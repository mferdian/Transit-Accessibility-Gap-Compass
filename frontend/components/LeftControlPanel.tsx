'use client';

import { useState } from 'react';
import {
  MapidLayerKey,
  SKAParameters,
  SimulationResult
} from '@/lib/types';

export type LeftPanelTab = 'filter' | 'layers' | 'simulation';

interface LeftControlPanelProps {
  // Weights / SKA
  weights: SKAParameters;
  onWeightsChange: (newWeights: SKAParameters) => void;
  onApply: () => void;
  onToggleRecommendations?: () => void;
  isLoading: boolean;

  // Layers
  showSkaArea: boolean;
  onToggleSkaArea: () => void;
  visibleLayers: Record<MapidLayerKey, boolean>;
  onToggleLayer: (layerKey: MapidLayerKey) => void;
  loadingLayers: Partial<Record<MapidLayerKey, boolean>>;

  // Simulation
  simulationMode: boolean;
  onToggleSimulationMode: () => void;
  simulationResult: SimulationResult | null;
  isSimulationLoading: boolean;
  onCloseSimulationResult: () => void;

  // Tab control
  activeTab: LeftPanelTab;
  onTabChange: (tab: LeftPanelTab) => void;

  // AI Vision audit quick action
  onOpenHalteAudit?: () => void;

  // Sample simulation trigger
  onSampleSimulation?: () => void;
}

const LAYER_ITEMS: Array<{ key: MapidLayerKey; label: string; hint: string; color: string }> = [
  { key: 'area_gap', label: 'Area GAP', hint: 'Zona kesenjangan aksesibilitas (garis merah)', color: 'bg-red-600 ring-1 ring-red-300' },
  { key: 'area_rekomendasi', label: 'Area Rekomendasi', hint: 'Zona kandidat halte baru (buffer ungu)', color: 'bg-purple-600 ring-1 ring-purple-300' },
  { key: 'demografi', label: 'Demografi Lokal', hint: 'Batas administratif kelurahan (garis slate)', color: 'bg-slate-700 ring-1 ring-slate-400' },
  { key: 'halte_existing', label: 'Halte Existing', hint: 'Sebaran titik halte saat ini (titik biru)', color: 'bg-sky-600 ring-1 ring-sky-300' },
  { key: 'titik_rekomendasi', label: 'Titik Rekomendasi', hint: 'Lokasi prioritas halte baru (titik indigo)', color: 'bg-indigo-600 ring-1 ring-indigo-300' },
];

function formatNumber(value: number, fractionDigits = 0) {
  return value.toLocaleString('id-ID', {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  });
}

export default function LeftControlPanel({
  weights,
  onWeightsChange,
  onApply,
  onToggleRecommendations,
  isLoading,
  showSkaArea,
  onToggleSkaArea,
  visibleLayers,
  onToggleLayer,
  loadingLayers,
  simulationMode,
  onToggleSimulationMode,
  simulationResult,
  isSimulationLoading,
  onCloseSimulationResult,
  activeTab,
  onTabChange,
  onOpenHalteAudit,
  onSampleSimulation,
}: LeftControlPanelProps) {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [localWeights, setLocalWeights] = useState<SKAParameters>(weights);

  const handleSliderChange = (key: keyof SKAParameters, value: number) => {
    const updated = { ...localWeights, [key]: value };
    setLocalWeights(updated);
    onWeightsChange(updated);
  };

  const activeLayersCount =
    (showSkaArea ? 1 : 0) + Object.values(visibleLayers).filter(Boolean).length;

  if (isMinimized) {
    return (
      <div className="absolute left-3 right-3 top-3 z-[20] max-w-[calc(100vw-1.5rem)] sm:left-5 sm:right-auto sm:top-5">
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="flex min-h-11 max-w-full flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-md transition-all hover:border-slate-300 hover:bg-white sm:min-h-0 sm:gap-2.5 sm:px-3.5"
        >
          <div className="h-5 w-5 rounded bg-slate-900 text-white flex items-center justify-center">
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
            </svg>
          </div>
          <span className="min-w-0 text-xs font-semibold text-slate-800">Transit Gap Compass</span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
            {activeLayersCount} Layer
          </span>
          {simulationMode && (
            <span className="rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
              Simulasi Aktif
            </span>
          )}
          <svg className="h-3.5 w-3.5 text-slate-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="absolute left-3 right-3 top-3 z-[20] flex max-h-[44svh] flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white/95 shadow-xl backdrop-blur-md sm:left-5 sm:right-auto sm:top-5 sm:w-[21.5rem] sm:max-w-[calc(100vw-2.5rem)] md:max-h-[calc(100svh-2.5rem)]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/50 px-3 py-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="h-6 w-6 rounded-md bg-slate-900 text-white flex items-center justify-center shrink-0">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-xs font-bold text-slate-900 tracking-tight leading-tight">
              Transit Gap Compass
            </h1>
            <p className="text-[10px] text-slate-500 font-normal leading-tight">Platform Analisis Aksesibilitas</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsMinimized(true)}
          className="grid h-8 w-8 shrink-0 place-items-center rounded text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors sm:h-6 sm:w-6"
          title="Perkecil Panel"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>

      {/* Segmented Tab Navigation */}
      <div className="mx-3 mt-3 grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1 text-xs sm:mx-3.5">
        <button
          type="button"
          onClick={() => onTabChange('filter')}
          className={`flex min-h-9 min-w-0 items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-[11px] transition-all sm:min-h-0 sm:gap-1.5 sm:px-2 sm:text-xs ${
            activeTab === 'filter'
              ? 'bg-white text-slate-900 shadow-sm font-semibold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 font-normal'
          }`}
        >
          <svg className="h-3.5 w-3.5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="21" x2="4" y2="14" />
            <line x1="4" y1="10" x2="4" y2="3" />
            <line x1="12" y1="21" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12" y2="3" />
            <line x1="20" y1="21" x2="20" y2="16" />
            <line x1="20" y1="12" x2="20" y2="3" />
            <line x1="1" y1="14" x2="7" y2="14" />
            <line x1="9" y1="8" x2="15" y2="8" />
            <line x1="17" y1="16" x2="23" y2="16" />
          </svg>
          <span className="truncate">Bobot</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('layers')}
          className={`flex min-h-9 min-w-0 items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-[11px] transition-all sm:min-h-0 sm:gap-1.5 sm:px-2 sm:text-xs ${
            activeTab === 'layers'
              ? 'bg-white text-slate-900 shadow-sm font-semibold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 font-normal'
          }`}
        >
          <svg className="h-3.5 w-3.5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
          <span className="truncate">Layer</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-semibold">
            {activeLayersCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('simulation')}
          className={`flex min-h-9 min-w-0 items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-[11px] transition-all sm:min-h-0 sm:gap-1.5 sm:px-2 sm:text-xs ${
            activeTab === 'simulation'
              ? 'bg-white text-slate-900 shadow-sm font-semibold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 font-normal'
          }`}
        >
          <svg className="h-3.5 w-3.5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="22" y1="12" x2="18" y2="12" />
            <line x1="6" y1="12" x2="2" y2="12" />
            <line x1="12" y1="6" x2="12" y2="2" />
            <line x1="12" y1="22" x2="12" y2="18" />
          </svg>
          <span className="truncate">What-If</span>
          {simulationMode && (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-3.5">
        {/* ==================== TAB 1: BOBOT SKA ==================== */}
        {activeTab === 'filter' && (
          <div className="space-y-3.5">
            <p className="text-[11px] text-slate-500 leading-normal">
              Atur proporsi pembobotan untuk menghitung Skor Kesenjangan Aksesibilitas (SKA).
            </p>

            <div className="space-y-3 bg-slate-50/80 p-3 rounded-lg border border-slate-100">
              {/* Kepadatan */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-700 font-medium">Kepadatan Penduduk</span>
                  <span className="font-mono text-slate-900 font-bold text-[11px]">
                    {(localWeights.w1 * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={localWeights.w1}
                  onChange={(e) => handleSliderChange('w1', parseFloat(e.target.value))}
                  className="w-full accent-slate-900 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                />
              </div>

              {/* Blind Spot */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-700 font-medium">Blind Spot Area</span>
                  <span className="font-mono text-slate-900 font-bold text-[11px]">
                    {(localWeights.w2 * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={localWeights.w2}
                  onChange={(e) => handleSliderChange('w2', parseFloat(e.target.value))}
                  className="w-full accent-slate-900 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                />
              </div>

              {/* Jarak First Mile */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-700 font-medium">Jarak First Mile</span>
                  <span className="font-mono text-slate-900 font-bold text-[11px]">
                    {(localWeights.w3 * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={localWeights.w3}
                  onChange={(e) => handleSliderChange('w3', parseFloat(e.target.value))}
                  className="w-full accent-slate-900 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                />
              </div>

              {/* Frekuensi Layanan */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-700 font-medium">Frekuensi Layanan</span>
                  <span className="font-mono text-slate-900 font-bold text-[11px]">
                    {(localWeights.w4 * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={localWeights.w4}
                  onChange={(e) => handleSliderChange('w4', parseFloat(e.target.value))}
                  className="w-full accent-slate-900 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-0.5">
              <button
                type="button"
                onClick={onApply}
                disabled={isLoading}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50 sm:min-h-0"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span>Menghitung SKA...</span>
                  </>
                ) : (
                  <span>Terapkan Parameter SKA</span>
                )}
              </button>

              {onToggleRecommendations && (
                <button
                  type="button"
                  onClick={onToggleRecommendations}
                  disabled={isLoading}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:min-h-0"
                >
                  <svg className="h-3.5 w-3.5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="3" width="16" height="16" rx="2" />
                    <path d="M4 11h16" />
                    <path d="M8 15h.01" />
                    <path d="M16 15h.01" />
                    <path d="M6 19v2" />
                    <path d="M18 19v2" />
                  </svg>
                  <span>Daftar Rekomendasi Halte</span>
                </button>
              )}

              {onOpenHalteAudit && (
                <button
                  type="button"
                  onClick={onOpenHalteAudit}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 sm:min-h-0"
                >
                  <svg className="h-3.5 w-3.5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <span>Audit Kondisi Halte (AI Vision)</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB 2: KONTROL LAYER ==================== */}
        {activeTab === 'layers' && (
          <div className="space-y-2">
            <p className="text-[11px] text-slate-500 mb-2">
              Visibilitas layer spasial pada kanvas peta.
            </p>

            {/* Area SKA Toggle */}
            <button
              type="button"
              onClick={onToggleSkaArea}
              className={`flex min-h-12 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-all sm:min-h-0 ${
                showSkaArea
                  ? 'border-slate-800 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
              }`}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-yellow-500" />
              <div className="min-w-0 flex-1">
                <span className="block text-xs font-semibold">Area SKA</span>
                <span className={`block text-[10px] ${showSkaArea ? 'text-slate-300' : 'text-slate-500'}`}>
                  Choropleth tingkat kesenjangan kelurahan
                </span>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  showSkaArea ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {showSkaArea ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* Other Layers */}
            {LAYER_ITEMS.map((layer) => {
              const active = visibleLayers[layer.key];
              const loading = loadingLayers[layer.key];
              return (
                <button
                  key={layer.key}
                  type="button"
                  onClick={() => onToggleLayer(layer.key)}
                  className={`flex min-h-12 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-all sm:min-h-0 ${
                    active
                      ? 'border-slate-800 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${layer.color}`} />
                  <div className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold">{layer.label}</span>
                    <span className={`block text-[10px] ${active ? 'text-slate-300' : 'text-slate-500'}`}>
                      {loading ? 'Memuat data...' : layer.hint}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {active ? 'ON' : 'OFF'}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* ==================== TAB 3: SIMULATOR WHAT-IF ==================== */}
        {activeTab === 'simulation' && (
          <div className="space-y-3">
            {/* Toggle Card */}
              <div className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 transition-all ${
              simulationMode
                ? 'border-emerald-500/80 bg-emerald-50/80 shadow-xs'
                : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-2.5">
                <span className={`h-2.5 w-2.5 rounded-full ${simulationMode ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                <div>
                  <span className="block text-xs font-semibold text-slate-900">Mode Simulasi Halte</span>
                  <span className="block text-[10px] text-slate-500">
                    {simulationMode ? 'Klik lokasi pada peta untuk simulasi' : 'Mode nonaktif — klik tab atau tombol ON'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onToggleSimulationMode}
                className={`ml-auto min-h-9 shrink-0 rounded px-3 py-1.5 text-xs font-bold transition-all shadow-xs sm:min-h-0 ${
                  simulationMode
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {simulationMode ? 'AKTIF (ON)' : 'MATI (OFF)'}
              </button>
            </div>

            {/* Instruction Notice */}
            {!simulationMode && !simulationResult && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 leading-normal space-y-2">
                <p>Klik tombol <strong>AKTIF (ON)</strong> di atas, lalu klik titik di peta untuk memproyeksikan penurunan skor kesenjangan dan jangkauan penduduk.</p>
                {onSampleSimulation && (
                  <button
                    type="button"
                    onClick={onSampleSimulation}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-2xs transition-colors hover:bg-slate-100 sm:min-h-0"
                  >
                    <span>🎯</span>
                    <span>Coba Simulasi Titik Contoh (Pusat Kota)</span>
                  </button>
                )}
              </div>
            )}

            {simulationMode && !simulationResult && !isSimulationLoading && (
              <div className="space-y-2">
                <div className="rounded-lg border border-emerald-300 bg-emerald-50/90 p-3 text-xs text-emerald-950 flex items-start gap-2.5 leading-normal">
                  <svg className="h-4 w-4 shrink-0 text-emerald-700 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <div>
                    <strong className="text-emerald-900">Siap Simulasi:</strong> Klik titik manapun pada peta untuk menganalisis dampak penambahan halte baru secara real-time.
                  </div>
                </div>

                {onSampleSimulation && (
                  <button
                    type="button"
                    onClick={onSampleSimulation}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-2xs transition-colors hover:bg-slate-50 sm:min-h-0"
                  >
                    <span>🎯</span>
                    <span>Atau Coba Titik Contoh (Surabaya Pusat)</span>
                  </button>
                )}
              </div>
            )}

            {isSimulationLoading && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-800 flex items-center gap-2">
                <svg className="animate-spin h-3.5 w-3.5 text-slate-700 shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Menghitung dampak spasial titik baru...</span>
              </div>
            )}

            {/* Simulation Results */}
            {simulationResult && (
              <div className="space-y-2.5 pt-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Hasil Proyeksi</span>
                  <button
                    type="button"
                    onClick={onCloseSimulationResult}
                    className="text-[11px] text-slate-500 hover:text-slate-900 font-medium"
                  >
                    Bersihkan
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5">
                    <p className="text-[10px] text-slate-500 font-medium">Radius Layanan</p>
                    <p className="text-sm font-bold text-slate-900 font-mono">{simulationResult.radius_layanan} m</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5">
                    <p className="text-[10px] text-slate-500 font-medium">Penurunan Gap</p>
                    <p className="text-sm font-bold text-slate-900 font-mono">
                      -{formatNumber(simulationResult.estimasi_penurunan_gap_score, 3)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5">
                    <p className="text-[10px] text-slate-500 font-medium">Area Terdampak</p>
                    <p className="text-sm font-bold text-slate-900 font-mono">{simulationResult.jumlah_area_terdampak}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5">
                    <p className="text-[10px] text-slate-500 font-medium">Est. Penduduk</p>
                    <p className="text-sm font-bold text-slate-900 font-mono">
                      +{formatNumber(simulationResult.estimasi_penduduk_baru)}
                    </p>
                  </div>
                </div>

                {/* Coordinates */}
                <div className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs">
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Koordinat Titik</p>
                  <p className="mt-0.5 font-mono text-slate-800 text-xs">
                    {simulationResult.lat.toFixed(5)}, {simulationResult.lon.toFixed(5)}
                  </p>
                </div>

                {/* Nearest Gap Area */}
                {simulationResult.area_gap_terdekat && (
                  <div className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs space-y-1">
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Area Gap Terdekat</p>
                    <p className="font-semibold text-slate-900 text-xs">{simulationResult.area_gap_terdekat.display_name}</p>
                    <div className="grid grid-cols-1 gap-1 border-t border-slate-100 pt-1 text-[10px] text-slate-600 min-[360px]:grid-cols-2 font-mono">
                      <div>Jarak: {formatNumber(simulationResult.area_gap_terdekat.distance_m, 1)} m</div>
                      <div>Gap: {formatNumber(simulationResult.area_gap_terdekat.gap_score, 3)}</div>
                      <div>Luas: {formatNumber(simulationResult.area_gap_terdekat.luas_m2)} m²</div>
                      <div>ID: {simulationResult.area_gap_terdekat.id}</div>
                    </div>
                  </div>
                )}

                {/* Environmental & Carbon Footprint Card */}
                {simulationResult.carbon_footprint && (
                  <div className="rounded-xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white p-2.5 text-xs space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between pb-1 border-b border-emerald-200/50">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-[11px]">
                        <span>🌱</span>
                        <span>Dampak Dekarbonisasi</span>
                      </div>
                      <span className="rounded-md bg-emerald-600 px-1.5 py-0.2 text-[10px] font-black text-white">
                        -{simulationResult.carbon_footprint.co2_reduction_tons_year} Ton/thn
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 pt-0.5 text-[11px] min-[360px]:grid-cols-2">
                      <div>
                        <p className="text-[9px] text-emerald-800/75">Serapan Ekuivalen</p>
                        <p className="font-bold text-slate-900">
                          🌲 ~{simulationResult.carbon_footprint.tree_equivalent.toLocaleString('id-ID')} Pohon
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] text-emerald-800/75">Pengalihan Kendaraan</p>
                        <p className="font-bold text-slate-900">
                          🛵 ~{simulationResult.carbon_footprint.daily_vehicle_trips_reduced.toLocaleString('id-ID')} trip/hari
                        </p>
                      </div>
                    <div className="flex items-center justify-between gap-2 border-t border-emerald-100/80 pt-1 text-[10px] min-[360px]:col-span-2">
                        <span className="text-emerald-800/75">Efisiensi Bahan Bakar:</span>
                        <span className="font-bold text-slate-800">
                          ⛽ ~{simulationResult.carbon_footprint.annual_fuel_liters_saved.toLocaleString('id-ID')} liter/thn
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
