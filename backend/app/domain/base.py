from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import uuid

class DomainEvent:
    """Base class for all Domain Events in ChronaAI."""
    def __init__(self, event_id: Optional[str] = None, timestamp: Optional[datetime] = None):
        self.event_id = event_id or str(uuid.uuid4())
        self.timestamp = timestamp or datetime.now(timezone.utc)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "event_id": self.event_id,
            "timestamp": self.timestamp.isoformat(),
            "event_type": self.__class__.__name__
        }

class Entity:
    """Base Entity class representing an object defined by its identity."""
    def __init__(self, id: Optional[str] = None):
        self.id = id or str(uuid.uuid4())

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Entity):
            return False
        return self.id == other.id

    def __hash__(self) -> int:
        return hash(self.id)

class AggregateRoot(Entity):
    """Base class for Aggregate Roots which coordinate events and maintain state."""
    def __init__(self, id: Optional[str] = None):
        super().__init__(id)
        self._version: int = 0
        self._events: List[DomainEvent] = []

    @property
    def version(self) -> int:
        return self._version

    def get_uncommitted_events(self) -> List[DomainEvent]:
        return self._events

    def clear_events(self) -> None:
        self._events.clear()

    def raise_event(self, event: DomainEvent) -> None:
        self._events.append(event)
        self.apply(event)
        self._version += 1

    def apply(self, event: DomainEvent) -> None:
        """Apply state changes based on the event. Override in subclasses."""
        method_name = f"on_{self._to_snake_case(event.__class__.__name__)}"
        if hasattr(self, method_name):
            getattr(self, method_name)(event)

    def _to_snake_case(self, name: str) -> str:
        import re
        return re.sub(r'(?<!^)(?=[A-Z])', '_', name).lower()
