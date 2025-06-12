# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi_jwt_auth import AuthJWT
from pydantic import BaseModel

from models import Base, engine
from auth import auth_router, get_config
from satellites import satellites_router
from upload import upload_router

app = FastAPI()

# CORS: разрешаем фронтенд (например, localhost:3000) и куки
origins = ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,  # важно для отправки cookie
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключаем маршруты
app.include_router(auth_router)
app.include_router(satellites_router)
app.include_router(upload_router)

@AuthJWT.load_config
def load_config():
    return get_config()  # возвращает настройки JWT (секретный ключ и хранение в куки)
