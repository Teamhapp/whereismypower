// TANGEDCO (Tamil Nadu Generation and Distribution Corporation)
// Official O&M Zone → Circle → Division hierarchy
// Sources: TANGEDCO official zone structure

export interface TnebDivision {
  id: string
  name: string
  localities: string[]   // key localities/areas served
}

export interface TnebCircle {
  id: string
  zoneId: string
  name: string
  shortName: string
  headquarters: string
  phone: string           // TNEB consumer complaint number
  whatsapp?: string
  divisions: TnebDivision[]
  districts: string[]     // districts covered
}

export interface TnebZone {
  id: string
  name: string
  shortName: string
  headquarters: string
  color: string           // brand color for map/UI
  phone: string           // zone control room
  circles: TnebCircle[]
  districts: string[]     // all districts in zone
}

// ── Chennai O&M Zone ────────────────────────────────────────────────────────

const CHENNAI_ZONE: TnebZone = {
  id:           'chennai',
  name:         'Chennai O&M Zone',
  shortName:    'Chennai',
  headquarters: 'Guindy, Chennai',
  color:        '#f59e0b',
  phone:        '044-28521030',
  districts:    ['Chennai'],
  circles: [
    {
      id:           'mylapore',
      zoneId:       'chennai',
      name:         'Mylapore O&M Circle',
      shortName:    'Mylapore',
      headquarters: 'Mylapore, Chennai – 600 004',
      phone:        '1912',
      whatsapp:     '+91 94443 21912',
      districts:    ['Chennai'],
      divisions: [
        { id: 'velachery-div',  name: 'Velachery Division',  localities: ['Velachery', 'Vijaya Nagar', 'Medavakkam', 'Keelkattalai'] },
        { id: 'adyar-div',     name: 'Adyar Division',      localities: ['Adyar', 'Thiruvanmiyur', 'Besant Nagar', 'Sholinganallur'] },
        { id: 'mylapore-div',  name: 'Mylapore Division',   localities: ['Mylapore', 'Mandaveli', 'Raja Annamalai Puram', 'R. A. Puram'] },
        { id: 'tnagar-div',    name: 'T. Nagar Division',   localities: ['T. Nagar', 'Pondy Bazaar', 'Nandanam', 'Saidapet'] },
      ],
    },
    {
      id:           'tambaram',
      zoneId:       'chennai',
      name:         'Tambaram O&M Circle',
      shortName:    'Tambaram',
      headquarters: 'Tambaram, Chennai – 600 045',
      phone:        '1912',
      whatsapp:     '+91 94443 21912',
      districts:    ['Chennai'],
      divisions: [
        { id: 'tambaram-div',  name: 'Tambaram Division',   localities: ['Tambaram', 'West Tambaram', 'Perungalathur', 'Vandalur'] },
        { id: 'chromepet-div', name: 'Chromepet Division',  localities: ['Chromepet', 'Pallavaram', 'Pammal', 'Selaiyur'] },
        { id: 'guduvanchery-div', name: 'Guduvanchery Div', localities: ['Guduvanchery', 'Urapakkam', 'Maraimalai Nagar'] },
      ],
    },
    {
      id:           'anna-nagar',
      zoneId:       'chennai',
      name:         'Anna Nagar O&M Circle',
      shortName:    'Anna Nagar',
      headquarters: 'Anna Nagar, Chennai – 600 040',
      phone:        '1912',
      districts:    ['Chennai'],
      divisions: [
        { id: 'anna-nagar-div', name: 'Anna Nagar Division', localities: ['Anna Nagar', '2nd Avenue', 'Thirumangalam', 'Arumbakkam'] },
        { id: 'porur-div',      name: 'Porur Division',       localities: ['Porur', 'Maduravoyal', 'Kattupakkam', 'Ramapuram'] },
        { id: 'ambattur-div',   name: 'Ambattur Division',    localities: ['Ambattur', 'Padi', 'Kolathur', 'Villivakkam'] },
      ],
    },
    {
      id:           'tondiarpet',
      zoneId:       'chennai',
      name:         'Tondiarpet O&M Circle',
      shortName:    'Tondiarpet',
      headquarters: 'Tondiarpet, Chennai – 600 081',
      phone:        '1912',
      districts:    ['Chennai'],
      divisions: [
        { id: 'tondiarpet-div',  name: 'Tondiarpet Division',  localities: ['Tondiarpet', 'Royapuram', 'Kasimedu', 'Tiruvottiyur'] },
        { id: 'perambur-div',    name: 'Perambur Division',    localities: ['Perambur', 'Otteri', 'Purasaiwakkam', 'Kolathur'] },
      ],
    },
    {
      id:           'alandur',
      zoneId:       'chennai',
      name:         'Alandur O&M Circle',
      shortName:    'Alandur',
      headquarters: 'Alandur, Chennai – 600 016',
      phone:        '1912',
      districts:    ['Chennai'],
      divisions: [
        { id: 'alandur-div',    name: 'Alandur Division',     localities: ['Alandur', 'Guindy', 'Ashok Nagar', 'K.K. Nagar'] },
        { id: 'meenambakkam-div', name: 'Meenambakkam Div',   localities: ['Meenambakkam', 'Pallikaranai', 'Perungudi', 'OMR'] },
      ],
    },
  ],
}

// ── Northern O&M Zone ────────────────────────────────────────────────────────

const NORTHERN_ZONE: TnebZone = {
  id:           'northern',
  name:         'Northern O&M Zone',
  shortName:    'Northern',
  headquarters: 'Vellore',
  color:        '#8b5cf6',
  phone:        '0416-2225512',
  districts:    ['Vellore', 'Ranipet', 'Tirupattur', 'Tiruvannamalai', 'Krishnagiri', 'Dharmapuri'],
  circles: [
    {
      id: 'vellore', zoneId: 'northern', name: 'Vellore O&M Circle', shortName: 'Vellore',
      headquarters: 'Vellore – 632 001', phone: '0416-2223130',
      districts: ['Vellore', 'Ranipet', 'Tirupattur'],
      divisions: [
        { id: 'vellore-div',  name: 'Vellore Division',  localities: ['Vellore', 'Katpadi', 'Sathuvachari'] },
        { id: 'ranipet-div',  name: 'Ranipet Division',  localities: ['Ranipet', 'Arcot', 'Wallajah'] },
        { id: 'tirupattur-div', name: 'Tirupattur Div',  localities: ['Tirupattur', 'Ambur', 'Vaniyambadi'] },
      ],
    },
    {
      id: 'tiruvannamalai', zoneId: 'northern', name: 'Tiruvannamalai O&M Circle', shortName: 'Tiruvannamalai',
      headquarters: 'Tiruvannamalai – 606 601', phone: '04175-233770',
      districts: ['Tiruvannamalai'],
      divisions: [
        { id: 'tiruvannamalai-div', name: 'Tiruvannamalai Div', localities: ['Tiruvannamalai', 'Polur', 'Arani'] },
        { id: 'cheyyar-div',        name: 'Cheyyar Division',   localities: ['Cheyyar', 'Kilpennathur'] },
      ],
    },
    {
      id: 'krishnagiri', zoneId: 'northern', name: 'Krishnagiri O&M Circle', shortName: 'Krishnagiri',
      headquarters: 'Krishnagiri – 635 001', phone: '04343-236222',
      districts: ['Krishnagiri', 'Dharmapuri'],
      divisions: [
        { id: 'krishnagiri-div', name: 'Krishnagiri Division', localities: ['Krishnagiri', 'Hosur', 'Denkanikottai'] },
        { id: 'dharmapuri-div',  name: 'Dharmapuri Division',  localities: ['Dharmapuri', 'Palacode', 'Pennagaram'] },
      ],
    },
  ],
}

// ── Central O&M Zone ─────────────────────────────────────────────────────────

const CENTRAL_ZONE: TnebZone = {
  id:           'central',
  name:         'Central O&M Zone',
  shortName:    'Central',
  headquarters: 'Tiruchirappalli',
  color:        '#3b82f6',
  phone:        '0431-2414270',
  districts:    ['Tiruchirappalli', 'Perambalur', 'Ariyalur', 'Karur', 'Namakkal', 'Salem', 'Erode', 'Thanjavur', 'Nagapattinam', 'Tiruvarur', 'Cuddalore', 'Villupuram'],
  circles: [
    {
      id: 'trichy', zoneId: 'central', name: 'Tiruchirappalli O&M Circle', shortName: 'Trichy',
      headquarters: 'Tiruchirappalli – 620 001', phone: '0431-2413232',
      districts: ['Tiruchirappalli', 'Perambalur', 'Ariyalur'],
      divisions: [
        { id: 'trichy-div', name: 'Trichy Division', localities: ['Tiruchirappalli', 'Srirangam', 'Golden Rock'] },
        { id: 'perambalur-div', name: 'Perambalur Div', localities: ['Perambalur', 'Ariyalur', 'Jayankondam'] },
      ],
    },
    {
      id: 'salem', zoneId: 'central', name: 'Salem O&M Circle', shortName: 'Salem',
      headquarters: 'Salem – 636 001', phone: '0427-2336700',
      districts: ['Salem', 'Namakkal'],
      divisions: [
        { id: 'salem-div',    name: 'Salem Division',    localities: ['Salem', 'Suramangalam', 'Fairlands'] },
        { id: 'namakkal-div', name: 'Namakkal Division', localities: ['Namakkal', 'Rasipuram', 'Tiruchengode'] },
      ],
    },
    {
      id: 'thanjavur', zoneId: 'central', name: 'Thanjavur O&M Circle', shortName: 'Thanjavur',
      headquarters: 'Thanjavur – 613 001', phone: '04362-231700',
      districts: ['Thanjavur', 'Tiruvarur', 'Nagapattinam'],
      divisions: [
        { id: 'thanjavur-div',    name: 'Thanjavur Division',    localities: ['Thanjavur', 'Kumbakonam', 'Papanasam'] },
        { id: 'nagapattinam-div', name: 'Nagapattinam Division', localities: ['Nagapattinam', 'Vedaranyam', 'Mayiladuthurai'] },
      ],
    },
    {
      id: 'cuddalore', zoneId: 'central', name: 'Cuddalore O&M Circle', shortName: 'Cuddalore',
      headquarters: 'Cuddalore – 607 001', phone: '04142-222411',
      districts: ['Cuddalore', 'Villupuram'],
      divisions: [
        { id: 'cuddalore-div',  name: 'Cuddalore Division',  localities: ['Cuddalore', 'Chidambaram', 'Neyveli'] },
        { id: 'villupuram-div', name: 'Villupuram Division', localities: ['Villupuram', 'Tindivanam', 'Gingee'] },
      ],
    },
  ],
}

// ── Western O&M Zone ─────────────────────────────────────────────────────────

const WESTERN_ZONE: TnebZone = {
  id:           'western',
  name:         'Western O&M Zone',
  shortName:    'Western',
  headquarters: 'Coimbatore',
  color:        '#10b981',
  phone:        '0422-2220680',
  districts:    ['Coimbatore', 'Tiruppur', 'Erode', 'Nilgiris', 'Karur'],
  circles: [
    {
      id: 'coimbatore', zoneId: 'western', name: 'Coimbatore O&M Circle', shortName: 'Coimbatore',
      headquarters: 'Coimbatore – 641 001', phone: '0422-2393333',
      districts: ['Coimbatore', 'Nilgiris'],
      divisions: [
        { id: 'coimbatore-div', name: 'Coimbatore Division', localities: ['Coimbatore', 'RS Puram', 'Gandhipuram', 'Peelamedu'] },
        { id: 'ooty-div',       name: 'Nilgiris Division',   localities: ['Ooty', 'Coonoor', 'Gudalur'] },
      ],
    },
    {
      id: 'tiruppur', zoneId: 'western', name: 'Tiruppur O&M Circle', shortName: 'Tiruppur',
      headquarters: 'Tiruppur – 641 601', phone: '0421-2240222',
      districts: ['Tiruppur', 'Erode'],
      divisions: [
        { id: 'tiruppur-div', name: 'Tiruppur Division', localities: ['Tiruppur', 'Palladam', 'Dharapuram'] },
        { id: 'erode-div',    name: 'Erode Division',    localities: ['Erode', 'Gobichettipalayam', 'Bhavani'] },
      ],
    },
  ],
}

// ── Southern O&M Zone ────────────────────────────────────────────────────────

const SOUTHERN_ZONE: TnebZone = {
  id:           'southern',
  name:         'Southern O&M Zone',
  shortName:    'Southern',
  headquarters: 'Tirunelveli',
  color:        '#ef4444',
  phone:        '0462-2576400',
  districts:    ['Tirunelveli', 'Thoothukudi', 'Kanyakumari', 'Tenkasi'],
  circles: [
    {
      id: 'tirunelveli', zoneId: 'southern', name: 'Tirunelveli O&M Circle', shortName: 'Tirunelveli',
      headquarters: 'Tirunelveli – 627 001', phone: '0462-2501500',
      districts: ['Tirunelveli', 'Tenkasi'],
      divisions: [
        { id: 'tirunelveli-div', name: 'Tirunelveli Division', localities: ['Tirunelveli', 'Palayamkottai', 'Tenkasi'] },
        { id: 'nanguneri-div',   name: 'Nanguneri Division',   localities: ['Nanguneri', 'Radhapuram', 'Cheranmahadevi'] },
      ],
    },
    {
      id: 'thoothukudi', zoneId: 'southern', name: 'Thoothukudi O&M Circle', shortName: 'Thoothukudi',
      headquarters: 'Thoothukudi – 628 001', phone: '0461-2310444',
      districts: ['Thoothukudi', 'Kanyakumari'],
      divisions: [
        { id: 'thoothukudi-div',  name: 'Thoothukudi Division',  localities: ['Thoothukudi', 'Tiruchendur', 'Kovilpatti'] },
        { id: 'kanyakumari-div',  name: 'Kanyakumari Division',  localities: ['Nagercoil', 'Marthandam', 'Padmanabhapuram'] },
      ],
    },
  ],
}

// ── South-Western O&M Zone ───────────────────────────────────────────────────

const SOUTH_WESTERN_ZONE: TnebZone = {
  id:           'south-western',
  name:         'South-Western O&M Zone',
  shortName:    'Madurai',
  headquarters: 'Madurai',
  color:        '#ec4899',
  phone:        '0452-2530922',
  districts:    ['Madurai', 'Dindigul', 'Theni', 'Ramanathapuram', 'Virudhunagar', 'Sivaganga'],
  circles: [
    {
      id: 'madurai', zoneId: 'south-western', name: 'Madurai O&M Circle', shortName: 'Madurai',
      headquarters: 'Madurai – 625 001', phone: '0452-2523522',
      districts: ['Madurai', 'Theni'],
      divisions: [
        { id: 'madurai-div', name: 'Madurai Division', localities: ['Madurai', 'Anna Nagar (Madurai)', 'Palanganatham'] },
        { id: 'theni-div',   name: 'Theni Division',   localities: ['Theni', 'Bodinayakanur', 'Uthamapalayam'] },
      ],
    },
    {
      id: 'virudhunagar', zoneId: 'south-western', name: 'Virudhunagar O&M Circle', shortName: 'Virudhunagar',
      headquarters: 'Virudhunagar – 626 001', phone: '04562-243244',
      districts: ['Virudhunagar', 'Ramanathapuram', 'Sivaganga'],
      divisions: [
        { id: 'virudhunagar-div',     name: 'Virudhunagar Division',     localities: ['Virudhunagar', 'Sivakasi', 'Sattur'] },
        { id: 'ramanathapuram-div',   name: 'Ramanathapuram Division',   localities: ['Ramanathapuram', 'Paramakudi', 'Rameswaram'] },
      ],
    },
    {
      id: 'dindigul', zoneId: 'south-western', name: 'Dindigul O&M Circle', shortName: 'Dindigul',
      headquarters: 'Dindigul – 624 001', phone: '0451-2421422',
      districts: ['Dindigul'],
      divisions: [
        { id: 'dindigul-div', name: 'Dindigul Division', localities: ['Dindigul', 'Palani', 'Kodaikanal', 'Vedasandur'] },
      ],
    },
  ],
}

// ── Puducherry (UT — served by TANGEDCO under agreement) ─────────────────────

const PUDUCHERRY_ZONE: TnebZone = {
  id:           'puducherry',
  name:         'Puducherry O&M Zone',
  shortName:    'Puducherry',
  headquarters: 'Puducherry',
  color:        '#06b6d4',
  phone:        '0413-2336560',
  districts:    ['Puducherry', 'Karaikal'],
  circles: [
    {
      id: 'puducherry-circle', zoneId: 'puducherry', name: 'Puducherry Circle', shortName: 'Puducherry',
      headquarters: 'Puducherry – 605 001', phone: '0413-2336560',
      districts: ['Puducherry', 'Karaikal'],
      divisions: [
        { id: 'puducherry-div', name: 'Puducherry Division', localities: ['Puducherry', 'Ozhukarai', 'Villianur'] },
        { id: 'karaikal-div',   name: 'Karaikal Division',   localities: ['Karaikal'] },
      ],
    },
  ],
}

// ── Master export ─────────────────────────────────────────────────────────────

export const TNEB_ZONES: TnebZone[] = [
  CHENNAI_ZONE,
  NORTHERN_ZONE,
  CENTRAL_ZONE,
  WESTERN_ZONE,
  SOUTHERN_ZONE,
  SOUTH_WESTERN_ZONE,
  PUDUCHERRY_ZONE,
]

// ── Lookup helpers ────────────────────────────────────────────────────────────

/** Find a circle by its id */
export function getCircleById(circleId: string): TnebCircle | undefined {
  for (const zone of TNEB_ZONES) {
    const circle = zone.circles.find(c => c.id === circleId)
    if (circle) return circle
  }
  return undefined
}

/** Find the zone that owns a circle */
export function getZoneByCircleId(circleId: string): TnebZone | undefined {
  return TNEB_ZONES.find(z => z.circles.some(c => c.id === circleId))
}

/** Find the division that serves a locality */
export function getDivisionByLocality(locality: string): { zone: TnebZone; circle: TnebCircle; division: TnebDivision } | undefined {
  const q = locality.toLowerCase()
  for (const zone of TNEB_ZONES) {
    for (const circle of zone.circles) {
      for (const division of circle.divisions) {
        if (division.localities.some(l => l.toLowerCase().includes(q) || q.includes(l.toLowerCase()))) {
          return { zone, circle, division }
        }
      }
    }
  }
  return undefined
}

/** Get all circles within a zone */
export function getCirclesByZone(zoneId: string): TnebCircle[] {
  return TNEB_ZONES.find(z => z.id === zoneId)?.circles ?? []
}

/** Emergency / consumer complaint number (universal TANGEDCO helpline) */
export const TANGEDCO_HELPLINE = '1912'
export const TANGEDCO_WHATSAPP = '+91 94443 21912'
export const TANGEDCO_WEBSITE  = 'https://www.tangedco.gov.in'
