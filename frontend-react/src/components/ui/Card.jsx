/**
 * Card — dark surface panel with optional coloured circular icon badge.
 *
 * Props:
 *   children    — card body
 *   className   — extra Tailwind classes (padding, width, etc.)
 *   icon        — ReactNode rendered inside the top-left circular badge
 *   iconColor   — Tailwind bg utility for the badge ring; defaults to accent/10
 *   iconText    — Tailwind text utility for the icon; defaults to text-accent
 */
export default function Card({
  children,
  className = '',
  icon,
  iconColor = 'bg-accent/10',
  iconText  = 'text-accent',
}) {
  return (
    <div className={`bg-surface border border-edge rounded-2xl min-w-0 overflow-hidden ${className}`}>
      {icon && (
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconColor} ${iconText}`}>
          {icon}
        </div>
      )}
      {children}
    </div>
  )
}
