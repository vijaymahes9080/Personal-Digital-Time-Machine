from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.exc import SQLAlchemyError
from loguru import logger
import time

from backend.app.core.config import settings

# Declare the declarative base for models
Base = declarative_base()

class DatabaseManager:
    def __init__(self, db_url: str):
        self.db_url = db_url
        if self.db_url.startswith("sqlite"):
            self.engine = create_engine(
                self.db_url,
                connect_args={"check_same_thread": False}
            )
        else:
            self.engine = create_engine(
                self.db_url,
                pool_pre_ping=True,
                pool_recycle=3600,
                pool_size=10,
                max_overflow=20
            )
        self.SessionLocal = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=self.engine
        )

    def verify_connection(self, max_retries: int = 3, delay_sec: float = 2.0) -> bool:
        """Verifies if the database server is reachable. Retries if not available."""
        for attempt in range(1, max_retries + 1):
            try:
                # Attempt to connect and execute simple query
                with self.engine.connect() as conn:
                    from sqlalchemy import text
                    conn.execute(text("SELECT 1"))
                logger.info("Successfully connected to PostgreSQL Database.")
                return True
            except (SQLAlchemyError, Exception) as e:
                logger.warning(
                    f"PostgreSQL connection attempt {attempt}/{max_retries} failed: {e}. "
                    f"Retrying in {delay_sec}s..."
                )
                time.sleep(delay_sec)
        
        logger.error("Could not establish a connection to the PostgreSQL database.")
        return False

    def get_db(self):
        """FastAPI Dependency yield database session."""
        db = self.SessionLocal()
        try:
            yield db
        finally:
            db.close()

# Singleton DB Manager
db_manager = DatabaseManager(settings.DATABASE_URL)
