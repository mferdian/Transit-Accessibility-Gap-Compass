'use client';

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
  if (key.includes('rusak') || key.includes('terhalang') || key.includes('dibatasi')) {
    return { box: 'border-red-500', badge: 'bg-red-600 text-white', dot: 'bg-red-500', category: 'Perlu perhatian' };
  }
  if (key.includes('penanda') || key.includes('bus stop')) {
    return { box: 'border-blue-500', badge: 'bg-blue-600 text-white', dot: 'bg-blue-500', category: 'Penanda lokasi (tidak dinilai)' };
  }
  if (key.includes('guiding') || key.includes('ramp')) {
    return { box: 'border-purple-500', badge: 'bg-purple-600 text-white', dot: 'bg-purple-500', category: 'Fasilitas aksesibilitas' };
  }
  return { box: 'border-emerald-500', badge: 'bg-emerald-600 text-white', dot: 'bg-emerald-500', category: 'Fasilitas terdeteksi' };
}

function BoxOverlay({ boxes }: { boxes: Record<string, number[]> }) {
  return (
    <>
      {Object.entries(boxes).map(([label, coords], index) => {
        const [x1, y1, x2, y2] = coords;
        const meta = getBoxMeta(label);
        return (
          <div
            key={label}
            className={`absolute border-2 ${meta.box} bg-white/5 shadow-[0_0_0_1px_rgba(255,255,255,0.75)]`}
            style={{
              left: `${x1 * 100}%`,
              top: `${y1 * 100}%`,
              width: `${(x2 - x1) * 100}%`,
              height: `${(y2 - y1) * 100}%`,
            }}
          >
            <span
              title={meta.category}
              className={`absolute -left-0.5 flex h-6 max-w-[16rem] items-center truncate whitespace-nowrap rounded px-1.5 text-[10px] font-bold shadow ${meta.badge} ${
                y1 < 0.08 ? 'top-0' : '-top-6'
              }`}
            >
              {index + 1}. {label.replace(/ \(foto \d+\)$/i, '')}
            </span>
          </div>
        );
      })}
    </>
  );
}

function BoxLegend({ boxes }: { boxes?: Record<string, number[]> | null }) {
  if (!boxes || Object.keys(boxes).length === 0) return null;
  return (
    <div className="grid gap-1.5">
      {Object.keys(boxes).map((label, index) => {
        const meta = getBoxMeta(label);
        return (
          <div key={label} className="flex items-start gap-2 text-xs">
            <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`} />
            <span className="font-semibold text-slate-800">{index + 1}. {label.replace(/ \(foto \d+\)$/i, '')}</span>
            <span className="ml-auto text-right text-[10px] text-slate-500">{meta.category}</span>
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
}: {
  src: string;
  alt: string;
  boxes?: Record<string, number[]> | null;
  fullScreen?: boolean;
  onError?: () => void;
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
      {boxes && <BoxOverlay boxes={boxes} />}
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

  return (
    <div className="absolute left-1/2 top-6 z-[30] flex max-h-[88vh] w-[24rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="text-base font-bold text-slate-800">Kondisi Halte</h2>
        <button
          onClick={onClose}
          className="grid h-8 w-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100"
          aria-label="Tutup panel kondisi halte"
        >
          x
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <h3 className="text-lg font-bold text-slate-900">{halteName}</h3>
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
          className={`relative mt-3 h-56 overflow-hidden rounded-xl border-2 border-dashed bg-slate-50 transition-colors ${
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
            <div className="grid h-full place-items-center p-6 text-center text-sm text-slate-400">
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
                <div key={idx} className="relative h-16 w-16 shrink-0">
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
                    className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-slate-900 text-[10px] text-white shadow hover:bg-red-600"
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
            <BoxLegend boxes={activeBoxes} />
          </div>
        )}

        {photoPreviews.length > 0 && (
          <div className="mt-3 grid grid-cols-[auto_1fr] gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || photoPreviews.length >= MAX_PHOTOS}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              + Tambah
            </button>
            <button
              onClick={analyzeSelectedPhotos}
              disabled={isLoading}
              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
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
            <div className="mt-4 flex items-start gap-3">
              <ScoreRing score={assessment.score} status={assessment.status} />
              <div className="flex-1 rounded-xl bg-orange-50 p-3">
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
                      <span className={`flex items-center gap-1 text-sm font-bold ${full ? 'text-green-600' : 'text-orange-500'}`}>
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
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-sm font-bold">{halteName}</p>
              <p className="text-xs text-slate-400">Foto {activePhoto + 1} dari {photoPreviews.length} · anotasi hasil AI</p>
            </div>
            <button
              onClick={() => setViewerOpen(false)}
              className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-lg hover:bg-white/20"
              aria-label="Tutup viewer"
            >
              x
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto p-4 lg:pr-80">
            <AnnotatedImage
              src={photoPreviews[activePhoto]}
              alt={`Foto penuh ${activePhoto + 1} - ${halteName}`}
              boxes={activeBoxes}
              fullScreen
            />

            {photoPreviews.length > 1 && (
              <>
                <button
                  onClick={() => setActivePhoto((current) => (current - 1 + photoPreviews.length) % photoPreviews.length)}
                  className="fixed left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-2xl hover:bg-white/20"
                  aria-label="Foto sebelumnya"
                >
                  ‹
                </button>
                <button
                  onClick={() => setActivePhoto((current) => (current + 1) % photoPreviews.length)}
                  className="fixed right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-2xl hover:bg-white/20 lg:right-[20rem]"
                  aria-label="Foto berikutnya"
                >
                  ›
                </button>
              </>
            )}
          </div>

          <aside className="border-t border-white/10 bg-slate-900 p-4 lg:fixed lg:bottom-0 lg:right-0 lg:top-[65px] lg:w-72 lg:border-l lg:border-t-0">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Deteksi Foto {activePhoto + 1}</p>
            {activeBoxes ? (
              <div className="space-y-2 rounded-xl bg-white p-3 text-slate-900">
                <BoxLegend boxes={activeBoxes} />
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
