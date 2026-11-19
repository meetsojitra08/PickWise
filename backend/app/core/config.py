from typing import Literal
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

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
            elif not url.startswith("postgresql+asyncpg://"):
                url = f"postgresql+asyncpg://{url.split('://', 1)[-1]}"

            parsed = urlparse(url)
            query_params = dict(parse_qsl(parsed.query))

            # asyncpg requires ?ssl= instead of ?sslmode=
            if "sslmode" in query_params:
                ssl_val = query_params.pop("sslmode")
                if "ssl" not in query_params and ssl_val in ("require", "verify-ca", "verify-full"):
                    query_params["ssl"] = ssl_val

            # Remove libpq-only parameters unsupported by asyncpg
            unsupported = {
                "channel_binding",
                "target_session_attrs",
                "application_name",
                "options",
                "gssencmode",
            }
            for key in unsupported:
                query_params.pop(key, None)

            return urlunparse(
                (
                    parsed.scheme,
                    parsed.netloc,
                    parsed.path,
                    parsed.params,
                    urlencode(query_params),
                    parsed.fragment,
                )
            )
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
        if self.REDIS_URL and self.REDIS_URL.strip():
            url = self.REDIS_URL.strip().strip("'\"")
            if url.startswith("https://"):
                url = "rediss://" + url[8:]
            elif url.startswith("http://"):
                url = "redis://" + url[7:]
            elif not any(url.startswith(s) for s in ("redis://", "rediss://", "unix://")):
                scheme = "rediss://" if "upstash.io" in url else "redis://"
                url = f"{scheme}{url}"
            self.REDIS_URL = url
        else:
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
