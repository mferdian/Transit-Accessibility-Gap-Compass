# Transit Accessibility Gap Compass

Platform untuk memetakan kesenjangan aksesibilitas transportasi umum, memberikan rekomendasi lokasi halte baru berbasis data, menilai kondisi infrastruktur halte menggunakan AI Vision, dan mensimulasikan dampak intervensi secara interaktif.

## Fitur

1. **Peta Kesenjangan Aksesibilitas** — choropleth map berdasarkan Skor Kesenjangan Aksesibilitas (SKA) per kelurahan
2. **Rekomendasi Lokasi Halte Baru** — Decision Support System berbasis analisis spasial (location-allocation)
3. **Panel Kondisi Infrastruktur Halte** — penilaian kelayakan halte otomatis dari foto survei menggunakan Vision-Language Model
4. **Simulator Dampak Intervensi (What-If)** — simulasi real-time perubahan SKA saat user menambahkan titik halte baru di peta

## Arsitektur

```
[Data Sources] → [GEO MAPID] → [AI/Analytics Engine] → [Next.js Frontend + MAPID Maps] → [End Users]
```

| Layer | Teknologi |
|---|---|
| Data Sources | BPS, OpenStreetMap, MAPID Apps |
| Spatial Storage | GEO MAPID |
| Backend / Analytics | FastAPI, GeoPandas, scikit-learn |
| Frontend | Next.js, TypeScript, Tailwind, MAPID Maps |

## Struktur Project

```
transit-gap-compass/
├── backend/                 # FastAPI
│   ├── app/
│   │   ├── main.py
│   │   ├── core/
│   │   │   └── config.py           # konfigurasi & environment variables
│   │   ├── models/                 # Pydantic schemas
│   │   ├── services/               # logic modular (reusable)
│   │   │   ├── ska.py              # perhitungan SKA (fitur 1)
│   │   │   ├── recommendation.py   # rekomendasi lokasi halte (fitur 2)
│   │   │   └── vision.py           # AI vision assessment (fitur 3)
│   │   ├── routers/                # endpoint per fitur
│   │   │   ├── gap_map.py
│   │   │   ├── recommendation.py
│   │   │   ├── halte_condition.py
│   │   │   └── simulate.py         # simulator what-if (fitur 4)
│   │   └── utils/
│   │       └── geo_helpers.py
│   ├── data/                       # dataset lokal (csv/geojson mentah, di-gitignore)
│   ├── pyproject.toml              # dikelola otomatis oleh uv
│   └── .env.example
├── frontend/                 # Next.js
│   ├── app/
│   ├── components/
│   │   ├── MapView.tsx
│   │   ├── FilterPanel.tsx
│   │   └── HalteDetailPanel.tsx
│   ├── lib/
│   │   └── api.ts                  # wrapper fetch ke backend
│   └── .env.local.example
├── .gitignore
└── README.md
```

## Prasyarat

- [uv](https://docs.astral.sh/uv/) (package manager Python untuk FastAPI)
- Node.js 18+
- API key GEO MAPID
- API key Vision-Language Model (untuk fitur 3)

## Instalasi

### 1. Clone repository

```bash
git clone <url-repo-anda>
cd transit-gap-compass
```

### 2. Setup Backend (FastAPI)

Install `uv` (kalau belum ada):

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Install dependencies:

```bash
cd backend
uv add "fastapi[standard]" geopandas pandas shapely scikit-learn pydantic-settings

cp .env.example .env
# isi .env dengan API key GEO MAPID & VLM Anda
```

Jalankan server:

```bash
uv run fastapi dev app/main.py
```

Backend berjalan di `http://localhost:8000` — dokumentasi API otomatis tersedia di `http://localhost:8000/docs`.

### 3. Setup Frontend (Next.js)

```bash
cd ../frontend
npm install

cp .env.local.example .env.local
# pastikan NEXT_PUBLIC_API_URL mengarah ke backend, default: http://localhost:8000
```

Jalankan dev server:

```bash
npm run dev
```

Frontend berjalan di `http://localhost:3000`.

## Environment Variables

**`backend/.env`**

| Variable | Keterangan |
|---|---|
| `GEOMAPID_API_URL` | Endpoint API GEO MAPID |
| `GEOMAPID_API_KEY` | API key GEO MAPID |
| `VLM_API_KEY` | API key untuk Vision-Language Model (fitur AI Vision) |
| `CORS_ORIGINS` | Daftar origin yang diizinkan mengakses backend |

**`frontend/.env.local`**

| Variable | Keterangan |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL backend FastAPI |

## Alur Data Singkat

1. Data mentah (kepadatan penduduk, jaringan jalan, lokasi halte, hasil survei) disimpan & diolah di **GEO MAPID**
2. **Backend** menghitung SKA, rekomendasi lokasi, dan skor kelayakan halte lewat fungsi modular di `app/services/`
3. Hasil disimpan kembali sebagai atribut layer di GEO MAPID atau di-serve langsung sebagai GeoJSON
4. **Frontend** melakukan fetch data dan merender sebagai peta interaktif via MAPID Maps

## Kontribusi Tim

| Area | Tanggung Jawab |
|---|---|
| Data/GIS | Dataset, integrasi GEO MAPID, fungsi geospasial |
| AI/Analytics | Logic SKA, rekomendasi, pipeline vision |
| Frontend | UI peta, panel filter, dashboard |

## Lisensi

Ditentukan kemudian.
