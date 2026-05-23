export type AreaStatus = 'outage' | 'restored' | 'unstable' | 'planned' | 'rain'

export interface AreaUpdate {
  user: string
  message: string
  time: string
  status: AreaStatus
}

export interface Area {
  id: string
  name: string
  district: string
  lat: number
  lng: number
  status: AreaStatus
  reportCount: number
  lastUpdated: string
  firstReported: string
  reason?: string
  confidence: number          // 0–100
  avgOutageMins: number       // minutes
  polygon: [number, number][] // [lat, lng] pairs
  updates: AreaUpdate[]
  // TNEB zone tagging
  tnebZoneId: string          // e.g. 'chennai'
  tnebCircleId: string        // e.g. 'mylapore'
  tnebDivisionId?: string     // e.g. 'velachery-div'
  feederNo?: string           // 11kV feeder identifier (optional)
}

export const STATUS_COLOR: Record<AreaStatus, string> = {
  outage:   '#ef4444',
  restored: '#22c55e',
  unstable: '#f59e0b',
  planned:  '#8b5cf6',
  rain:     '#3b82f6',
}

export const STATUS_LABEL: Record<AreaStatus, string> = {
  outage:   'Outage',
  restored: 'Restored',
  unstable: 'Unstable',
  planned:  'Planned',
  rain:     'Rain',
}

export const STATUS_ICON: Record<AreaStatus, string> = {
  outage:   '🔴',
  restored: '🟢',
  unstable: '🟡',
  planned:  '🟣',
  rain:     '🔵',
}

export const AREAS: Area[] = [
  {
    id: 'velachery',
    name: 'Velachery',
    district: 'Chennai',
    lat: 12.9816, lng: 80.2209,
    status: 'outage',
    reportCount: 48,
    lastUpdated: '3 min ago',
    firstReported: '2h 14m ago',
    reason: 'Transformer failure',
    confidence: 92,
    avgOutageMins: 135,
    tnebZoneId: 'chennai',
    tnebCircleId: 'mylapore',
    tnebDivisionId: 'velachery-div',
    feederNo: 'VLY-11kV-F03',
    polygon: [
      [12.9950, 80.2100], [12.9950, 80.2320],
      [12.9680, 80.2320], [12.9680, 80.2100],
    ],
    updates: [
      { user: 'Ravi K.', message: 'Still no power near 100 Feet Rd junction', time: '3 min ago', status: 'outage' },
      { user: 'Priya S.', message: 'TNEB van spotted near Velachery main rd', time: '18 min ago', status: 'outage' },
      { user: 'Kumar M.', message: 'Power went out suddenly around 8:15 AM', time: '2h 10m ago', status: 'outage' },
      { user: 'Anitha R.', message: 'Transformer smell near Vijaya Nagar', time: '2h 20m ago', status: 'outage' },
    ],
  },
  {
    id: 'tambaram',
    name: 'Tambaram',
    district: 'Chennai',
    lat: 12.9249, lng: 80.1000,
    status: 'outage',
    reportCount: 24,
    lastUpdated: '12 min ago',
    firstReported: '1h 30m ago',
    reason: 'Overload',
    confidence: 78,
    avgOutageMins: 90,
    tnebZoneId: 'chennai',
    tnebCircleId: 'tambaram',
    tnebDivisionId: 'tambaram-div',
    feederNo: 'TMB-11kV-F07',
    polygon: [
      [12.9380, 80.0850], [12.9380, 80.1150],
      [12.9110, 80.1150], [12.9110, 80.0850],
    ],
    updates: [
      { user: 'Senthil P.', message: 'No power in West Tambaram since 7 AM', time: '12 min ago', status: 'outage' },
      { user: 'Meena V.', message: 'Saw sparks from pole near bus stand', time: '45 min ago', status: 'outage' },
    ],
  },
  {
    id: 'anna-nagar',
    name: 'Anna Nagar',
    district: 'Chennai',
    lat: 13.0850, lng: 80.2101,
    status: 'outage',
    reportCount: 11,
    lastUpdated: '28 min ago',
    firstReported: '45 min ago',
    reason: 'Maintenance',
    confidence: 55,
    avgOutageMins: 45,
    tnebZoneId: 'chennai',
    tnebCircleId: 'anna-nagar',
    tnebDivisionId: 'anna-nagar-div',
    feederNo: 'ANG-11kV-F11',
    polygon: [
      [13.0980, 80.1960], [13.0980, 80.2240],
      [13.0720, 80.2240], [13.0720, 80.1960],
    ],
    updates: [
      { user: 'Deepa L.', message: 'Power off in 2nd Ave blocks', time: '28 min ago', status: 'outage' },
    ],
  },
  {
    id: 'adyar',
    name: 'Adyar',
    district: 'Chennai',
    lat: 13.0012, lng: 80.2565,
    status: 'unstable',
    reportCount: 3,
    lastUpdated: '52 min ago',
    firstReported: '1h 10m ago',
    reason: 'Voltage fluctuation',
    confidence: 30,
    avgOutageMins: 20,
    tnebZoneId: 'chennai',
    tnebCircleId: 'mylapore',
    tnebDivisionId: 'adyar-div',
    feederNo: 'ADY-11kV-F02',
    polygon: [
      [13.0140, 80.2440], [13.0140, 80.2690],
      [12.9880, 80.2690], [12.9880, 80.2440],
    ],
    updates: [
      { user: 'Nithya A.', message: 'Lights flickering for past hour', time: '52 min ago', status: 'unstable' },
    ],
  },
  {
    id: 't-nagar',
    name: 'T. Nagar',
    district: 'Chennai',
    lat: 13.0408, lng: 80.2336,
    status: 'restored',
    reportCount: 32,
    lastUpdated: '1h 5m ago',
    firstReported: '4h ago',
    reason: 'Transformer replaced',
    confidence: 95,
    avgOutageMins: 180,
    tnebZoneId: 'chennai',
    tnebCircleId: 'mylapore',
    tnebDivisionId: 'tnagar-div',
    feederNo: 'TNG-11kV-F05',
    polygon: [
      [13.0540, 80.2210], [13.0540, 80.2460],
      [13.0280, 80.2460], [13.0280, 80.2210],
    ],
    updates: [
      { user: 'Balaji T.', message: 'Power is back! Took 3 hours though', time: '1h 5m ago', status: 'restored' },
      { user: 'Saranya M.', message: 'Still no power in Pondy Bazaar side', time: '2h ago', status: 'outage' },
    ],
  },
  {
    id: 'chromepet',
    name: 'Chromepet',
    district: 'Chennai',
    lat: 12.9516, lng: 80.1462,
    status: 'restored',
    reportCount: 3,
    lastUpdated: '3h ago',
    firstReported: '5h ago',
    reason: 'Line fault cleared',
    confidence: 70,
    avgOutageMins: 120,
    tnebZoneId: 'chennai',
    tnebCircleId: 'tambaram',
    tnebDivisionId: 'chromepet-div',
    feederNo: 'CRP-11kV-F04',
    polygon: [
      [12.9640, 80.1340], [12.9640, 80.1590],
      [12.9400, 80.1590], [12.9400, 80.1340],
    ],
    updates: [
      { user: 'Ganesh R.', message: 'All good now, power restored', time: '3h ago', status: 'restored' },
    ],
  },
  {
    id: 'porur',
    name: 'Porur',
    district: 'Chennai',
    lat: 13.0345, lng: 80.1574,
    status: 'rain',
    reportCount: 7,
    lastUpdated: '8 min ago',
    firstReported: '35 min ago',
    reason: 'Heavy rain / flooding',
    confidence: 60,
    avgOutageMins: 60,
    tnebZoneId: 'chennai',
    tnebCircleId: 'anna-nagar',
    tnebDivisionId: 'porur-div',
    feederNo: 'PRR-11kV-F09',
    polygon: [
      [13.0470, 80.1440], [13.0470, 80.1710],
      [13.0220, 80.1710], [13.0220, 80.1440],
    ],
    updates: [
      { user: 'Vijay N.', message: 'Power cut due to heavy rain near ECR bypass', time: '8 min ago', status: 'rain' },
      { user: 'Lakshmi K.', message: 'Water logging on main road, no power', time: '22 min ago', status: 'rain' },
    ],
  },
]
