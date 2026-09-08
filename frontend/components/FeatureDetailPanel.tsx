'use client';

import { SelectedFeatureDetail } from '@/lib/types';

interface FeatureDetailPanelProps {
  feature: SelectedFeatureDetail | null;
  onClose: () => void;
  onAssessCondition?: (halteId: string, halteName: string) => void;
}

const hiddenKeys = new Set(['_layer_key', '_layer_id', '_layer_name', '_geometry_type']);

function formatValue(key: string, value: any) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'number') {
    if (key.toLowerCase().includes('pct') || key.toLowerCase().includes('percent')) return `${value.toFixed(1)}%`;
    if (key.toLowerCase().includes('score') || key.toLowerCase().includes('ska')) return value.toFixed(2);
    if (key.toLowerCase().includes('kepadatan')) return `${Math.round(value).toLocaleString('id-ID')} jiwa/km²`;
    return Number.isInteger(value) ? value.toLocaleString('id-ID') : value.toFixed(2);
  }
  if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export default function FeatureDetailPanel({ feature, onClose, onAssessCondition }: FeatureDetailPanelProps) {
  if (!feature) return null;

  const entries = Object.entries(feature.properties)
    .filter(([key]) => !hiddenKeys.has(key))
    .slice(0, 18);

  return (
    <div className="absolute right-6 top-6 z-[25] w-[22rem] max-w-[calc(100vw-3rem)] max-h-[82vh] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-slate-500">{feature.layerName}</p>
          <h2 className="truncate text-base font-bold text-slate-900">
            {feature.properties.display_name || feature.layerKey}
          </h2>
          <p className="text-xs text-slate-500">{feature.geometryType}</p>
        </div>
        <button
          onClick={onClose}
          className="grid h-7 w-7 shrink-0 place-items-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-900 transition-colors"
          aria-label="Tutup detail"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="max-h-[64vh] overflow-y-auto px-4 py-3">
        {feature.coordinates && (
          <div className="mb-3 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-900">
            {feature.coordinates[0].toFixed(6)}, {feature.coordinates[1].toFixed(6)}
          </div>
        )}

        <div className="divide-y divide-slate-100">
          {entries.map(([key, value]) => {
            const formatted = formatValue(key, value);
            const isLong = key.toLowerCase().includes('alamat') || String(value || '').length > 25;
            if (isLong) {
              return (
                <div key={key} className="py-2 text-xs flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-500 tracking-wide">{key}</span>
                  <div className="font-medium text-slate-900 leading-relaxed break-words bg-slate-50 p-2 rounded-lg border border-slate-200">
                    {formatted}
                  </div>
                </div>
              );
            }
            return (
              <div key={key} className="grid grid-cols-[42%_1fr] gap-3 py-2 text-sm">
                <span className="break-words text-slate-500">{key}</span>
                <span className="break-words text-right font-medium text-slate-800">{formatted}</span>
              </div>
            );
          })}
        </div>

        {feature.layerKey === 'halte_existing' && onAssessCondition && (
          <button
            onClick={() =>
              onAssessCondition(
                String(feature.properties.id || feature.properties.fid || feature.properties.display_name || 'halte'),
                String(feature.properties.nama_halte || feature.properties.display_name || 'Halte')
              )
            }
            className="mt-3 w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Nilai Kondisi Halte (AI)
          </button>
        )}
      </div>
    </div>
  );
}
