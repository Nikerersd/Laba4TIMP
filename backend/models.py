from sqlalchemy import Column, Integer, String, Text, ForeignKey, LargeBinary, DateTime
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, declarative_base, relationship
from datetime import datetime
from sqlalchemy.sql import func

DATABASE_URL = "postgresql+asyncpg://postgres:root@localhost/laba4"
engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

class Satellite(Base):
    __tablename__ = "satellites"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    access_password = Column(String, nullable=False)  # хэш пароля
    description = Column(Text, nullable=True)
    
    # Связь с encrypted_data (один ко многим)
    encrypted_data = relationship("EncryptedData", back_populates="satellite", cascade="all, delete")
    data_logs = relationship("DataLog", back_populates="satellite", cascade="all, delete")

class EncryptedData(Base):
    __tablename__ = "encrypted_data"
    
    id = Column(Integer, primary_key=True, index=True)
    satellite_id = Column(Integer, ForeignKey('satellites.id', ondelete="CASCADE"), nullable=False)
    payload = Column(LargeBinary, nullable=False)
    received_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Связи
    satellite = relationship("Satellite", back_populates="encrypted_data")

class ActionType(Base):
    __tablename__ = "action_types"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(Text, unique=True, nullable=False)
    
    # Связь с data_logs (один ко многим)
    data_logs = relationship("DataLog", back_populates="action_type")

class DataLog(Base):
    __tablename__ = "data_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    action_type_id = Column(Integer, ForeignKey('action_types.id', ondelete="RESTRICT"), nullable=False)
    action_time = Column(DateTime(timezone=True), server_default=func.now())
    satellite_id = Column(Integer, ForeignKey('satellites.id', ondelete="CASCADE"), nullable=False)
    old_payload = Column(LargeBinary, nullable=False)
    new_payload = Column(LargeBinary)
    
    # Связи
    action_type = relationship("ActionType", back_populates="data_logs")
    satellite = relationship("Satellite", back_populates="data_logs")

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)