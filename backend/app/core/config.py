from typing import List, Optional
from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "Pickwise"
    APP_ENV: str = "local"
    APP_DEBUG: bool = True
    APP_URL: str = "http://localhost:8080"
    SECRET_KEY: str = "pickwise-insecure-secret-key-change-in-production-32bytes"

    # Database
    DB_HOST: str = "db"
    DB_PORT: int = 5432
    DB_DATABASE: str = "pickwise"
    DB_USERNAME: str = "pickwise"
    DB_PASSWORD: str = "pickwise"

    @computed_field
    @property
    def ASYNC_DATABASE_URL(self) -> str:
        return f"postgresql+asyncpg://{self.DB_USERNAME}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_DATABASE}"

    @computed_field
    @property
    def SYNC_DATABASE_URL(self) -> str:
        return f"postgresql://{self.DB_USERNAME}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_DATABASE}"

    # Redis
    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: Optional[str] = None

    @computed_field
    @property
    def REDIS_URL(self) -> str:
        if self.REDIS_PASSWORD:
            return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/0"
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/0"

    # AI / Groq
    GROQ_API_KEY: Optional[str] = None
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_TIMEOUT_SECONDS: int = 20
    AI_DAILY_QUOTA_USER: int = 30
    AI_DAILY_QUOTA_GUEST: int = 5

    # Auth & Sessions
    SESSION_COOKIE_NAME: str = "pickwise_session"
    SESSION_LIFETIME_MINUTES: int = 120
    XSRF_COOKIE_NAME: str = "XSRF-TOKEN"
    XSRF_HEADER_NAME: str = "x-xsrf-token"

    CORS_ALLOWED_ORIGINS: List[str] = [
        "http://localhost:8080",
        "http://localhost:5173",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:5173",
    ]


settings = Settings()
