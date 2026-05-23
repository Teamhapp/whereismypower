'use client'

import { useState } from 'react'

interface Props {
  onBack: () => void
}

export default function ReliabilityView({ onBack }: Props) {
  const [selectedMonth, setSelectedMonth] = useState('This Month')

  // Mock SVG line graph data points
  // Points: (10, 80) -> (25% progress) -> (50%) -> (75%) -> (90%)
  const svgWidth = 320
  const svgHeight = 100
  const linePoints = "10,80 70,85 130,65 190,75 250,55 310,40"

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center'
        }}>
          ←
        </button>
        <span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Outfit' }}>Reliability</span>
        <select 
          value={selectedMonth} 
          onChange={(e) => setSelectedMonth(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)',
            color: '#fff', fontSize: 12, padding: '4px 8px', borderRadius: 8, cursor: 'pointer',
            fontFamily: 'Inter', outline: 'none'
          }}
        >
          <option style={{ background: '#0f172a' }} value="This Month">This Month</option>
          <option style={{ background: '#0f172a' }} value="Last Month">Last Month</option>
          <option style={{ background: '#0f172a' }} value="Last 3 Months">Last 3 Months</option>
        </select>
      </div>

      {/* Area Selector and Score Badge */}
      <div className="glass-card" style={{ marginBottom: 16, padding: '16px' }}>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>Area</p>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Velachery</h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Glowing Circle/Hex Score */}
          <div style={{
            position: 'relative', width: 72, height: 72, borderRadius: '50%',
            background: 'conic-gradient(#10b981 65%, rgba(255,255,255,0.08) 65%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(16, 185, 129, 0.2)'
          }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%', background: 'var(--bg-deep)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 800, fontFamily: 'Outfit', color: '#10b981'
            }}>
              65
            </div>
          </div>
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>Moderate</h4>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Reliability Score</p>
          </div>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
        <div className="glass-card" style={{ padding: '12px 8px', textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Total Outages</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>12</p>
        </div>
        <div className="glass-card" style={{ padding: '12px 8px', textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Total Downtime</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>18h 40m</p>
        </div>
        <div className="glass-card" style={{ padding: '12px 8px', textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Avg. Outage</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>1h 33m</p>
        </div>
      </div>

      {/* Outage Trend Chart */}
      <div className="glass-card" style={{ marginBottom: 16, padding: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, fontFamily: 'Outfit' }}>Outage Trend</h4>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>outages / week</span>
        </div>

        {/* SVG Sparkline Graph */}
        <div style={{ width: '100%', height: svgHeight, position: 'relative' }}>
          <svg width="100%" height="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="none">
            {/* Grid Lines */}
            <line x1="0" y1="20" x2={svgWidth} y2="20" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            <line x1="0" y1="50" x2={svgWidth} y2="50" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            <line x1="0" y1="80" x2={svgWidth} y2="80" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

            {/* Gradient Area under line */}
            <defs>
              <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path d={`M 10,${svgHeight} L 10,80 L 70,85 L 130,65 L 190,75 L 250,55 L 310,40 L 310,${svgHeight} Z`} fill="url(#chartGlow)" />

            {/* Sparkline */}
            <polyline
              fill="none"
              stroke="url(#lineGradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={linePoints}
            />
            
            <defs>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#f5a623" />
                <stop offset="50%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#ff7675" />
              </linearGradient>
            </defs>

            {/* Markers */}
            {[
              { x: 10, y: 80 }, { x: 70, y: 85 }, { x: 130, y: 65 },
              { x: 190, y: 75 }, { x: 250, y: 55 }, { x: 310, y: 40 }
            ].map((p, idx) => (
              <circle key={idx} cx={p.x} cy={p.y} r="3.5" fill="#080f19" stroke="#ef4444" strokeWidth="2" />
            ))}
          </svg>
        </div>

        {/* X Axis Labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>
          <span>1 May</span>
          <span>8 May</span>
          <span>15 May</span>
          <span>22 May</span>
        </div>
      </div>

      {/* Frequent Outage Reasons */}
      <div className="glass-card" style={{ padding: '14px' }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, fontFamily: 'Outfit', marginBottom: 12 }}>Frequent Outage Reasons</h4>
        
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
            <span style={{ fontWeight: 500 }}>Heavy Rain</span>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>7 (58%)</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: '58%', background: '#ef4444' }} />
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
            <span style={{ fontWeight: 500 }}>Equipment Failure</span>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>3 (25%)</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: '25%', background: '#f5a623' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
