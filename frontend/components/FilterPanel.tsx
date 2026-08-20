'use client';

import { SKAParameters } from '@/lib/types';
import { useState } from 'react';

interface FilterPanelProps {
  weights: SKAParameters;
  onWeightsChange: (newWeights: SKAParameters) => void;
  onApply: () => void;
  isLoading: boolean;
}

export default function FilterPanel({ weights, onWeightsChange, onApply, isLoading }: FilterPanelProps) {
  const [localWeights, setLocalWeights] = useState<SKAParameters>(weights);

  const handleChange = (key: keyof SKAParameters, value: number) => {
    const updated = { ...localWeights, [key]: value };
    setLocalWeights(updated);
    onWeightsChange(updated); // Sync with parent state for instant local update if needed
  };

  return (
    <div className="absolute top-6 left-6 z-[20] w-80 bg-white/90 backdrop-blur-md p-5 rounded-2xl shadow-2xl border border-slate-200 flex flex-col gap-4">
      <div className="border-b pb-3">
        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
          Transit Gap Compass
        </h2>
        <p className="text-xs text-slate-500 mt-1">Sesuaikan bobot parameter untuk simulasi SKA</p>
      </div>

      <div className="space-y-4">
        {/* Kepadatan */}
        <div>
          <div className="flex justify-between text-sm mb-1">
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
          <div className="flex justify-between text-sm mb-1">
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
          <div className="flex justify-between text-sm mb-1">
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
          <div className="flex justify-between text-sm mb-1">
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

      <button 
        onClick={onApply}
        disabled={isLoading}
        className="mt-2 w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow hover:opacity-90 transition-all disabled:opacity-50"
      >
        {isLoading ? 'Menghitung SKA...' : 'Terapkan Filter SKA'}
      </button>
    </div>
  );
}
