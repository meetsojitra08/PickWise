from typing import Literal

from pydantic import computed_field, field_validator, model_validator
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
    DATABASE_URL: str | None = None
    DB_HOST: str = "db"
    DB_PORT: int = 5432
    DB_DATABASE: str = "pickwise"
    DB_USERNAME: str = "pickwise"
    DB_PASSWORD: str = "pickwise"

    @computed_field
    @property
    def ASYNC_DATABASE_URL(self) -> str:
        if self.DATABASE_URL:
            url = self.DATABASE_URL
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql+asyncpg://", 1)
            elif url.startswith("postgresql://"):
                url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
            # asyncpg driver requires ?ssl= instead of ?sslmode=
            if "sslmode=" in url:
                url = url.replace("sslmode=", "ssl=")
            return url
        return (
            f"postgresql+asyncpg://{self.DB_USERNAME}:{self.DB_PASSWORD}@"
            f"{self.DB_HOST}:{self.DB_PORT}/{self.DB_DATABASE}"
        )

    @computed_field
    @property
    def SYNC_DATABASE_URL(self) -> str:
        if self.DATABASE_URL:
            url = self.DATABASE_URL
            if url.startswith("postgres://"):
                return url.replace("postgres://", "postgresql://", 1)
            return url
        return (
            f"postgresql://{self.DB_USERNAME}:{self.DB_PASSWORD}@"
            f"{self.DB_HOST}:{self.DB_PORT}/{self.DB_DATABASE}"
        )

    # Redis
    REDIS_URL: str = ""
    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str | None = None

    @model_validator(mode="after")
    def assemble_redis_url(self) -> "Settings":
        if not self.REDIS_URL:
            if self.REDIS_PASSWORD:
                self.REDIS_URL = (
                    f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/0"
                )
            else:
                self.REDIS_URL = f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/0"
        return self

    # AI / Groq
    GROQ_API_KEY: str | None = None
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_TIMEOUT_SECONDS: int = 20
    AI_DAILY_QUOTA_USER: int = 30
    AI_DAILY_QUOTA_GUEST: int = 5

    # Auth & Sessions
    SESSION_COOKIE_NAME: str = "pickwise_session"
    SESSION_COOKIE_SAMESITE: Literal["lax", "strict", "none"] = "lax"
    SESSION_COOKIE_SECURE: bool | None = None
    SESSION_LIFETIME_MINUTES: int = 120
    XSRF_COOKIE_NAME: str = "XSRF-TOKEN"
    XSRF_HEADER_NAME: str = "x-xsrf-token"

    CORS_ALLOWED_ORIGINS: list[str] | str = [
        "http://localhost:8080",
        "http://localhost:5173",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:5173",
    ]

    @field_validator("CORS_ALLOWED_ORIGINS", mode="after")
    @classmethod
    def assemble_cors_origins(cls, v: list[str] | str) -> list[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                import json

                try:
                    parsed = json.loads(v)
                    if isinstance(parsed, list):
                        return [str(item) for item in parsed]
                except Exception:
                    pass
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v


settings = Settings()
