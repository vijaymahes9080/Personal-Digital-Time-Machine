from dependency_injector import containers, providers
from loguru import logger

from backend.app.infrastructure.database.postgres import db_manager
from backend.app.infrastructure.database.event_store import event_store_repo
from backend.app.infrastructure.search.qdrant_client import vector_store
from backend.app.infrastructure.graph.neo4j_client import graph_client
from backend.app.infrastructure.cache.redis_client import cache_client
from backend.app.infrastructure.search.tantivy_client import search_index

class Container(containers.DeclarativeContainer):
    # Core Database & Client singletons
    db = providers.Singleton(lambda: db_manager)
    event_store = providers.Singleton(lambda: event_store_repo)
    vector_store = providers.Singleton(lambda: vector_store)
    graph_client = providers.Singleton(lambda: graph_client)
    cache_client = providers.Singleton(lambda: cache_client)
    search_index = providers.Singleton(lambda: search_index)

    # Agents (Lazy loaded or instantiated as Singletons)
    ocr_agent = providers.Singleton(
        lambda: OCRAgentWrapper()
    )
    embedding_agent = providers.Singleton(
        lambda: EmbeddingAgentWrapper()
    )

class OCRAgentWrapper:
    """Lazy-loaded OCR agent shell to avoid premature imports of pytesseract in containers."""
    def __init__(self):
        self._agent = None

    def get_agent(self):
        if not self._agent:
            from backend.app.infrastructure.agents.ocr_agent import OCRAgent
            self._agent = OCRAgent()
        return self._agent

    def process_screenshot(self, image_path: str) -> str:
        return self.get_agent().process_screenshot(image_path)

class EmbeddingAgentWrapper:
    """Lazy-loaded Embedding agent shell to avoid premature imports of large ML models."""
    def __init__(self):
        self._agent = None

    def get_agent(self):
        if not self._agent:
            from backend.app.infrastructure.agents.embedding_agent import EmbeddingAgent
            self._agent = EmbeddingAgent()
        return self._agent

    def get_embeddings(self, text: str) -> list[float]:
        return self.get_agent().get_embeddings(text)

# Singleton Container instance
app_container = Container()
