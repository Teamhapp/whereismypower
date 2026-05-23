'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { AREAS, STATUS_COLOR, type Area } from '@/app/data/areas'
import { SCHEDULED_OUTAGES, getScheduledStatus, formatTimeRange, type ScheduledOutage } from '@/app/data/scheduled'

interface Props {
  selectedId: string | null
  selectedScheduledId: string | null
  onAreaClick: (area: Area) => void
  onScheduledClick: (item: ScheduledOutage) => void
}

const SCHEDULED_COLOR: Record<string, string> = {
  active:    '#3b82f6',
  upcoming:  '#8b5cf6',
  completed: '#94a3b8',
}

export default function LiveMap({ selectedId, selectedScheduledId, onAreaClick, onScheduledClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<L.Map | null>(null)

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [13.0, 80.18],
      zoom: 11,
      zoomControl: false,
    })

    // Dark CartoDB tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map)

    L.control.zoom({ position: 'bottomright' }).addTo(map)
    mapRef.current = map

    return () => { map.remove(); mapRef.current = null }
  }, [])

  // Community area polygons + count badges
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const layers: L.Layer[] = []

    AREAS.forEach(area => {
      const color = STATUS_COLOR[area.status]
      const isSelected = area.id === selectedId

      // Filled polygon zone
      const poly = L.polygon(area.polygon as L.LatLngExpression[], {
        color,
        weight: isSelected ? 2.5 : 1.5,
        opacity: isSelected ? 0.95 : 0.7,
        fillColor: color,
        fillOpacity: isSelected ? 0.28 : 0.15,
        interactive: true,
      }).addTo(map).on('click', () => onAreaClick(area))
      layers.push(poly)

      // Count badge in centre of area
      const r = Math.max(26, Math.min(48, 18 + area.reportCount / 2))
      const size = r * 2
      const icon = L.divIcon({
        html: `<div style="
          width:${size}px;height:${size}px;border-radius:50%;
          background:${color}22;border:2px solid ${color};
          display:flex;align-items:center;justify-content:center;
          font-size:${Math.max(11, Math.round(r * 0.5))}px;font-weight:700;color:${color};
          box-shadow:${isSelected ? `0 0 0 5px ${color}33,` : ''}0 2px 14px ${color}55;
          cursor:pointer;backdrop-filter:blur(6px);
        ">${area.reportCount}</div>`,
        className: '',
        iconSize: [size, size],
        iconAnchor: [r, r],
      })

      const marker = L.marker([area.lat, area.lng], { icon })
        .addTo(map)
        .bindTooltip(`<b>${area.name}</b> · ${area.reportCount} reports`, { direction: 'top', offset: [0, -(r + 4)] })
        .on('click', () => onAreaClick(area))
      layers.push(marker)
    })

    return () => layers.forEach(l => map.removeLayer(l))
  }, [selectedId, onAreaClick])

  // Scheduled outage markers — diamond badge
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const layers: L.Layer[] = []

    SCHEDULED_OUTAGES.forEach(item => {
      const status = getScheduledStatus(item)
      if (status === 'completed') return

      const color = SCHEDULED_COLOR[status]
      const isSelected = item.id === selectedScheduledId
      const timeLabel = formatTimeRange(item)

      if (status === 'active') {
        const pulse = L.circle([item.lat, item.lng], {
          radius: 1800,
          color,
          weight: 2,
          fillColor: color,
          fillOpacity: 0.08,
          dashArray: '6 4',
          interactive: false,
        }).addTo(map)
        layers.push(pulse)
      }

      const icon = L.divIcon({
        html: `<div style="
          position:relative;width:44px;height:44px;
          display:flex;align-items:center;justify-content:center;
          background:${color};border-radius:8px 8px 8px 0;transform:rotate(-45deg);
          box-shadow:${isSelected ? `0 0 0 4px ${color}44,` : ''}0 2px 10px ${color}77;
          cursor:pointer;border:2px solid rgba(255,255,255,.25);
        ">
          <div style="transform:rotate(45deg);font-size:16px;line-height:1;">📅</div>
        </div>
        <div style="
          position:absolute;bottom:-22px;left:50%;transform:translateX(-50%);
          background:${color};color:#fff;font-size:10px;font-weight:700;
          padding:2px 7px;border-radius:6px;white-space:nowrap;
          box-shadow:0 1px 6px rgba(0,0,0,.5);
        ">${item.areaName}</div>`,
        className: '',
        iconSize: [44, 44],
        iconAnchor: [10, 44],
      })

      const marker = L.marker([item.lat, item.lng], { icon, zIndexOffset: 500 })
        .addTo(map)
        .bindTooltip(`<b>${item.areaName}</b><br>${timeLabel}<br>${item.durationHours}h scheduled cut`, {
          direction: 'top', offset: [0, -50],
        })
        .on('click', () => onScheduledClick(item))
      layers.push(marker)
    })

    return () => layers.forEach(l => map.removeLayer(l))
  }, [selectedScheduledId, onScheduledClick])

  return <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
}
