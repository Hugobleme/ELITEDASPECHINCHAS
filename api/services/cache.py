"""
Serviço de Cache Resiliente para FastAPI.
Oferece suporte primário a Redis com fallback automático em memória (TTL/LRU).
Garante zero indisponibilidade caso o Redis esteja indisponível ou desconectado.
"""
import os
import json
import time
import logging
from typing import Optional, Any, Callable
from functools import wraps
from fastapi import Request, Response

logger = logging.getLogger("elitedaspechinchas.cache")

# Estado em memória para fallback resiliente
_IN_MEMORY_CACHE: dict[str, tuple[float, str]] = {}
_STATS = {
    "hits": 0,
    "misses": 0,
    "writes": 0,
    "invalidations": 0,
}


def _get_redis_client():
    redis_url = os.getenv("REDIS_URL")
    if not redis_url:
        return None
    try:
        import redis
        client = redis.Redis.from_url(redis_url, socket_timeout=1.5, socket_connect_timeout=1.5)
        client.ping()
        return client
    except Exception as exc:
        logger.debug(f"[Cache] Redis indisponível, usando fallback em memória: {exc}")
        return None


class CacheService:
    def __init__(self):
        self._redis = None
        self._last_redis_check = 0.0

    def get_redis(self):
        now = time.time()
        # Tenta reconectar ao Redis periodicamente a cada 30 segundos se estiver desconectado
        if self._redis is None and (now - self._last_redis_check > 30.0):
            self._last_redis_check = now
            self._redis = _get_redis_client()
        return self._redis

    def get(self, key: str) -> Optional[str]:
        r = self.get_redis()
        if r:
            try:
                val = r.get(key)
                if val is not None:
                    _STATS["hits"] += 1
                    return val.decode("utf-8") if isinstance(val, bytes) else str(val)
            except Exception as exc:
                logger.warning(f"[Cache] Erro de leitura no Redis: {exc}. Usando fallback.")
                self._redis = None

        # Fallback em memória
        now = time.time()
        entry = _IN_MEMORY_CACHE.get(key)
        if entry:
            expire_at, value = entry
            if expire_at > now:
                _STATS["hits"] += 1
                return value
            else:
                del _IN_MEMORY_CACHE[key]

        _STATS["misses"] += 1
        return None

    def set(self, key: str, value: str, ttl_seconds: int = 300) -> bool:
        _STATS["writes"] += 1
        r = self.get_redis()
        success = False
        if r:
            try:
                r.setex(key, ttl_seconds, value)
                success = True
            except Exception as exc:
                logger.warning(f"[Cache] Erro de escrita no Redis: {exc}. Usando fallback.")
                self._redis = None

        # Sempre espelha no cache em memória como salvaguarda
        _IN_MEMORY_CACHE[key] = (time.time() + ttl_seconds, value)
        # Limpeza leve se a memória crescer excessivamente
        if len(_IN_MEMORY_CACHE) > 5000:
            self._cleanup_in_memory()
        return success

    def invalidate_prefix(self, prefix: str) -> int:
        """Invalida todas as chaves que iniciam com o prefixo informado."""
        _STATS["invalidations"] += 1
        deleted_count = 0

        # Invalidação no Redis
        r = self.get_redis()
        if r:
            try:
                keys = r.keys(f"{prefix}*")
                if keys:
                    deleted_count = r.delete(*keys)
            except Exception as exc:
                logger.warning(f"[Cache] Erro ao invalidar chaves no Redis: {exc}")
                self._redis = None

        # Invalidação em memória
        to_del = [k for k in _IN_MEMORY_CACHE if k.startswith(prefix)]
        for k in to_del:
            del _IN_MEMORY_CACHE[k]
        deleted_count += len(to_del)

        logger.info(f"[Cache] Invalidadas chaves com prefixo '{prefix}' (total: {deleted_count})")
        return deleted_count

    def clear(self):
        """Limpa completamente o cache em memória e no Redis (usado em testes ou resets)."""
        _IN_MEMORY_CACHE.clear()
        r = self.get_redis()
        if r:
            try:
                r.flushdb()
            except Exception:
                pass

    def _cleanup_in_memory(self):
        now = time.time()
        expired = [k for k, (exp, _) in _IN_MEMORY_CACHE.items() if exp <= now]
        for k in expired:
            del _IN_MEMORY_CACHE[k]

    def get_stats(self) -> dict:
        total_reqs = _STATS["hits"] + _STATS["misses"]
        hit_ratio = (_STATS["hits"] / total_reqs * 100) if total_reqs > 0 else 0.0
        return {
            "hits": _STATS["hits"],
            "misses": _STATS["misses"],
            "total_requests": total_reqs,
            "hit_ratio_pct": round(hit_ratio, 2),
            "writes": _STATS["writes"],
            "invalidations": _STATS["invalidations"],
            "in_memory_keys": len(_IN_MEMORY_CACHE),
            "redis_connected": self._redis is not None,
        }


# Instância global do serviço de cache
cache_service = CacheService()


def cached_endpoint(prefix: str, ttl_seconds: int = 300):
    """
    Decorator para rotas FastAPI com injeção automática de header X-Cache: HIT/MISS.
    """
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Extrai request para gerar chave única baseada na URL e query parameters
            request: Optional[Request] = None
            response: Optional[Response] = None

            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                elif isinstance(arg, Response):
                    response = arg
            for val in kwargs.values():
                if isinstance(val, Request):
                    request = val
                elif isinstance(val, Response):
                    response = val

            if not request:
                return func(*args, **kwargs)

            # Gera chave baseada no path e query string ordenada
            query_items = sorted(request.query_params.items())
            query_str = "&".join(f"{k}={v}" for k, v in query_items)
            cache_key = f"{prefix}:{request.url.path}?{query_str}"

            cached_payload = cache_service.get(cache_key)
            if cached_payload is not None:
                if response:
                    response.headers["X-Cache"] = "HIT"
                try:
                    return json.loads(cached_payload)
                except Exception:
                    pass

            # Cache MISS
            result = func(*args, **kwargs)

            # Serializa e grava no cache
            try:
                # Trata modelos Pydantic ou dicionários/listas normais
                if hasattr(result, "model_dump"):
                    serializable = result.model_dump()
                elif hasattr(result, "dict"):
                    serializable = result.dict()
                elif isinstance(result, list):
                    serializable = [
                        item.model_dump() if hasattr(item, "model_dump")
                        else item.dict() if hasattr(item, "dict")
                        else item
                        for item in result
                    ]
                else:
                    serializable = result

                payload_str = json.dumps(serializable, default=str)
                cache_service.set(cache_key, payload_str, ttl_seconds=ttl_seconds)
            except Exception as ser_err:
                logger.debug(f"[Cache] Falha ao serializar resultado para cache: {ser_err}")

            if response:
                response.headers["X-Cache"] = "MISS"

            return result

        return wrapper
    return decorator
