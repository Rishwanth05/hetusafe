/**
 * Button — primary / secondary / ghost / danger variants.
 *
 * Variants:
 *   primary   — solid accent-green, rounded-full, dark text (high contrast)
 *   secondary — transparent + border-edge, rounded-xl
 *   ghost     — no background or border, muted text
 *   danger    — solid danger-red, rounded-full, white text
 *
 * Sizes: sm | md (default) | lg
 */

const VARIANTS = {
  primary:   'bg-accent text-canvas font-semibold rounded-full hover:bg-glow active:scale-95',
  secondary: 'bg-transparent border border-edge text-light rounded-xl hover:bg-elevated',
  ghost:     'bg-transparent text-muted hover:text-light',
  danger:    'bg-danger text-white font-semibold rounded-full hover:opacity-90 active:scale-95',
}

const SIZES = {
  // min-h-[44px] on all sizes — iOS HIG 44px touch-target floor.
  // md/lg already exceed it via padding; sm (py-2 ≈ 36px) does not.
  sm: 'px-4  py-2   text-sm   gap-1.5 min-h-[44px]',
  md: 'px-6  py-3   text-sm   gap-2   min-h-[44px]',
  lg: 'px-8  py-3.5 text-base gap-2   min-h-[44px]',
}

export default function Button({
  variant   = 'primary',
  size      = 'md',
  className = '',
  children,
  ...props
}) {
  return (
    <button
      className={[
        'inline-flex items-center justify-center font-medium',
        'transition-all duration-150',
        VARIANTS[variant] ?? VARIANTS.primary,
        SIZES[size]       ?? SIZES.md,
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </button>
  )
}
