import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "ChronaAI"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = Field(default="supersecretkeyforchronaaithatshouldbechangedinproduction1234567890")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Local Directory Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    
    @property
    def SCREENSHOTS_DIR(self) -> Path:
        path = self.DATA_DIR / "screenshots"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def QDRANT_DIR(self) -> Path:
        path = self.DATA_DIR / "qdrant"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def TANTIVY_DIR(self) -> Path:
        path = self.DATA_DIR / "tantivy"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def CACHE_DIR(self) -> Path:
        path = self.DATA_DIR / "cache"
        path.mkdir(parents=True, exist_ok=True)
        return path

    # SQLite / PostgreSQL Database (defaults to zero-configuration SQLite)
    DATABASE_URL: str = Field(default="sqlite:///data/chrona_ai.db")

    # Qdrant Database (Local or Host-based)
    QDRANT_HOST: str = "localhost"
    QDRANT_PORT: int = 6333
    QDRANT_PREFER_LOCAL: bool = True  # If True, runs in serverless storage mode on local disk

    # Neo4j Database
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "password"
    NEO4J_PREFER_FALLBACK: bool = True  # Falls back to local SQLite graph model if Neo4j server is offline

    # Redis Database
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_PREFER_FALLBACK: bool = True  # Falls back to SQLite diskcache if offline

    # AI & Models
    OLLAMA_API_URL: str = "http://localhost:11434"
    LLM_MODEL: str = "qwen2.5-coder:7b"
    EMBEDDING_MODEL: str = "nomic-embed-text"
    OCR_TESSERACT_CMD: str = "tesseract"  # Needs to match executable path

    # Universal Activity Recorder Frequencies
    WINDOW_POLL_INTERVAL_SEC: float = 1.0
    CLIPBOARD_POLL_INTERVAL_SEC: float = 1.0
    SCREENSHOT_INTERVAL_SEC: float = 10.0
    FILE_WATCHER_DEBOUNCE_SEC: float = 2.0

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
