import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, Wallet, AlertTriangle, CreditCard, ArrowRight, ArrowRightLeft, ShieldAlert, BadgeInfo
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import client from '../../api/client'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'
import PageHeader from '../../components/ui/PageHeader'
import MetricCard from '../../components/ui/MetricCard'
import SectionCard from '../../components/ui/SectionCard'
import EmptyState from '../../components/ui/EmptyState'

/* ── Formatters ─────────────────────────────────────────────── */
const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN')
const pct = (n) => Math.round(n) + '%'
const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

/* ── Custom Insight list building ───────────────────────────── */
function buildInsights(dash) {
  if (!dash || dash.loan_count === 0) {
    return [
      {
        title: 'Unlock your settlement estimates',
        text: 'Add your active loan details to start tracking repayments, calculating debt stress levels, and simulating negotiation margins.',
        type: 'info',
      }
    ]
  }
  const s = dash.overall_stress, d = dash.avg_dti, p = dash.monthly_surplus
  const list = []

  if (s >= 61) {
    list.push({
      title: 'High priority OTS leverage',
      text: `Your overall stress score is high (${Math.round(s)}/100). Outstanding days increase your settlement leverage, making a structured proposal plan your primary priority.`,
      type: 'high',
    })
  } else if (s >= 31) {
    list.push({
      title: 'Moderate risk watchzone',
      text: `Debt stress is moderate at ${Math.round(s)}/100. Review settlement estimates soon to prevent overdue timelines from compounding.`,
      type: 'tight',
    })
  } else {
    list.push({
      title: 'Repayments are stable',
      text: `Your current debt load of ${pct(d)} DTI and stress score of ${Math.round(s)}/100 remains in a manageable range. Monitor overdue timelines.`,
      type: 'healthy',
    })
  }

  if (p < 0) {
    list.push({
      title: 'Monthly deficit detected',
      text: 'Your current EMIs exceed your income after basic living expenses. Focus on restricting outflow before starting settlement negotiations.',
      type: 'deficit',
    })
  }

  return list
}

/* ── Recharts trend chart ───────────────────────────────────── */
function TrendChart({ snapshots }) {
  const isReal = snapshots && snapshots.length >= 2

  if (!isReal) {
    return (
      <div style={{ position: 'relative', width: '100%', height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.3 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={[{ x: 1, y: 10 }, { x: 2, y: 15 }, { x: 3, y: 12 }]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EDEAE1" />
              <YAxis domain={[0, 100]} hide />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontFamily: 'var(--font-body)', position: 'relative', zIndex: 1 }}>
          No history recorded yet
        </span>
      </div>
    )
  }

  const data = snapshots.map(s => {
    const d = new Date(s.created_at)
    return {
      name: `${d.getDate()}/${d.getMonth() + 1}`,
      stress: s.stress_score,
      settle: s.settlement_percentage
    }
  })

  return (
    <div style={{ width: '100%', height: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EDEAE1" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#7A776E', fontFamily: 'Inter' }} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#7A776E', fontFamily: 'Inter' }} domain={[0, 100]} />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-raised)', fontSize: '0.75rem', fontFamily: 'Inter' }}
            formatter={(value, name) => [typeof value === 'number' ? Math.round(value) : value, name === 'stress' ? 'Stress Score' : 'Settlement %']}
            labelStyle={{ color: 'var(--color-muted)', marginBottom: 4 }}
          />
          <Line type="monotone" dataKey="stress" stroke="#1B1A17" strokeWidth={2} dot={{ r: 4, fill: '#1B1A17', strokeWidth: 0 }} activeDot={{ r: 6 }} />
          <Line type="monotone" dataKey="settle" stroke="#B8622B" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 4, fill: '#B8622B', strokeWidth: 0 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ── DTI / stress status helper ─────────────────────────────── */
function dtiStatus(v) { return v < 35 ? 'healthy' : v < 55 ? 'tight' : 'high' }
function stressStatus(v) { return v < 31 ? 'healthy' : v < 61 ? 'tight' : 'high' }

export default function Dashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [dash, setDash] = useState(null)
  const [snapshots, setSnapshots] = useState([])
  const [letters, setLetters] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [dashData, snapsData, lettersData] = await Promise.all([
          client.get('/dashboard').then(r => r.data),
          client.get('/snapshots?limit=30').then(r => r.data).catch(() => []),
          client.get('/letters').then(r => r.data).catch(() => []),
        ])
        if (!cancelled) {
          setDash(dashData)
          setSnapshots(snapsData)
          setLetters(lettersData)
        }
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.detail || 'Could not load dashboard.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (error) {
    return (
      <div style={{ padding: '40px 32px' }} className="fade-in">
        <PageHeader title="Overview" subtitle="Manage your debt health." />
        <SectionCard title="System Error">
          <p style={{ color: 'var(--color-danger)', fontSize: '0.875rem' }}>{error}</p>
        </SectionCard>
      </div>
    )
  }

  const insightsList = dash ? buildInsights(dash) : []

  return (
    <div style={{ padding: '32px 32px 48px', maxWidth: 1240, margin: '0 auto' }} className="fade-in">
      <PageHeader
        title="Overview"
        subtitle="Dignified, practical guidance to help you navigate retail debt resolution."
      />

      {/* Metric Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {loading ? (
          [0, 1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 110, borderRadius: 'var(--radius-md)' }} />
          ))
        ) : (
          <>
            <MetricCard
              label="Avg DTI Ratio"
              value={pct(dash.avg_dti)}
              badgeVariant={dtiStatus(dash.avg_dti)}
              badgeLabel={dtiStatus(dash.avg_dti) === 'healthy' ? 'Healthy' : dtiStatus(dash.avg_dti) === 'tight' ? 'Tight' : 'High Burden'}
              foot="Share of monthly income used for EMIs"
              Icon={TrendingUp}
            />
            <MetricCard
              label="Monthly Surplus"
              value={inr(dash.monthly_surplus)}
              badgeVariant={dash.monthly_surplus > 0 ? 'healthy' : 'critical'}
              badgeLabel={dash.monthly_surplus > 0 ? 'Surplus' : 'Deficit'}
              foot="Net income after all debt repayments"
              Icon={Wallet}
            />
            <MetricCard
              label="Debt Stress Score"
              value={`${Math.round(dash.overall_stress)} / 100`}
              badgeVariant={stressStatus(dash.overall_stress)}
              badgeLabel={
                dash.overall_stress < 31 ? 'Low Stress' : dash.overall_stress < 61 ? 'Moderate' : 'High Stress'
              }
              progress={dash.overall_stress}
              progressColor={
                dash.overall_stress < 31 ? 'var(--color-green)' : dash.overall_stress < 61 ? 'var(--color-amber)' : 'var(--color-danger)'
              }
              accent
              Icon={AlertTriangle}
            />
            <MetricCard
              label="Active Accounts"
              value={dash.loan_count}
              foot={dash.loan_count === 0 ? 'No open records' : `Total outstanding: ${inr(dash.total_debt)}`}
              Icon={CreditCard}
            />
          </>
        )}
      </div>

      {/* Row 2: Actionable Insights + Chart */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.5fr',
          gap: 16,
          marginBottom: 24,
        }}
        className="dashboard-grid"
      >
        {/* Actionable Insights Panel */}
        <div
          style={{
            background: 'var(--color-amber-dim)',
            border: '1px solid #E8C9A4',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 20,
          }}
        >
          <div>
            <p className="section-label" style={{ color: 'var(--color-amber)', marginBottom: 16 }}>
              Personalised Guidance
            </p>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="skeleton" style={{ height: 14, width: '90%', borderRadius: 4 }} />
                <div className="skeleton" style={{ height: 14, width: '80%', borderRadius: 4 }} />
                <div className="skeleton" style={{ height: 14, width: '70%', borderRadius: 4 }} />
              </div>
            ) : insightsList.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-ink)' }}>
                  No active loan metrics
                </p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', lineHeight: 1.5 }}>
                  Add your active loan details to start tracking repayments, calculating debt stress levels, and simulating negotiation margins.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {insightsList.map((ins, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ marginTop: 2 }}>
                      {ins.type === 'high' || ins.type === 'deficit' ? (
                        <ShieldAlert size={15} color="var(--color-danger)" />
                      ) : (
                        <BadgeInfo size={15} color="var(--color-amber)" />
                      )}
                    </div>
                    <div>
                      <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-ink)', lineHeight: 1.25 }}>
                        {ins.title}
                      </p>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', marginTop: 4, lineHeight: 1.45 }}>
                        {ins.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!loading && (
            <div style={{ display: 'flex', gap: 10 }}>
              {dash.loan_count === 0 ? (
                <Button variant="primary" size="sm" onClick={() => navigate('/loans')}>
                  Add your first loan <ArrowRight size={13} style={{ marginLeft: 4 }} />
                </Button>
              ) : (
                <Button variant="secondary" size="sm" onClick={() => navigate('/settlement')}>
                  Analyse settlement options <ArrowRight size={13} style={{ marginLeft: 4 }} />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Trend History Panel */}
        <SectionCard
          title="Trend History"
          action={
            <div style={{ display: 'flex', gap: 12 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.6875rem', color: 'var(--color-muted)' }}>
                <span style={{ display: 'inline-block', width: 12, height: 2, background: '#1B1A17', borderRadius: 1 }} />
                Stress Score
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.6875rem', color: 'var(--color-muted)' }}>
                <span style={{ display: 'inline-block', width: 12, height: 2, borderTop: '2px dashed #B8622B', background: 'none' }} />
                Recommended Estimate %
              </span>
            </div>
          }
        >
          {loading ? (
            <div className="skeleton" style={{ height: 150, borderRadius: 'var(--radius-md)' }} />
          ) : (
            <>
              <TrendChart snapshots={snapshots} />
              {snapshots.length < 2 && (
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                    Save multiple scenarios in the Settlement portal to begin recording real data points.
                  </p>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/settlement')}>
                    Save your first settlement analysis
                  </Button>
                </div>
              )}
            </>
          )}
        </SectionCard>
      </div>

      {/* Row 3: Recent Settlements Table */}
      <SectionCard title="Recent Generated Proposals">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[0, 1, 2].map(i => <div key={i} className="skeleton" style={{ height: 32, borderRadius: 4 }} />)}
          </div>
        ) : letters.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', marginBottom: 12 }}>
              No settlement letters generated yet.
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate('/settlement')}>
              Begin settlement analysis
            </Button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {['Date Generated', 'Lender', 'Recommended Estimate %', 'Source'].map(h => (
                    <th
                      key={h}
                      style={{
                        padding: '10px 16px',
                        textAlign: 'left',
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: 'var(--color-muted)',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {letters.slice(0, 6).map((l, i) => (
                  <tr
                    key={l.id}
                    style={{
                      borderBottom: i < Math.min(letters.length, 6) - 1 ? '1px solid var(--color-border)' : 'none',
                    }}
                  >
                    <td style={{ padding: '12px 16px', fontSize: '0.8125rem', color: 'var(--color-muted)' }}>
                      {fmtDate(l.created_at)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-ink)' }}>
                      {l.lender}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.8125rem', fontFamily: 'var(--font-heading)', color: 'var(--color-ink)' }}>
                      {Math.round(l.settlement_pct)}%
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <Badge variant={l.source === 'AI' ? 'ai' : 'neutral'}>
                        {l.source === 'AI' ? 'Gemini AI' : 'Offline Template'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
