import redis
from loguru import logger
from typing import Any, Optional
import json
import os
import diskcache

from backend.app.core.config import settings

class LocalCache:
    def __init__(self):
        self.use_fallback = False
        self.redis_client: Optional[redis.Redis] = None
        self.fallback_cache: Optional[diskcache.Cache] = None

        try:
            logger.info(f"Connecting to Redis Cache at {settings.REDIS_URL}...")
            self.redis_client = redis.Redis.from_url(
                settings.REDIS_URL,
                socket_connect_timeout=2.0,
                decode_responses=True
            )
            # Ping database to verify
            self.redis_client.ping()
            logger.info("Successfully connected to Redis.")
        except Exception as e:
            if settings.REDIS_PREFER_FALLBACK:
                logger.warning(
                    f"Failed to connect to Redis ({e}). "
                    f"Falling back to local disk-based cache at {settings.CACHE_DIR}."
                )
                self.use_fallback = True
                self.fallback_cache = diskcache.Cache(str(settings.CACHE_DIR))
            else:
                logger.error(f"Failed to connect to Redis: {e}")
                raise e

    def set(self, key: str, value: Any, expire_seconds: Optional[int] = None) -> bool:
        """Sets value in cache with optional TTL expiration."""
        try:
            serialized = json.dumps(value)
            if self.use_fallback:
                # diskcache takes expire in seconds
                self.fallback_cache.set(key, serialized, expire=expire_seconds)
                return True
            else:
                self.redis_client.set(key, serialized, ex=expire_seconds)
                return True
        except Exception as e:
            logger.error(f"Failed to write to cache (key={key}): {e}")
            return False

    def get(self, key: str) -> Optional[Any]:
        """Gets value from cache. Returns None if missing."""
        try:
            if self.use_fallback:
                val = self.fallback_cache.get(key)
            else:
                val = self.redis_client.get(key)
            
            if val is None:
                return None
            return json.loads(val)
        except Exception as e:
            logger.error(f"Failed to read from cache (key={key}): {e}")
            return None

    def delete(self, key: str) -> bool:
        """Removes key from cache."""
        try:
            if self.use_fallback:
                return self.fallback_cache.delete(key)
            else:
                return bool(self.redis_client.delete(key))
        except Exception as e:
            logger.error(f"Failed to delete cache key {key}: {e}")
            return False

    def clear(self) -> None:
        """Wipes the entire cache database."""
        try:
            if self.use_fallback:
                self.fallback_cache.clear()
            else:
                self.redis_client.flushdb()
            logger.info("Cache successfully cleared.")
        except Exception as e:
            logger.error(f"Failed to clear cache: {e}")

# Singleton Cache Client
cache_client = LocalCache()
