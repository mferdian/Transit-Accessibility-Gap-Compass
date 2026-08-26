'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { GeoJSONFeatureCollection, RecommendationPoint } from '@/lib/types';
import 'leaflet/dist/leaflet.css';

// Dynamically import MapContainer and other components from react-leaflet
// This is necessary because Leaflet relies on the window object, which is not available during SSR.
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import('react-leaflet').then(mod => mod.GeoJSON), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then(mod => mod.CircleMarker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

interface MapViewProps {
  geoData: GeoJSONFeatureCollection | null;
  recommendationData?: RecommendationPoint[];
  onSimulationClick?: (lat: number, lon: number) => void;
  simulationMode?: boolean;
}

export default function MapView({ geoData, recommendationData, onSimulationClick, simulationMode = false }: MapViewProps) {
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    setMapLoaded(true);
  }, []);

  const getSKAColor = (score: number) => {
    // 0 = low gap (green), 1 = high gap (red)
    if (score >= 0.75) return '#ef4444'; // Sangat Kritis (Red)
    if (score >= 0.5) return '#f97316';  // Tinggi (Orange)
    if (score >= 0.25) return '#eab308'; // Sedang (Yellow)
    return '#22c55e'; // Rendah (Green)
  };

  const styleFeature = (feature: any) => {
    const score = feature.properties.ska_score || 0;
    return {
      fillColor: getSKAColor(score),
      weight: 2,
      opacity: 1,
      color: 'white',
      dashArray: '3',
      fillOpacity: 0.7
    };
  };

  const onEachFeature = (feature: any, layer: any) => {
    if (feature.properties) {
      const p = feature.properties;
      const score = p.ska_score ? p.ska_score.toFixed(2) : 'N/A';
      const popupContent = `
        <div class="p-2 min-w-[200px]">
          <h3 class="font-bold text-lg border-b pb-1 mb-2">${p.nama}</h3>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <span class="text-gray-600">Skor SKA:</span>
            <span class="font-semibold text-right">${score} (${p.kategori_ska || '-'})</span>
            <span class="text-gray-600">Kepadatan:</span>
            <span class="text-right">${p.kepadatan.toLocaleString()}</span>
            <span class="text-gray-600">Blind Spot:</span>
            <span class="text-right">${p.blind_spot_pct}%</span>
          </div>
        </div>
      `;
      layer.bindPopup(popupContent);
      
      layer.on({
        mouseover: (e: any) => {
          const l = e.target;
          l.setStyle({
            weight: 3,
            color: '#666',
            dashArray: '',
            fillOpacity: 0.9
          });
          l.bringToFront();
        },
        mouseout: (e: any) => {
          // @ts-ignore - styleFeature expects a GeoJSON feature
          layer.setStyle(styleFeature(feature));
        }
      });
    }
  };

  if (!mapLoaded) return <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center">Loading Map...</div>;

  const center = [-7.25, 112.75] as [number, number]; // Surabaya roughly

  return (
    <div className={`w-full h-full relative ${simulationMode ? 'cursor-crosshair' : ''}`}>
      <MapContainer 
        center={center} 
        zoom={12} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%', zIndex: 10 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://mapid.io/">GEO MAPID</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" // Placeholder, in prod use MAPID URL with API key
        />
        {geoData && (
          <GeoJSON 
            key={JSON.stringify(geoData.features.map(f => f.properties.ska_score))} // Force re-render on data change
            data={geoData} 
            style={styleFeature}
            onEachFeature={onEachFeature}
          />
        )}
        {recommendationData && recommendationData.map((rec, idx) => (
          <CircleMarker
            key={`rec-${idx}`}
            center={[rec.lat, rec.lon]}
            radius={8}
            pathOptions={{ color: 'white', weight: 2, fillColor: '#2563eb', fillOpacity: 0.9 }}
          >
            <Popup>
              <div className="p-1">
                <h3 className="font-bold text-base mb-1">{rec.nama || `Rekomendasi Halte ${rec.rank}`}</h3>
                <div className="text-sm">
                  <div><span className="text-slate-500">Rank:</span> #{rec.rank} ({rec.jenis_rekomendasi})</div>
                  <div><span className="text-slate-500">Est. Penduduk:</span> {rec.estimasi_penduduk_terlayani.toLocaleString()} jiwa</div>
                  <div><span className="text-slate-500">Radius Layanan:</span> {rec.radius_layanan} m</div>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      
      {/* Legend overlay */}
      <div className="absolute bottom-6 left-6 z-[20] bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-slate-200">
        <h4 className="font-bold text-sm mb-3">Tingkat Kesenjangan (SKA)</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-red-500"></div>Sangat Kritis (&ge; 0.75)</div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-orange-500"></div>Tinggi (0.50 - 0.74)</div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-yellow-500"></div>Sedang (0.25 - 0.49)</div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-green-500"></div>Rendah (&lt; 0.25)</div>
        </div>
      </div>
    </div>
  );
}
