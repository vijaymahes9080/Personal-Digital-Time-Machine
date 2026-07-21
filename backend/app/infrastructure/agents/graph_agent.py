import re
import os
from typing import List, Dict, Any, Tuple
from loguru import logger

from backend.app.domain.base import DomainEvent
from backend.app.domain.events import (
    WindowSwitchedEvent,
    ClipboardCopiedEvent,
    FileEditedEvent,
    ScreenshotCapturedEvent
)

class GraphBuilderAgent:
    def __init__(self):
        # Broad lookup list for software technologies
        self.known_technologies = [
            "python", "javascript", "typescript", "rust", "golang", "c++", "java", "php", "ruby", "html", "css",
            "react", "vue", "angular", "nextjs", "vite", "tailwind", "fastapi", "flask", "django", "spring",
            "postgresql", "sqlite", "mysql", "mongodb", "redis", "neo4j", "qdrant", "meilisearch", "elasticsearch",
            "docker", "kubernetes", "git", "github", "npm", "pip", "poetry", "tauri", "ollama", "whisper",
            "tensorflow", "pytorch", "keras", "pandas", "numpy", "scikit-learn"
        ]

    def analyze_event(self, event: DomainEvent, text_content: str) -> Tuple[List[Dict[str, Any]], List[Tuple[str, str, str, Dict[str, Any]]]]:
        """Analyzes an event and its content to extract nodes and edge relationships."""
        nodes = []
        edges = []

        # Central User Node
        nodes.append({
            "id": "user_1",
            "label": "Person",
            "properties": {"name": "User", "role": "Knowledge Worker"}
        })

        # Add event node
        event_node_id = f"event_{event.event_id}"
        nodes.append({
            "id": event_node_id,
            "label": "Event",
            "properties": {
                "type": getattr(event, "activity_type", "general"),
                "app": event.app_name,
                "title": event.window_title,
                "timestamp": event.timestamp.isoformat()
            }
        })
        edges.append(("user_1", event_node_id, "TRIGGERED", {}))

        # Add App node
        app_id = f"app_{event.app_name.lower().replace(' ', '_')}"
        nodes.append({
            "id": app_id,
            "label": "Technology",
            "properties": {"name": event.app_name, "type": "Application"}
        })
        edges.append((event_node_id, app_id, "BELONGS_TO", {}))
        edges.append(("user_1", app_id, "USES", {"last_used": event.timestamp.isoformat()}))

        # Combine title and contents to scan for knowledge patterns
        full_text = f"{event.window_title} {text_content}".lower()

        # 1. Extract Technologies
        for tech in self.known_technologies:
            # Match boundary word
            if re.search(rf"\b{re.escape(tech)}\b", full_text):
                tech_id = f"tech_{tech}"
                nodes.append({
                    "id": tech_id,
                    "label": "Technology",
                    "properties": {"name": tech.capitalize(), "type": "Language/Library"}
                })
                # Relate event and user to tech
                edges.append((event_node_id, tech_id, "USES", {}))
                edges.append(("user_1", tech_id, "KNOWS", {"last_active": event.timestamp.isoformat()}))

        # 2. Extract Project and File details (File edited events)
        if isinstance(event, FileEditedEvent):
            file_path = event.details.get("file_path", "")
            file_name = os.path.basename(file_path)
            file_id = f"file_{file_path.lower().replace(os.sep, '_')}"
            
            nodes.append({
                "id": file_id,
                "label": "File",
                "properties": {
                    "name": file_name,
                    "path": file_path,
                    "extension": event.details.get("extension", "")
                }
            })
            edges.append((event_node_id, file_id, "MODIFIED", {"change_type": event.details.get("change_type", "modified")}))

            parent_dir = os.path.dirname(file_path)
            if parent_dir:
                project_name = os.path.basename(parent_dir)
                project_id = f"project_{project_name.lower().replace(' ', '_')}"
                
                nodes.append({
                    "id": project_id,
                    "label": "Project",
                    "properties": {"name": project_name, "path": parent_dir}
                })
                edges.append((file_id, project_id, "BELONGS_TO", {}))
                edges.append(("user_1", project_id, "WORKS_ON", {"last_active": event.timestamp.isoformat()}))
                edges.append((event_node_id, project_id, "BELONGS_TO", {}))

        # 3. Extract Errors & Exceptions
        error_matches = re.findall(r"\b(\w+error|\w+exception)\b", full_text)
        for err in error_matches:
            err_name = err.capitalize()
            err_id = f"error_{err.lower()}"
            nodes.append({
                "id": err_id,
                "label": "Error",
                "properties": {"name": err_name, "timestamp": event.timestamp.isoformat()}
            })
            edges.append((event_node_id, err_id, "ENCOUNTERED", {}))

        # 4. Extract Concepts / Ideas from Clipboard copies
        if isinstance(event, ClipboardCopiedEvent):
            # Pick out potential short topic titles (3-5 words starting with capital letters, or hashtags, etc.)
            # Or simple keywords (e.g. "auth", "migration", "refactoring")
            topics = ["refinement", "architecture", "debugging", "security", "optimization"]
            for topic in topics:
                if topic in full_text:
                    concept_id = f"concept_{topic}"
                    nodes.append({
                        "id": concept_id,
                        "label": "Concept",
                        "properties": {"name": topic.capitalize()}
                    })
                    edges.append((event_node_id, concept_id, "DISCUSSED", {}))
                    edges.append(("user_1", concept_id, "LEARNED", {}))

        return nodes, edges

# Singleton Agent Instance
graph_builder_agent = GraphBuilderAgent()
