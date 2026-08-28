'use client';

import { MapidLayerKey } from '@/lib/types';

interface LayerTogglePanelProps {
  showSkaArea: boolean;
  onToggleSkaArea: () => void;
  visibleLayers: Record<MapidLayerKey, boolean>;
  onToggleLayer: (layerKey: MapidLayerKey) => void;
  loadingLayers: Partial<Record<MapidLayerKey, boolean>>;
}

const layers: Array<{ key: MapidLayerKey; label: string; hint: string; color: string }> = [
  { key: 'area_gap', label: 'Area GAP', hint: 'Polygon kesenjangan', color: 'bg-red-500' },
  { key: 'area_rekomendasi', label: 'Area Rekomendasi', hint: 'Area kandidat', color: 'bg-violet-500' },
  { key: 'demografi', label: 'Demografi Lokal', hint: '154 wilayah kelurahan', color: 'bg-emerald-600' },
  { key: 'halte_existing', label: 'Halte Existing', hint: '125 titik halte', color: 'bg-cyan-600' },
  { key: 'titik_rekomendasi', label: 'Titik Rekomendasi', hint: 'Marker prioritas', color: 'bg-blue-600' },
];

function ToggleButton({
  active,
  label,
  hint,
  color,
  loading,
  onClick,
}: {
  active: boolean;
  label: string;
  hint: string;
  color: string;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors ${
        active
          ? 'border-slate-800 bg-slate-900 text-white'
          : 'border-slate-200 bg-white text-slate-800 hover:border-slate-400'
      }`}
      aria-pressed={active}
    >
      <span className={`h-3 w-3 shrink-0 rounded-full ${color}`} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{label}</span>
        <span className={`block text-xs ${active ? 'text-slate-300' : 'text-slate-500'}`}>
          {loading ? 'Memuat...' : hint}
        </span>
      </span>
      <span className={`text-xs font-bold ${active ? 'text-white' : 'text-slate-400'}`}>
        {active ? 'ON' : 'OFF'}
      </span>
    </button>
  );
}

export default function LayerTogglePanel({
  showSkaArea,
  onToggleSkaArea,
  visibleLayers,
  onToggleLayer,
  loadingLayers
}: LayerTogglePanelProps) {
  return (
    <div className="absolute left-6 bottom-6 z-[20] w-80 bg-white/92 backdrop-blur-md p-4 rounded-lg shadow-xl border border-slate-200">
      <div className="mb-3">
        <h2 className="text-sm font-bold text-slate-800">Kontrol Layer Peta</h2>
        <p className="text-xs text-slate-500">Nyalakan atau matikan area dan titik</p>
      </div>

      <div className="space-y-2">
        <ToggleButton
          active={showSkaArea}
          label="Area SKA"
          hint="Choropleth kelurahan"
          color="bg-yellow-500"
          onClick={onToggleSkaArea}
        />

        {layers.map((layer) => (
          <ToggleButton
            key={layer.key}
            active={visibleLayers[layer.key]}
            label={layer.label}
            hint={layer.hint}
            color={layer.color}
            loading={loadingLayers[layer.key]}
            onClick={() => onToggleLayer(layer.key)}
          />
        ))}
      </div>
    </div>
  );
}
