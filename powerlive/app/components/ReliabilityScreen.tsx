'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts'
import { RELIABILITY_TREND, REASON_BREAKDOWN } from '@/app/data/notifications'
import { AREAS } from '@/app/data/areas'

const TARGET_AREA = AREAS.find(a => a.id === 'velachery')!

function ScoreShield({ score }: { score: number }) {
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'
  const label = score >= 80 ? 'Good' : score >= 50 ? 'Moderate' : 'Poor'
  return (
    <div style={{ textAlign: 'center', marginBottom: 28 }}>
      <div style={{
        width: 120, height: 140, margin: '0 auto 16px',
        background: `linear-gradient(135deg, ${color}22, ${color}44)`,
        border: `2px solid ${color}66`,
        clipPath: 'polygon(50% 0%, 100% 18%, 100% 72%, 50% 100%, 0% 72%, 0% 18%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
      }}>
        <span style={{ fontSize: 34, fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>/{100}</span>
      </div>
      <p style={{ fontSize: 22, fontWeight: 800, color, marginBottom: 4 }}>{label} Reliability</p>
      <p style={{ fontSize: 13, color: 'var(--text3)' }}>Based on 30-day outage history</p>
    </div>
  )
}

export default function ReliabilityScreen() {
  const area = TARGET_AREA
  const score = Math.max(0, Math.min(100, 100 - Math.round(area.confidence * 0.35)))

  return (
    <div style={{ background: 'var(--bg)', height: '100%', overflowY: 'auto' }}>

      {/* Header */}
      <div style={{
        padding: '18px 16px 14px',
        background: 'var(--bg2)',
        borderBottom: '1px solid var(--border)',
      }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>Reliability</h1>
        <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>Outage history & score for tracked areas</p>
      </div>

      <div style={{ padding: '20px 16px' }}>

        {/* Area selector */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--card2)', borderRadius: 12, padding: '10px 14px',
          border: '1px solid var(--border2)', marginBottom: 24,
        }}>
          <span style={{ fontSize: 18 }}>📍</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{area.name}</p>
            <p style={{ fontSize: 11, color: 'var(--text3)' }}>{area.district}</p>
          </div>
          <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>Change</span>
        </div>

        {/* Shield score */}
        <ScoreShield score={65} />

        {/* 30-day trend */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
            Outage Hours — Last 30 Days
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>Daily outage duration in hours</p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={RELIABILITY_TREND} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="day"
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={{ stroke: 'rgba(255,255,255,.06)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: '#1e1e32', border: '1px solid rgba(255,255,255,.13)',
                  borderRadius: 10, color: '#f1f5f9',
                }}
                labelStyle={{ color: '#94a3b8', fontSize: 12 }}
                formatter={(v) => [`${v}h`, 'Outage']}
                labelFormatter={(l) => `Day ${l}`}
              />
              <Line
                type="monotone"
                dataKey="hours"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={{ fill: '#f59e0b', r: 3 }}
                activeDot={{ r: 5, fill: '#f59e0b' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Reason breakdown */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
            Outage Reasons
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>Frequency of reported causes</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={REASON_BREAKDOWN} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="reason"
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={{ stroke: 'rgba(255,255,255,.06)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: '#1e1e32', border: '1px solid rgba(255,255,255,.13)',
                  borderRadius: 10, color: '#f1f5f9',
                }}
                formatter={(v) => [v, 'Incidents']}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {REASON_BREAKDOWN.map((entry, i) => (
                  <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick stats */}
        <div className="stats-bar" style={{ marginBottom: 0 }}>
          <div className="stat-cell">
            <span className="stat-val" style={{ color: '#ef4444' }}>22</span>
            <span className="stat-lbl">Outages this month</span>
          </div>
          <div className="stat-cell">
            <span className="stat-val" style={{ color: 'var(--primary)' }}>28h</span>
            <span className="stat-lbl">Total downtime</span>
          </div>
          <div className="stat-cell">
            <span className="stat-val" style={{ color: 'var(--restored)' }}>76m</span>
            <span className="stat-lbl">Avg restore time</span>
          </div>
        </div>

        {/* Tip */}
        <div style={{
          marginTop: 20, padding: '14px 16px',
          background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.18)',
          borderRadius: 12,
        }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', marginBottom: 4 }}>💡 Tip</p>
          <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
            Transformer failures cause {Math.round(REASON_BREAKDOWN[0].count / REASON_BREAKDOWN.reduce((a, b) => a + b.count, 0) * 100)}% of outages in {area.name}.
            Consider a UPS for critical devices.
          </p>
        </div>

        <div style={{ height: 8 }} />
      </div>
    </div>
  )
}
