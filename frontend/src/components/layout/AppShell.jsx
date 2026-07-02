import Sidebar from './Sidebar'
import BottomNav from './BottomNav'

/**
 * AppShell — responsive layout wrapper for authenticated pages
 * Desktop (≥768px): Sidebar on left + scrollable main content
 * Mobile (<768px):  Full-width content + fixed bottom nav bar
 */
export default function AppShell({ children }) {
  return (
    <>
      {/* Desktop layout */}
      <div
        className="hidden md:flex"
        style={{ minHeight: '100vh', background: 'var(--color-cream)' }}
      >
        <Sidebar />
        <main
          style={{
            flex: 1,
            minWidth: 0,
            overflowY: 'auto',
            background: 'var(--color-cream)',
          }}
        >
          {children}
        </main>
      </div>

      {/* Mobile layout */}
      <div
        className="flex flex-col md:hidden"
        style={{
          minHeight: '100vh',
          background: 'var(--color-cream)',
          paddingBottom: 64, /* reserve space for bottom nav */
        }}
      >
        <main style={{ flex: 1 }}>
          {children}
        </main>
        <BottomNav />
      </div>
    </>
  )
}
