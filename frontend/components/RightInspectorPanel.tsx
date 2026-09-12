'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import { SelectedFeatureDetail, RecommendationPoint } from '@/lib/types';

interface RightInspectorPanelProps {
  selectedFeature: SelectedFeatureDetail | null;
  onCloseFeature: () => void;
  onAssessCondition?: (halteId: string, halteName: string) => void;
  recommendations: RecommendationPoint[];
  isRecLoading: boolean;
  showRecommendations: boolean;
  onCloseRecommendations: () => void;
  onRecommendationClick: (lat: number, lon: number, rec?: RecommendationPoint) => void;
  activeRecommendation?: RecommendationPoint | null;
  onClearActiveRecommendation?: () => void;
  activeTab: 'detail' | 'recommendations';
  onTabChange: (tab: 'detail' | 'recommendations') => void;
}

const hiddenKeys = new Set(['_layer_key', '_layer_id', '_layer_name', '_geometry_type', 'display_name', 'carbon_footprint']);

const KNOWN_LABELS: Record<string, string> = {
  // Wilayah Administrasi
  DESA: 'Kelurahan / Desa',
  nama: 'Nama Wilayah',
  KECAMATAN: 'Kecamatan',
  KABKOT: 'Kota / Kabupaten',
  PROVINSI: 'Provinsi',
  ALAMAT: 'Alamat Lokasi',
  STATUS: 'Status Operasional',
  status_operasional: 'Status Operasional',
  nama_halte: 'Nama Halte',
  NAMA: 'Nama Objek',
  TIPE_1: 'Tipe Fasilitas',
  TIPE_2: 'Kategori Fasilitas',
  TIPE_3: 'Klasifikasi Halte',
  TELEPON: 'Kontak Pengelola',

  // SKA & Indikator Kesenjangan Transit
  ska_score: 'Skor SKA (Kesenjangan Akses)',
  kategori_ska: 'Tingkat Kesenjangan',
  blind_spot_pct: 'Area Blind Spot Transit',
  jarak_first_mile: 'Jarak First-Mile ke Halte',
  frekuensi: 'Frekuensi Layanan Transit',
  gap_score: 'Skor GAP Aksesibilitas',
  priority_score: 'Skor Prioritas Halte',
  radius_layanan: 'Radius Jangkauan Layanan',
  estimasi_penduduk_terlayani: 'Est. Penduduk Terlayani',
  estimasi_perubahan_ska: 'Est. Penurunan Kesenjangan',
  jenis_rekomendasi: 'Jenis Rekomendasi',

  // Area Kesenjangan (GAP)
  luas_m2_sum: 'Total Luas Area GAP',
  luas_m2_count: 'Jumlah Blok Kesenjangan',
  luas_m2_mean: 'Rata-rata Luas Blok',
  row_index: 'Indeks Baris Grid',
  col_index: 'Indeks Kolom Grid',
  left: 'Batas Barat (Lon Min)',
  right: 'Batas Timur (Lon Max)',
  top: 'Batas Utara (Lat Max)',
  bottom: 'Batas Selatan (Lat Min)',

  // Data Kependudukan Terbaru (2024)
  'JUMLAH PENDUDUK 2024': 'Jumlah Penduduk (Tahun 2024 - Terbaru)',
  'KEPADATAN PENDUDUK 2024': 'Kepadatan Penduduk (Tahun 2024 - Terbaru)',
  jumlah_penduduk: 'Jumlah Penduduk (Tahun 2024)',
  kepadatan: 'Kepadatan Penduduk (Tahun 2024)',
  'LUAS WILAYAH (KM²)': 'Luas Wilayah',
  'JUMLAH KK': 'Jumlah Kepala Keluarga (KK)',
  'LAKI-LAKI': 'Penduduk Laki-Laki',
  PEREMPUAN: 'Penduduk Perempuan',
  'JUMLAH WAJIB KTP': 'Penduduk Wajib KTP',
  'JUMLAH REKAM WAJIB KTP': 'Perekaman E-KTP',
  'JUMLAH MENINGGAL': 'Kematian Tercatat',
  'PERPINDAHAN PENDUDUK': 'Migrasi Penduduk',

  // Riwayat Kependudukan Tahun-Tahun Sebelumnya
  'JUMLAH PENDUDUK 2023': 'Jumlah Penduduk (Tahun 2023)',
  'JUMLAH PENDUDUK 2022': 'Jumlah Penduduk (Tahun 2022)',
  'JUMLAH PENDUDUK 2021': 'Jumlah Penduduk (Tahun 2021)',
  'JUMLAH PENDUDUK 2020': 'Jumlah Penduduk (Tahun 2020)',
  'KEPADATAN PENDUDUK 2023': 'Kepadatan Penduduk (Tahun 2023)',
  'KEPADATAN PENDUDUK 2022': 'Kepadatan Penduduk (Tahun 2022)',
  'KEPADATAN PENDUDUK 2021': 'Kepadatan Penduduk (Tahun 2021)',
  'KEPADATAN PENDUDUK 2020': 'Kepadatan Penduduk (Tahun 2020)',

  // Kode Wilayah & Sistem
  ID_DESA: 'Kode Kelurahan (BPS)',
  ID_KEC: 'Kode Kecamatan',
  ID_KABKOT: 'Kode Kab / Kota',
  ID_PROV: 'Kode Provinsi',
  fid: 'ID Fitur (FID)',
  id: 'ID Identifikasi',
  LATITUDE: 'Garis Lintang (Lat)',
  LONGITUDE: 'Garis Bujur (Lon)',
  'TANGGAL PENGUMPULAN': 'Tgl. Pengumpulan Data',
  'TANGGAL UPDATE': 'Tgl. Pembaruan Data',
};

function getHumanLabel(key: string): string {
  if (KNOWN_LABELS[key]) return KNOWN_LABELS[key];

  const jmlMatch = key.match(/^JUMLAH\s+PENDUDUK\s+(\d{4})/i);
  if (jmlMatch) return `Jumlah Penduduk (Tahun ${jmlMatch[1]})`;

  const kpdMatch = key.match(/^KEPADATAN\s+PENDUDUK\s+(\d{4})/i);
  if (kpdMatch) return `Kepadatan Penduduk (Tahun ${kpdMatch[1]})`;

  const growthMatch = key.match(/^PERTUMBUHAN\s+PENDUDUK\s+TAHUN\s+(\d{4})/i);
  if (growthMatch) return `Pertumbuhan Penduduk (${growthMatch[1]})`;

  const birthMatch = key.match(/^LAHIR\s+TAHUN\s+(\d{4})/i);
  if (birthMatch) return `Kelahiran Tahun ${birthMatch[1]}`;

  return key
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(key: string, value: any) {
  if (value === null || value === undefined || value === '') return '-';
  const k = key.toLowerCase();

  if (typeof value === 'number') {
    if (k.includes('pct') || k.includes('percent') || k.includes('pertumbuhan')) {
      return `${value.toFixed(1)}%`;
    }
    if (k.includes('score') || k.includes('ska')) {
      return value.toFixed(2);
    }
    if (k.includes('kepadatan')) {
      return `${Math.round(value).toLocaleString('id-ID')} jiwa/km²`;
    }
    if (
      k.includes('penduduk') ||
      k.includes('laki') ||
      k.includes('perempuan') ||
      k.includes('meninggal') ||
      k.includes('ktp') ||
      k.includes('terlayani')
    ) {
      return `${Math.round(value).toLocaleString('id-ID')} jiwa`;
    }
    if (k.includes('kk')) {
      return `${Math.round(value).toLocaleString('id-ID')} KK`;
    }
    if (k.includes('count')) {
      return Number.isInteger(value) ? `${value.toLocaleString('id-ID')} unit` : String(value);
    }
    if (k.includes('luas_m2') || k.includes('m2')) {
      return `${Math.round(value).toLocaleString('id-ID')} m²`;
    }
    if (k.includes('luas')) {
      return `${value.toFixed(2)} km²`;
    }
    if (k.includes('jarak') || k.includes('radius')) {
      return `${Math.round(value).toLocaleString('id-ID')} meter`;
    }
    if (k.includes('frekuensi')) {
      return `${value.toFixed(1)} armada/jam`;
    }
    if (k === 'fid' || k.startsWith('id_') || k === 'id') {
      return String(value);
    }
    return Number.isInteger(value) ? value.toLocaleString('id-ID') : value.toFixed(2);
  }

  if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function categorizeKey(key: string): 'primary' | 'history' | 'technical' {
  const k = key.toUpperCase();
  if (/\b(2020|2021|2022|2023)\b/.test(k)) {
    return 'history';
  }
  if (['FID', 'ID', 'ID_DESA', 'ID_KEC', 'ID_KABKOT', 'ID_PROV', 'ROW_INDEX', 'COL_INDEX', 'LEFT', 'RIGHT', 'TOP', 'BOTTOM', 'LATITUDE', 'LONGITUDE', 'TANGGAL PENGUMPULAN', 'TANGGAL UPDATE'].includes(k)) {
    return 'technical';
  }
  return 'primary';
}

function isLongAttribute(key: string, value: any): boolean {
  const k = key.toLowerCase();
  if (
    k.includes('alamat') ||
    k.includes('deskripsi') ||
    k.includes('keterangan') ||
    k.includes('catatan') ||
    k.includes('evidence') ||
    k.includes('lokasi') ||
    k.includes('uraian')
  ) {
    return true;
  }
  const strVal = String(value ?? '').trim();
  if (strVal.length > 25) {
    return true;
  }
  return false;
}

function renderPropertyRow(key: string, value: any, isMono = false) {
  const formattedVal = formatValue(key, value);
  const label = getHumanLabel(key);
  const isLong = isLongAttribute(key, value);

  if (isLong) {
    return (
      <div key={key} className="py-2.5 text-xs flex flex-col gap-1">
        <span className="block text-[11px] font-semibold text-slate-500 tracking-wide">
          {label}
        </span>
        <div className="font-semibold text-slate-900 leading-relaxed break-words bg-slate-100/90 p-2.5 rounded-xl border border-slate-200/80 text-xs shadow-2xs select-text">
          {formattedVal}
        </div>
      </div>
    );
  }

  return (
    <div key={key} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-2 text-xs">
      <span className={`font-medium text-slate-600 leading-snug ${isMono ? 'font-mono text-[11px]' : ''}`}>
        {label}
      </span>
      <span className={`min-w-0 flex-1 font-bold text-slate-900 text-right break-words leading-snug min-[360px]:min-w-[42%] ${isMono ? 'font-mono text-[11px]' : ''}`}>
        {formattedVal}
      </span>
    </div>
  );
}

export default function RightInspectorPanel({
  selectedFeature,
  onCloseFeature,
  onAssessCondition,
  recommendations,
  isRecLoading,
  showRecommendations,
  onCloseRecommendations,
  onRecommendationClick,
  activeRecommendation,
  onClearActiveRecommendation,
  activeTab,
  onTabChange,
}: RightInspectorPanelProps) {
  const hasFeature = Boolean(selectedFeature);
  const hasRecommendations = showRecommendations;

  // Collapsible sub-sections
  const [showHistory, setShowHistory] = useState(false);
  const [showTechnical, setShowTechnical] = useState(false);

  // If neither is active, render nothing
  if (!hasFeature && !hasRecommendations) return null;

  // Determine current tab safely
  const currentTab = activeTab === 'detail' && !hasFeature
    ? 'recommendations'
    : activeTab === 'recommendations' && !hasRecommendations
    ? 'detail'
    : activeTab;

  const rawEntries = selectedFeature
    ? Object.entries(selectedFeature.properties)
        .filter(([key]) => !hiddenKeys.has(key))
    : [];

  const primaryEntries = rawEntries.filter(([key]) => categorizeKey(key) === 'primary');
  const historyEntries = rawEntries.filter(([key]) => categorizeKey(key) === 'history');
  const technicalEntries = rawEntries.filter(([key]) => categorizeKey(key) === 'technical');

  const p = selectedFeature?.properties || {};
  const hasSkaSummary = p.ska_score != null;

  return (
    <aside
      aria-label="Panel Inspeksi Kanan"
      className="pointer-events-auto flex max-h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 shadow-2xl backdrop-blur-md transition-all sm:w-[22rem] sm:max-w-[calc(100vw-3rem)]"
    >
      {/* Tab Switcher Header (when both are active) */}
      {hasFeature && hasRecommendations ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-3 py-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-1 rounded-lg bg-slate-200/70 p-1 text-xs">
            <button
              onClick={() => onTabChange('detail')}
              className={`flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md px-2 py-1 font-semibold transition-all sm:flex-none sm:gap-1.5 sm:px-2.5 ${
                currentTab === 'detail'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <svg className="h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
              </svg>
              <span className="truncate">Detail</span>
            </button>
            <button
              onClick={() => onTabChange('recommendations')}
              className={`flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md px-2 py-1 font-semibold transition-all sm:flex-none sm:gap-1.5 sm:px-2.5 ${
                currentTab === 'recommendations'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="truncate">Rekomendasi</span>
              {recommendations.length > 0 && (
                <span className="rounded-full bg-slate-200 px-1.5 py-0.2 text-[10px] font-bold text-slate-700">
                  {recommendations.length}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (currentTab === 'detail') onCloseFeature();
                else onCloseRecommendations();
              }}
              title="Tutup tab aktif"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-700 sm:h-7 sm:w-7"
              aria-label="Tutup tab"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ) : hasFeature ? (
        /* Single Feature Detail Header */
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-3 py-3 sm:px-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {selectedFeature?.layerName}
            </p>
            <h2 className="truncate text-sm font-bold text-slate-900">
              {selectedFeature?.properties.display_name || selectedFeature?.properties.nama || selectedFeature?.properties.DESA || selectedFeature?.layerKey}
            </h2>
            <p className="text-[11px] text-slate-400">{selectedFeature?.geometryType}</p>
          </div>
          <button
            onClick={onCloseFeature}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-700 sm:h-7 sm:w-7"
            aria-label="Tutup detail fitur"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        /* Single Recommendation Header */
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-3 py-3 sm:px-4">
          <div className="min-w-0">
            <h2 className="text-xs font-bold text-slate-900 tracking-tight">Rekomendasi Halte Baru</h2>
            <p className="text-[10px] text-slate-500 font-normal">Prioritas penempatan halte berdasarkan skor SKA</p>
          </div>
          <button
            onClick={onCloseRecommendations}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-700 sm:h-7 sm:w-7"
            aria-label="Tutup rekomendasi"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Tab 1: Feature Detail Content */}
      {currentTab === 'detail' && selectedFeature && (
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 sm:px-4">
          {/* Sub-header title when in tab mode */}
          {hasRecommendations && (
            <div className="pb-2 border-b border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {selectedFeature.layerName}
              </p>
              <h3 className="text-sm font-bold text-slate-900 truncate">
                {selectedFeature.properties.display_name || selectedFeature.properties.nama || selectedFeature.properties.DESA || selectedFeature.layerKey}
              </h3>
            </div>
          )}

          {/* Coordinate Badge */}
          {selectedFeature.coordinates && (
            <div className="flex items-center gap-1.5 rounded-lg bg-blue-50/80 px-2.5 py-1.5 text-xs text-blue-900">
              <svg className="h-3 w-3 shrink-0 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-mono text-[11px]">
                {selectedFeature.coordinates[0].toFixed(5)}, {selectedFeature.coordinates[1].toFixed(5)}
              </span>
            </div>
          )}

          {/* SKA Highlight Card (if SKA properties exist) */}
          {hasSkaSummary && (
            <div className="rounded-xl border border-rose-100 bg-gradient-to-br from-rose-50/70 to-orange-50/40 p-3 shadow-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-rose-200/50">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
                  Indikator Kesenjangan (SKA)
                </span>
                <span className="rounded-md bg-rose-600 px-2 py-0.5 text-xs font-black text-white shadow-xs">
                  {p.ska_score?.toFixed(2) ?? '-'}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2 text-xs min-[360px]:grid-cols-2">
                <div>
                  <p className="text-[10px] text-slate-500">Tingkat Kesenjangan</p>
                  <p className="font-bold text-slate-900">{p.kategori_ska || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">Area Blind Spot</p>
                  <p className="font-bold text-slate-900">
                    {p.blind_spot_pct != null ? `${Number(p.blind_spot_pct).toFixed(1)}%` : '-'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Carbon Footprint / Green Mobility Card */}
          {p.carbon_footprint && (
            <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-white p-3 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/60 pb-1.5">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="text-sm">🌱</span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900">
                    Dampak Dekarbonisasi (Green Mobility)
                  </span>
                </div>
                <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-xs font-black text-white shadow-xs">
                  -{p.carbon_footprint.co2_reduction_tons_year} Ton/thn
                </span>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2 text-xs min-[360px]:grid-cols-2">
                <div>
                  <p className="text-[10px] text-emerald-800/80">Serapan Karbon Ekuivalen</p>
                  <p className="font-bold text-slate-900">
                    🌲 ~{p.carbon_footprint.tree_equivalent?.toLocaleString('id-ID')} Pohon
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-emerald-800/80">Pengalihan Kendaraan Pribadi</p>
                  <p className="font-bold text-slate-900">
                    🛵 ~{p.carbon_footprint.daily_vehicle_trips_reduced?.toLocaleString('id-ID')} trip/hari
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-emerald-800/80">Efisiensi Bahan Bakar (BBM)</p>
                  <p className="font-bold text-slate-900">
                    ⛽ ~{p.carbon_footprint.annual_fuel_liters_saved?.toLocaleString('id-ID')} liter/thn
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-emerald-800/80">Basis Metodologi</p>
                  <p className="font-semibold text-emerald-950">Modal Shift IPCC / WRI</p>
                </div>
              </div>
            </div>
          )}

          {/* Section 1: Data Utama & Kependudukan Terbaru */}
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {selectedFeature.layerKey === 'area_gap'
                ? 'Detail Kesenjangan Aksesibilitas (GAP)'
                : selectedFeature.layerKey === 'halte_existing' ||
                  selectedFeature.layerKey === 'rekomendasi_halte' ||
                  selectedFeature.layerKey === 'titik_rekomendasi'
                ? 'Informasi Halte Transit'
                : 'Informasi Wilayah & Kependudukan'}
            </p>
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-1">
              {primaryEntries.map(([key, value]) => renderPropertyRow(key, value))}
            </div>
          </div>

          {/* Section 2: Riwayat Sensus Penduduk (2020-2023) */}
          {historyEntries.length > 0 && (
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-100/70 transition-colors"
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Riwayat Sensus ({historyEntries.length} Data 2020–2023)
                  </span>
                </div>
                <svg
                  className={`h-3.5 w-3.5 text-slate-400 transition-transform ${showHistory ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showHistory && (
                <div className="border-t border-slate-100 divide-y divide-slate-100 px-3 py-1 bg-white/70">
                  {historyEntries.map(([key, value]) => renderPropertyRow(key, value))}
                </div>
              )}
            </div>
          )}

          {/* Section 3: Kode Wilayah & Data Teknis */}
          {technicalEntries.length > 0 && (
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowTechnical(!showTechnical)}
                className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-100/70 transition-colors"
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Kode Administrasi & Teknis ({technicalEntries.length})
                  </span>
                </div>
                <svg
                  className={`h-3.5 w-3.5 text-slate-400 transition-transform ${showTechnical ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showTechnical && (
                <div className="border-t border-slate-100 divide-y divide-slate-100 px-3 py-1 bg-white/70">
                  {technicalEntries.map(([key, value]) => renderPropertyRow(key, value, true))}
                </div>
              )}
            </div>
          )}

          {/* AI Vision Audit CTA for Existing Bus Stops */}
          {selectedFeature.layerKey === 'halte_existing' && onAssessCondition && (
            <button
              onClick={() =>
                onAssessCondition(
                  String(selectedFeature.properties.id || selectedFeature.properties.fid || selectedFeature.properties.display_name || 'halte'),
                  String(selectedFeature.properties.nama_halte || selectedFeature.properties.display_name || 'Halte')
                )
              }
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Audit Kondisi Halte (AI Vision)</span>
            </button>
          )}
        </div>
      )}

      {/* Tab 2: Recommendations Content */}
      {currentTab === 'recommendations' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {/* Citywide Decarbonization Banner */}
          {recommendations.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200/90 bg-gradient-to-r from-emerald-50 via-teal-50/60 to-white px-3 py-2 text-xs text-emerald-950 shadow-2xs">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-xs shadow-xs">
                  🌱
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-800">
                    Potensi Dekarbonisasi Kota
                  </p>
                  <p className="font-extrabold text-emerald-950 text-xs">
                    -{recommendations.reduce((sum, r) => sum + (r.carbon_footprint?.co2_reduction_tons_year || 0), 0).toLocaleString('id-ID', { maximumFractionDigits: 1 })} Ton CO₂e/thn
                  </p>
                </div>
              </div>
              <div className="ml-auto text-right">
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100/90 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                  🌲 ~{recommendations.reduce((sum, r) => sum + (r.carbon_footprint?.tree_equivalent || 0), 0).toLocaleString('id-ID')} Pohon
                </span>
              </div>
            </div>
          )}

          {/* Active Highlight Banner & Deselect Button */}
          {activeRecommendation && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300/80 bg-amber-50/95 px-3 py-2 text-xs text-amber-950 shadow-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-ping shrink-0" />
                <span className="font-bold truncate">
                  Fokus #{activeRecommendation.rank}: {activeRecommendation.nama || `Rekomendasi ${activeRecommendation.rank}`}
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearActiveRecommendation?.();
                }}
                className="flex min-h-8 shrink-0 items-center gap-1 rounded-lg border border-amber-300 bg-white px-2 py-1 text-[11px] font-bold text-amber-800 shadow-2xs transition-colors hover:bg-amber-100 sm:min-h-0"
                title="Hapus sorotan rekomendasi aktif dari peta"
              >
                <span>✕</span>
                <span>Hapus Sorotan</span>
              </button>
            </div>
          )}

          {isRecLoading ? (
            <div className="space-y-2.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="h-8 w-8 rounded-full bg-slate-200 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-3/4 rounded bg-slate-200" />
                    <div className="h-2.5 w-1/2 rounded bg-slate-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : recommendations.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Tidak ada rekomendasi halte. Coba turunkan threshold SKA.
            </div>
          ) : (
            recommendations.map((rec, idx) => {
              const isSelected = Boolean(
                activeRecommendation && (
                  activeRecommendation.rank === rec.rank ||
                  (Math.abs(activeRecommendation.lat - rec.lat) < 0.0001 && Math.abs(activeRecommendation.lon - rec.lon) < 0.0001)
                )
              );

              return (
                <div
                  key={`${rec.lat}-${rec.lon}-${idx}`}
                  onClick={() => {
                    if (isSelected) {
                      onClearActiveRecommendation?.();
                    } else {
                      onRecommendationClick(rec.lat, rec.lon, rec);
                    }
                  }}
                  title={isSelected ? 'Klik untuk membatalkan sorotan ini' : 'Klik untuk menyorot di peta'}
                  className={`group flex gap-2.5 rounded-xl border p-2.5 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50/80 shadow-md ring-2 ring-amber-400/40'
                      : 'border-slate-200/80 bg-white hover:border-blue-400 hover:shadow-md'
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black transition-colors ${
                      isSelected
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white'
                    }`}
                  >
                    {rec.rank}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <h4 className="min-w-0 flex-1 truncate text-xs font-bold text-slate-800" title={rec.nama || `Rekomendasi Halte ${rec.rank}`}>
                        {rec.nama || `Rekomendasi Halte ${rec.rank}`}
                      </h4>
                      {isSelected && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onClearActiveRecommendation?.();
                          }}
                          title="Hapus sorotan"
                          className="flex min-h-7 items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-2xs transition-colors hover:bg-amber-600 sm:min-h-0"
                        >
                          <span>Aktif</span>
                          <span className="font-black text-amber-100">✕</span>
                        </button>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
                      <span>Radius: {rec.radius_layanan}m</span>
                      <span className="font-semibold text-slate-700">
                        Est. {rec.estimasi_penduduk_terlayani.toLocaleString('id-ID')} jiwa
                      </span>
                    </div>
                    {/* Carbon Footprint Eco Chip */}
                    {rec.carbon_footprint && (
                      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 rounded-lg border border-emerald-200/70 bg-emerald-50/90 px-2 py-1 text-[10px] text-emerald-950">
                        <span className="flex items-center gap-1 font-bold text-emerald-900">
                          <span>🌱</span>
                          <span>-{rec.carbon_footprint.co2_reduction_tons_year} Ton CO₂/thn</span>
                        </span>
                        <span className="text-emerald-700 font-semibold">
                          🌲 ~{rec.carbon_footprint.tree_equivalent.toLocaleString('id-ID')} pohon
                        </span>
                      </div>
                    )}
                    <span className="mt-1.5 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-600">
                      {rec.jenis_rekomendasi}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </aside>
  );
}
