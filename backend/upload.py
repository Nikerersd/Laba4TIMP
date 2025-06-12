# upload.py
from fastapi import APIRouter, Depends, HTTPException, Path
from pydantic import BaseModel
from sqlalchemy.future import select
from models import AsyncSessionLocal, EncryptedData, Satellite, DataLog, ActionType
from fastapi_jwt_auth import AuthJWT
from cryptography.fernet import Fernet, InvalidToken
import base64
import logging

upload_router = APIRouter()

STATIC_ENCRYPTION_KEY = b'YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWE='
fernet = Fernet(STATIC_ENCRYPTION_KEY)

logger = logging.getLogger(__name__)

class DataUpdateModel(BaseModel):
    new_data: str

class DataUploadModel(BaseModel):
    raw_data: str  # допустим, передаётся строка (текстовые данные)

@upload_router.post("/upload")
async def upload_data(data: DataUploadModel, Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    satellite_name = Authorize.get_jwt_subject()

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Satellite).filter_by(name=satellite_name))
        satellite = result.scalars().first()

        if not satellite:
            raise HTTPException(status_code=404, detail="Satellite not found")

        # Шифруем данные
        encrypted_payload = fernet.encrypt(data.raw_data.encode())

        # Сохраняем в БД
        encrypted = EncryptedData(
            satellite_id=satellite.id,
            payload=encrypted_payload
        )
        session.add(encrypted)
        await session.commit()

        return {"msg": "Data received and encrypted successfully"}

@upload_router.get("/encrypted")
async def get_decrypted_data(Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    satellite_name = Authorize.get_jwt_subject()

    async with AsyncSessionLocal() as session:
        # Получаем спутник
        result = await session.execute(select(Satellite).filter_by(name=satellite_name))
        satellite = result.scalars().first()

        if not satellite:
            raise HTTPException(status_code=404, detail="Satellite not found")

        # Получаем все данные по satellite_id
        result = await session.execute(
            select(EncryptedData).filter_by(satellite_id=satellite.id)
        )
        encrypted_list = result.scalars().all()

        # Расшифровываем каждое сообщение
        decrypted_data = []
        for entry in encrypted_list:
            try:
                decrypted_payload = fernet.decrypt(entry.payload).decode()
            except Exception as e:
                decrypted_payload = "[Ошибка расшифровки]"
            decrypted_data.append({
                "id": entry.id,
                "received_at": entry.received_at.isoformat(),
                "data": decrypted_payload
            })

        return {"satellite": satellite.name, "entries": decrypted_data}

@upload_router.get("/logs")
async def get_logs(Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    satellite_name = Authorize.get_jwt_subject()

    async with AsyncSessionLocal() as session:
        # Получаем спутник
        result = await session.execute(select(Satellite).filter_by(name=satellite_name))
        satellite = result.scalars().first()

        if not satellite:
            raise HTTPException(status_code=404, detail="Satellite not found")

        # Получаем все логи по satellite_id с информацией о типе действия
        result = await session.execute(
            select(DataLog, ActionType)
            .join(ActionType, DataLog.action_type_id == ActionType.id)
            .filter(DataLog.satellite_id == satellite.id)
            .order_by(DataLog.action_time.desc())
        )
        logs = result.all()

        # Формируем ответ с расшифрованными данными
        formatted_logs = []
        for log, action_type in logs:
            try:
                decrypted_old = fernet.decrypt(log.old_payload).decode()
            except Exception as e:
                decrypted_old = "[Ошибка расшифровки]"
                
            decrypted_new = None
            if log.new_payload:
                try:
                    decrypted_new = fernet.decrypt(log.new_payload).decode()
                except Exception as e:
                    decrypted_new = "[Ошибка расшифровки]"

            formatted_logs.append({
                "id": log.id,
                "action_type": action_type.name,
                "action_time": log.action_time.isoformat(),
                "old_payload": decrypted_old,
                "new_payload": decrypted_new
            })

        return {"satellite": satellite.name, "logs": formatted_logs}


@upload_router.delete("/encrypted/{data_id}")
async def delete_encrypted_data(
    data_id: int = Path(..., description="ID зашифрованной записи"),
    Authorize: AuthJWT = Depends()
):
    Authorize.jwt_required()
    satellite_name = Authorize.get_jwt_subject()

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Satellite).filter_by(name=satellite_name))
        satellite = result.scalars().first()

        if not satellite:
            raise HTTPException(status_code=404, detail="Satellite not found")

        result = await session.execute(
            select(EncryptedData).filter_by(id=data_id, satellite_id=satellite.id)
        )
        data_entry = result.scalars().first()

        if not data_entry:
            raise HTTPException(status_code=404, detail="Data not found or access denied")

        await session.delete(data_entry)
        await session.commit()

        return {"msg": f"Entry {data_id} deleted successfully"}

@upload_router.put("/encrypted/{data_id}")
async def update_encrypted_data(
    data_id: int,
    update: DataUpdateModel,
    Authorize: AuthJWT = Depends()
):
    Authorize.jwt_required()
    satellite_name = Authorize.get_jwt_subject()

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Satellite).filter_by(name=satellite_name))
        satellite = result.scalars().first()

        if not satellite:
            raise HTTPException(status_code=404, detail="Satellite not found")

        result = await session.execute(
            select(EncryptedData).filter_by(id=data_id, satellite_id=satellite.id)
        )
        data_entry = result.scalars().first()

        if not data_entry:
            raise HTTPException(status_code=404, detail="Data not found or access denied")

        try:
            encrypted_new_payload = fernet.encrypt(update.new_data.encode())
            data_entry.payload = encrypted_new_payload
            await session.commit()
            return {"msg": f"Entry {data_id} updated successfully"}
        except Exception as e:
            logger.exception(f"Ошибка при шифровании обновлённых данных: {e}")
            raise HTTPException(status_code=500, detail="Encryption failed")