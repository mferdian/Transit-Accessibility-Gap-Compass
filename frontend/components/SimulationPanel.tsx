'use client';

import { SimulationResult } from '@/lib/types';

interface SimulationPanelProps {
  result: SimulationResult | null;
  isLoading: boolean;
  isActive: boolean;
  onToggleMode: () => void;
  onCloseResult: () => void;
}

function formatNumber(value: number, fractionDigits = 0) {
  return value.toLocaleString('id-ID', {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  });
}

export default function SimulationPanel({
  result,
  isLoading,
  isActive,
  onToggleMode,
  onCloseResult,
}: SimulationPanelProps) {
  return (
    <div className="absolute inset-x-3 bottom-3 z-[20] max-h-[50svh] overflow-hidden rounded-lg border border-slate-200 bg-white/94 shadow-xl backdrop-blur-md sm:inset-x-auto sm:left-6 sm:top-[28rem] sm:bottom-auto sm:w-80 sm:max-w-[calc(100vw-3rem)] sm:max-h-[calc(100svh-30rem)]">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900">Simulator What-If</h2>
            <p className="text-xs text-slate-500">
              {isActive ? 'Klik titik di peta untuk simulasi' : 'Mode klik peta nonaktif'}
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleMode}
            className={`min-h-9 rounded-md px-3 py-1.5 text-xs font-bold sm:min-h-0 ${
              isActive ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border border-slate-200'
            }`}
            aria-pressed={isActive}
          >
            {isActive ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      <div className="max-h-[calc(50svh-4.5rem)] space-y-3 overflow-y-auto px-3 py-3 text-sm sm:max-h-[calc(100svh-34.5rem)] sm:px-4">
        {isLoading && (
          <div className="rounded-md bg-blue-50 px-3 py-2 text-blue-900">
            Menghitung dampak titik baru...
          </div>
        )}

        {!result && !isLoading && (
          <div className="rounded-md bg-slate-50 px-3 py-2 text-slate-600">
            Aktifkan mode, lalu klik area di peta.
          </div>
        )}

        {result && (
          <>
            <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Radius</p>
                <p className="text-lg font-bold text-slate-900">{result.radius_layanan} m</p>
              </div>
              <div className="rounded-md bg-green-50 p-3">
                <p className="text-xs text-green-700">Penurunan Gap</p>
                <p className="text-lg font-bold text-green-800">
                  -{formatNumber(result.estimasi_penurunan_gap_score, 3)}
                </p>
              </div>
              <div className="rounded-md bg-orange-50 p-3">
                <p className="text-xs text-orange-700">Area Terdampak</p>
                <p className="text-lg font-bold text-orange-800">{result.jumlah_area_terdampak}</p>
              </div>
              <div className="rounded-md bg-blue-50 p-3">
                <p className="text-xs text-blue-700">Est. Penduduk</p>
                <p className="text-lg font-bold text-blue-800">{formatNumber(result.estimasi_penduduk_baru)}</p>
              </div>
            </div>

            <div className="rounded-md border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Titik Simulasi</p>
              <p className="mt-1 font-medium text-slate-800">
                {result.lon.toFixed(6)}, {result.lat.toFixed(6)}
              </p>
            </div>

            {result.area_gap_terdekat && (
              <div className="rounded-md border border-slate-200 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Area GAP Terdekat</p>
                <p className="mt-1 font-bold text-slate-900">{result.area_gap_terdekat.display_name}</p>
                <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-slate-600 min-[360px]:grid-cols-2">
                  <span>Jarak: {formatNumber(result.area_gap_terdekat.distance_m, 1)} m</span>
                  <span>Gap: {formatNumber(result.area_gap_terdekat.gap_score, 3)}</span>
                  <span>Luas: {formatNumber(result.area_gap_terdekat.luas_m2)} m2</span>
                  <span>ID: {result.area_gap_terdekat.id}</span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={onCloseResult}
              className="min-h-11 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:min-h-0"
            >
              Bersihkan Hasil
            </button>
          </>
        )}
      </div>
    </div>
  );
}
