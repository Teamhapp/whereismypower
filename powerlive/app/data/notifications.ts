export interface Notification {
  id: string
  type: 'outage' | 'restored' | 'planned' | 'community' | 'system'
  title: string
  body: string
  area?: string
  time: string
  unread: boolean
  icon: string
  iconBg: string
}

export const NOTIFICATIONS: Notification[] = [
  // Today
  {
    id: 'n1',
    type: 'outage',
    title: 'Power Outage — Velachery',
    body: 'Reported by 48 residents. Transformer failure near 100 Feet Rd.',
    area: 'Velachery',
    time: '3 min ago',
    unread: true,
    icon: '⚡',
    iconBg: 'rgba(239,68,68,.2)',
  },
  {
    id: 'n2',
    type: 'planned',
    title: 'Scheduled Cut — Nungambakkam',
    body: 'TNPDCL shutdown today 9 AM – 5 PM. Store water & charge devices.',
    area: 'Nungambakkam',
    time: '1h ago',
    unread: true,
    icon: '📅',
    iconBg: 'rgba(139,92,246,.2)',
  },
  {
    id: 'n3',
    type: 'community',
    title: 'New Report Near You',
    body: 'Priya S. reported voltage fluctuation in Adyar.',
    area: 'Adyar',
    time: '52 min ago',
    unread: true,
    icon: '👥',
    iconBg: 'rgba(245,158,11,.2)',
  },
  {
    id: 'n4',
    type: 'restored',
    title: 'Power Restored — T. Nagar',
    body: 'Community confirmed power is back. Outage lasted 3h 5m.',
    area: 'T. Nagar',
    time: '1h 5m ago',
    unread: false,
    icon: '✅',
    iconBg: 'rgba(34,197,94,.2)',
  },
  {
    id: 'n5',
    type: 'outage',
    title: 'Power Outage — Tambaram',
    body: '24 reports from West Tambaram. Overload suspected.',
    area: 'Tambaram',
    time: '1h 30m ago',
    unread: false,
    icon: '⚡',
    iconBg: 'rgba(239,68,68,.2)',
  },
  {
    id: 'n6',
    type: 'system',
    title: 'App Update',
    body: 'Rain-related outage tracking now available. Stay safe!',
    time: '3h ago',
    unread: false,
    icon: '🔔',
    iconBg: 'rgba(59,130,246,.2)',
  },
  // Yesterday
  {
    id: 'n7',
    type: 'planned',
    title: 'Scheduled Cut — Mylapore',
    body: 'TNPDCL shutdown 10 AM – 2 PM completed successfully.',
    area: 'Mylapore',
    time: 'Yesterday, 2:00 PM',
    unread: false,
    icon: '📅',
    iconBg: 'rgba(139,92,246,.2)',
  },
  {
    id: 'n8',
    type: 'restored',
    title: 'Power Restored — Chromepet',
    body: 'Line fault cleared after 2 hours. 3 reports confirmed.',
    area: 'Chromepet',
    time: 'Yesterday, 11:30 AM',
    unread: false,
    icon: '✅',
    iconBg: 'rgba(34,197,94,.2)',
  },
  {
    id: 'n9',
    type: 'community',
    title: 'Trending Outage Nearby',
    body: '32 reports around your saved area T. Nagar last evening.',
    area: 'T. Nagar',
    time: 'Yesterday, 8:45 PM',
    unread: false,
    icon: '📈',
    iconBg: 'rgba(245,158,11,.2)',
  },
]

// Reliability data for Velachery (30-day trend)
export const RELIABILITY_TREND = [
  { day: '1', outages: 0, hours: 0 },
  { day: '3', outages: 1, hours: 1.5 },
  { day: '5', outages: 0, hours: 0 },
  { day: '7', outages: 2, hours: 3.0 },
  { day: '9', outages: 1, hours: 2.0 },
  { day: '11', outages: 0, hours: 0 },
  { day: '13', outages: 3, hours: 5.5 },
  { day: '15', outages: 1, hours: 1.0 },
  { day: '17', outages: 0, hours: 0 },
  { day: '19', outages: 2, hours: 4.0 },
  { day: '21', outages: 1, hours: 2.5 },
  { day: '23', outages: 0, hours: 0 },
  { day: '25', outages: 4, hours: 6.0 },
  { day: '27', outages: 1, hours: 1.5 },
  { day: '29', outages: 2, hours: 3.5 },
]

export const REASON_BREAKDOWN = [
  { reason: 'Transformer', count: 8, color: '#ef4444' },
  { reason: 'Overload',    count: 5, color: '#f59e0b' },
  { reason: 'Maintenance', count: 4, color: '#8b5cf6' },
  { reason: 'Rain',        count: 3, color: '#3b82f6' },
  { reason: 'Line Fault',  count: 2, color: '#22c55e' },
]
