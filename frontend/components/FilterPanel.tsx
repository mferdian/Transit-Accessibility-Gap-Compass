'use client';

import { SKAParameters } from '@/lib/types';
import { useState } from 'react';

interface FilterPanelProps {
  weights: SKAParameters;
  onWeightsChange: (newWeights: SKAParameters) => void;
  onApply: () => void;
  onToggleRecommendations?: () => void;
  isLoading: boolean;
}

export default function FilterPanel({ weights, onWeightsChange, onApply, onToggleRecommendations, isLoading }: FilterPanelProps) {
  const [localWeights, setLocalWeights] = useState<SKAParameters>(weights);

  const handleChange = (key: keyof SKAParameters, value: number) => {
    const updated = { ...localWeights, [key]: value };
    setLocalWeights(updated);
    onWeightsChange(updated); // Sync with parent state for instant local update if needed
  };

  return (
    <div className="absolute left-3 right-3 top-3 z-[20] flex max-h-[48svh] flex-col gap-4 overflow-y-auto rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-2xl backdrop-blur-md sm:left-6 sm:right-auto sm:top-6 sm:w-80 sm:max-w-[calc(100vw-3rem)] sm:max-h-[82svh] sm:p-5">
      <div className="border-b pb-3">
        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
          Transit Gap Compass
        </h2>
        <p className="text-xs text-slate-500 mt-1">Sesuaikan bobot parameter untuk simulasi SKA</p>
      </div>

      <div className="space-y-4">
        {/* Kepadatan */}
        <div>
          <div className="mb-1 flex flex-wrap justify-between gap-x-3 gap-y-1 text-sm">
            <span className="font-medium text-slate-700">Kepadatan Penduduk</span>
            <span className="text-blue-600 font-bold">{(localWeights.w1 * 100).toFixed(0)}%</span>
          </div>
          <input 
            type="range" min="0" max="1" step="0.05"
            value={localWeights.w1}
            onChange={(e) => handleChange('w1', parseFloat(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>

        {/* Blind Spot */}
        <div>
          <div className="mb-1 flex flex-wrap justify-between gap-x-3 gap-y-1 text-sm">
            <span className="font-medium text-slate-700">Blind Spot Area</span>
            <span className="text-blue-600 font-bold">{(localWeights.w2 * 100).toFixed(0)}%</span>
          </div>
          <input 
            type="range" min="0" max="1" step="0.05"
            value={localWeights.w2}
            onChange={(e) => handleChange('w2', parseFloat(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>

        {/* Jarak */}
        <div>
          <div className="mb-1 flex flex-wrap justify-between gap-x-3 gap-y-1 text-sm">
            <span className="font-medium text-slate-700">Jarak First Mile</span>
            <span className="text-blue-600 font-bold">{(localWeights.w3 * 100).toFixed(0)}%</span>
          </div>
          <input 
            type="range" min="0" max="1" step="0.05"
            value={localWeights.w3}
            onChange={(e) => handleChange('w3', parseFloat(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>

        {/* Frekuensi */}
        <div>
          <div className="mb-1 flex flex-wrap justify-between gap-x-3 gap-y-1 text-sm">
            <span className="font-medium text-slate-700">Frekuensi Layanan</span>
            <span className="text-blue-600 font-bold">{(localWeights.w4 * 100).toFixed(0)}%</span>
          </div>
          <input 
            type="range" min="0" max="1" step="0.05"
            value={localWeights.w4}
            onChange={(e) => handleChange('w4', parseFloat(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-2">
        <button 
          onClick={onApply}
          disabled={isLoading}
          className="min-h-11 w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 font-semibold text-white shadow transition-all hover:opacity-90 disabled:opacity-50 sm:min-h-0"
        >
          {isLoading ? 'Menghitung SKA...' : 'Terapkan Filter SKA'}
        </button>
        <button
          onClick={onToggleRecommendations}
          disabled={isLoading}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2.5 font-semibold text-indigo-600 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-50 sm:min-h-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Lihat Rekomendasi Halte
        </button>
      </div>
    </div>
  );
}
