"""
Módulo de Observabilidade e Logs Estruturados — Elite das Pechinchas
Fornece formatação padronizada em JSON com campos obrigatórios:
- timestamp (ISO-8601 UTC)
- level (INFO, WARNING, ERROR, etc.)
- component (listener, publisher, api, worker, etc.)
- event (identificador de ação/evento)
- request_id (quando disponível)
- path (para requisições HTTP)
- duration (em milissegundos ou segundos)
"""

import json
import logging
from datetime import datetime, timezone
from typing import Optional, Any, Dict


class StructuredJsonFormatter(logging.Formatter):
    """
    Formatador de logs que converte LogRecords em JSON padronizado.
    Suporta mensagens normais de texto ou payloads pré-formatados.
    """

    def __init__(self, default_component: str = "general"):
        super().__init__()
        self.default_component = default_component

    def format(self, record: logging.LogRecord) -> str:
        msg = record.getMessage()

        # Se já for um payload JSON válido com 'component' e 'level', preserva
        if msg.startswith("{") and msg.endswith("}"):
            try:
                parsed = json.loads(msg)
                if isinstance(parsed, dict) and "component" in parsed:
                    if "timestamp" not in parsed:
                        parsed["timestamp"] = datetime.fromtimestamp(
                            record.created, tz=timezone.utc
                        ).isoformat()
                    if "level" not in parsed:
                        parsed["level"] = record.levelname
                    return json.dumps(parsed, ensure_ascii=False)
            except Exception:
                pass

        data: Dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(
                record.created, tz=timezone.utc
            ).isoformat(),
            "level": record.levelname,
            "component": getattr(record, "component", self.default_component),
            "event": getattr(record, "event", "log_message"),
            "message": msg,
        }

        if hasattr(record, "request_id") and record.request_id:
            data["request_id"] = record.request_id
        if hasattr(record, "path") and record.path:
            data["path"] = record.path
        if hasattr(record, "duration") and record.duration is not None:
            data["duration"] = record.duration

        # Anexa atributos extras que não pertencem ao LogRecord padrão
        for key, val in record.__dict__.items():
            if key not in (
                "name", "msg", "args", "levelname", "levelno", "pathname", "filename",
                "module", "exc_info", "exc_text", "stack_info", "lineno", "funcName",
                "created", "msecs", "relativeCreated", "thread", "threadName",
                "processName", "process", "message", "component", "event",
                "request_id", "path", "duration", "default_component"
            ) and not key.startswith("_"):
                data[key] = val

        return json.dumps(data, ensure_ascii=False)


def get_structured_logger(name: str, component: str = "bot") -> logging.Logger:
    """
    Retorna uma instância de logger com StructuredJsonFormatter configurado no handler.
    """
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)

    has_json_handler = any(
        isinstance(getattr(h, "formatter", None), StructuredJsonFormatter)
        for h in logger.handlers
    )
    if not has_json_handler:
        handler = logging.StreamHandler()
        handler.setFormatter(StructuredJsonFormatter(default_component=component))
        logger.addHandler(handler)
        logger.propagate = False

    return logger


def emit_json_log(
    logger: logging.Logger,
    level: str,
    component: str,
    event: str,
    message: str,
    request_id: Optional[str] = None,
    path: Optional[str] = None,
    duration: Optional[float] = None,
    **extra: Any,
) -> str:
    """
    Emite um log estruturado em JSON com chaves padronizadas.
    Retorna a string JSON gerada para fins de auditoria ou asserção em testes.
    """
    payload: Dict[str, Any] = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "level": level.upper(),
        "component": component,
        "event": event,
        "message": message,
    }
    if request_id is not None:
        payload["request_id"] = request_id
    if path is not None:
        payload["path"] = path
    if duration is not None:
        payload["duration"] = duration
    if extra:
        payload.update(extra)

    json_str = json.dumps(payload, ensure_ascii=False)
    log_func = getattr(logger, level.lower(), logger.info)
    log_func(json_str)
    return json_str
