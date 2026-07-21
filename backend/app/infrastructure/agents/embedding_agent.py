import httpx
from loguru import logger
from typing import List
import numpy as np
import hashlib

from backend.app.core.config import settings

class EmbeddingAgent:
    def __init__(self):
        self.ollama_url = settings.OLLAMA_API_URL
        self.model_name = settings.EMBEDDING_MODEL
        self.vector_dim = 768  # Target Qdrant collection dimensions
        self.use_ollama = True

        # Check if Ollama is running
        try:
            response = httpx.get(f"{self.ollama_url}/api/tags", timeout=2.0)
            if response.status_code == 200:
                logger.info(f"Connected to Ollama. Embedding model: {self.model_name}")
            else:
                self.use_ollama = False
                logger.warning("Ollama returned non-200. Will use local fallback embedding generator.")
        except (httpx.RequestError, Exception) as e:
            self.use_ollama = False
            logger.warning(
                f"Ollama is offline or unreachable ({e}). "
                f"ChronaAI will fallback to local pseudo-embeddings. "
                f"To get semantic search, start Ollama with 'ollama run {self.model_name}'."
            )

    def get_embeddings(self, text: str) -> List[float]:
        """Generates a dense embedding vector for the given text."""
        if not text or not text.strip():
            return [0.0] * self.vector_dim

        if self.use_ollama:
            try:
                # Call Ollama Embeddings API
                payload = {
                    "model": self.model_name,
                    "prompt": text
                }
                # Check for newer Ollama embedding endpoint format
                response = httpx.post(
                    f"{self.ollama_url}/api/embeddings",
                    json=payload,
                    timeout=5.0
                )
                if response.status_code == 200:
                    data = response.json()
                    embedding = data.get("embedding")
                    if embedding:
                        # Ensure output matches target size by padding/truncating if necessary
                        if len(embedding) == self.vector_dim:
                            return embedding
                        else:
                            logger.warning(f"Ollama vector size {len(embedding)} mismatch. Resizing to {self.vector_dim}.")
                            return self._resize_vector(embedding, self.vector_dim)
            except Exception as e:
                logger.error(f"Failed to generate embeddings with Ollama: {e}. Falling back...")

        # Local pseudo-embedding fallback: generates a deterministic vector of length 768 based on string hashing
        return self._generate_fallback_vector(text)

    def _resize_vector(self, vector: List[float], target_dim: int) -> List[float]:
        """Truncates or pads a vector to match the target dimension."""
        if len(vector) > target_dim:
            return vector[:target_dim]
        else:
            return vector + [0.0] * (target_dim - len(vector))

    def _generate_fallback_vector(self, text: str) -> List[float]:
        """Generates a deterministic vector of floats from text hash. Suitable for testing offline."""
        vector = []
        # Chunk text and hash each block to fill the dimensions
        for i in range(self.vector_dim):
            # Create a localized seed for each index
            seed = f"{text}_{i}"
            sha = hashlib.sha256(seed.encode("utf-8")).hexdigest()
            # Convert hash slice to float in range [-1.0, 1.0]
            val = (int(sha[:8], 16) / 4294967295.0) * 2.0 - 1.0
            vector.append(val)
        
        # Normalize the vector to have length 1
        arr = np.array(vector)
        norm = np.linalg.norm(arr)
        if norm > 0:
            arr = arr / norm
        return arr.tolist()
