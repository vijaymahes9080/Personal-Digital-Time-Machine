from datetime import datetime
from typing import Dict, Any, Optional
from backend.app.domain.base import DomainEvent

class ActivityRecordedEvent(DomainEvent):
    """Fired when any general activity is logged into the timeline."""
    def __init__(
        self,
        event_id: Optional[str] = None,
        timestamp: Optional[datetime] = None,
        activity_type: str = "general",
        app_name: str = "Unknown",
        window_title: str = "",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(event_id, timestamp)
        self.activity_type = activity_type
        self.app_name = app_name
        self.window_title = window_title
        self.details = details or {}

    def to_dict(self) -> Dict[str, Any]:
        data = super().to_dict()
        data.update({
            "activity_type": self.activity_type,
            "app_name": self.app_name,
            "window_title": self.window_title,
            "details": self.details
        })
        return data

class WindowSwitchedEvent(ActivityRecordedEvent):
    def __init__(
        self,
        event_id: Optional[str] = None,
        timestamp: Optional[datetime] = None,
        app_name: str = "",
        window_title: str = "",
        process_path: str = "",
        pid: int = 0
    ):
        super().__init__(
            event_id=event_id,
            timestamp=timestamp,
            activity_type="window_switch",
            app_name=app_name,
            window_title=window_title,
            details={"process_path": process_path, "pid": pid}
        )

class ClipboardCopiedEvent(ActivityRecordedEvent):
    def __init__(
        self,
        event_id: Optional[str] = None,
        timestamp: Optional[datetime] = None,
        text_content: str = "",
        app_name: str = "",
        window_title: str = ""
    ):
        super().__init__(
            event_id=event_id,
            timestamp=timestamp,
            activity_type="clipboard",
            app_name=app_name,
            window_title=window_title,
            details={"text_content": text_content}
        )

class FileEditedEvent(ActivityRecordedEvent):
    def __init__(
        self,
        event_id: Optional[str] = None,
        timestamp: Optional[datetime] = None,
        file_path: str = "",
        change_type: str = "modified",  # created, modified, deleted
        extension: str = ""
    ):
        super().__init__(
            event_id=event_id,
            timestamp=timestamp,
            activity_type="file_edit",
            app_name="File Explorer",
            window_title=f"{change_type.capitalize()}: {file_path}",
            details={"file_path": file_path, "change_type": change_type, "extension": extension}
        )

class ScreenshotCapturedEvent(ActivityRecordedEvent):
    def __init__(
        self,
        event_id: Optional[str] = None,
        timestamp: Optional[datetime] = None,
        file_name: str = "",
        relative_path: str = "",
        app_name: str = "",
        window_title: str = "",
        ocr_text: Optional[str] = None
    ):
        super().__init__(
            event_id=event_id,
            timestamp=timestamp,
            activity_type="screenshot",
            app_name=app_name,
            window_title=window_title,
            details={
                "file_name": file_name,
                "relative_path": relative_path,
                "ocr_text": ocr_text or ""
            }
        )
