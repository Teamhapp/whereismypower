'use client'

import { useState, useEffect, useRef } from 'react'
import L from 'leaflet'
import { STATUS_COLOR, type Area } from '@/app/data/areas'
import { SCHEDULED_OUTAGES, getScheduledStatus, formatTimeRange, type ScheduledOutage } from '@/app/data/scheduled'

interface Props {
  areas: Area[]
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

// Crisp Vector SVGs for premium custom markers matching the screenshot
const getStatusSVG = (status: string) => {
  switch (status) {
    case 'outage':
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9v8l10-12h-9z"/></svg>`
    case 'restored':
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
    case 'unstable':
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`
    case 'planned':
      return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
    case 'rain':
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/><line x1="8" y1="16" x2="8" y2="22"/><line x1="12" y1="16" x2="12" y2="22"/><line x1="16" y1="16" x2="16" y2="22"/></svg>`
    default:
      return ''
  }
}

const getStatusLabelText = (status: string) => {
  switch (status) {
    case 'outage':
      return 'Major Outage'
    case 'restored':
      return 'Power Restored'
    case 'unstable':
      return 'Voltage Issue'
    case 'planned':
      return 'Planned Shutdown'
    case 'rain':
      return 'Rain Impact'
    default:
      return ''
  }
}

const getStatusLabelColor = (status: string) => {
  switch (status) {
    case 'restored': return '#4ade80'
    case 'outage': return '#fc8181'
    case 'unstable': return '#fbbf24'
    case 'planned': return '#a78bfa'
    case 'rain': return '#60a5fa'
    default: return '#94a3b8'
  }
}

export default function LiveMap({ areas, selectedId, selectedScheduledId, onAreaClick, onScheduledClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<L.Map | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const [mapStyle, setMapStyle] = useState<'dark' | 'satellite' | 'light'>('dark')

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [13.05, 80.22], // Centered precisely over Chennai to capture all updated screenshot zones
      zoom: 12,               // Zoom Level 12 for perfect layout framing
      zoomControl: false,
    })

    L.control.zoom({ position: 'bottomright' }).addTo(map)
    mapRef.current = map

    return () => { map.remove(); mapRef.current = null }
  }, [])

  // Swap Tile Layers Dynamically
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current)
    }

    let url = ''
    let attr = ''
    if (mapStyle === 'dark') {
      url = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      attr = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
    } else if (mapStyle === 'light') {
      url = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
      attr = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
    } else {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      attr = 'Tiles &copy; Esri &mdash; Source: Esri, USDA, USGS, and the GIS User Community'
    }

    const tileLayer = L.tileLayer(url, {
      attribution: attr,
      maxZoom: 20,
    }).addTo(map)

    tileLayerRef.current = tileLayer
  }, [mapStyle])

  // Camera Fly-To transitions on selection changes
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (selectedId) {
      const selectedArea = areas.find(a => a.id === selectedId)
      if (selectedArea) {
        map.flyTo([selectedArea.lat, selectedArea.lng], 13.5, {
          duration: 1.2,
          easeLinearity: 0.25
        })
      }
    } else if (selectedScheduledId) {
      const selectedScheduled = SCHEDULED_OUTAGES.find(s => s.id === selectedScheduledId)
      if (selectedScheduled) {
        map.flyTo([selectedScheduled.lat, selectedScheduled.lng], 13.5, {
          duration: 1.2,
          easeLinearity: 0.25
        })
      }
    }
  }, [selectedId, selectedScheduledId, areas])

  // Community area polygons + count badges
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const layers: L.Layer[] = []

    areas.forEach(area => {
      const color = STATUS_COLOR[area.status]
      const isSelected = area.id === selectedId

      // Filled polygon zone (subtle default fill to avoid dense overlapping stacks)
      const poly = L.polygon(area.polygon as L.LatLngExpression[], {
        color,
        weight: isSelected ? 3 : 1.2,
        opacity: isSelected ? 0.95 : 0.35,
        fillColor: color,
        fillOpacity: isSelected ? 0.24 : 0.03,
        interactive: true,
      }).addTo(map)

      if (isSelected) {
        poly.bringToFront()
      }

      poly.on('click', () => onAreaClick(area))

      // Bring hovered zones dynamically to front
      poly.on('mouseover', (e) => {
        const layer = e.target as L.Polygon
        layer.setStyle({
          weight: 3.5,
          opacity: 0.95,
          fillOpacity: 0.26,
        })
        layer.bringToFront()
      })

      poly.on('mouseout', (e) => {
        const layer = e.target as L.Polygon
        if (!isSelected) {
          layer.setStyle({
            weight: 1.2,
            opacity: 0.35,
            fillOpacity: 0.03,
          })
        }
      })

      layers.push(poly)

      // Advanced Floating Custom Badge Marker rendering directly in divIcon
      const icon = L.divIcon({
        html: `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; width: 120px;">
            <!-- Icon Circle -->
            <div style="
              width: 32px; height: 32px; border-radius: 50%;
              background: ${color}; border: 2.2px solid #ffffff;
              display: flex; align-items: center; justify-content: center;
              color: #ffffff;
              box-shadow: 0 4px 12px ${color}88, ${isSelected ? `0 0 0 5px ${color}33` : ''};
              cursor: pointer; position: relative; z-index: 2;
            ">
              ${getStatusSVG(area.status)}
            </div>
            
            <!-- Outage reports count sub-pill (only for active outages) -->
            ${area.status === 'outage' ? `
              <div style="
                background: ${color}; color: #ffffff; font-size: 8px; font-weight: 800;
                padding: 1px 5px; border-radius: 20px; border: 1.2px solid #ffffff;
                margin-top: -6px; z-index: 3; box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                white-space: nowrap;
              ">
                ${area.reportCount}
              </div>
            ` : ''}

            <!-- Premium glassmorphic text label bubble underneath -->
            <div style="
              background: rgba(13, 13, 20, 0.88); border: 1.2px solid rgba(255, 255, 255, 0.08);
              border-radius: 8px; padding: 4px 8px; margin-top: 5px;
              display: flex; flex-direction: column; align-items: center;
              box-shadow: 0 4px 14px rgba(0,0,0,0.6); pointer-events: none;
              white-space: nowrap; backdrop-filter: blur(8px);
            ">
              <span style="font-size: 11px; font-weight: 700; color: #ffffff; line-height: 1.2;">${area.name}</span>
              <span style="font-size: 9px; font-weight: 600; color: ${getStatusLabelColor(area.status)}; line-height: 1.2; margin-top: 1px;">
                ${getStatusLabelText(area.status)}
              </span>
            </div>
          </div>
        `,
        className: 'map-pulse-' + area.status,
        iconSize: [120, 75],
        iconAnchor: [60, 16], // Accurately pins the top-circle center to the geographic coordinate
      })

      const marker = L.marker([area.lat, area.lng], { icon })
        .addTo(map)
        .on('click', () => onAreaClick(area))
      layers.push(marker)
    })

    return () => layers.forEach(l => map.removeLayer(l))
  }, [areas, selectedId, onAreaClick])

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
        className: status === 'active' ? 'map-pulse-planned' : '',
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

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />

      {/* Floating Premium Map Style Switcher */}
      <div className="map-style-switcher">
        <button
          className={`style-btn ${mapStyle === 'dark' ? 'active' : ''}`}
          onClick={() => setMapStyle('dark')}
        >
          🕶️ Dark
        </button>
        <button
          className={`style-btn ${mapStyle === 'satellite' ? 'active' : ''}`}
          onClick={() => setMapStyle('satellite')}
        >
          🛰️ Satellite
        </button>
        <button
          className={`style-btn ${mapStyle === 'light' ? 'active' : ''}`}
          onClick={() => setMapStyle('light')}
        >
          ☀️ Light
        </button>
      </div>
    </div>
  )
}
