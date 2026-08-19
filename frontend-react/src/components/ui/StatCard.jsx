/**
 * StatCard — big bold metric with a small label.
 * Designed to sit in a 3- or 4-column grid.
 *
 * Props:
 *   value      — the metric (number or string, e.g. "1,234" or "98%")
 *   label      — description shown below the value
 *   accent     — optional Tailwind text utility applied to `value` (e.g. "text-accent")
 *   className  — extra classes for the outer card
 *
 * Usage:
 *   <div className="grid grid-cols-3 gap-3">
 *     <StatCard value="128"  label="Reports" />
 *     <StatCard value="4.2k" label="Users"   accent="text-accent" />
 *     <StatCard value="92%"  label="Resolved" />
 *   </div>
 */
export default function StatCard({ value, label, accent = 'text-light', className = '' }) {
  return (
    <div className={`bg-surface border border-edge rounded-2xl p-4 text-center overflow-hidden ${className}`}>
      {/*
        text-xl on mobile → text-2xl on sm (≥640px).
        In a 3-col grid on 375px each card is ≈106px wide; 24px font for a
        6-char value ("12,432") overflows the ~74px inner width after padding.
        20px (text-xl) fits safely. truncate guards against unexpectedly long values.
      */}
      <p className={`text-xl sm:text-2xl font-bold leading-none tracking-tight truncate ${accent}`}>
        {value}
      </p>
      <p className="text-caption text-muted mt-1.5 truncate">{label}</p>
    </div>
  )
}
