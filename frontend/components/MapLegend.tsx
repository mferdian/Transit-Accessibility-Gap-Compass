'use client';

import { useState } from 'react';
import { MapidLayerKey } from '@/lib/types';

interface MapLegendProps {
  visibleLayers?: Record<MapidLayerKey, boolean>;
  showSkaArea?: boolean;
  showRecommendations?: boolean;
  className?: string;
}

export default function MapLegend({
  visibleLayers,
  showSkaArea = true,
  showRecommendations = false,
  className = '',
}: MapLegendProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      aria-label="Legenda dan Simbol Peta"
      className={`max-h-[30svh] w-full overflow-y-auto rounded-2xl border border-slate-200/90 bg-white/95 p-3 text-slate-900 shadow-xl backdrop-blur-md transition-all sm:w-[22rem] sm:max-w-[calc(100vw-3rem)] sm:p-3.5 md:max-h-[42svh] ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 text-slate-700">
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </span>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
            Legenda & Simbol Peta
          </h4>
        </div>
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex min-h-8 items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 sm:min-h-0"
        >
          <span>{isCollapsed ? 'Buka' : 'Sembunyikan'}</span>
          <svg
            className={`h-3 w-3 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {!isCollapsed && (
        <div className="mt-2.5 space-y-2.5 text-xs">
          {/* SKA Category Swatches */}
          {showSkaArea && (
            <div>
              <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Tingkat SKA (Kesenjangan Akses)
              </p>
              <div className="grid grid-cols-1 gap-1.5 text-[11px] min-[360px]:grid-cols-2">
                <div className="flex min-h-8 items-center gap-1.5 rounded-lg border border-rose-100/80 bg-rose-50/70 px-2 py-1 sm:min-h-0">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#e11d48] shrink-0 shadow-sm" />
                  <span className="font-semibold text-rose-900">Kritis (&ge;0.75)</span>
                </div>
                <div className="flex min-h-8 items-center gap-1.5 rounded-lg border border-orange-100/80 bg-orange-50/70 px-2 py-1 sm:min-h-0">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ea580c] shrink-0 shadow-sm" />
                  <span className="font-semibold text-orange-900">Tinggi (0.50)</span>
                </div>
                <div className="flex min-h-8 items-center gap-1.5 rounded-lg border border-amber-100/80 bg-amber-50/70 px-2 py-1 sm:min-h-0">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#eab308] shrink-0 shadow-sm" />
                  <span className="font-semibold text-amber-900">Sedang (0.25)</span>
                </div>
                <div className="flex min-h-8 items-center gap-1.5 rounded-lg border border-emerald-100/80 bg-emerald-50/70 px-2 py-1 sm:min-h-0">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#10b981] shrink-0 shadow-sm" />
                  <span className="font-semibold text-emerald-900">Rendah (&lt;0.25)</span>
                </div>
              </div>
            </div>
          )}

          {/* Layer Symbols */}
          <div className="border-t border-slate-100 pt-2 space-y-1 text-[11px]">
            <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Simbol Layer Aktif
            </p>

            <div
              className={`flex min-h-8 flex-wrap items-center justify-between gap-x-2 gap-y-0.5 rounded-lg px-2 py-1 transition-opacity sm:min-h-0 ${
                visibleLayers?.halte_existing !== false ? 'bg-slate-50/80' : 'opacity-40'
              }`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#0284c7] ring-1.5 ring-white shadow-sm shrink-0" />
                <span className="text-slate-700 font-medium">Halte Existing</span>
              </div>
              <span className="text-[10px] text-slate-400">Titik Biru</span>
            </div>

            <div
              className={`flex min-h-8 flex-wrap items-center justify-between gap-x-2 gap-y-0.5 rounded-lg px-2 py-1 transition-opacity sm:min-h-0 ${
                visibleLayers?.titik_rekomendasi || showRecommendations
                  ? 'bg-indigo-50/70'
                  : 'opacity-40'
              }`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#4f46e5] ring-1.5 ring-white shadow-sm shrink-0" />
                <span className="text-slate-800 font-semibold">Rekomendasi Halte</span>
              </div>
              <span className="text-[10px] text-indigo-600 font-medium">Titik Indigo</span>
            </div>

            <div className="flex min-h-8 flex-wrap items-center justify-between gap-x-2 gap-y-0.5 rounded-lg border border-amber-200/60 bg-amber-50/80 px-2 py-1 sm:min-h-0">
              <div className="flex min-w-0 items-center gap-2">
                <span className="relative flex h-3 w-3 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#f59e0b] ring-1 ring-white" />
                </span>
                <span className="text-amber-900 font-bold">Rekomendasi Terpilih</span>
              </div>
              <span className="text-[10px] text-amber-700 font-medium">Kuning Emas (Fokus)</span>
            </div>

            <div
              className={`flex min-h-8 flex-wrap items-center justify-between gap-x-2 gap-y-0.5 rounded-lg px-2 py-1 transition-opacity sm:min-h-0 ${
                visibleLayers?.area_gap !== false ? 'bg-slate-50/80' : 'opacity-40'
              }`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-1.5 w-4 border-b-2 border-dashed border-[#dc2626] shrink-0" />
                <span className="text-slate-700 font-medium">Area GAP</span>
              </div>
              <span className="text-[10px] text-slate-400">Garis Merah</span>
            </div>

            <div
              className={`flex min-h-8 flex-wrap items-center justify-between gap-x-2 gap-y-0.5 rounded-lg px-2 py-1 transition-opacity sm:min-h-0 ${
                visibleLayers?.area_rekomendasi !== false ? 'bg-slate-50/80' : 'opacity-40'
              }`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-1.5 w-4 border-b-2 border-dashed border-[#7c3aed] shrink-0" />
                <span className="text-slate-700 font-medium">Area Rekomendasi</span>
              </div>
              <span className="text-[10px] text-slate-400">Buffer Ungu</span>
            </div>

            <div
              className={`flex min-h-8 flex-wrap items-center justify-between gap-x-2 gap-y-0.5 rounded-lg px-2 py-1 transition-opacity sm:min-h-0 ${
                visibleLayers?.demografi !== false ? 'bg-slate-50/80' : 'opacity-40'
              }`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-1.5 w-4 border-b-2 border-dashed border-[#334155] shrink-0" />
                <span className="text-slate-700 font-medium">Batas Kelurahan</span>
              </div>
              <span className="text-[10px] text-slate-400">Garis Slate</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
