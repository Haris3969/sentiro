from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str
    supabase_anon_key: str
    supabase_service_key: str
    database_url: str

    gemini_api_key: str = ""
    marketaux_api_key: str = ""
    newsapi_key: str = ""

    cors_origins: str = "http://localhost:5173"
    insight_refresh_minutes: int = 45

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
