import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

# Set testing environment variables before importing settings
os.environ["DATABASE_URL"] = "sqlite:///file:testdb?mode=memory&cache=shared"
os.environ["QDRANT_PREFER_LOCAL"] = "True"
os.environ["NEO4J_PREFER_FALLBACK"] = "True"
os.environ["REDIS_PREFER_FALLBACK"] = "True"

from backend.app.infrastructure.database.postgres import Base, db_manager
from backend.app.core.config import settings

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Initializes the database schema once for the entire test session."""
    # Override engine to use shared in-memory sqlite
    test_engine = create_engine(
        "sqlite:///file:testdb?mode=memory&cache=shared",
        connect_args={"check_same_thread": False, "uri": True}
    )
    db_manager.engine = test_engine
    db_manager.SessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=test_engine
    )
    
    # Create tables
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)

@pytest.fixture
def db_session():
    """Provides a transactional database session that rolls back after each test."""
    connection = db_manager.engine.connect()
    transaction = connection.begin()
    session = db_manager.SessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()
