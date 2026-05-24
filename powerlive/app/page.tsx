'use client'

import { useState, useCallback } from 'react'
import BottomNav, { type NavTab } from '@/app/components/BottomNav'
import HomeScreen from '@/app/components/HomeScreen'
import ReportFlow from '@/app/components/ReportFlow'
import AreaPanel from '@/app/components/AreaPanel'
import ScheduledPanel from '@/app/components/ScheduledPanel'
import AlertsScreen from '@/app/components/AlertsScreen'
import ReliabilityScreen from '@/app/components/ReliabilityScreen'
import ProfileScreen from '@/app/components/ProfileScreen'
import ChatBot from '@/app/components/ChatBot'
import AuthModal from '@/app/components/AuthModal'
import { useAuth } from '@/app/context/AuthContext'
import { type Area } from '@/app/data/areas'
import { type ScheduledOutage } from '@/app/data/scheduled'
import { NOTIFICATIONS } from '@/app/data/notifications'
import { useWifiDropDetection } from '@/lib/useWifiDrop'
import ConfirmBanner from '@/app/components/ConfirmBanner'

export default function Home() {
  const { user, showAuthModal, setShowAuthModal } = useAuth()

  const [tab, setTab]                       = useState<NavTab>('map')
  const [showReport, setShowReport]         = useState(false)
  const [reportStatus, setReportStatus]     = useState<'no_power' | 'power_back' | undefined>()
  const [selectedArea, setSelectedArea]     = useState<Area | null>(null)
  const [selectedScheduled, setSelectedScheduled] = useState<ScheduledOutage | null>(null)
  const [followed, setFollowed]             = useState<Set<string>>(new Set())
  const [showChat, setShowChat]             = useState(false)
  // Area to follow after sign-in (if user was a guest when they tapped Follow)
  const [pendingFollowId, setPendingFollowId] = useState<string | null>(null)

  const [wifiDropConfirm, setWifiDropConfirm] = useState<{ lat: number; lng: number } | null>(null)
  const [wifiDropArea, setWifiDropArea] = useState<string>('your area')

  useWifiDropDetection({
    onProbableOutage: async (lat, lng) => {
      setWifiDropConfirm({ lat, lng })
      try {
        const { reverseGeocode } = await import('@/lib/geo')
        const geo = await reverseGeocode(lat, lng)
        if (geo.locality) {
          setWifiDropArea(geo.locality)
        }
      } catch {
        setWifiDropArea('your area')
      }
    },
    onConnectionRestored: (lat, lng) => {
      console.log('WiFi connection restored at', lat, lng)
    }
  })

  const unreadCount = NOTIFICATIONS.filter(n => n.unread).length

  function openReport(status?: 'no_power' | 'power_back') {
    setReportStatus(status)
    setShowReport(true)
  }

  const handleAreaSelect = useCallback((area: Area) => {
    setSelectedScheduled(null)
    setSelectedArea(area)
  }, [])

  const handleScheduledSelect = useCallback((item: ScheduledOutage) => {
    setSelectedArea(null)
    setSelectedScheduled(item)
  }, [])

  function handleFollow() {
    if (!selectedArea) return

    const isFollowed = followed.has(selectedArea.id)

    if (!isFollowed && !user) {
      // Guest trying to follow — prompt sign-in, remember which area to follow after
      setPendingFollowId(selectedArea.id)
      setShowAuthModal(true)
      return
    }

    setFollowed(prev => {
      const next = new Set(prev)
      isFollowed ? next.delete(selectedArea.id) : next.add(selectedArea.id)
      return next
    })
  }

  function handleAuthModalClose() {
    // If the user just signed in and had a pending follow, apply it
    if (pendingFollowId && user) {
      setFollowed(prev => new Set([...prev, pendingFollowId]))
    }
    setPendingFollowId(null)
    setShowAuthModal(false)
  }

  function closePanel() {
    setSelectedArea(null)
    setSelectedScheduled(null)
  }

  function handleTabChange(t: NavTab) {
    setTab(t)
    // Switching tabs clears any open panel
    closePanel()
  }

  return (
    <div style={{ height: '100dvh', width: '100vw', position: 'relative', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ── Map screen ── */}
      {tab === 'map' && (
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 'var(--nav-h)', left: 'var(--side-w)' }}>
          <HomeScreen
            onAreaSelect={handleAreaSelect}
            onScheduledSelect={handleScheduledSelect}
            onReport={openReport}
          />
        </div>
      )}

      {/* ── Alerts screen ── */}
      {tab === 'alerts' && (
        <AlertsScreen />
      )}

      {/* ── Updates screen ── */}
      {tab === 'updates' && (
        <ReliabilityScreen />
      )}

      {/* ── Profile screen ── */}
      {tab === 'profile' && (
        <ProfileScreen />
      )}

      {/* ── Side panel: Community area ── */}
      {selectedArea && (
        <AreaPanel
          area={selectedArea}
          followed={followed.has(selectedArea.id)}
          onFollow={handleFollow}
          onClose={closePanel}
          onReport={status => openReport(status)}
        />
      )}

      {/* ── Side panel: Scheduled outage ── */}
      {selectedScheduled && (
        <ScheduledPanel
          item={selectedScheduled}
          onClose={closePanel}
        />
      )}

      {/* ── Report flow modal ── */}
      {showReport && (
        <ReportFlow
          initialStatus={reportStatus}
          onClose={() => { setShowReport(false); setReportStatus(undefined) }}
          onSubmit={() => {}}
        />
      )}

      {/* ── ChatBot modal ── */}
      {showChat && <ChatBot onClose={() => setShowChat(false)} />}

      {/* ── Auth modal (Google sign-in) ── */}
      {showAuthModal && (
        <AuthModal
          onClose={handleAuthModalClose}
          prompt={pendingFollowId ? 'Sign in to follow this area and get outage alerts' : undefined}
        />
      )}

      {/* ── WiFi drop confirmation banner ── */}
      {wifiDropConfirm && (
        <ConfirmBanner
          areaName={wifiDropArea}
          onAnswer={(status) => {
            openReport(status)
            setWifiDropConfirm(null)
          }}
          onDismiss={() => setWifiDropConfirm(null)}
        />
      )}

      {/* ── Floating AI chat button (map only, above nav) ── */}
      {tab === 'map' && !showChat && !showReport && !selectedArea && !selectedScheduled && (
        <button
          onClick={() => setShowChat(true)}
          style={{
            position: 'fixed',
            bottom: `calc(var(--nav-h) + 14px)`,
            right: 16,
            zIndex: 1050,
            width: 48, height: 48,
            borderRadius: '50%',
            background: 'rgba(19,19,31,0.95)',
            border: '1px solid rgba(245,158,11,.4)',
            backdropFilter: 'blur(12px)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22,
            boxShadow: '0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px rgba(245,158,11,.15)',
            transition: 'transform .15s, box-shadow .15s',
          }}
          title="Ask AI — Where is My Power?"
        >
          🤖
        </button>
      )}

      {/* ── Bottom nav ── */}
      <BottomNav
        active={tab}
        unreadAlerts={unreadCount}
        onTab={handleTabChange}
        onReport={openReport}
      />
    </div>
  )
}

/* Profile has two sub-tabs: Stats (Reliability) | Account (Profile) */
function ProfileAndReliabilityShell() {
  const [sub, setSub] = useState<'reliability' | 'account'>('reliability')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Sub-tab bar */}
      <div style={{
        display: 'flex', background: 'var(--bg2)',
        borderBottom: '1px solid var(--border)',
        padding: '8px 16px 0', gap: 4, flexShrink: 0,
      }}>
        {([
          { id: 'reliability', label: '📊 Reliability' },
          { id: 'account',     label: '👤 Account' },
        ] as const).map(s => (
          <button
            key={s.id}
            onClick={() => setSub(s.id)}
            style={{
              padding: '9px 18px', border: 'none', cursor: 'pointer',
              background: 'none', fontSize: 13, fontWeight: 600,
              color: sub === s.id ? 'var(--primary)' : 'var(--text3)',
              borderBottom: sub === s.id ? '2px solid var(--primary)' : '2px solid transparent',
              transition: 'all .15s',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {sub === 'reliability' ? <ReliabilityScreen /> : <ProfileScreen />}
      </div>
    </div>
  )
}
