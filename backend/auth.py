# auth.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.future import select
from passlib.context import CryptContext
from fastapi_jwt_auth import AuthJWT
from models import AsyncSessionLocal, Satellite

auth_router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class RegisterModel(BaseModel):
    name: str
    password: str
    description: str = None

class LoginModel(BaseModel):
    name: str
    password: str

class JWTSettings(BaseModel):
    authjwt_secret_key: str = "your-secret-key"
    authjwt_token_location: set = {"cookies"}
    authjwt_cookie_csrf_protect: bool = False  # (CSRF можно включить при необходимости)

def get_config():
    return JWTSettings()

@auth_router.post("/register")
async def register_satellite(reg: RegisterModel):
    async with AsyncSessionLocal() as session:
        # Проверяем уникальность имени
        result = await session.execute(select(Satellite).filter_by(name=reg.name))
        if result.scalars().first():
            raise HTTPException(status_code=400, detail="Satellite name already exists")
        # Хэшируем пароль
        hashed_pw = pwd_context.hash(reg.password)
        sat = Satellite(name=reg.name, access_password=hashed_pw, description=reg.description)
        session.add(sat)
        await session.commit()
        return {"msg": "Satellite registered successfully", "id": sat.id}

@auth_router.post("/login")
async def login_satellite(user: LoginModel, Authorize: AuthJWT = Depends()):
    # Проверяем название и пароль
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Satellite).filter_by(name=user.name))
        sat = result.scalars().first()
    
    if not sat or not pwd_context.verify(user.password, sat.access_password):
        raise HTTPException(status_code=401, detail="Bad name or password")
    
    # Создаём JWT и устанавливаем его в httpOnly cookie
    access_token = Authorize.create_access_token(subject=user.name)
    refresh_token = Authorize.create_refresh_token(subject=user.name)
    
    # Устанавливаем оба токена в cookies
    Authorize.set_access_cookies(access_token)
    Authorize.set_refresh_cookies(refresh_token)
    
    return {"msg": "Successfully logged in"}
