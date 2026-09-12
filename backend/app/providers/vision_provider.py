import base64
import json
import re
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import settings
from app.models.schemas import VisionFeatureDetection
from app.providers.base import BaseVisionProvider


GEMINI_MODEL = "gemini-2.0-flash"
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

VISION_PROMPT = """Anda adalah auditor senior aksesibilitas infrastruktur transportasi umum di Indonesia (rujukan: pedoman aksesibilitas Permenhub dan SNI halte/stop). Anda menilai satu foto halte transportasi umum.

TUGAS: Deteksi fitur berikut HANYA berdasarkan apa yang BENAR-BENAR TERLIHAT di foto. Jangan berasumsi fitur ada hanya karena umumnya halte memilikinya.

DEFINISI FITUR (deteksi dengan aturan ini):
1. "has_ramp" — pendekatan LANDAI (slope, bukan tangga) yang menghubungkan trotoar/jalan ke lantai halte, biasanya di sisi kiri/kanan halte, sering dengan tepi kuning. Trotoar yang sekadar rendah BUKAN ramp. Tanpa ramp dan hanya ada tangga/undakan → false.
2. "has_guiding_block" — tactile paving/ubin pemandu untuk tuna netra. Cari khusus di sepertiga BAWAH foto dan lantai area tunggu: jalur ubin bertekstur garis memanjang (directional bar) dan/atau ubin titik-titik timbul (warning dot). Warnanya sering kuning, tetapi bisa tampak cokelat/oranye/gelap karena bayangan atau kotor. Satu jalur kuning bertekstur yang melintas di depan bangku atau menuju area naik-turun tetap dihitung true. Pada foto halte dari depan, jangan lewatkan strip tactile yang berada dekat tepi bawah gambar. Keramik polos, garis cat, dan paving tanpa tekstur timbul BUKAN guiding block.
3. "has_shelter" — atap/kanopi buatan di atas area tunggu. Payung pedagang, pohon, atau atap gedung di belakang BUKAN shelter.
4. "has_bench" — tempat duduk (bangku/kursi) di area tunggu halte. Kursi penjaga/pedagang di luar halte tidak dihitung.
5. Bedakan dua objek berikut secara ketat:
   - "has_bus_stop_marker" — penanda lokasi berhenti saja, misalnya piktogram bus + tulisan "STOP", "BUS STOP", atau "HALTE". Penanda ini BUKAN papan informasi rute dan tidak mendapat skor informasi.
   - "has_information_board" — media informasi PERJALANAN yang memuat minimal salah satu: nomor/nama trayek, daftar tujuan/halte, diagram atau peta rute, jadwal/headway, tarif, atau petunjuk perpindahan. Logo bus, piktogram bus, tulisan STOP/BUS STOP/HALTE, nama halte saja, iklan, dan rambu lalu lintas BUKAN papan informasi rute.
   - "route_information_evidence" — salin ringkas bukti yang benar-benar terlihat, misalnya "Rute R1 - Purabaya", "daftar tujuan dan tarif", atau "peta jaringan". Jika tidak dapat menyebut bukti selain STOP/BUS STOP/HALTE, isi null dan set has_information_board=false.
6. "roof_damage" — atap rusak nyata: bolong, sobek, penyok berat, rangka patah, panel lepas. Karat tipis/kotor ringan BUKAN kerusakan.
7. "board_legible" — detail perjalanan pada papan informasi rute masih jelas terbaca. Keterbacaan tulisan STOP saja tidak dihitung. Jika tidak ada informasi perjalanan, set false.
8. "ramp_blocked" — ramp terhalang sehingga tak bisa dipakai: diparkiri, tertutup tiang, tanaman, ditambal aspal, atau landainya terlalu curam/rusak.
9. "guiding_block_broken" — jalur guiding block terputus, ubin terangkat, hilang sebagian, atau tertutup aspal/kendaraan.

ATURAN PENILAIAN:
- Periksa foto secara sistematis: struktur atap → area tunggu → tepi/akses halte → lantai/trotoar sekitar. Untuk guiding block, zoom secara visual pada sepertiga bawah foto dan cari pola garis timbul atau titik timbul yang tersambung.
- Fitur yang terpotong sebagian di tepi foto tapi teridentifikasi jelas → tetap true.
- Jika TIDAK YAKIN atau fitur tidak terlihat jelas (kabur, gelap, tertutup) → set false dan turunkan confidence_score.
- Jika foto BUKAN halte transportasi umum (misal interior, makanan, random object) → semua boolean false, confidence_score 0.1, bounding_boxes kosong {{}}.
- Jangan menilai kualitas foto; nilai hanya objek fisik di foto.
- Uji wajib untuk papan informasi: tanyakan "informasi rute apa yang dapat dibaca?" Jika jawabannya hanya STOP/BUS STOP/HALTE atau piktogram bus, maka has_bus_stop_marker=true, has_information_board=false, board_legible=false, route_information_evidence=null.

KONTUR / POLIGON BOUNDING BOX (PENTING: IKUTI BENTUK PERSPEKTIF BENDA):
- Jangan hanya memberi kotak tegak lurus (AABB) biasa jika bendanya bersudut atau memiliki bidang miring perspektif. Berikan poligon yang MENGIKUTI BENTUK FISIK ASLI BENDA TERSEBUT (perspective polygon contour):
  * Atap kanopi halte: ikuti garis kemiringan atau lengkungan atap (4 sampai 8 titik).
  * Bangku tunggu: ikuti bidang tempat duduk dan sandaran sesuai sudut pandang kamera (4 sampai 6 titik).
  * Ramp akses: ikuti bidang miring lintasan akses dari trotoar ke lantai halte (4 sampai 6 titik).
  * Guiding block: ikuti alur garis ubin bertekstur memanjang sesuai perspektif lantai (4 sampai 8 titik).
  * Papan informasi / penanda halte: ikuti bidang panel informasi (4 titik).
- Format setiap objek berupa array titik poligon keliling berurutan: [[x1, y1], [x2, y2], [x3, y3], [x4, y4], ...] (minimal 4 titik).
- Semua nilai x dan y dinormalisasi antara 0.0 sampai 1.0 relatif terhadap dimensi penuh foto (sudut kiri-atas = 0.0, 0.0; sudut kanan-bawah = 1.0, 1.0).
- Gunakan label Bahasa Indonesia yang deskriptif (mis. "Shelter Pelindung", "Bangku Tunggu", "Ramp Akses", "Guiding Block", "Papan Informasi").

OUTPUT: Balas HANYA JSON valid (tanpa penjelasan tambahan, tanpa markdown):
{
  "has_ramp": bool,
  "has_guiding_block": bool,
  "has_shelter": bool,
  "has_bench": bool,
  "has_information_board": bool,
  "has_bus_stop_marker": bool,
  "route_information_evidence": string | null,
  "roof_damage": bool,
  "board_legible": bool,
  "ramp_blocked": bool,
  "guiding_block_broken": bool,
  "confidence_score": float,
  "bounding_boxes": {}
}"""


def parse_model_json(text: str) -> Dict[str, Any]:
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError(f"Model tidak mengembalikan JSON: {text[:200]}")
    return json.loads(match.group(0))


def _chat_completions_url(base_url: str) -> str:
    url = (base_url or "").rstrip("/")
    if url.endswith("/chat/completions"):
        return url
    return f"{url}/chat/completions"


def extract_openai_content(response: httpx.Response) -> str:
    """Support both regular OpenAI JSON and gateways that always return SSE chunks."""
    content_type = response.headers.get("content-type", "")
    if "text/event-stream" not in content_type and not response.text.lstrip().startswith("data:"):
        data = response.json()
        return data["choices"][0]["message"]["content"]

    chunks: List[str] = []
    for line in response.text.splitlines():
        if not line.startswith("data:"):
            continue
        raw = line.removeprefix("data:").strip()
        if not raw or raw == "[DONE]":
            continue
        try:
            event = json.loads(raw)
        except json.JSONDecodeError:
            continue
        choice = (event.get("choices") or [{}])[0]
        delta = choice.get("delta") or {}
        message = choice.get("message") or {}
        text = delta.get("content") or message.get("content")
        if text:
            chunks.append(text)
    if not chunks:
        raise ValueError("OpenAI-compatible endpoint returned no text content")
    return "".join(chunks)


def normalize_bounding_boxes(raw: Any) -> Optional[Dict[str, List[float]]]:
    """
    Validates and normalizes bounding polygon/box coordinates.
    Accepts:
      - nested polygon points: [[x1, y1], [x2, y2], [x3, y3], ...]
      - flat coordinates: [x1, y1, x2, y2, ...]
      - standard 4-coordinate box: [x1, y1, x2, y2]
    Returns a dictionary mapping label to a flat list of floats [x1, y1, x2, y2, ...].
    All coordinates are clamped between 0.0 and 1.0.
    """
    if not isinstance(raw, dict):
        return None

    boxes: Dict[str, List[float]] = {}
    for label, coords in raw.items():
        if not isinstance(coords, (list, tuple)):
            continue

        flat_pts: list[float] = []
        # Check if nested [[x, y], ...]
        if len(coords) > 0 and isinstance(coords[0], (list, tuple)):
            for pt in coords:
                if isinstance(pt, (list, tuple)) and len(pt) >= 2:
                    try:
                        x = float(pt[0])
                        y = float(pt[1])
                        flat_pts.extend([x, y])
                    except (TypeError, ValueError):
                        continue
        else:
            # Flat list
            try:
                flat_pts = [float(v) for v in coords]
            except (TypeError, ValueError):
                continue

        # If standard 4-element box [x1, y1, x2, y2]
        if len(flat_pts) == 4:
            x1, y1, x2, y2 = flat_pts
            x1 = max(0.0, min(x1, 1.0))
            y1 = max(0.0, min(y1, 1.0))
            x2 = max(0.0, min(x2, 1.0))
            y2 = max(0.0, min(y2, 1.0))
            if x1 < x2 and y1 < y2:
                boxes[str(label).strip()] = [round(x1, 4), round(y1, 4), round(x2, 4), round(y2, 4)]
        elif len(flat_pts) >= 6 and len(flat_pts) % 2 == 0:
            # Polygon vertices with at least 3 points
            clamped = [round(max(0.0, min(val, 1.0)), 4) for val in flat_pts]
            boxes[str(label).strip()] = clamped

    return boxes or None


def features_from_payload(payload: Dict[str, Any]) -> VisionFeatureDetection:
    bounding_boxes = normalize_bounding_boxes(payload.get("bounding_boxes"))
    evidence_value = payload.get("route_information_evidence")
    evidence = str(evidence_value).strip() if evidence_value else None
    route_signal_pattern = re.compile(
        r"\b(rute|trayek|tujuan|jadwal|headway|tarif|peta|koridor|transit|terminal|stasiun|rp\s?\d|[a-z]{1,3}\d+)\b",
        re.IGNORECASE,
    )
    has_route_evidence = bool(evidence and route_signal_pattern.search(evidence))
    has_information_board = bool(payload.get("has_information_board", False)) and has_route_evidence
    has_bus_stop_marker = bool(payload.get("has_bus_stop_marker", False))

    if not has_information_board and bounding_boxes:
        relabeled_boxes: Dict[str, List[float]] = {}
        for label, coords in bounding_boxes.items():
            lowered = label.lower()
            if "papan informasi" in lowered or "route information" in lowered:
                relabeled_boxes["Penanda Bus Stop"] = coords
                has_bus_stop_marker = True
            else:
                relabeled_boxes[label] = coords
        bounding_boxes = relabeled_boxes

    return VisionFeatureDetection(
        has_ramp=bool(payload.get("has_ramp", False)),
        has_guiding_block=bool(payload.get("has_guiding_block", False)),
        has_shelter=bool(payload.get("has_shelter", False)),
        has_bench=bool(payload.get("has_bench", False)),
        has_information_board=has_information_board,
        has_bus_stop_marker=has_bus_stop_marker,
        route_information_evidence=evidence if has_information_board else None,
        roof_damage=bool(payload.get("roof_damage", False)),
        board_legible=has_information_board and bool(payload.get("board_legible", False)),
        ramp_blocked=bool(payload.get("ramp_blocked", False)),
        guiding_block_broken=bool(payload.get("guiding_block_broken", False)),
        confidence_score=max(0.0, min(float(payload.get("confidence_score") or 0.0), 1.0)),
        bounding_boxes=bounding_boxes,
    )


class MockVisionProvider(BaseVisionProvider):
    """Deterministic demo assessment (scenario: halte dengan ramp & guiding block buruk)."""

    def analyze_halte_image(self, image_base64: Optional[str] = None, mime_type: str = "image/jpeg") -> Dict[str, Any]:
        return {
            "has_ramp": False,
            "has_guiding_block": False,
            "has_shelter": True,
            "has_bench": True,
            "has_information_board": True,
            "has_bus_stop_marker": False,
            "route_information_evidence": "Daftar rute dan tujuan",
            "roof_damage": False,
            "board_legible": False,
            "ramp_blocked": False,
            "guiding_block_broken": False,
            "confidence_score": 0.87,
            "bounding_boxes": {
                "Shelter Pelindung": [0.03, 0.08, 0.94, 0.04, 0.91, 0.40, 0.06, 0.44],
                "Bangku Tunggu": [0.20, 0.54, 0.76, 0.52, 0.79, 0.78, 0.17, 0.82],
                "Papan Informasi": [0.82, 0.28, 0.98, 0.29, 0.97, 0.58, 0.81, 0.57],
            },
        }


class GeminiVisionProvider(BaseVisionProvider):
    def analyze_halte_image(self, image_base64: Optional[str] = None, mime_type: str = "image/jpeg") -> Dict[str, Any]:
        if not settings.VLM_API_KEY:
            raise ValueError("VLM_API_KEY must be set in .env for gemini vision mode")
        if not image_base64:
            raise ValueError("image_base64 is required for real vision assessment")

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": VISION_PROMPT},
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": image_base64,
                            }
                        },
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.0,
                "responseMimeType": "application/json",
                "maxOutputTokens": 2048,
            },
        }

        response = httpx.post(
            GEMINI_URL,
            params={"key": settings.VLM_API_KEY},
            json=payload,
            timeout=60.0,
        )
        response.raise_for_status()
        data = response.json()

        text = data["candidates"][0]["content"]["parts"][0]["text"]
        return parse_model_json(text)


class OpenAIVisionProvider(BaseVisionProvider):
    """OpenAI-compatible chat completions provider (works with OpenRouter, Ollama, vLLM, etc.)."""

    def analyze_halte_image(self, image_base64: Optional[str] = None, mime_type: str = "image/jpeg") -> Dict[str, Any]:
        if not settings.VLM_API_KEY:
            raise ValueError("VLM_API_KEY must be set in .env for openai vision mode")
        if not image_base64:
            raise ValueError("image_base64 is required for real vision assessment")

        payload = {
            "model": settings.VLM_MODEL,
            "temperature": 0,
            "response_format": {"type": "json_object"},
            "messages": [
                {
                    "role": "system",
                    "content": "You are a transit stop accessibility auditor. Always respond with valid JSON only.",
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": VISION_PROMPT},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:{mime_type};base64,{image_base64}"},
                        },
                    ],
                }
            ],
        }

        response = httpx.post(
            _chat_completions_url(settings.VLM_BASE_URL),
            headers={"Authorization": f"Bearer {settings.VLM_API_KEY}"},
            json=payload,
            timeout=60.0,
        )
        response.raise_for_status()
        return parse_model_json(extract_openai_content(response))


def get_vision_provider() -> BaseVisionProvider:
    if settings.VISION_MODE == "mock":
        return MockVisionProvider()

    provider = (settings.VLM_PROVIDER or "gemini").lower()
    if provider == "gemini":
        return GeminiVisionProvider()
    if provider in ("openai", "openai_compatible", "custom"):
        return OpenAIVisionProvider()
    return MockVisionProvider()
