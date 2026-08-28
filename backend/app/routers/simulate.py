from fastapi import APIRouter, HTTPException

from app.models.schemas import SimulateRequest, SimulateResponse
from app.services.simulation import simulate_intervention

router = APIRouter()


@router.post("/simulate", response_model=SimulateResponse, tags=["Simulation"])
def run_simulation(payload: SimulateRequest):
    try:
        return simulate_intervention(
            lat=payload.lat,
            lon=payload.lon,
            service_radius=payload.service_radius,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
