import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  CreditCard,
  Calculator,
  FileText,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const NAV = [
  { to: '/dashboard',  label: 'Dashboard',  Icon: LayoutDashboard },
  { to: '/loans',      label: 'My Loans',   Icon: CreditCard },
  { to: '/settlement', label: 'Settlement',  Icon: Calculator },
  { to: '/letters',    label: 'Letters',     Icon: FileText },
]

function Initials({ name }) {
  const parts = (name || 'U').trim().split(/\s+/)
  const init = parts.length >= 2
    ? parts[0][0] + parts[parts.length - 1][0]
    : parts[0].slice(0, 2)
  return init.toUpperCase()
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside
      style={{
        width: 248,
        minHeight: '100vh',
        background: 'white',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '0',
        flexShrink: 0,
      }}
    >
      {/* Brand header */}
      <div
        style={{
          padding: '28px 24px 22px',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.4rem',
              fontWeight: 400,
              color: 'var(--color-ink)',
              letterSpacing: '-0.02em',
            }}
          >
            FinRelief
          </span>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.6875rem',
              fontWeight: 700,
              color: 'var(--color-amber)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            AI
          </span>
        </div>
        <p
          style={{
            fontSize: '0.6875rem',
            color: 'var(--color-muted)',
            marginTop: 4,
            fontFamily: 'var(--font-body)',
            letterSpacing: '0.01em',
          }}
        >
          Debt settlement platform
        </p>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <p className="section-label" style={{ padding: '0 8px', marginBottom: 8 }}>
          Navigation
        </p>
        {NAV.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              color: isActive ? 'var(--color-amber)' : 'var(--color-muted)',
              background: isActive ? 'var(--color-amber-dim)' : 'transparent',
              fontSize: '0.875rem',
              fontWeight: isActive ? 500 : 450,
              textDecoration: 'none',
              transition: 'all 0.15s ease',
              borderLeft: isActive ? '3px solid var(--color-amber)' : '3px solid transparent',
              paddingLeft: isActive ? 9 : 12,
            })}
          >
            {({ isActive }) => (
              <>
                <Icon size={16} strokeWidth={isActive ? 2 : 1.75} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User chip + logout */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'var(--color-surface)',
        }}
      >
        {/* Initials avatar */}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'var(--color-amber-dim)',
            border: '1px solid var(--color-amber)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--color-amber)',
            fontFamily: 'var(--font-body)',
            flexShrink: 0,
          }}
          aria-label={`User: ${user?.name}`}
        >
          <Initials name={user?.name} />
        </div>

        {/* Name + email */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: 'var(--color-ink)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {user?.name || 'User'}
          </p>
          <p
            style={{
              fontSize: '0.6875rem',
              color: 'var(--color-muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {user?.email}
          </p>
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          title="Log out"
          aria-label="Log out"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 6,
            borderRadius: 4,
            color: 'var(--color-muted)',
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.12s ease',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-danger)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-muted)')}
        >
          <LogOut size={16} strokeWidth={1.75} />
        </button>
      </div>
    </aside>
  )
}
