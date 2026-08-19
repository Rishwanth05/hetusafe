/**
 * PriorityBadge — pill-shaped severity indicator.
 *
 * Levels: 'low' | 'medium' | 'high' | 'critical'
 *
 * Usage:
 *   <PriorityBadge level="high" />
 */

const LEVELS = {
  low:      { label: 'Low',      dot: 'bg-accent',  text: 'text-accent',  ring: 'bg-accent/10'  },
  medium:   { label: 'Medium',   dot: 'bg-warn',    text: 'text-warn',    ring: 'bg-warn/10'    },
  high:     { label: 'High',     dot: 'bg-danger',  text: 'text-danger',  ring: 'bg-danger/10'  },
  critical: { label: 'Critical', dot: 'bg-danger',  text: 'text-danger',  ring: 'bg-danger/15'  },
}

export default function PriorityBadge({ level = 'low', className = '' }) {
  const cfg = LEVELS[level] ?? LEVELS.low

  return (
    <span className={[
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
      'text-caption font-medium whitespace-nowrap shrink-0',
      cfg.ring, cfg.text,
      className,
    ].join(' ')}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} aria-hidden="true" />
      {cfg.label}
    </span>
  )
}
