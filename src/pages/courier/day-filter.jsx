import { Calendar, ChevronLeft, ChevronRight } from "lucide-react"

function shiftDate(iso, days) {
  const d = new Date(iso + "T00:00:00")
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function DayFilter({ date, onChange, count }) {
  return (
    <div className="day-filter">
      <button onClick={() => onChange(shiftDate(date, -1))}>
        <ChevronLeft size={16} />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Calendar size={16} style={{ color: '#64748b' }} />
        <input
          type="date"
          value={date}
          onChange={(e) => onChange(e.target.value)}
        />
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', background: '#e2e8f0', padding: '0.1rem 0.4rem', borderRadius: '1rem' }}>
          {count}
        </span>
      </div>

      <button onClick={() => onChange(shiftDate(date, 1))}>
        <ChevronRight size={16} />
      </button>
    </div>
  )
}
