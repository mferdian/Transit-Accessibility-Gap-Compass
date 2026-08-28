'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { GeoJSONFeatureCollection, RecommendationPoint, SelectedFeatureDetail } from '@/lib/types';
import 'leaflet/dist/leaflet.css';

// Dynamically import MapContainer and other components from react-leaflet
// This is necessary because Leaflet relies on the window object, which is not available during SSR.
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import('react-leaflet').then(mod => mod.GeoJSON), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then(mod => mod.CircleMarker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const MapClickHandler = dynamic(() => import('@/components/MapClickHandler'), { ssr: false });

interface MapViewProps {
  geoData: GeoJSONFeatureCollection | null;
  gapAreaData?: GeoJSONFeatureCollection | null;
  recommendationPointData?: GeoJSONFeatureCollection | null;
  recommendationAreaData?: GeoJSONFeatureCollection | null;
  demographicData?: GeoJSONFeatureCollection | null;
  halteExistingData?: GeoJSONFeatureCollection | null;
  recommendationData?: RecommendationPoint[];
  onFeatureSelect?: (feature: SelectedFeatureDetail) => void;
  onSimulationClick?: (lat: number, lon: number) => void;
  simulationPoint?: { lat: number; lon: number } | null;
  simulationMode?: boolean;
}

type MarkerFeature = {
  key: string;
  lat: number;
  lon: number;
  properties: Record<string, any>;
  layerName: string;
  geometryType: string;
};

export default function MapView({
  geoData,
  gapAreaData,
  recommendationPointData,
  recommendationAreaData,
  demographicData,
  halteExistingData,
  recommendationData,
  onFeatureSelect,
  onSimulationClick,
  simulationPoint,
  simulationMode = false
}: MapViewProps) {
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

  const styleMapidPolygon = (color: string, fillOpacity: number) => {
    return (feature: any) => ({
      fillColor: feature?.properties?.gap_score ? getSKAColor(feature.properties.gap_score) : color,
      weight: 1,
      opacity: 0.9,
      color,
      fillOpacity
    });
  };

  const bindSelectableFeature = (color: string, fillOpacity: number) => {
    return (feature: any, layer: any) => {
      const properties = feature.properties || {};
      layer.on({
        click: () => {
          onFeatureSelect?.({
            layerKey: properties._layer_key || 'unknown',
            layerName: properties._layer_name || 'Layer MAPID',
            geometryType: feature.geometry?.type || 'Unknown',
            properties,
          });
        },
        mouseover: (e: any) => {
          e.target.setStyle?.({ weight: 3, fillOpacity: Math.min(fillOpacity + 0.22, 0.55) });
        },
        mouseout: (e: any) => {
          e.target.setStyle?.(styleMapidPolygon(color, fillOpacity)(feature));
        }
      });
    };
  };

  const extractPointMarkers = (collection?: GeoJSONFeatureCollection | null): MarkerFeature[] => {
    if (!collection?.features) return [];

    const markers: MarkerFeature[] = [];

    collection.features.forEach((feature, featureIndex) => {
      const geometry = feature.geometry || {};
      const properties = feature.properties || {};
      const layerName = properties._layer_name || collection.layer_name || 'Titik Rekomendasi';
      const geometryType = geometry.type || 'Unknown';

      const pushPoint = (coords: any, pointIndex: number) => {
        if (!Array.isArray(coords) || coords.length < 2) return;
        const [lon, lat] = coords;
        if (typeof lat !== 'number' || typeof lon !== 'number') return;

        markers.push({
          key: `${properties.id || properties.fid || featureIndex}-${pointIndex}`,
          lat,
          lon,
          properties,
          layerName,
          geometryType,
        });
      };

      if (geometryType === 'Point') {
        pushPoint(geometry.coordinates, 0);
      } else if (geometryType === 'MultiPoint') {
        geometry.coordinates?.forEach(pushPoint);
      } else if (Array.isArray(geometry.coordinates?.[0]) && typeof geometry.coordinates[0][0] === 'number') {
        geometry.coordinates.forEach(pushPoint);
      }
    });

    return markers;
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
        <MapClickHandler enabled={simulationMode} onClick={onSimulationClick} />
        {geoData && (
          <GeoJSON 
            key={JSON.stringify(geoData.features.map(f => f.properties.ska_score))} // Force re-render on data change
            data={geoData} 
            style={styleFeature}
            onEachFeature={onEachFeature}
          />
        )}
        {demographicData && (
          <GeoJSON
            key={`demografi-${demographicData.features.length}`}
            data={demographicData}
            style={styleMapidPolygon('#059669', 0.12)}
            onEachFeature={bindSelectableFeature('#059669', 0.12)}
          />
        )}
        {recommendationAreaData && (
          <GeoJSON
            key={`area-rekomendasi-${recommendationAreaData.features.length}`}
            data={recommendationAreaData}
            style={styleMapidPolygon('#7c3aed', 0.18)}
            onEachFeature={bindSelectableFeature('#7c3aed', 0.18)}
          />
        )}
        {gapAreaData && (
          <GeoJSON
            key={`area-gap-${gapAreaData.features.length}`}
            data={gapAreaData}
            style={styleMapidPolygon('#ef4444', 0.28)}
            onEachFeature={bindSelectableFeature('#ef4444', 0.28)}
          />
        )}
        {extractPointMarkers(recommendationPointData).map((point) => (
          <CircleMarker
            key={point.key}
            center={[point.lat, point.lon]}
            radius={6}
            pathOptions={{ color: 'white', weight: 2, fillColor: '#2563eb', fillOpacity: 0.95 }}
            eventHandlers={{
              click: () => onFeatureSelect?.({
                layerKey: point.properties._layer_key || 'titik_rekomendasi',
                layerName: point.layerName,
                geometryType: point.geometryType,
                properties: point.properties,
                coordinates: [point.lon, point.lat],
              })
            }}
          >
            <Popup>
              <div className="p-1">
                <h3 className="font-bold text-base mb-1">{point.properties.display_name || 'Titik Rekomendasi'}</h3>
                <div className="text-sm">
                  {point.properties.rank !== undefined && <div><span className="text-slate-500">Rank:</span> #{point.properties.rank}</div>}
                  {point.properties.priority_score !== undefined && <div><span className="text-slate-500">Skor Prioritas:</span> {Number(point.properties.priority_score).toFixed(3)}</div>}
                  {point.properties.CLUSTER_ID !== undefined && <div><span className="text-slate-500">Cluster:</span> {point.properties.CLUSTER_ID}</div>}
                  {point.properties.CLUSTER_SIZE !== undefined && <div><span className="text-slate-500">Ukuran:</span> {point.properties.CLUSTER_SIZE}</div>}
                  {point.properties.nearest_gap_distance_m !== undefined && <div><span className="text-slate-500">Jarak ke GAP:</span> {point.properties.nearest_gap_distance_m} m</div>}
                  <div><span className="text-slate-500">Koordinat:</span> {point.lon.toFixed(5)}, {point.lat.toFixed(5)}</div>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
        {extractPointMarkers(halteExistingData).map((point) => (
          <CircleMarker
            key={`halte-${point.key}`}
            center={[point.lat, point.lon]}
            radius={5}
            pathOptions={{ color: '#0f172a', weight: 1, fillColor: '#0891b2', fillOpacity: 0.85 }}
            eventHandlers={{
              click: () => onFeatureSelect?.({
                layerKey: point.properties._layer_key || 'halte_existing',
                layerName: point.layerName,
                geometryType: point.geometryType,
                properties: point.properties,
                coordinates: [point.lon, point.lat],
              })
            }}
          >
            <Popup>
              <div className="p-1">
                <h3 className="font-bold text-base mb-1">{point.properties.nama_halte || point.properties.display_name || 'Halte Existing'}</h3>
                <div className="text-sm">
                  {point.properties.STATUS !== undefined && <div><span className="text-slate-500">Status:</span> {point.properties.STATUS}</div>}
                  {point.properties.DESA !== undefined && <div><span className="text-slate-500">Kelurahan:</span> {point.properties.DESA}</div>}
                  {point.properties.KECAMATAN !== undefined && <div><span className="text-slate-500">Kecamatan:</span> {point.properties.KECAMATAN}</div>}
                  <div><span className="text-slate-500">Koordinat:</span> {point.lon.toFixed(5)}, {point.lat.toFixed(5)}</div>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
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
        {simulationPoint && (
          <CircleMarker
            center={[simulationPoint.lat, simulationPoint.lon]}
            radius={10}
            pathOptions={{ color: '#0f172a', weight: 3, fillColor: '#38bdf8', fillOpacity: 0.85 }}
          >
            <Popup>
              <div className="p-1 text-sm">
                <div className="font-bold">Titik Simulasi</div>
                <div>{simulationPoint.lon.toFixed(5)}, {simulationPoint.lat.toFixed(5)}</div>
              </div>
            </Popup>
          </CircleMarker>
        )}
      </MapContainer>
      
      {/* Legend overlay */}
      <div className="absolute bottom-6 right-6 z-[20] bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-slate-200">
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
