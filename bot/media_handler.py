"""
Módulo de tratamento, validação, extração e segurança de mídias de origem (Telegram e Web).
Garante preservação de fotos originais, proteção contra SSRF, validação de MIME types
e gerenciamento seguro de arquivos temporários.
"""
import os
import re
import socket
import ipaddress
import tempfile
import urllib.parse
from typing import Optional, Dict, Any, Tuple
import httpx

from bot.structured_logger import get_structured_logger, emit_json_log

logger = get_structured_logger("elitedaspechinchas.bot.media_handler", component="media_handler")

# Configurações de Mídia
MAX_MEDIA_SIZE_MB = int(os.getenv("MAX_MEDIA_SIZE_MB", "10"))
MAX_MEDIA_SIZE_BYTES = MAX_MEDIA_SIZE_MB * 1024 * 1024
MEDIA_DOWNLOAD_TIMEOUT = float(os.getenv("MEDIA_DOWNLOAD_TIMEOUT", "15.0"))

ALLOWED_IMAGE_MIMES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/jpg",
}

ALLOWED_IMAGE_EXTS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
}


def is_private_ip(ip_str: str) -> bool:
    """Verifica se um endereço IP pertence a faixas privadas, loopback ou reservadas (SSRF protection)."""
    try:
        ip = ipaddress.ip_address(ip_str)
        return (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
            or ip_str.startswith("169.254.")  # AWS/GCP/Cloud metadata
        )
    except ValueError:
        return True


def is_safe_public_url(url: Optional[str]) -> bool:
    """
    Valida rigorosamente se uma URL é pública, sintaticamente correta e segura contra SSRF.
    Bloqueia localhost, 127.0.0.1, faixas RFC 1918, links locais e esquemas não-HTTP.
    """
    if not url or not isinstance(url, str):
        return False

    clean_url = url.strip()
    try:
        parsed = urllib.parse.urlparse(clean_url)
        if parsed.scheme.lower() not in ("http", "https"):
            return False

        hostname = parsed.hostname
        if not hostname:
            return False

        lower_host = hostname.lower()
        if lower_host in ("localhost", "127.0.0.1", "0.0.0.0", "::1", "metadata.google.internal"):
            return False

        # Verifica resolução de DNS para prevenir DNS Rebinding e SSRF
        try:
            addr_info = socket.getaddrinfo(hostname, None)
            for item in addr_info:
                ip_addr = item[4][0]
                if is_private_ip(ip_addr):
                    return False
        except socket.gaierror:
            # Não foi possível resolver o host
            return False

        return True
    except Exception as e:
        logger.debug(f"[MediaHandler] URL inválida rejeitada ({url}): {e}")
        return False


def cleanup_temp_media(path: Optional[str]) -> None:
    """Remove com segurança um arquivo temporário de mídia se existir."""
    if path and os.path.exists(path):
        try:
            os.remove(path)
            logger.debug(f"[MediaHandler] Arquivo temporário removido: {path}")
        except Exception as e:
            logger.warning(f"[MediaHandler] Falha ao remover temporário {path}: {e}")


def create_safe_temp_media_file(suffix: str = ".jpg") -> str:
    """Cria um arquivo temporário com nome aleatório seguro no diretório temp padrão do SO."""
    clean_suffix = suffix if suffix.startswith(".") else f".{suffix}"
    if clean_suffix.lower() not in ALLOWED_IMAGE_EXTS:
        clean_suffix = ".jpg"

    fd, path = tempfile.mkstemp(prefix="promo_media_", suffix=clean_suffix)
    os.close(fd)
    return path


async def download_image_to_temp(
    url: str,
    max_bytes: int = MAX_MEDIA_SIZE_BYTES,
    timeout_secs: float = MEDIA_DOWNLOAD_TIMEOUT,
) -> Optional[str]:
    """
    Baixa com streaming seguro uma imagem remota para arquivo temporário local.
    Aplica limites estritos de tamanho, timeout e validação de Content-Type.
    Retorna o caminho do arquivo temporário criado, ou None em caso de falha.
    """
    if not is_safe_public_url(url):
        emit_json_log(
            logger=logger,
            level="warning",
            component="media_handler",
            event="media_download_rejected",
            message=f"URL de mídia insegura ou inválida para download: {url}",
            has_public_url=False,
        )
        return None

    temp_path = create_safe_temp_media_file()
    bytes_downloaded = 0

    try:
        transport = httpx.AsyncHTTPTransport(retries=1)
        async with httpx.AsyncClient(timeout=timeout_secs, follow_redirects=True, transport=transport) as client:
            async with client.stream("GET", url) as response:
                if response.status_code != 200:
                    emit_json_log(
                        logger=logger,
                        level="warning",
                        component="media_handler",
                        event="media_download_http_error",
                        message=f"Status HTTP {response.status_code} ao baixar imagem.",
                        status_code=response.status_code,
                    )
                    cleanup_temp_media(temp_path)
                    return None

                content_type = response.headers.get("content-type", "").split(";")[0].strip().lower()
                # Se content-type informado e não for imagem permitida
                if content_type and content_type not in ALLOWED_IMAGE_MIMES and "application/octet-stream" not in content_type:
                    emit_json_log(
                        logger=logger,
                        level="warning",
                        component="media_handler",
                        event="media_invalid_mime",
                        message=f"Content-Type não permitido para imagem: {content_type}",
                        mime_type=content_type,
                    )
                    cleanup_temp_media(temp_path)
                    return None

                # Valida header Content-Length antecipadamente
                content_length = response.headers.get("content-length")
                if content_length:
                    try:
                        if int(content_length) > max_bytes:
                            emit_json_log(
                                logger=logger,
                                level="warning",
                                component="media_handler",
                                event="media_too_large",
                                message=f"Content-Length ({content_length} bytes) excede o limite ({max_bytes} bytes).",
                                file_size=int(content_length),
                            )
                            cleanup_temp_media(temp_path)
                            return None
                    except ValueError:
                        pass

                with open(temp_path, "wb") as f:
                    async for chunk in response.aiter_bytes(chunk_size=16384):
                        bytes_downloaded += len(chunk)
                        if bytes_downloaded > max_bytes:
                            emit_json_log(
                                logger=logger,
                                level="warning",
                                component="media_handler",
                                event="media_too_large",
                                message=f"Download de mídia excedeu limite de {max_bytes} bytes. Abortado.",
                                file_size=bytes_downloaded,
                            )
                            cleanup_temp_media(temp_path)
                            return None
                        f.write(chunk)

                if bytes_downloaded == 0:
                    cleanup_temp_media(temp_path)
                    return None

                return temp_path

    except httpx.TimeoutException:
        emit_json_log(
            logger=logger,
            level="warning",
            component="media_handler",
            event="media_download_timeout",
            message=f"Timeout de {timeout_secs}s excedido ao baixar imagem.",
        )
        cleanup_temp_media(temp_path)
        return None
    except Exception as exc:
        emit_json_log(
            logger=logger,
            level="warning",
            component="media_handler",
            event="media_download_error",
            message=f"Erro ao baixar imagem: {exc}",
        )
        cleanup_temp_media(temp_path)
        return None


async def extract_source_media(message, client=None) -> Dict[str, Any]:
    """
    Extrai e classifica mídias presentes em uma mensagem do Telegram (Telethon ou objeto similar).
    Garante preservação de foto anexada, documento de imagem e URLs diretas válidas.

    Retorna um dicionário padronizado:
    {
        "source_media_type": "photo" | "document" | "url" | "web_preview" | None,
        "source_media_path": "/temp/path.jpg" | None,
        "source_image_url": "https://..." | None,
        "has_public_url": bool,
        "telegram_msg_id": int | None,
        "source_chat_id": int | str | None,
    }
    """
    msg_id = getattr(message, "id", None) or getattr(message, "telegram_msg_id", None)
    chat_id = getattr(message, "chat_id", None) or getattr(message, "peer_id", None)

    result = {
        "source_media_type": None,
        "source_media_path": None,
        "source_image_url": None,
        "has_public_url": False,
        "telegram_msg_id": msg_id,
        "source_chat_id": str(chat_id) if chat_id else None,
    }

    if not message:
        return result

    try:
        # 1. Foto anexada diretamente no Telegram (Telethon Message.photo ou MessageMediaPhoto)
        has_photo = getattr(message, "photo", None) is not None
        if not has_photo and getattr(message, "media", None):
            media_cls = message.media.__class__.__name__
            if "Photo" in media_cls:
                has_photo = True

        if has_photo:
            emit_json_log(
                logger=logger,
                level="info",
                component="listener",
                event="source_media_detected",
                message=f"Foto anexada detectada na mensagem {msg_id}",
                telegram_msg_id=msg_id,
                media_type="photo",
                has_public_url=False,
            )
            result["source_media_type"] = "photo"

            # Se o cliente Telethon foi fornecido, efetua o download seguro para temporário
            if client is not None:
                try:
                    temp_dest = create_safe_temp_media_file(suffix=".jpg")
                    downloaded_path = await client.download_media(message, file=temp_dest)
                    if downloaded_path and os.path.exists(downloaded_path):
                        f_size = os.path.getsize(downloaded_path)
                        if f_size > MAX_MEDIA_SIZE_BYTES:
                            emit_json_log(
                                logger=logger,
                                level="warning",
                                component="listener",
                                event="media_too_large",
                                message=f"Foto anexada excede {MAX_MEDIA_SIZE_MB}MB ({f_size} bytes). Descartando.",
                                telegram_msg_id=msg_id,
                                file_size=f_size,
                            )
                            cleanup_temp_media(downloaded_path)
                            result["source_media_path"] = None
                        else:
                            result["source_media_path"] = downloaded_path
                    else:
                        cleanup_temp_media(temp_dest)
                except Exception as down_err:
                    logger.warning(f"[MediaHandler] Falha ao baixar foto da mensagem {msg_id}: {down_err}")

            return result

        # 2. Documento com imagem anexada (Telethon Message.document)
        document = getattr(message, "document", None)
        if document:
            doc_mime = (getattr(document, "mime_type", "") or "").lower()
            doc_size = getattr(document, "size", 0) or 0

            if doc_mime in ALLOWED_IMAGE_MIMES:
                emit_json_log(
                    logger=logger,
                    level="info",
                    component="listener",
                    event="source_media_detected",
                    message=f"Documento de imagem detectado na mensagem {msg_id} (MIME: {doc_mime})",
                    telegram_msg_id=msg_id,
                    media_type="document",
                    has_public_url=False,
                    mime_type=doc_mime,
                )
                result["source_media_type"] = "document"

                if doc_size > MAX_MEDIA_SIZE_BYTES:
                    emit_json_log(
                        logger=logger,
                        level="warning",
                        component="listener",
                        event="media_too_large",
                        message=f"Documento de imagem excede {MAX_MEDIA_SIZE_MB}MB ({doc_size} bytes).",
                        telegram_msg_id=msg_id,
                        file_size=doc_size,
                    )
                elif client is not None:
                    ext = ".jpg" if "jpeg" in doc_mime or "jpg" in doc_mime else (".png" if "png" in doc_mime else ".webp")
                    temp_dest = create_safe_temp_media_file(suffix=ext)
                    try:
                        downloaded_path = await client.download_media(message, file=temp_dest)
                        if downloaded_path and os.path.exists(downloaded_path):
                            result["source_media_path"] = downloaded_path
                        else:
                            cleanup_temp_media(temp_dest)
                    except Exception as doc_err:
                        logger.warning(f"[MediaHandler] Falha ao baixar documento de imagem {msg_id}: {doc_err}")
                        cleanup_temp_media(temp_dest)

                return result
            else:
                emit_json_log(
                    logger=logger,
                    level="info",
                    component="listener",
                    event="media_rejected_unsupported_mime",
                    message=f"Documento ignorado na mensagem {msg_id}: MIME não permitido ({doc_mime})",
                    telegram_msg_id=msg_id,
                    mime_type=doc_mime,
                )
                return result

        # 3. Web Preview com foto pública
        web_preview = getattr(message, "web_preview", None)
        if web_preview:
            preview_photo = getattr(web_preview, "photo", None)
            preview_url = getattr(web_preview, "url", None)
            if preview_photo and client is not None:
                emit_json_log(
                    logger=logger,
                    level="info",
                    component="listener",
                    event="source_media_detected",
                    message=f"Web preview com foto detectado na mensagem {msg_id}",
                    telegram_msg_id=msg_id,
                    media_type="web_preview",
                    has_public_url=bool(preview_url),
                )
                result["source_media_type"] = "web_preview"
                try:
                    temp_dest = create_safe_temp_media_file(suffix=".jpg")
                    downloaded_path = await client.download_media(preview_photo, file=temp_dest)
                    if downloaded_path and os.path.exists(downloaded_path):
                        result["source_media_path"] = downloaded_path
                    else:
                        cleanup_temp_media(temp_dest)
                except Exception as prev_err:
                    logger.debug(f"[MediaHandler] Falha ao baixar foto de web_preview: {prev_err}")

                if preview_url and is_safe_public_url(preview_url):
                    result["source_image_url"] = preview_url
                    result["has_public_url"] = True
                return result

        # 4. URLs de imagem direta presentes no texto ou entidades
        text = getattr(message, "text", "") or getattr(message, "message", "") or ""
        if text:
            # Procura por URLs com extensões de imagem
            direct_img_matches = re.findall(
                r'https?://[^\s<>"]+?\.(?:jpg|jpeg|png|webp)(?:\?[^\s<>"]*)?',
                text,
                flags=re.IGNORECASE,
            )
            for img_url in direct_img_matches:
                if is_safe_public_url(img_url):
                    emit_json_log(
                        logger=logger,
                        level="info",
                        component="listener",
                        event="source_media_detected",
                        message=f"URL direta de imagem detectada no texto da mensagem {msg_id}",
                        telegram_msg_id=msg_id,
                        media_type="url",
                        has_public_url=True,
                    )
                    result["source_media_type"] = "url"
                    result["source_image_url"] = img_url
                    result["has_public_url"] = True
                    return result

    except Exception as exc:
        logger.warning(f"[MediaHandler] Exceção ao extrair mídia da mensagem {msg_id}: {exc}")

    return result
