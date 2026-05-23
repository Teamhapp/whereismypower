export function deriveReason(text?: string): string {
  if (!text) return 'unknown'
  const t = text.toLowerCase()
  if (/மழை|rain|storm|cyclone|flood/.test(t)) return 'rain'
  if (/maintenance|பராமரிப்பு|scheduled|shutdown/.test(t)) return 'maintenance'
  if (/transformer|டிரான்ஸ்ஃபார்மர்|blast/.test(t)) return 'transformer'
  if (/overload|load shedding|தட்டுப்பாடு/.test(t)) return 'overload'
  if (/accident|car|lorry|vehicle/.test(t)) return 'accident'
  return 'unknown'
}
