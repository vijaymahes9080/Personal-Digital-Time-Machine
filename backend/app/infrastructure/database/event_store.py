from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Dict, Any, Callable
from loguru import logger
import uuid
import json
from datetime import datetime, timezone

from backend.app.domain.base import DomainEvent
from backend.app.domain.events import (
    ActivityRecordedEvent,
    WindowSwitchedEvent,
    ClipboardCopiedEvent,
    FileEditedEvent,
    ScreenshotCapturedEvent
)
from backend.app.infrastructure.database.models import StoredEvent

class EventStoreRepository:
    def __init__(self):
        self._subscribers: List[Callable[[DomainEvent], None]] = []

    def subscribe(self, subscriber: Callable[[DomainEvent], None]) -> None:
        """Register a projection handler or service to listen to new appended events."""
        self._subscribers.append(subscriber)
        logger.debug(f"Registered event subscriber: {subscriber.__name__ if hasattr(subscriber, '__name__') else str(subscriber)}")

    def append(self, session: Session, stream_id: str, events: List[DomainEvent], expected_version: int) -> None:
        """Appends domain events to the event store and dispatches them to subscribers."""
        # 1. Fetch current max version of the stream to verify concurrency (Event Sourcing constraint)
        current_version_row = (
            session.query(StoredEvent.version)
            .filter(StoredEvent.stream_id == stream_id)
            .order_by(desc(StoredEvent.version))
            .first()
        )
        current_version = current_version_row[0] if current_version_row else 0

        if current_version != expected_version:
            raise ValueError(
                f"Concurrency conflict: Stream version is {current_version}, "
                f"but expected {expected_version}"
            )

        next_version = current_version
        stored_rows = []

        # 2. Convert Domain Events to Database StoredEvent records
        for event in events:
            next_version += 1
            event_dict = event.to_dict()
            
            # Remove base fields from JSON data to save space
            event_id = event_dict.pop("event_id")
            timestamp_str = event_dict.pop("timestamp")
            event_type = event_dict.pop("event_type")
            
            stored_event = StoredEvent(
                event_id=str(event_id),
                stream_id=stream_id,
                event_type=event_type,
                timestamp=datetime.fromisoformat(timestamp_str),
                data=event_dict,
                version=next_version
            )
            stored_rows.append(stored_event)
            session.add(stored_event)

        session.flush() # Persist to get Postgres validation without committing yet

        # 3. Publish domain events to local in-memory subscribers (Projections)
        for event in events:
            self._dispatch(event)

    def load_stream(self, session: Session, stream_id: str) -> List[DomainEvent]:
        """Loads all events in a stream, ordered by version, reconstructing state changes."""
        rows = (
            session.query(StoredEvent)
            .filter(StoredEvent.stream_id == stream_id)
            .order_by(StoredEvent.version)
            .all()
        )
        return [self._to_domain_event(row) for row in rows]

    def _dispatch(self, event: DomainEvent) -> None:
        """Dispatches event to registered projection handlers."""
        for subscriber in self._subscribers:
            try:
                subscriber(event)
            except Exception as e:
                logger.error(f"Error in subscriber {subscriber} processing event {event.event_id}: {e}")

    def _to_domain_event(self, row: StoredEvent) -> DomainEvent:
        """Hydrates a database row back into its strongly typed domain event."""
        event_type = row.event_type
        event_id = str(row.event_id)
        timestamp = row.timestamp
        data = row.data

        # Instantiate matching Domain Event based on the class type
        if event_type == "WindowSwitchedEvent":
            return WindowSwitchedEvent(
                event_id=event_id,
                timestamp=timestamp,
                app_name=data.get("app_name", ""),
                window_title=data.get("window_title", ""),
                process_path=data.get("details", {}).get("process_path", ""),
                pid=data.get("details", {}).get("pid", 0)
            )
        elif event_type == "ClipboardCopiedEvent":
            return ClipboardCopiedEvent(
                event_id=event_id,
                timestamp=timestamp,
                text_content=data.get("details", {}).get("text_content", ""),
                app_name=data.get("app_name", ""),
                window_title=data.get("window_title", "")
            )
        elif event_type == "FileEditedEvent":
            return FileEditedEvent(
                event_id=event_id,
                timestamp=timestamp,
                file_path=data.get("details", {}).get("file_path", ""),
                change_type=data.get("details", {}).get("change_type", "modified"),
                extension=data.get("details", {}).get("extension", "")
            )
        elif event_type == "ScreenshotCapturedEvent":
            return ScreenshotCapturedEvent(
                event_id=event_id,
                timestamp=timestamp,
                file_name=data.get("details", {}).get("file_name", ""),
                relative_path=data.get("details", {}).get("relative_path", ""),
                app_name=data.get("app_name", ""),
                window_title=data.get("window_title", ""),
                ocr_text=data.get("details", {}).get("ocr_text", "")
            )
        else:
            # Fallback to general recorded event
            return ActivityRecordedEvent(
                event_id=event_id,
                timestamp=timestamp,
                activity_type=data.get("activity_type", "general"),
                app_name=data.get("app_name", "Unknown"),
                window_title=data.get("window_title", ""),
                details=data.get("details", {})
            )

# Singleton Event Store Repository
event_store_repo = EventStoreRepository()
