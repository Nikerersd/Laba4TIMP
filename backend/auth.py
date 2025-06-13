# auth.py
import logging
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy.future import select
from passlib.context import CryptContext
from fastapi_jwt_auth import AuthJWT
from models import AsyncSessionLocal, Satellite
from fastapi.responses import RedirectResponse

logger = logging.getLogger("auth_logger")
logger.setLevel(logging.INFO)
handler = logging.FileHandler("auth_errors.log")
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)

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
    authjwt_cookie_csrf_protect: bool = False

def get_config():
    return JWTSettings()

@auth_router.post("/register")
async def register_satellite(reg: RegisterModel):
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(Satellite).filter_by(name=reg.name))
            if result.scalars().first():
                logger.warning(f"Attempted to register existing satellite: {reg.name}")
                raise HTTPException(status_code=400, detail="Satellite name already exists")

            hashed_pw = pwd_context.hash(reg.password)
            sat = Satellite(name=reg.name, access_password=hashed_pw, description=reg.description)
            session.add(sat)
            await session.commit()
            logger.info(f"Satellite registered: {reg.name}")
            return {"msg": "Satellite registered successfully", "id": sat.id}
    except Exception as e:
        logger.error(f"Registration error for {reg.name}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Registration failed")

@auth_router.post("/login")
async def login_satellite(user: LoginModel, Authorize: AuthJWT = Depends()):
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(Satellite).filter_by(name=user.name))
            sat = result.scalars().first()

        if not sat or not pwd_context.verify(user.password, sat.access_password):
            logger.warning(f"Failed login attempt for satellite: {user.name}")
            raise HTTPException(status_code=401, detail="Bad name or password")

        access_token = Authorize.create_access_token(subject=user.name)
        refresh_token = Authorize.create_refresh_token(subject=user.name)
        Authorize.set_access_cookies(access_token)
        Authorize.set_refresh_cookies(refresh_token)
        logger.info(f"Satellite logged in: {user.name}")
        return {"msg": "Successfully logged in"}
    except Exception as e:
        logger.error(f"Login error for {user.name}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Login failed")

@auth_router.post("/logout")
async def logout_satellite(Authorize: AuthJWT = Depends()):
    try:
        Authorize.unset_jwt_cookies()
        response = RedirectResponse(url="/login", status_code=302)
        response.delete_cookie("access_token_cookie")
        response.delete_cookie("refresh_token_cookie")
        logger.info("Satellite logged out")
        return response
    except Exception as e:
        logger.error(f"Logout error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Logout failed")
