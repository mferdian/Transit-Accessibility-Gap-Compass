from typing import Any, Dict, List, Optional

from app.models.schemas import AspectScore, HalteConditionDetail, VisionFeatureDetection


ASPECT_LABELS = {
    "shelter_atap": ("Shelter / Atap", 20),
    "fasilitas_duduk": ("Fasilitas Duduk", 15),
    "papan_informasi": ("Papan Informasi Rute", 15),
    "kondisi_fisik": ("Kondisi Fisik", 10),
    "ramp_kursi_roda": ("Ramp Akses Kursi Roda", 20),
    "guiding_block": ("Guiding Block Tuna Netra", 20),
}


def score_shelter_atap(features: VisionFeatureDetection) -> AspectScore:
    label, max_score = ASPECT_LABELS["shelter_atap"]
    if not features.has_shelter:
        return AspectScore(key="shelter_atap", label=label, score=0, max_score=max_score,
                           note="Tidak terdeteksi shelter/atap pelindung")
    if features.roof_damage:
        return AspectScore(key="shelter_atap", label=label, score=12, max_score=max_score,
                           note="Atap terdeteksi namun ada kerusakan")
    return AspectScore(key="shelter_atap", label=label, score=max_score, max_score=max_score,
                       note="Shelter/atap lengkap dan baik")


def score_fasilitas_duduk(features: VisionFeatureDetection) -> AspectScore:
    label, max_score = ASPECT_LABELS["fasilitas_duduk"]
    if features.has_bench:
        return AspectScore(key="fasilitas_duduk", label=label, score=max_score, max_score=max_score,
                           note="Bangku tunggu tersedia")
    return AspectScore(key="fasilitas_duduk", label=label, score=0, max_score=max_score,
                       note="Tidak terdeteksi bangku tunggu")


def score_papan_informasi(features: VisionFeatureDetection) -> AspectScore:
    label, max_score = ASPECT_LABELS["papan_informasi"]
    if not features.has_information_board:
        return AspectScore(key="papan_informasi", label=label, score=0, max_score=max_score,
                           note="Tidak terdeteksi papan informasi rute")
    if not features.board_legible:
        return AspectScore(key="papan_informasi", label=label, score=10, max_score=max_score,
                           note="Papan informasi kusam dan tidak terbaca")
    return AspectScore(key="papan_informasi", label=label, score=max_score, max_score=max_score,
                       note="Papan informasi rute terbaca dengan baik")


def score_kondisi_fisik(features: VisionFeatureDetection) -> AspectScore:
    label, max_score = ASPECT_LABELS["kondisi_fisik"]
    score = float(max_score)
    deductions = []
    if features.roof_damage:
        score -= 3
        deductions.append("atap rusak")
    if not features.board_legible:
        score -= 2
        deductions.append("papan informasi tidak terbaca")
    if features.guiding_block_broken:
        score -= 2
        deductions.append("guiding block rusak")
    score = max(0.0, score)
    note = "Kondisi fisik prima" if not deductions else "Deduksi: " + ", ".join(deductions)
    return AspectScore(key="kondisi_fisik", label=label, score=score, max_score=max_score, note=note)


def score_ramp(features: VisionFeatureDetection) -> AspectScore:
    label, max_score = ASPECT_LABELS["ramp_kursi_roda"]
    if not features.has_ramp:
        return AspectScore(key="ramp_kursi_roda", label=label, score=0, max_score=max_score,
                           note="Tidak terdeteksi ramp akses kursi roda")
    if features.ramp_blocked:
        return AspectScore(key="ramp_kursi_roda", label=label, score=8, max_score=max_score,
                           note="Ramp ada namun terhalang/tidak fungsional")
    return AspectScore(key="ramp_kursi_roda", label=label, score=max_score, max_score=max_score,
                       note="Ramp akses kursi roda memadai")


def score_guiding_block(features: VisionFeatureDetection) -> AspectScore:
    label, max_score = ASPECT_LABELS["guiding_block"]
    if not features.has_guiding_block:
        return AspectScore(key="guiding_block", label=label, score=0, max_score=max_score,
                           note="Tidak terdeteksi guiding block tuna netra")
    if features.guiding_block_broken:
        return AspectScore(key="guiding_block", label=label, score=10, max_score=max_score,
                           note="Guiding block ada namun rusak/terputus")
    return AspectScore(key="guiding_block", label=label, score=max_score, max_score=max_score,
                       note="Guiding block tuna netra memadai")


SCORERS = [
    score_shelter_atap,
    score_fasilitas_duduk,
    score_papan_informasi,
    score_kondisi_fisik,
    score_ramp,
    score_guiding_block,
]


def categorize_status(score: float) -> str:
    if score >= 80:
        return "Baik"
    if score >= 50:
        return "Perlu Perbaikan"
    return "Kritis"


def build_ai_notes(total: float, aspects: List[AspectScore]) -> str:
    failed = [a for a in aspects if a.score < a.max_score]
    passed = [a for a in aspects if a.score >= a.max_score]

    if not failed:
        return "Seluruh aspek aksesibilitas dan kenyamanan halte terpenuhi dengan baik."

    passed_labels = ", ".join(a.label for a in passed) if passed else "-"
    failed_labels = ", ".join(a.label for a in failed)
    return (
        f"Kondisi halte dinilai {int(round(total))}/100. "
        f"Aspek yang sudah memadai: {passed_labels}. "
        f"Namun aksesibilitas belum terpenuhi pada: {failed_labels}."
    )


def assess_features(features: VisionFeatureDetection) -> HalteConditionDetail:
    aspects = [scorer(features) for scorer in SCORERS]
    total = sum(aspect.score for aspect in aspects)
    return HalteConditionDetail(
        status=categorize_status(total),
        score=round(total, 1),
        features=features,
        aspects=aspects,
        ai_notes=build_ai_notes(total, aspects),
    )
