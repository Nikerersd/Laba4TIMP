# satellites.py
from fastapi import APIRouter, Depends, HTTPException
from fastapi_jwt_auth import AuthJWT
from pydantic import BaseModel
from sqlalchemy.future import select
from models import AsyncSessionLocal, Satellite

satellites_router = APIRouter()

class SatelliteOut(BaseModel):
    id: int
    name: str
    description: str | None

    class Config:
        orm_mode = True

@satellites_router.get("/satellites")
async def list_satellites():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Satellite.id, Satellite.name, Satellite.description))
        sats = result.all()
        # Возвращаем список без паролей
        return [{"id": s.id, "name": s.name, "description": s.description} for s in sats]

@satellites_router.get("/satellites/{sat_id}")
async def get_description(sat_id: int):
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Satellite).filter_by(id=sat_id))
        sat = result.scalars().first()
        if not sat:
            raise HTTPException(status_code=404, detail="Satellite not found")
        return {"id": sat.id, "name": sat.name, "description": sat.description}

# Пример защищённого маршрута, доступного только при наличии JWT
@satellites_router.get("/dashboard")
def dashboard(Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()  # Требуется валидный access-токен
    current = Authorize.get_jwt_subject()
    return {"msg": f"Welcome, {current}! This is a protected dashboard."}
