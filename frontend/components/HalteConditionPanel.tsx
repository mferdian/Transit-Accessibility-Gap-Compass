'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { VisionAssessmentResponse } from '@/lib/types';
import { assessHalteImages } from '@/lib/api';

interface HalteConditionPanelProps {
  halteId: string;
  halteName: string;
  onClose: () => void;
}

const MAX_PHOTOS = 8;
const ALLOWED_TYPES = /^image\/(jpeg|png|webp|gif|bmp)$/;

const COMMUNITY_REVIEWS = [
  'Kalau malam lampu halte sering mati, pengguna kursi roda tidak bisa naik ke trotoar karena tidak ada ramp.',
];

function statusColor(status: string) {
  if (status === 'Baik') return 'text-green-600';
  if (status === 'Kritis') return 'text-red-600';
  return 'text-orange-500';
}

function statusRingColor(status: string) {
  if (status === 'Baik') return '#16a34a';
  if (status === 'Kritis') return '#dc2626';
  return '#f97316';
}

function ScoreRing({ score, status }: { score: number; status: string }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference * (1 - Math.min(Math.max(score, 0), 100) / 100);
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="9" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={statusRingColor(status)}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={progress}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-slate-800">{Math.round(score)}</span>
        <span className="text-[10px] text-slate-400">/100</span>
      </div>
    </div>
  );
}

function getBoxMeta(label: string) {
  const key = label.toLowerCase();
  if (key.includes('rusak') || key.includes('terhalang') || key.includes('dibatasi') || key.includes('patah') || key.includes('curam')) {
    return {
      stroke: '#ef4444',
      fill: 'rgba(239, 68, 68, 0.16)',
      fillHover: 'rgba(239, 68, 68, 0.38)',
      badge: 'bg-red-600 text-white',
      dot: 'bg-red-500',
      category: 'Perlu perhatian',
      dashed: false,
    };
  }
  if (key.includes('penanda') || key.includes('bus stop') || key.includes('stop marker')) {
    return {
      stroke: '#3b82f6',
      fill: 'rgba(59, 130, 246, 0.16)',
      fillHover: 'rgba(59, 130, 246, 0.38)',
      badge: 'bg-blue-600 text-white',
      dot: 'bg-blue-500',
      category: 'Penanda lokasi (tidak dinilai)',
      dashed: false,
    };
  }
  if (key.includes('guiding') || key.includes('ramp') || key.includes('ubin') || key.includes('tuna netra') || key.includes('akses')) {
    return {
      stroke: '#a855f7',
      fill: 'rgba(168, 85, 247, 0.18)',
      fillHover: 'rgba(168, 85, 247, 0.40)',
      badge: 'bg-purple-600 text-white',
      dot: 'bg-purple-500',
      category: 'Fasilitas aksesibilitas',
      dashed: false,
    };
  }
  return {
    stroke: '#10b981',
    fill: 'rgba(16, 185, 129, 0.16)',
    fillHover: 'rgba(16, 185, 129, 0.38)',
    badge: 'bg-emerald-600 text-white',
    dot: 'bg-emerald-500',
    category: 'Fasilitas terdeteksi',
    dashed: false,
  };
}

interface ParsedPolygon {
  label: string;
  index: number;
  points: [number, number][];
  svgPoints: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  anchorX: number;
  anchorY: number;
  placement: 'top' | 'bottom';
  yOffsetPx: number;
}

function parsePolygons(boxes: Record<string, number[]>): ParsedPolygon[] {
  const entries = Object.entries(boxes);
  const items: ParsedPolygon[] = entries.map(([label, coords], index) => {
    let pts: [number, number][] = [];
    if (coords.length === 4) {
      const [x1, y1, x2, y2] = coords;
      pts = [
        [x1, y1],
        [x2, y1],
        [x2, y2],
        [x1, y2],
      ];
    } else if (coords.length >= 6) {
      for (let i = 0; i < coords.length - 1; i += 2) {
        pts.push([coords[i], coords[i + 1]]);
      }
    }

    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const svgPoints = pts
      .map(([x, y]) => `${(x * 100).toFixed(2)},${(y * 100).toFixed(2)}`)
      .join(' ');

    const preferBottom = minY < 0.10;

    return {
      label,
      index: index + 1,
      points: pts,
      svgPoints,
      minX,
      maxX,
      minY,
      maxY,
      anchorX: Math.max(0.08, Math.min(0.92, (minX + maxX) / 2)),
      anchorY: preferBottom ? maxY : minY,
      placement: preferBottom ? 'bottom' : 'top',
      yOffsetPx: 0,
    };
  });

  // Anti-collision staggering: detect when labels are close and alternate placement / offsets
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      const xDiff = Math.abs(a.anchorX - b.anchorX);
      const yDiff = Math.abs(a.anchorY - b.anchorY);

      if (xDiff < 0.22 && yDiff < 0.08) {
        if (a.placement === 'top' && b.minY > 0.10) {
          b.placement = 'bottom';
          b.anchorY = b.maxY;
        } else if (a.placement === 'bottom' && b.maxY < 0.90) {
          b.placement = 'top';
          b.anchorY = b.minY;
        } else {
          b.yOffsetPx += 26;
        }
      }
    }
  }

  return items;
}

function BoxOverlay({
  boxes,
  hoveredLabel,
  onHoverLabel,
}: {
  boxes: Record<string, number[]>;
  hoveredLabel?: string | null;
  onHoverLabel?: (label: string | null) => void;
}) {
  const polygons = parsePolygons(boxes);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* SVG Polygons tracing true object contours */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full pointer-events-none"
      >
        {polygons.map((item) => {
          const meta = getBoxMeta(item.label);
          const isHovered = hoveredLabel === item.label;
          const isOtherHovered = hoveredLabel !== null && !isHovered;

          return (
            <polygon
              key={item.label}
              points={item.svgPoints}
              className="pointer-events-auto cursor-pointer transition-all duration-200"
              fill={isHovered ? meta.fillHover : meta.fill}
              stroke={meta.stroke}
              strokeWidth={isHovered ? '2.4' : '1.4'}
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={isOtherHovered ? 0.35 : 1.0}
              vectorEffect="non-scaling-stroke"
              style={{
                filter: isHovered
                  ? 'drop-shadow(0 0 5px rgba(255,255,255,0.95))'
                  : 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))',
              }}
              onMouseEnter={() => onHoverLabel?.(item.label)}
              onMouseLeave={() => onHoverLabel?.(null)}
              onClick={(e) => {
                e.stopPropagation();
                onHoverLabel?.(hoveredLabel === item.label ? null : item.label);
              }}
            />
          );
        })}
      </svg>

      {/* Collision-free, high-contrast labels */}
      {polygons.map((item) => {
        const meta = getBoxMeta(item.label);
        const isHovered = hoveredLabel === item.label;
        const isOtherHovered = hoveredLabel !== null && !isHovered;

        const topPct = item.placement === 'bottom'
          ? Math.min(94, item.maxY * 100 + 1)
          : Math.max(3, item.minY * 100 - 1);

        return (
          <div
            key={item.label}
            className={`absolute pointer-events-auto transition-all duration-200 cursor-pointer ${
              isHovered ? 'z-50 scale-105' : isOtherHovered ? 'z-10 opacity-35' : 'z-20 opacity-100'
            }`}
            style={{
              left: `${Math.max(10, Math.min(90, item.anchorX * 100))}%`,
              top: `${topPct}%`,
              transform: `translate(-50%, ${item.placement === 'bottom' ? '2px' : '-100%'}) translateY(${item.yOffsetPx}px)`,
            }}
            onMouseEnter={() => onHoverLabel?.(item.label)}
            onMouseLeave={() => onHoverLabel?.(null)}
            onClick={(e) => {
              e.stopPropagation();
              onHoverLabel?.(hoveredLabel === item.label ? null : item.label);
            }}
          >
            <div
              className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-lg backdrop-blur-md border transition-all ${
                isHovered
                  ? 'bg-slate-950 text-white border-white ring-2 ring-white/50 shadow-2xl'
                  : 'bg-slate-950/85 text-slate-100 border-white/25 hover:border-white/60'
              }`}
            >
              <span
                className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[9px] font-black text-white"
                style={{ backgroundColor: meta.stroke }}
              >
                {item.index}
              </span>
              <span className="max-w-[52vw] truncate font-semibold tracking-tight sm:max-w-[18rem]">
                {item.label.replace(/ \(foto \d+\)$/i, '')}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BoxLegend({
  boxes,
  hoveredLabel,
  onHoverLabel,
}: {
  boxes?: Record<string, number[]> | null;
  hoveredLabel?: string | null;
  onHoverLabel?: (label: string | null) => void;
}) {
  if (!boxes || Object.keys(boxes).length === 0) return null;
  return (
    <div className="grid gap-1.5">
      {Object.keys(boxes).map((label, index) => {
        const meta = getBoxMeta(label);
        const isHovered = hoveredLabel === label;
        return (
          <div
            key={label}
            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-all cursor-pointer ${
              isHovered
                ? 'bg-slate-200/90 ring-1 ring-slate-400 font-medium'
                : 'hover:bg-slate-100'
            }`}
            onMouseEnter={() => onHoverLabel?.(label)}
            onMouseLeave={() => onHoverLabel?.(null)}
            onClick={() => onHoverLabel?.(isHovered ? null : label)}
          >
            <span
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white shadow-sm"
              style={{ backgroundColor: meta.stroke }}
            >
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 truncate font-semibold text-slate-800">
              {label.replace(/ \(foto \d+\)$/i, '')}
            </span>
            <span className="ml-auto max-w-[50%] shrink-0 text-right text-[10px] leading-snug text-slate-500 sm:max-w-[44%]">
              {meta.category}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function AnnotatedImage({
  src,
  alt,
  boxes,
  fullScreen = false,
  onError,
  hoveredLabel,
  onHoverLabel,
}: {
  src: string;
  alt: string;
  boxes?: Record<string, number[]> | null;
  fullScreen?: boolean;
  onError?: () => void;
  hoveredLabel?: string | null;
  onHoverLabel?: (label: string | null) => void;
}) {
  return (
    <div className="relative inline-block max-h-full max-w-full leading-none">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={fullScreen
          ? 'block h-auto max-h-[72vh] w-auto max-w-[92vw] object-contain lg:max-w-[72vw]'
          : 'block h-auto max-h-56 w-auto max-w-full object-contain'}
        onError={onError}
      />
      {boxes && (
        <BoxOverlay
          boxes={boxes}
          hoveredLabel={hoveredLabel}
          onHoverLabel={onHoverLabel}
        />
      )}
    </div>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function HalteConditionPanel({ halteId, halteName, onClose }: HalteConditionPanelProps) {
  const [result, setResult] = useState<VisionAssessmentResponse | null>(null);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [activePhoto, setActivePhoto] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!viewerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setViewerOpen(false);
      if (event.key === 'ArrowLeft') {
        setActivePhoto((current) => (current - 1 + photoPreviews.length) % photoPreviews.length);
      }
      if (event.key === 'ArrowRight') {
        setActivePhoto((current) => (current + 1) % photoPreviews.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [viewerOpen, photoPreviews.length]);

  const handleFiles = async (fileList: FileList | File[]) => {
    setError(null);
    setImageError(false);

    const rawFiles = Array.from(fileList);
    const files = rawFiles.filter((f) => ALLOWED_TYPES.test(f.type) && f.size <= 8 * 1024 * 1024);
    const rejected = Array.from(fileList).length - files.length;

    if (rejected > 0) {
      setError(`${rejected} file dilewati: format harus JPG/PNG/WebP dan maksimal 8 MB.`);
    }
    if (files.length === 0) return;

    const combined = [...photoPreviews];
    const newFiles: File[] = [];
    let activeIdx = activePhoto;

    for (const file of files) {
      if (combined.length >= MAX_PHOTOS) {
        setError(`Maksimal ${MAX_PHOTOS} foto per penilaian.`);
        break;
      }
      const dataUrl = await readFileAsDataUrl(file);
      activeIdx = combined.length;
      combined.push(dataUrl);
      newFiles.push(file);
    }

    if (newFiles.length === 0) return;

    setPhotoPreviews(combined);
    setActivePhoto(activeIdx);
    // Selecting photos is a staging action. Analysis only runs when the user is ready.
    setResult(null);
  };

  const analyzeSelectedPhotos = async () => {
    if (photoPreviews.length === 0) {
      setError('Pilih minimal satu foto halte.');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const payloads = photoPreviews.map((dataUrl) => ({
        image_base64: dataUrl.split(',')[1],
        image_mime_type: dataUrl.slice(5, dataUrl.indexOf(';')),
      }));
      const data = await assessHalteImages(halteId, halteName, payloads);
      setResult(data);
      setActivePhoto(0);
    } catch (err: any) {
      setError(err.message || 'Gagal menilai gambar halte.');
    } finally {
      setIsLoading(false);
    }
  };

  const removePhoto = (index: number) => {
    const next = photoPreviews.filter((_, idx) => idx !== index);
    setPhotoPreviews(next);
    setResult(null);
    setImageError(false);
    setActivePhoto((current) => Math.min(current, Math.max(next.length - 1, 0)));
  };

  const assessment = result?.assessment;
  const photos = result?.photos || [];
  const activeBoxes =
    photos.length > 0 && photoPreviews[activePhoto]
      ? photos.find((p) => p.image_index === activePhoto)?.features.bounding_boxes
      : assessment?.features.bounding_boxes;
  const activeStatus =
    photos.length > 0 && photoPreviews[activePhoto]
      ? photos.find((p) => p.image_index === activePhoto)?.status
      : assessment?.status;
  const confidencePct = assessment ? Math.round(assessment.features.confidence_score * 100) : null;

  const loadSamplePhoto = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setError(null);
    setImageError(false);
    try {
      const response = await fetch('/test_halte.jpg');
      const blob = await response.blob();
      const file = new File([blob], 'contoh_halte_surabaya.jpg', { type: 'image/jpeg' });
      await handleFiles([file]);
    } catch (err: any) {
      setError('Gagal memuat contoh foto survei: ' + (err.message || ''));
    }
  };

  return (
    <div className="absolute inset-x-3 top-3 z-[30] flex max-h-[calc(100svh-1.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:left-1/2 sm:right-auto sm:top-6 sm:w-[25rem] sm:max-w-[calc(100vw-2rem)] sm:-translate-x-1/2 sm:max-h-[88svh]">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-3 sm:px-4">
        <h2 className="min-w-0 text-sm font-bold text-slate-800">Audit Kondisi Fisik Halte</h2>
        <button
          onClick={onClose}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 sm:h-7 sm:w-7"
          aria-label="Tutup panel kondisi halte"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-4">
        <h3 className="break-words text-lg font-bold text-slate-900">{halteName}</h3>
        {assessment ? (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className={`text-xs font-medium ${statusColor(assessment.status)}`}>
              {assessment.status} &bull; <span className="italic text-slate-400">Last update: {result?.last_update}</span>
            </p>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                result?.source === 'mock'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {result?.source === 'mock' ? 'Data Demo' : `AI: ${result?.source}`}
            </span>
          </div>
        ) : (
          <p className="text-xs text-slate-400">
            Belum ada penilaian. Unggah satu atau beberapa foto halte untuk menilai.
          </p>
        )}

        <div
          className={`relative mt-3 h-48 overflow-hidden rounded-xl border-2 border-dashed bg-slate-50 transition-colors sm:h-56 ${
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300'
          } ${photoPreviews.length === 0 ? 'cursor-pointer' : ''}`}
          onClick={() => {
            if (photoPreviews.length === 0) fileInputRef.current?.click();
          }}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            event.preventDefault();
            if (event.currentTarget === event.target) setIsDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            if (event.dataTransfer.files.length) handleFiles(event.dataTransfer.files);
          }}
        >
          {photoPreviews[activePhoto] && !imageError ? (
            <>
              <div className="absolute inset-0 grid place-items-center bg-slate-950/5">
                <AnnotatedImage
                  src={photoPreviews[activePhoto]}
                  alt={`Foto ${activePhoto + 1} - ${halteName}`}
                  boxes={activeBoxes}
                  onError={() => setImageError(true)}
                  hoveredLabel={hoveredLabel}
                  onHoverLabel={setHoveredLabel}
                />
              </div>
              {assessment && (
                <button
                  onClick={() => setViewerOpen(true)}
                  className="absolute right-2 top-2 rounded-lg bg-slate-950/75 px-2.5 py-1.5 text-[10px] font-bold text-white shadow hover:bg-slate-950"
                  aria-label="Buka foto penuh dengan anotasi"
                >
                  Lihat penuh
                </button>
              )}
              {photos.length > 1 && (
                <span className="absolute bottom-2 right-2 rounded-full bg-slate-900/70 px-2 py-0.5 text-[10px] font-medium text-white">
                  {activePhoto + 1}/{photoPreviews.length}
                  {activeStatus ? ` · ${activeStatus}` : ''}
                </span>
              )}
            </>
          ) : (
            <div className="grid h-full place-items-center p-4 text-center text-sm text-slate-400 sm:p-6">
              {imageError ? (
                <span className="text-red-500">
                  Gambar tidak dapat ditampilkan. Klik untuk pilih foto lain (JPG/PNG/WebP).
                </span>
              ) : (
                <span>
                  <span className="block font-semibold text-slate-600">
                    {isDragging ? 'Lepaskan foto di sini' : 'Tarik foto atau klik untuk memilih'}
                  </span>
                  <span className="mt-1 block text-xs">1-8 foto · JPG/PNG/WebP · maks. 8 MB/foto</span>
                  <span className="mt-2 block text-[10px] text-slate-400">
                    Ambil sudut depan, samping, lantai akses, dan papan informasi
                  </span>
                  <button
                    type="button"
                    onClick={loadSamplePhoto}
                    className="mt-3 inline-flex min-h-10 max-w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-100 sm:min-h-0"
                  >
                    <svg className="w-3.5 h-3.5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <span>Gunakan Contoh Foto Halte</span>
                  </button>
                </span>
              )}
            </div>
          )}
          {isLoading && (
            <div className="absolute inset-0 grid place-items-center bg-white/70 text-sm font-medium text-slate-600">
              Menganalisis {photoPreviews.length > 1 ? `${photoPreviews.length} foto` : 'gambar'}...
            </div>
          )}
        </div>

        {photoPreviews.length > 0 && (
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {photoPreviews.map((url, idx) => {
              const photo = photos.find((p) => p.image_index === idx);
              return (
                <div key={idx} className="relative h-16 w-16 shrink-0 sm:h-16 sm:w-16">
                  <button
                    onClick={() => {
                      setActivePhoto(idx);
                      setImageError(false);
                    }}
                    className={`h-full w-full overflow-hidden rounded-lg border-2 transition-colors ${
                      idx === activePhoto ? 'border-blue-600' : 'border-transparent hover:border-slate-300'
                    }`}
                    aria-label={`Lihat foto ${idx + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Foto ${idx + 1}`} className="h-full w-full object-cover" />
                    {photo && (
                      <span
                        className={`absolute bottom-0 right-0 rounded-tl px-1 text-[9px] font-bold text-white ${
                          photo.status === 'Baik' ? 'bg-green-600' : photo.status === 'Kritis' ? 'bg-red-600' : 'bg-orange-500'
                        }`}
                      >
                        {Math.round(photo.score)}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => removePhoto(idx)}
                    className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-slate-900 text-[10px] text-white shadow hover:bg-red-600 sm:h-5 sm:w-5"
                    aria-label={`Hapus foto ${idx + 1}`}
                  >
                    x
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {assessment && activeBoxes && (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Objek pada foto {activePhoto + 1}</p>
              <button onClick={() => setViewerOpen(true)} className="text-[10px] font-bold text-blue-600 hover:text-blue-800">
                Buka anotasi penuh
              </button>
            </div>
            <BoxLegend
              boxes={activeBoxes}
              hoveredLabel={hoveredLabel}
              onHoverLabel={setHoveredLabel}
            />
          </div>
        )}

        {photoPreviews.length > 0 && (
          <div className="mt-3 grid grid-cols-1 gap-2 min-[360px]:grid-cols-[auto_1fr]">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || photoPreviews.length >= MAX_PHOTOS}
              className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 sm:min-h-0"
            >
              + Tambah
            </button>
            <button
              onClick={analyzeSelectedPhotos}
              disabled={isLoading}
              className="min-h-11 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 sm:min-h-0"
            >
              {isLoading ? 'Menganalisis...' : `Analisis ${photoPreviews.length} Foto`}
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif,image/bmp"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files);
            e.target.value = '';
          }}
        />

        {error && <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

        {assessment && (
          <>
            <div className="mt-4 flex flex-col items-center gap-3 min-[360px]:flex-row min-[360px]:items-start">
              <ScoreRing score={assessment.score} status={assessment.status} />
              <div className="w-full min-w-0 flex-1 rounded-xl bg-orange-50 p-3">
                <div className="mb-1 text-orange-500">✦</div>
                <p className="text-xs leading-relaxed text-orange-700">{assessment.ai_notes}</p>
                {photos.length > 1 && (
                  <p className="mt-1 text-[10px] text-orange-500">
                    Skor gabungan dari {photos.length} foto
                  </p>
                )}
                {confidencePct !== null && result?.source !== 'mock' && (
                  <div className="mt-2 flex items-center gap-2 border-t border-orange-100 pt-2">
                    <span className="text-[10px] uppercase tracking-wide text-orange-500">Confidence</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-orange-100">
                      <div className="h-full rounded-full bg-orange-500" style={{ width: `${confidencePct}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-orange-600">{confidencePct}%</span>
                  </div>
                )}
              </div>
            </div>

            {confidencePct !== null && result?.source !== 'mock' && confidencePct < 60 && (
              <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Keyakinan model rendah. Tambahkan foto yang lebih terang dan menampilkan akses lantai serta papan informasi.
              </p>
            )}

            <h4 className="mt-5 text-sm font-bold text-slate-800">Detail Scoring Aturan</h4>
            <div className="mt-2 divide-y divide-slate-100">
              {assessment.aspects.map((aspect) => {
                const full = aspect.score >= aspect.max_score;
                const isOpen = expanded === aspect.key;
                return (
                  <div key={aspect.key}>
                    <button
                      className="flex w-full items-center justify-between py-2.5 text-left"
                      onClick={() => setExpanded(isOpen ? null : aspect.key)}
                    >
                      <span className="text-sm font-medium text-slate-700">{aspect.label}</span>
                    <span className={`ml-2 flex shrink-0 items-center gap-1 text-sm font-bold ${full ? 'text-green-600' : 'text-orange-500'}`}>
                        {aspect.score}/{aspect.max_score}
                        {aspect.note && <span className="text-xs font-normal">{isOpen ? '⌄' : '›'}</span>}
                      </span>
                    </button>
                    {isOpen && aspect.note && (
                      <p className="pb-2 text-xs text-slate-500">{aspect.note}</p>
                    )}
                  </div>
                );
              })}
            </div>

            <h4 className="mt-5 text-sm font-bold text-blue-700">Ulasan Komunitas</h4>
            <div className="mt-2 space-y-2">
              {COMMUNITY_REVIEWS.map((review, idx) => (
                <p key={idx} className="rounded-lg bg-blue-50 p-3 text-xs italic leading-relaxed text-blue-900">
                  &quot;{review}&quot;
                </p>
              ))}
            </div>
          </>
        )}
      </div>

      {viewerOpen && photoPreviews[activePhoto] && createPortal(
        <div
          className="fixed inset-0 z-[1000] flex flex-col bg-slate-950/95 text-white backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Foto halte penuh dengan bounding box"
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-3 sm:px-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{halteName}</p>
              <p className="text-xs text-slate-400">Foto {activePhoto + 1} dari {photoPreviews.length} · anotasi hasil AI</p>
            </div>
            <button
              onClick={() => setViewerOpen(false)}
              className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-lg hover:bg-white/20 sm:h-9 sm:w-9"
              aria-label="Tutup viewer"
            >
              x
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto p-3 sm:p-4 lg:pr-80">
            <AnnotatedImage
              src={photoPreviews[activePhoto]}
              alt={`Foto penuh ${activePhoto + 1} - ${halteName}`}
              boxes={activeBoxes}
              fullScreen
              hoveredLabel={hoveredLabel}
              onHoverLabel={setHoveredLabel}
            />

            {photoPreviews.length > 1 && (
              <>
                <button
                  onClick={() => setActivePhoto((current) => (current - 1 + photoPreviews.length) % photoPreviews.length)}
                  className="fixed left-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-2xl hover:bg-white/20 sm:left-3 sm:h-11 sm:w-11"
                  aria-label="Foto sebelumnya"
                >
                  ‹
                </button>
                <button
                  onClick={() => setActivePhoto((current) => (current + 1) % photoPreviews.length)}
                  className="fixed right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-2xl hover:bg-white/20 sm:right-3 sm:h-11 sm:w-11 lg:right-[20rem]"
                  aria-label="Foto berikutnya"
                >
                  ›
                </button>
              </>
            )}
          </div>

          <aside className="max-h-[36svh] overflow-y-auto border-t border-white/10 bg-slate-900 p-3 sm:p-4 lg:fixed lg:bottom-0 lg:right-0 lg:top-[65px] lg:max-h-none lg:w-72 lg:border-l lg:border-t-0">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Deteksi Foto {activePhoto + 1}</p>
            {activeBoxes ? (
              <div className="space-y-2 rounded-xl bg-white p-3 text-slate-900">
                <BoxLegend
                  boxes={activeBoxes}
                  hoveredLabel={hoveredLabel}
                  onHoverLabel={setHoveredLabel}
                />
              </div>
            ) : (
              <p className="rounded-lg bg-white/5 p-3 text-xs text-slate-400">Tidak ada bounding box pada foto ini.</p>
            )}
            <p className="mt-4 text-[10px] leading-relaxed text-slate-500">
              Tekan Esc untuk menutup. Gunakan tombol panah kiri/kanan untuk berpindah foto.
            </p>
          </aside>
        </div>,
        document.body
      )}
    </div>
  );
}
