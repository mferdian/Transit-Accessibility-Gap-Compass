'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { GeoJSONFeatureCollection, RecommendationPoint, SelectedFeatureDetail, SimulationResult } from '@/lib/types';
import 'leaflet/dist/leaflet.css';

// Dynamically import MapContainer and other components from react-leaflet
// This is necessary because Leaflet relies on the window object, which is not available during SSR.
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import('react-leaflet').then(mod => mod.GeoJSON), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then(mod => mod.CircleMarker), { ssr: false });
const Circle = dynamic(() => import('react-leaflet').then(mod => mod.Circle), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then(mod => mod.Tooltip), { ssr: false });
const MapClickHandler = dynamic(() => import('@/components/MapClickHandler'), { ssr: false });

interface MapViewProps {
  geoData: GeoJSONFeatureCollection | null;
  gapAreaData?: GeoJSONFeatureCollection | null;
  recommendationPointData?: GeoJSONFeatureCollection | null;
  recommendationAreaData?: GeoJSONFeatureCollection | null;
  demographicData?: GeoJSONFeatureCollection | null;
  halteExistingData?: GeoJSONFeatureCollection | null;
  recommendationData?: RecommendationPoint[];
  centerTarget?: { lat: number; lon: number; zoom?: number } | null;
  activeRecommendation?: RecommendationPoint | null;
  onClearActiveRecommendation?: () => void;
  onFeatureSelect?: (feature: SelectedFeatureDetail) => void;
  onSimulationClick?: (lat: number, lon: number) => void;
  simulationPoint?: { lat: number; lon: number } | null;
  simulationResult?: SimulationResult | null;
  isSimulationLoading?: boolean;
  onClearSimulation?: () => void;
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

function ActiveRecommendationBeacon({
  target,
  onClear,
}: {
  target: RecommendationPoint | null;
  onClear?: () => void;
}) {
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (target) {
      const timer = setTimeout(() => {
        try {
          markerRef.current?.openPopup();
        } catch {
          // ignore
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [target]);

  if (!target) return null;

  return (
    <>
      {/* Outer pulsing radar ring */}
      <CircleMarker
        center={[target.lat, target.lon]}
        radius={28}
        pane="beaconPane"
        pathOptions={{
          color: '#f59e0b',
          weight: 2,
          dashArray: '4, 4',
          fillColor: '#fef3c7',
          fillOpacity: 0.35,
        }}
      />
      {/* Mid focus ring */}
      <CircleMarker
        center={[target.lat, target.lon]}
        radius={18}
        pane="beaconPane"
        pathOptions={{
          color: '#ffffff',
          weight: 2.5,
          fillColor: '#d97706',
          fillOpacity: 0.65,
        }}
      />
      {/* Center glowing golden amber pin */}
      <CircleMarker
        ref={markerRef}
        center={[target.lat, target.lon]}
        radius={11}
        pane="beaconPane"
        pathOptions={{
          color: '#ffffff',
          weight: 3.5,
          fillColor: '#b45309',
          fillOpacity: 1,
        }}
      >
        <Tooltip permanent={true} direction="top" offset={[0, -14]}>
          <div className="flex items-center gap-1 font-bold text-[11px] text-slate-900 whitespace-nowrap">
            <span className="text-amber-500">🎯</span>
            <span>Rekomendasi #{target.rank}</span>
          </div>
        </Tooltip>
        <Popup autoClose={false}>
          <div className="p-1 min-w-[210px] text-slate-800">
            <div className="flex items-center gap-1.5 text-amber-700 font-bold text-[10px] uppercase tracking-wider mb-1">
              <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
              <span>Rekomendasi Halte Terpilih</span>
            </div>
            <h3 className="font-bold text-sm text-slate-900 leading-tight">
              {target.nama || `Rekomendasi Halte #${target.rank}`}
            </h3>
            <div className="mt-2 space-y-1 text-xs border-t border-slate-100 pt-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-slate-500">Peringkat:</span>
                <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  #{target.rank}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-slate-500">Jenis:</span>
                <span className="font-semibold text-slate-800">{target.jenis_rekomendasi}</span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-slate-500">Est. Terlayani:</span>
                <span className="font-bold text-slate-900">
                  {target.estimasi_penduduk_terlayani ? target.estimasi_penduduk_terlayani.toLocaleString('id-ID') : '-'} jiwa
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-slate-500">Radius Layanan:</span>
                <span className="font-medium text-slate-700">{target.radius_layanan} meter</span>
              </div>
              {target.carbon_footprint && (
                <div className="mt-2 rounded-lg bg-emerald-50 border border-emerald-200/80 p-2 text-xs">
                  <div className="flex items-center justify-between text-emerald-950 font-bold text-[11px]">
                    <span className="flex items-center gap-1">
                      <span>🌱</span>
                      <span>Potensi Dekarbonisasi:</span>
                    </span>
                    <span className="text-emerald-700">-{target.carbon_footprint.co2_reduction_tons_year} Ton/thn</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-emerald-800">
                    <span>🌲 ~{target.carbon_footprint.tree_equivalent.toLocaleString('id-ID')} pohon</span>
                    <span>🛵 ~{target.carbon_footprint.daily_vehicle_trips_reduced} trip/hari</span>
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear?.();
              }}
              className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300/80 px-2 py-1.5 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            >
              <span>✕</span>
              <span>Hapus Sorotan dari Peta</span>
            </button>
            <p className="text-[10px] font-mono text-slate-400 mt-2 text-right">
              {target.lon.toFixed(5)}, {target.lat.toFixed(5)}
            </p>
          </div>
        </Popup>
      </CircleMarker>
    </>
  );
}

export default function MapView({
  geoData,
  gapAreaData,
  recommendationPointData,
  recommendationAreaData,
  demographicData,
  halteExistingData,
  recommendationData,
  centerTarget,
  activeRecommendation,
  onClearActiveRecommendation,
  onFeatureSelect,
  onSimulationClick,
  simulationPoint,
  simulationResult,
  isSimulationLoading = false,
  onClearSimulation,
  simulationMode = false
}: MapViewProps) {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [panesReady, setPanesReady] = useState(false);

  // Live mutable refs to completely eliminate stale closure issues in Leaflet layer event listeners
  const simulationModeRef = useRef(simulationMode);
  simulationModeRef.current = simulationMode;

  const onSimulationClickRef = useRef(onSimulationClick);
  onSimulationClickRef.current = onSimulationClick;

  const onFeatureSelectRef = useRef(onFeatureSelect);
  onFeatureSelectRef.current = onFeatureSelect;

  useEffect(() => {
    setMapLoaded(true);
  }, []);

  const getSKAColor = (score: number) => {
    // Distinct, vibrant choropleth palette
    if (score >= 0.75) return '#e11d48'; // Sangat Kritis (Rose Red)
    if (score >= 0.5) return '#ea580c';  // Tinggi (Warm Orange)
    if (score >= 0.25) return '#eab308'; // Sedang (Golden Amber)
    return '#10b981'; // Rendah (Emerald Green)
  };

  // Base Choropleth SKA Area: balanced transparency to avoid muddy overlaps
  const styleFeature = (feature: any) => {
    const score = feature.properties.ska_score || 0;
    return {
      pane: 'skaPane',
      fillColor: getSKAColor(score),
      weight: 1.5,
      opacity: 0.9,
      color: '#ffffff',
      dashArray: '2, 3',
      fillOpacity: 0.48
    };
  };

  // Demografi Lokal: Clean administrative boundary line without conflicting green fill
  const styleDemografi = () => ({
    pane: 'demografiPane',
    fillColor: '#64748b',
    weight: 1.5,
    opacity: 0.85,
    dashArray: '3, 4',
    color: '#334155',
    fillOpacity: 0.05
  });

  // Area GAP: Distinct hazard zone with dashed warning perimeter (pane 460 guarantees it is above demografi & ska)
  const styleAreaGap = () => ({
    pane: 'areaGapPane',
    fillColor: '#dc2626',
    weight: 2.5,
    opacity: 0.95,
    dashArray: '6, 4',
    color: '#b91c1c',
    fillOpacity: 0.28
  });

  // Area Rekomendasi: Distinct violet/indigo buffer zone
  const styleAreaRekomendasi = () => ({
    pane: 'areaRekomendasiPane',
    fillColor: '#8b5cf6',
    weight: 2,
    opacity: 0.9,
    dashArray: '4, 4',
    color: '#7c3aed',
    fillOpacity: 0.18
  });

  const bindSelectableFeature = (
    layerKey: string,
    defaultStyleFn: () => any,
    hoverStyleFn: () => any
  ) => {
    return (feature: any, layer: any) => {
      const properties = feature.properties || {};
      layer.on({
        click: (e: any) => {
          if (simulationModeRef.current) {
            e.originalEvent?.stopPropagation();
            onSimulationClickRef.current?.(e.latlng.lat, e.latlng.lng);
            return;
          }
          e.originalEvent?.stopPropagation();

          const layerNameMap: Record<string, string> = {
            area_gap: 'Area Kesenjangan Aksesibilitas (GAP)',
            demografi: 'Wilayah Administrasi & Demografi',
            area_rekomendasi: 'Area Rekomendasi Jangkauan',
            titik_rekomendasi: 'Titik Rekomendasi Halte',
            halte_existing: 'Halte Existing Transit',
          };

          const displayName =
            properties.display_name ||
            properties.nama ||
            properties.DESA ||
            (properties.id ? `Area GAP #${properties.id}` : null) ||
            (properties.fid ? `Area GAP #${properties.fid}` : null) ||
            layerNameMap[layerKey] ||
            'Fitur Peta';

          onFeatureSelectRef.current?.({
            layerKey: properties._layer_key || layerKey,
            layerName: properties._layer_name || layerNameMap[layerKey] || 'Fitur Peta',
            geometryType: feature.geometry?.type || 'Polygon',
            properties: {
              ...properties,
              display_name: displayName,
            },
            coordinates: e.latlng ? [e.latlng.lng, e.latlng.lat] : undefined,
          });
        },
        mouseover: (e: any) => {
          e.target.setStyle?.(hoverStyleFn());
        },
        mouseout: (e: any) => {
          e.target.setStyle?.(defaultStyleFn());
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
      const score = p.ska_score != null ? Number(p.ska_score).toFixed(2) : 'N/A';
      const blindSpot = p.blind_spot_pct != null ? `${Number(p.blind_spot_pct).toFixed(1)}%` : '-';
      const kepadatan = p.kepadatan != null ? Math.round(Number(p.kepadatan)).toLocaleString('id-ID') : '-';
      const kategori = p.kategori_ska || '-';

      const popupContent = `
        <div class="p-1 min-w-[210px] max-w-[260px] text-slate-800">
          <div class="font-bold text-base border-b border-slate-200 pb-1 mb-2 text-slate-900 tracking-wide">
            ${p.nama}
          </div>
          <div class="space-y-1.5 text-xs">
            <div class="flex items-baseline justify-between gap-3">
              <span class="text-slate-500 whitespace-nowrap">Skor SKA:</span>
              <span class="font-bold text-slate-900 text-right">
                ${score} <span class="font-medium text-slate-500 text-[11px]">(${kategori})</span>
              </span>
            </div>
            <div class="flex items-baseline justify-between gap-3">
              <span class="text-slate-500 whitespace-nowrap">Kepadatan:</span>
              <span class="font-semibold text-slate-800 text-right">${kepadatan} <span class="text-[10px] font-normal text-slate-400">jiwa/km²</span></span>
            </div>
            <div class="flex items-baseline justify-between gap-3">
              <span class="text-slate-500 whitespace-nowrap">Blind Spot:</span>
              <span class="font-semibold text-slate-800 text-right">${blindSpot}</span>
            </div>
          </div>
        </div>
      `;
      layer.bindPopup(popupContent, { maxWidth: 280, minWidth: 210 });

      layer.on({
        click: (e: any) => {
          if (simulationModeRef.current) {
            e.originalEvent?.stopPropagation();
            layer.closePopup?.();
            onSimulationClickRef.current?.(e.latlng.lat, e.latlng.lng);
            return;
          }
          e.originalEvent?.stopPropagation();
          onFeatureSelectRef.current?.({
            layerKey: 'ska_area',
            layerName: `Kesenjangan SKA - ${p.nama}`,
            geometryType: feature.geometry?.type || 'Polygon',
            properties: p,
            coordinates: e.latlng ? [e.latlng.lng, e.latlng.lat] : undefined,
          });
        },
        popupopen: () => {
          if (simulationModeRef.current) {
            layer.closePopup?.();
          }
        },
        mouseover: (e: any) => {
          const l = e.target;
          l.setStyle({
            pane: 'skaPane',
            weight: 2.5,
            color: '#0f172a',
            dashArray: '',
            fillOpacity: 0.65
          });
        },
        mouseout: () => {
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
        <MapClickHandler
          enabled={simulationMode}
          onClick={onSimulationClick}
          centerTarget={centerTarget}
          onPanesReady={() => setPanesReady(true)}
        />
        {panesReady && geoData && (
          <GeoJSON
            key={JSON.stringify(geoData.features.map(f => f.properties.ska_score))} // Force re-render on data change
            data={geoData}
            pane="skaPane"
            style={styleFeature}
            onEachFeature={onEachFeature}
          />
        )}
        {panesReady && demographicData && (
          <GeoJSON
            key={`demografi-${demographicData.features.length}`}
            data={demographicData}
            pane="demografiPane"
            style={styleDemografi}
            onEachFeature={bindSelectableFeature(
              'demografi',
              styleDemografi,
              () => ({ pane: 'demografiPane', weight: 2.5, color: '#0f172a', fillOpacity: 0.18 })
            )}
          />
        )}
        {panesReady && recommendationAreaData && (
          <GeoJSON
            key={`area-rekomendasi-${recommendationAreaData.features.length}`}
            data={recommendationAreaData}
            pane="areaRekomendasiPane"
            style={styleAreaRekomendasi}
            onEachFeature={bindSelectableFeature(
              'area_rekomendasi',
              styleAreaRekomendasi,
              () => ({ pane: 'areaRekomendasiPane', weight: 3, color: '#6d28d9', fillOpacity: 0.30 })
            )}
          />
        )}
        {panesReady && gapAreaData && (
          <GeoJSON
            key={`area-gap-${gapAreaData.features.length}`}
            data={gapAreaData}
            pane="areaGapPane"
            style={styleAreaGap}
            onEachFeature={bindSelectableFeature(
              'area_gap',
              styleAreaGap,
              () => ({ pane: 'areaGapPane', weight: 3.5, color: '#991b1b', fillOpacity: 0.40 })
            )}
          />
        )}
        {extractPointMarkers(recommendationPointData).map((point) => {
          const isSelected = Boolean(
            activeRecommendation && (
              (Math.abs(point.lat - activeRecommendation.lat) < 0.0001 && Math.abs(point.lon - activeRecommendation.lon) < 0.0001) ||
              (point.properties.rank !== undefined && point.properties.rank === activeRecommendation.rank)
            )
          );

          return (
            <CircleMarker
              key={point.key}
              center={[point.lat, point.lon]}
              radius={isSelected ? 11 : 7}
              pane="pointsPane"
              pathOptions={{
                color: '#ffffff',
                weight: isSelected ? 3.5 : 2.5,
                fillColor: isSelected ? '#f59e0b' : '#4f46e5',
                fillOpacity: 1,
              }}
              eventHandlers={{
                click: (e) => {
                  e.originalEvent?.stopPropagation();
                  if (simulationModeRef.current) {
                    onSimulationClickRef.current?.(point.lat, point.lon);
                    return;
                  }
                  onFeatureSelectRef.current?.({
                    layerKey: point.properties._layer_key || 'titik_rekomendasi',
                    layerName: point.layerName,
                    geometryType: point.geometryType,
                    properties: point.properties,
                    coordinates: [point.lon, point.lat],
                  });
                },
                mouseover: (e) => {
                  e.target.setStyle?.({ radius: isSelected ? 13 : 9, weight: 3.5 });
                },
                mouseout: (e) => {
                  e.target.setStyle?.({ radius: isSelected ? 11 : 7, weight: isSelected ? 3.5 : 2.5 });
                }
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
          );
        })}
        {extractPointMarkers(halteExistingData).map((point) => (
          <CircleMarker
            key={`halte-${point.key}`}
            center={[point.lat, point.lon]}
            radius={6}
            pane="pointsPane"
            pathOptions={{ color: '#ffffff', weight: 1.5, fillColor: '#0284c7', fillOpacity: 0.95 }}
            eventHandlers={{
              click: (e) => {
                e.originalEvent?.stopPropagation();
                if (simulationModeRef.current) {
                  onSimulationClickRef.current?.(point.lat, point.lon);
                  return;
                }
                onFeatureSelectRef.current?.({
                  layerKey: point.properties._layer_key || 'halte_existing',
                  layerName: point.layerName,
                  geometryType: point.geometryType,
                  properties: point.properties,
                  coordinates: [point.lon, point.lat],
                });
              },
              mouseover: (e) => {
                e.target.setStyle?.({ radius: 8, weight: 2.5 });
              },
              mouseout: (e) => {
                e.target.setStyle?.({ radius: 6, weight: 1.5 });
              }
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
        {recommendationData && recommendationData.map((rec, idx) => {
          const isSelected = Boolean(
            activeRecommendation && (
              rec.rank === activeRecommendation.rank ||
              (Math.abs(rec.lat - activeRecommendation.lat) < 0.0001 && Math.abs(rec.lon - activeRecommendation.lon) < 0.0001)
            )
          );

          return (
            <CircleMarker
              key={`rec-${idx}`}
              center={[rec.lat, rec.lon]}
              radius={isSelected ? 11 : 8}
              pane="pointsPane"
              pathOptions={{
                color: '#ffffff',
                weight: isSelected ? 3.5 : 2.5,
                fillColor: isSelected ? '#f59e0b' : '#6366f1',
                fillOpacity: 1,
              }}
              eventHandlers={{
                click: (e) => {
                  e.originalEvent?.stopPropagation();
                  if (simulationModeRef.current) {
                    onSimulationClickRef.current?.(rec.lat, rec.lon);
                    return;
                  }
                  onFeatureSelectRef.current?.({
                    layerKey: 'rekomendasi_halte',
                    layerName: `Rekomendasi Halte #${rec.rank}`,
                    geometryType: 'Point',
                    properties: {
                      display_name: rec.nama || `Rekomendasi Halte #${rec.rank}`,
                      rank: rec.rank,
                      jenis_rekomendasi: rec.jenis_rekomendasi,
                      estimasi_penduduk_terlayani: rec.estimasi_penduduk_terlayani,
                      radius_layanan: rec.radius_layanan,
                      carbon_footprint: rec.carbon_footprint,
                    },
                    coordinates: [rec.lon, rec.lat],
                  });
                },
                mouseover: (e) => {
                  e.target.setStyle?.({ radius: isSelected ? 13 : 10, weight: 3.5 });
                },
                mouseout: (e) => {
                  e.target.setStyle?.({ radius: isSelected ? 11 : 8, weight: isSelected ? 3.5 : 2.5 });
                }
              }}
            >
              <Popup>
                <div className="p-1 min-w-[190px]">
                  <h3 className="font-bold text-base mb-1">{rec.nama || `Rekomendasi Halte ${rec.rank}`}</h3>
                  <div className="text-sm space-y-0.5">
                    <div><span className="text-slate-500">Rank:</span> #{rec.rank} ({rec.jenis_rekomendasi})</div>
                    <div><span className="text-slate-500">Est. Penduduk:</span> {rec.estimasi_penduduk_terlayani.toLocaleString()} jiwa</div>
                    <div><span className="text-slate-500">Radius Layanan:</span> {rec.radius_layanan} m</div>
                    {rec.carbon_footprint && (
                      <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-xs text-emerald-700 font-bold">
                        <span className="flex items-center gap-1">
                          <span>🌱</span>
                          <span>Reduksi Emisi:</span>
                        </span>
                        <span>-{rec.carbon_footprint.co2_reduction_tons_year} Ton CO₂/thn</span>
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
        <ActiveRecommendationBeacon
          target={activeRecommendation ?? null}
          onClear={onClearActiveRecommendation}
        />
        {/* What-If Simulation Buffer, Beacon, & Result Marker */}
        {simulationPoint && (
          <>
            {/* 400m Service Coverage Buffer Circle */}
            <Circle
              center={[simulationPoint.lat, simulationPoint.lon]}
              radius={simulationResult?.radius_layanan || 400}
              pane="areaRekomendasiPane"
              pathOptions={{
                color: '#10b981',
                weight: 2.5,
                dashArray: '6, 6',
                fillColor: '#10b981',
                fillOpacity: 0.16,
              }}
            >
              <Tooltip sticky>
                <div className="text-xs font-semibold text-emerald-950">
                  <span>🎯 Jangkauan Layanan Halte Simulasi ({simulationResult?.radius_layanan || 400}m)</span>
                </div>
              </Tooltip>
            </Circle>

            {/* Radar Pulsing Rings */}
            <CircleMarker
              center={[simulationPoint.lat, simulationPoint.lon]}
              radius={20}
              pane="beaconPane"
              pathOptions={{
                color: '#10b981',
                weight: 1.5,
                fillColor: '#10b981',
                fillOpacity: 0.20,
              }}
            />
            <CircleMarker
              center={[simulationPoint.lat, simulationPoint.lon]}
              radius={13}
              pane="beaconPane"
              pathOptions={{
                color: '#059669',
                weight: 2,
                fillColor: '#34d399',
                fillOpacity: 0.35,
              }}
            />

            {/* Center Pin Marker with Rich Popup */}
            <CircleMarker
              center={[simulationPoint.lat, simulationPoint.lon]}
              radius={8}
              pane="pointsPane"
              pathOptions={{
                color: '#ffffff',
                weight: 3,
                fillColor: '#047857',
                fillOpacity: 1,
              }}
            >
              <Popup autoClose={false}>
                <div className="p-1 min-w-[220px] text-slate-800">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[10px] uppercase tracking-wider mb-1">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>Hasil Simulasi Halte Baru</span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 leading-tight mb-2">
                    Proyeksi Halte Baru (What-If)
                  </h3>

                  {simulationResult ? (
                    <div className="space-y-1.5 text-xs border-t border-slate-100 pt-1.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-slate-500">Radius Layanan:</span>
                        <span className="font-semibold text-slate-800">{simulationResult.radius_layanan} m</span>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-slate-500">Penurunan GAP:</span>
                        <span className="font-bold text-emerald-700 font-mono">
                          -{simulationResult.estimasi_penurunan_gap_score.toFixed(3)}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-slate-500">Est. Penduduk Baru:</span>
                        <span className="font-bold text-slate-900 font-mono">
                          +{simulationResult.estimasi_penduduk_baru.toLocaleString('id-ID')} jiwa
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-slate-500">Area Terdampak:</span>
                        <span className="font-semibold text-slate-800">{simulationResult.jumlah_area_terdampak} blok</span>
                      </div>
                      {simulationResult.area_gap_terdekat && (
                        <div className="rounded bg-slate-50 p-1.5 text-[11px] text-slate-600">
                          <span className="text-slate-400">GAP Terdekat:</span>{' '}
                          <span className="font-semibold text-slate-800">{simulationResult.area_gap_terdekat.display_name}</span>{' '}
                          ({simulationResult.area_gap_terdekat.distance_m.toFixed(0)}m)
                        </div>
                      )}
                      {simulationResult.carbon_footprint && (
                        <div className="mt-1 rounded-lg bg-emerald-50 border border-emerald-200/80 p-2 text-xs">
                          <div className="flex items-center justify-between text-emerald-950 font-bold text-[11px]">
                            <span>🌱 Dekarbonisasi:</span>
                            <span className="text-emerald-700 font-mono">
                              -{simulationResult.carbon_footprint.co2_reduction_tons_year} Ton/thn
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center justify-between text-[10px] text-emerald-800">
                            <span>🌲 ~{simulationResult.carbon_footprint.tree_equivalent.toLocaleString('id-ID')} pohon</span>
                            <span>🛵 ~{simulationResult.carbon_footprint.daily_vehicle_trips_reduced} trip/hari</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-2 text-xs text-slate-500 flex items-center gap-2">
                      <svg className="animate-spin h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Menghitung dampak spasial...</span>
                    </div>
                  )}

                  <div className="mt-2 pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{simulationPoint.lat.toFixed(5)}, {simulationPoint.lon.toFixed(5)}</span>
                    {onClearSimulation && (
                      <button
                        type="button"
                        onClick={onClearSimulation}
                        className="text-red-500 hover:text-red-700 font-sans font-semibold"
                      >
                        ✕ Hapus
                      </button>
                    )}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          </>
        )}
      </MapContainer>
    </div>
  );
}
