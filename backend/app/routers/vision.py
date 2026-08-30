from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException

from app.core.config import settings
from app.models.schemas import (
    PhotoAssessment,
    VisionAssessRequest,
    VisionAssessmentResponse,
    VisionFeatureDetection,
)
from app.providers.vision_provider import features_from_payload, get_vision_provider
from app.services.vision_scoring import assess_features

router = APIRouter()

MAX_IMAGES = 8
MAX_IMAGE_BYTES = 8 * 1024 * 1024
ALLOWED_IMAGE_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp"}


def collect_image_inputs(payload: VisionAssessRequest) -> List[Dict[str, Any]]:
    images: List[Dict[str, Any]] = []
    if payload.image_base64:
        images.append({"base64": payload.image_base64, "mime": payload.image_mime_type or "image/jpeg"})
    images.extend(
        {"base64": img.image_base64, "mime": img.image_mime_type or "image/jpeg"}
        for img in payload.images
    )
    if len(images) > MAX_IMAGES:
        raise HTTPException(status_code=400, detail=f"Maksimal {MAX_IMAGES} foto per penilaian")

    for index, image in enumerate(images, start=1):
        if image["mime"] not in ALLOWED_IMAGE_MIME_TYPES:
            raise HTTPException(status_code=400, detail=f"Format foto {index} tidak didukung: {image['mime']}")
        # Base64 is approximately 4/3 of the original byte size.
        estimated_bytes = len(image["base64"] or "") * 3 // 4
        if estimated_bytes > MAX_IMAGE_BYTES:
            raise HTTPException(status_code=413, detail=f"Foto {index} melebihi batas 8 MB")
    return images


def merge_features(per_photo: List[VisionFeatureDetection]) -> VisionFeatureDetection:
    """Aggregate different viewpoints of the same stop into one assessment."""
    first = per_photo[0]
    if len(per_photo) == 1:
        return first

    def any_true(attr: str) -> bool:
        return any(getattr(f, attr) for f in per_photo)

    def any_where_present(value_attr: str, presence_attr: str) -> bool:
        relevant = [f for f in per_photo if getattr(f, presence_attr)]
        return any(getattr(f, value_attr) for f in relevant) if relevant else False

    def confidence_weighted_average() -> float:
        confidences = [max(f.confidence_score, 0.01) for f in per_photo]
        # Multiple viewpoints improve confidence, capped to avoid claiming certainty.
        mean = sum(confidences) / len(confidences)
        coverage_bonus = min(0.12, (len(per_photo) - 1) * 0.03)
        return min(0.98, mean + coverage_bonus)

    bounding_boxes: Dict[str, List[float]] = {}
    for idx, features in enumerate(per_photo, start=1):
        if not features.bounding_boxes:
            continue
        suffix = f" (foto {idx})" if len(per_photo) > 1 else ""
        for label, coords in features.bounding_boxes.items():
            bounding_boxes[f"{label}{suffix}"] = coords

    return VisionFeatureDetection(
        has_ramp=any_true("has_ramp"),
        has_guiding_block=any_true("has_guiding_block"),
        has_shelter=any_true("has_shelter"),
        has_bench=any_true("has_bench"),
        has_information_board=any_true("has_information_board"),
        has_bus_stop_marker=any_true("has_bus_stop_marker"),
        route_information_evidence=next(
            (f.route_information_evidence for f in per_photo if f.route_information_evidence),
            None,
        ),
        roof_damage=any_true("roof_damage"),
        # Only photos where a board is actually visible can judge legibility.
        board_legible=any_where_present("board_legible", "has_information_board"),
        ramp_blocked=any_true("ramp_blocked"),
        guiding_block_broken=any_true("guiding_block_broken"),
        confidence_score=confidence_weighted_average(),
        bounding_boxes=bounding_boxes or None,
    )


@router.post("/vision/assess", response_model=VisionAssessmentResponse, tags=["Vision"])
def assess_halte_image(payload: VisionAssessRequest):
    provider = get_vision_provider()
    images = collect_image_inputs(payload)

    if images and settings.VISION_MODE == "mock":
        raise HTTPException(
            status_code=400,
            detail=(
                "Foto tidak dianalisis karena VISION_MODE masih 'mock'. "
                "Set VISION_MODE='vlm', VLM_PROVIDER='openai', VLM_BASE_URL, "
                "VLM_MODEL, dan VLM_API_KEY di backend/.env."
            ),
        )

    # Demo/mock mode: analyze once without an image.
    if not images:
        if settings.VISION_MODE != "mock":
            raise HTTPException(status_code=400, detail="At least one image is required")
        images = [{"base64": None, "mime": "image/jpeg"}]

    per_photo: List[VisionFeatureDetection] = []
    photo_results: List[PhotoAssessment] = []
    errors: List[str] = []

    for idx, image in enumerate(images):
        try:
            detection = provider.analyze_halte_image(image_base64=image["base64"], mime_type=image["mime"])
            features = features_from_payload(detection)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except Exception as exc:
            errors.append(f"foto {idx + 1}: {exc}")
            continue

        per_photo.append(features)
        detail = assess_features(features)
        photo_results.append(
            PhotoAssessment(
                image_index=idx,
                features=features,
                score=detail.score,
                status=detail.status,
            )
        )

    if not per_photo:
        detail_msg = "; ".join(errors) or "No images could be analyzed"
        raise HTTPException(status_code=502, detail=f"Vision provider failed: {detail_msg}")

    merged = merge_features(per_photo)
    assessment = assess_features(merged)

    return VisionAssessmentResponse(
        halte_id=payload.halte_id,
        halte_name=payload.halte_name,
        last_update=datetime.now(timezone.utc).strftime("%d %b %Y"),
        source="mock" if settings.VISION_MODE == "mock" else settings.VLM_PROVIDER,
        assessment=assessment,
        photos=photo_results,
    )
