import { Loader2 } from 'lucide-react'

/**
 * Button variants:
 *   primary   — filled amber, main CTA
 *   secondary — filled dark ink, secondary actions
 *   outline   — bordered, lighter actions
 *   ghost     — no border/bg, text-only actions
 *   danger    — filled red for destructive actions
 */
const variants = {
  primary:   'bg-amber text-white hover:brightness-110 border border-amber',
  secondary: 'bg-ink text-cream hover:opacity-90 border border-ink',
  outline:   'bg-transparent text-ink border border-[color:var(--color-border)] hover:border-[color:var(--color-muted)] hover:bg-surface',
  ghost:     'bg-transparent text-muted hover:text-ink hover:bg-surface border border-transparent',
  danger:    'bg-danger text-white hover:brightness-110 border border-danger',
}

const sizes = {
  sm:  'h-7 px-3 text-xs gap-1.5',
  md:  'h-9 px-4 text-sm gap-2',
  lg:  'h-11 px-6 text-sm gap-2',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) {
  const isDisabled = disabled || loading

  return (
    <button
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center font-medium rounded',
        'transition-all duration-150 cursor-pointer select-none',
        'focus-visible:outline-2 focus-visible:outline-offset-2',
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        isDisabled ? 'opacity-50 cursor-not-allowed' : '',
        className,
      ].join(' ')}
      style={{ fontFamily: 'var(--font-body)' }}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin shrink-0" />}
      {children}
    </button>
  )
}
