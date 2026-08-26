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
    <div className="absolute top-6 right-6 z-[20] w-80 max-h-[80vh] flex flex-col bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
      <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Rekomendasi Halte</h2>
          <p className="text-xs text-slate-500">Berdasarkan SKA Tertinggi</p>
        </div>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-slate-200 rounded-full transition-colors"
        >
          <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
              className="group flex gap-3 p-3 border border-slate-100 rounded-xl bg-white hover:border-blue-300 hover:shadow-md cursor-pointer transition-all"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                {rec.rank}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-slate-800 truncate" title={rec.nama || 'Titik Halte'}>
                  {rec.nama || `Titik Halte ${rec.rank}`}
                </h4>
                <div className="flex justify-between items-end mt-1">
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
