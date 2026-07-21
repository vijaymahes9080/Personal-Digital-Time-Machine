from sqlalchemy import Column, String, Integer, DateTime, JSON, Text, Boolean, ForeignKey
from sqlalchemy.sql import func
import uuid

from backend.app.infrastructure.database.postgres import Base

class StoredEvent(Base):
    """The Event Store (Write Side). Stores all raw domain events in order."""
    __tablename__ = "stored_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_id = Column(String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    stream_id = Column(String(255), nullable=False, index=True)
    event_type = Column(String(100), nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True, default=func.now())
    data = Column(JSON, nullable=False)
    version = Column(Integer, nullable=False)

    def __repr__(self) -> str:
        return f"<StoredEvent {self.event_type} (version={self.version}) for stream {self.stream_id}>"


class ActivityLog(Base):
    """The Activity Log (Read Side / Projection). Optimized for fast timeline querying."""
    __tablename__ = "activity_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id = Column(String(36), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    activity_type = Column(String(50), nullable=False, index=True) # window_switch, clipboard, file_edit, screenshot, etc.
    app_name = Column(String(255), nullable=False, index=True)
    window_title = Column(Text, nullable=True)
    details = Column(JSON, nullable=False, default={})

    ocr_extracted = Column(Text, nullable=True)
    embedding_indexed = Column(Boolean, nullable=False, default=False)
    graph_indexed = Column(Boolean, nullable=False, default=False)
    search_indexed = Column(Boolean, nullable=False, default=False)

    def __repr__(self) -> str:
        return f"<ActivityLog {self.activity_type} - {self.app_name} at {self.timestamp}>"
