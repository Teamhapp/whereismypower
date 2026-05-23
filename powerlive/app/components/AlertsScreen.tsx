'use client'

import { useState } from 'react'
import { NOTIFICATIONS, type Notification } from '@/app/data/notifications'

interface Props {
  onNotifClick?: (n: Notification) => void
}

export default function AlertsScreen({ onNotifClick }: Props) {
  const [notifs, setNotifs] = useState(NOTIFICATIONS)

  const todayNotifs     = notifs.filter(n => !n.time.startsWith('Yesterday'))
  const yesterdayNotifs = notifs.filter(n => n.time.startsWith('Yesterday'))
  const unreadCount     = notifs.filter(n => n.unread).length

  function markAllRead() {
    setNotifs(ns => ns.map(n => ({ ...n, unread: false })))
  }

  function markRead(id: string) {
    setNotifs(ns => ns.map(n => n.id === id ? { ...n, unread: false } : n))
  }

  function renderItem(n: Notification) {
    return (
      <div
        key={n.id}
        className={`notif-item${n.unread ? ' unread' : ''}`}
        onClick={() => { markRead(n.id); onNotifClick?.(n) }}
      >
        <div className="notif-icon-box" style={{ background: n.iconBg }}>
          {n.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <p style={{ fontSize: 14, fontWeight: n.unread ? 700 : 500, color: 'var(--text)', lineHeight: 1.3 }}>
              {n.title}
            </p>
            {n.unread && <div className="unread-dot" style={{ flexShrink: 0, marginTop: 5 }} />}
          </div>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 3, lineHeight: 1.5 }}>
            {n.body}
          </p>
          <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{n.time}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="screen" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div style={{
        padding: '18px 16px 0',
        background: 'var(--bg2)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>Alerts</h1>
            {unreadCount > 0 && (
              <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              style={{
                background: 'rgba(245,158,11,.12)', border: '1px solid rgba(245,158,11,.25)',
                borderRadius: 10, padding: '7px 12px', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, color: 'var(--primary)',
              }}
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Today */}
      {todayNotifs.length > 0 && (
        <>
          <div className="section-hdr" style={{ paddingTop: 16 }}>
            <span className="section-title">Today</span>
          </div>
          <div style={{ background: 'var(--bg2)', borderRadius: 0, border: 0 }}>
            {todayNotifs.map(renderItem)}
          </div>
        </>
      )}

      {/* Yesterday */}
      {yesterdayNotifs.length > 0 && (
        <>
          <div className="section-hdr" style={{ paddingTop: 16 }}>
            <span className="section-title">Yesterday</span>
          </div>
          <div style={{ background: 'var(--bg2)' }}>
            {yesterdayNotifs.map(renderItem)}
          </div>
        </>
      )}

      {notifs.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>🔔</p>
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text2)' }}>No alerts yet</p>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 6 }}>
            Follow areas to get notified about outages
          </p>
        </div>
      )}

      {/* Bottom padding for nav */}
      <div style={{ height: 16 }} />
    </div>
  )
}
