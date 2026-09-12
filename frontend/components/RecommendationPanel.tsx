'use client';

import { RecommendationPoint } from '@/lib/types';

interface RecommendationPanelProps {
  recommendations: RecommendationPoint[];
  isLoading: boolean;
  onClose: () => void;
  onItemClick: (lat: number, lon: number) => void;
}

export default function RecommendationPanel({ recommendations, isLoading, onClose, onItemClick }: RecommendationPanelProps) {
  return (
    <div className="absolute inset-x-3 bottom-3 top-auto z-[20] flex max-h-[50svh] flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white/95 shadow-xl backdrop-blur-md sm:inset-x-auto sm:right-5 sm:top-5 sm:w-[21rem] sm:max-w-[calc(100vw-2.5rem)] sm:max-h-[82svh]">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/50 px-3 py-3 sm:px-4">
        <div className="min-w-0">
          <h2 className="text-xs font-bold text-slate-900 tracking-tight">Rekomendasi Halte Baru</h2>
          <p className="text-[10px] text-slate-500 font-normal">Prioritas berdasarkan SKA tertinggi</p>
        </div>
        <button 
          onClick={onClose}
          className="grid h-8 w-8 shrink-0 place-items-center rounded text-slate-400 transition-colors hover:bg-slate-200/60 hover:text-slate-700 sm:h-6 sm:w-6"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 sm:p-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="animate-pulse flex gap-3 p-3 border rounded-xl bg-slate-50">
                <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : recommendations.length === 0 ? (
          <div className="text-center text-slate-500 py-8">
            Tidak ada rekomendasi. Coba turunkan threshold SKA.
          </div>
        ) : (
          recommendations.map((rec, idx) => (
            <div 
              key={`${rec.lat}-${rec.lon}-${idx}`}
              onClick={() => onItemClick(rec.lat, rec.lon)}
              className="group flex min-h-16 cursor-pointer gap-3 rounded-xl border border-slate-100 bg-white p-3 transition-all hover:border-blue-300 hover:shadow-md sm:min-h-0"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                {rec.rank}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-slate-800 truncate" title={rec.nama || 'Titik Halte'}>
                  {rec.nama || `Titik Halte ${rec.rank}`}
                </h4>
                <div className="mt-1 flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
                  <div className="text-xs text-slate-500">
                    <div>Radius: {rec.radius_layanan}m</div>
                    <div className="text-green-600 font-medium">{rec.jenis_rekomendasi}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">Est. Penduduk</div>
                    <div className="font-bold text-slate-700">{rec.estimasi_penduduk_terlayani.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
