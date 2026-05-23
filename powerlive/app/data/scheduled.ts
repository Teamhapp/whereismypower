export interface ScheduledOutage {
  id: string
  areaName: string
  district: string
  lat: number
  lng: number
  scheduledDate: string   // YYYY-MM-DD
  startTime: string       // HH:MM
  endTime: string         // HH:MM
  durationHours: number
  affectedStreets?: string
  substation?: string
  source: 'official'
  sourceUrl: string
}

// Status relative to now
export type ScheduledStatus = 'active' | 'upcoming' | 'completed'

export function getScheduledStatus(item: ScheduledOutage): ScheduledStatus {
  const now = new Date()
  const dateStr = item.scheduledDate
  const todayStr = now.toISOString().slice(0, 10)

  if (dateStr < todayStr) return 'completed'
  if (dateStr > todayStr) return 'upcoming'

  // Today — check time
  const [sh, sm] = item.startTime.split(':').map(Number)
  const [eh, em] = item.endTime.split(':').map(Number)
  const nowMins = now.getHours() * 60 + now.getMinutes()
  const startMins = sh * 60 + sm
  const endMins = eh * 60 + em

  if (nowMins < startMins) return 'upcoming'
  if (nowMins > endMins)   return 'completed'
  return 'active'
}

export function formatTimeRange(item: ScheduledOutage): string {
  const fmt = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    const period = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${String(m).padStart(2, '0')} ${period}`
  }
  return `${fmt(item.startTime)} – ${fmt(item.endTime)}`
}

// Mock data matching today's date — replace with Supabase fetch in production
const today = new Date().toISOString().slice(0, 10)
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

export const SCHEDULED_OUTAGES: ScheduledOutage[] = [
  {
    id: 'sch-1',
    areaName: 'Mylapore',
    district: 'Chennai',
    lat: 13.0333, lng: 80.2667,
    scheduledDate: today,
    startTime: '10:00', endTime: '14:00', durationHours: 4,
    affectedStreets: 'Luz Church Rd, R.K. Mutt Rd, Kutchery Rd',
    substation: 'Mylapore SS',
    source: 'official',
    sourceUrl: 'https://www.livechennai.com/powercut.asp',
  },
  {
    id: 'sch-2',
    areaName: 'Nungambakkam',
    district: 'Chennai',
    lat: 13.0569, lng: 80.2425,
    scheduledDate: today,
    startTime: '09:00', endTime: '17:00', durationHours: 8,
    affectedStreets: 'Haddows Rd, Sterling Rd, College Rd',
    substation: 'Nungambakkam SS',
    source: 'official',
    sourceUrl: 'https://www.livechennai.com/powercut.asp',
  },
  {
    id: 'sch-3',
    areaName: 'Perambur',
    district: 'Chennai',
    lat: 13.1143, lng: 80.2323,
    scheduledDate: today,
    startTime: '06:00', endTime: '10:00', durationHours: 4,
    affectedStreets: 'Perambur Barracks Rd, NSK Salai',
    substation: 'Perambur SS',
    source: 'official',
    sourceUrl: 'https://www.tnpdcl.in/scheduledinterrupt.html',
  },
  {
    id: 'sch-4',
    areaName: 'Sholinganallur',
    district: 'Chennai',
    lat: 12.9010, lng: 80.2279,
    scheduledDate: today,
    startTime: '14:00', endTime: '18:00', durationHours: 4,
    affectedStreets: 'OMR, Karapakkam, Perungudi',
    substation: 'Sholinganallur SS',
    source: 'official',
    sourceUrl: 'https://www.livechennai.com/powercut.asp',
  },
  {
    id: 'sch-5',
    areaName: 'Villivakkam',
    district: 'Chennai',
    lat: 13.0950, lng: 80.2093,
    scheduledDate: tomorrow,
    startTime: '08:00', endTime: '16:00', durationHours: 8,
    affectedStreets: 'Jawaharlal Nehru Rd, 2nd Ave, 4th Cross St',
    substation: 'Villivakkam SS',
    source: 'official',
    sourceUrl: 'https://www.tnpdcl.in/scheduledinterrupt.html',
  },
  {
    id: 'sch-6',
    areaName: 'Kodambakkam',
    district: 'Chennai',
    lat: 13.0534, lng: 80.2214,
    scheduledDate: tomorrow,
    startTime: '10:00', endTime: '14:00', durationHours: 4,
    affectedStreets: 'GN Chetty Rd, Arcot Rd, Arcot St',
    substation: 'Kodambakkam SS',
    source: 'official',
    sourceUrl: 'https://www.livechennai.com/powercut.asp',
  },
]
