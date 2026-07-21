import tantivy
from loguru import logger
from typing import List, Dict, Any, Optional
import os

from backend.app.core.config import settings

class LocalSearchIndex:
    def __init__(self):
        # 1. Define Tantivy Schema
        schema_builder = tantivy.SchemaBuilder()
        self.f_event_id = schema_builder.add_text_field("event_id", stored=True)
        self.f_timestamp = schema_builder.add_text_field("timestamp", stored=True)
        self.f_activity_type = schema_builder.add_text_field("activity_type", stored=True, tokenizer_name="default")
        self.f_app_name = schema_builder.add_text_field("app_name", stored=True, tokenizer_name="default")
        self.f_window_title = schema_builder.add_text_field("window_title", stored=True, tokenizer_name="default")
        self.f_body = schema_builder.add_text_field("body", stored=True, tokenizer_name="default")
        self.schema = schema_builder.build()

        try:
            # 2. Open or Create Index
            # If in testing mode, use an in-memory index to avoid OS file locking conflicts
            if "test" in str(settings.DATABASE_URL) or "memory" in str(settings.DATABASE_URL):
                logger.info("Initializing Tantivy index in-memory for testing...")
                self.index = tantivy.Index(self.schema)
            else:
                os.makedirs(settings.TANTIVY_DIR, exist_ok=True)
                if len(os.listdir(settings.TANTIVY_DIR)) > 0:
                    logger.info(f"Opening existing Tantivy index at {settings.TANTIVY_DIR}...")
                    self.index = tantivy.Index.open(str(settings.TANTIVY_DIR))
                else:
                    logger.info(f"Creating new Tantivy index at {settings.TANTIVY_DIR}...")
                    self.index = tantivy.Index(self.schema, path=str(settings.TANTIVY_DIR))
            
            # Setup Index Writer (with 50MB memory limit)
            self.writer = self.index.writer(heap_size=50000000)
        except Exception as e:
            logger.error(f"Failed to initialize Tantivy index: {e}")
            raise e

    def add_document(
        self,
        event_id: str,
        timestamp: str,
        activity_type: str,
        app_name: str,
        window_title: str,
        body: str
    ) -> bool:
        """Indexes a document into Tantivy. Note: Commit is called immediately for real-time search."""
        try:
            doc = tantivy.Document()
            doc.add_text("event_id", event_id)
            doc.add_text("timestamp", timestamp)
            doc.add_text("activity_type", activity_type)
            doc.add_text("app_name", app_name)
            doc.add_text("window_title", window_title)
            doc.add_text("body", body)

            self.writer.add_document(doc)
            self.writer.commit()
            logger.debug(f"Tantivy indexed event {event_id} successfully.")
            return True
        except Exception as e:
            logger.error(f"Failed to add document to Tantivy: {e}")
            # Try to recreate writer if it got corrupted
            try:
                self.writer = self.index.writer(heap_size=50000000)
            except Exception:
                pass
            return False

    def search_keyword(self, query_string: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Queries the local Tantivy index using Lucene-style search strings."""
        try:
            # Refresh reader to see latest commits
            self.index.reload()
            searcher = self.index.searcher()
            
            # Default fields to search against
            query = self.index.parse_query(
                query_string,
                default_field_names=["window_title", "body", "app_name", "activity_type"]
            )
            
            hits = searcher.search(query, limit).hits
            
            results = []
            for score, doc_address in hits:
                doc = searcher.doc(doc_address)
                # Parse fields
                results.append({
                    "score": score,
                    "event_id": doc.get_first("event_id"),
                    "timestamp": doc.get_first("timestamp"),
                    "activity_type": doc.get_first("activity_type"),
                    "app_name": doc.get_first("app_name"),
                    "window_title": doc.get_first("window_title"),
                    "body": doc.get_first("body")
                })
            return results
        except Exception as e:
            logger.error(f"Tantivy search error for query '{query_string}': {e}")
            return []

# Singleton Search Index Client
search_index = LocalSearchIndex()
