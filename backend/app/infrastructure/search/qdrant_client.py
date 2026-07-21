from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels
from qdrant_client.http.exceptions import UnexpectedResponse
from loguru import logger
from typing import List, Dict, Any, Optional
import uuid

from backend.app.core.config import settings

class LocalVectorStore:
    def __init__(self):
        # Direct serverless disk storage mode! No docker needed.
        self.collection_name = "chrona_activities"
        self.vector_size = 768  # Standard size for nomic-embed-text or BGE-large
        
        try:
            if settings.QDRANT_PREFER_LOCAL:
                logger.info(f"Initializing Qdrant in Serverless mode at {settings.QDRANT_DIR}")
                self.client = QdrantClient(path=str(settings.QDRANT_DIR))
            else:
                logger.info(f"Initializing Qdrant client connecting to {settings.QDRANT_HOST}:{settings.QDRANT_PORT}")
                self.client = QdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT)
            
            self._ensure_collection_exists()
        except Exception as e:
            logger.error(f"Failed to initialize Qdrant client: {e}")
            raise e

    def _ensure_collection_exists(self) -> None:
        """Create collection if it doesn't already exist."""
        try:
            collections = self.client.get_collections().collections
            collection_names = [col.name for col in collections]
            
            if self.collection_name not in collection_names:
                logger.info(f"Creating Qdrant collection: {self.collection_name} (dim={self.vector_size})")
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=qmodels.VectorParams(
                        size=self.vector_size,
                        distance=qmodels.Distance.COSINE
                    )
                )
            else:
                logger.debug(f"Qdrant collection {self.collection_name} already exists.")
        except Exception as e:
            logger.error(f"Error ensuring Qdrant collection: {e}")

    def upsert_event(self, event_id: str, vector: List[float], payload: Dict[str, Any]) -> bool:
        """Upsert a single event vector with metadata payload."""
        try:
            # Generate a consistent UUID from string
            point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, event_id))
            
            self.client.upsert(
                collection_name=self.collection_name,
                points=[
                    qmodels.PointStruct(
                        id=point_id,
                        vector=vector,
                        payload=payload
                    )
                ]
            )
            logger.debug(f"Successfully indexed vector for event {event_id} in Qdrant.")
            return True
        except Exception as e:
            logger.error(f"Failed to upsert event {event_id} into Qdrant: {e}")
            return False

    def search_semantic(self, query_vector: List[float], limit: int = 10, filter_dict: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Search vector database using query embedding vector."""
        try:
            q_filter = None
            if filter_dict:
                conditions = []
                for k, v in filter_dict.items():
                    conditions.append(
                        qmodels.FieldCondition(
                            key=k,
                            match=qmodels.MatchValue(value=v)
                        )
                    )
                q_filter = qmodels.Filter(must=conditions)

            res = self.client.query_points(
                collection_name=self.collection_name,
                query=query_vector,
                limit=limit,
                query_filter=q_filter,
                with_payload=True
            )
            results = res.points
            
            search_hits = []
            for hit in results:
                search_hits.append({
                    "id": hit.id,
                    "score": hit.score,
                    "payload": hit.payload
                })
            return search_hits
        except Exception as e:
            logger.error(f"Failed semantic search in Qdrant: {e}")
            return []

# Singleton Vector Store Client
vector_store = LocalVectorStore()
