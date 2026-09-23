import re
import urllib.parse
import logging
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from database.models import AffiliateRule
from config import DEFAULT_AFFILIATE_TAGS, AFFILIATE_PARAM_NAMES

logger = logging.getLogger(__name__)

# Parâmetros UTM e de campanha que devem ser preservados se presentes
PRESERVED_UTM_PARAMS = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
]


def extract_amazon_asin(url: str) -> Optional[str]:
    """
    Extrai o código ASIN de 10 caracteres de um link da Amazon.
    Exemplos: /dp/B0CX8R1234, /gp/product/B0CX8R1234, /product/B0CX8R1234
    """
    patterns = [
        r"/dp/([A-Z0-9]{10})",
        r"/gp/product/([A-Z0-9]{10})",
        r"/product/([A-Z0-9]{10})",
        r"/ASIN/([A-Z0-9]{10})",
    ]
    for pattern in patterns:
        match = re.search(pattern, url, re.IGNORECASE)
        if match:
            return match.group(1).upper()
    return None


def extract_mercadolivre_id(url: str) -> Optional[str]:
    """
    Extrai o identificador de anúncio do Mercado Livre (ex: MLB-1234567890 ou MLB1234567890).
    """
    patterns = [
        r"(MLB-?\d{8,12})",
        r"/p/(MLB\d{6,12})",
    ]
    for pattern in patterns:
        match = re.search(pattern, url, re.IGNORECASE)
        if match:
            raw_id = match.group(1).upper()
            return raw_id if "-" in raw_id else f"MLB-{raw_id.replace('MLB', '')}"
    return None


def copy_preserved_params(source_url: str, target_url: str) -> str:
    """
    Copia parâmetros UTM e rastreadores originais da URL de origem para a nova URL de afiliado.
    """
    try:
        src_parsed = urllib.parse.urlparse(source_url)
        src_qs = urllib.parse.parse_qs(src_parsed.query)

        tgt_parsed = urllib.parse.urlparse(target_url)
        tgt_qs = urllib.parse.parse_qs(tgt_parsed.query)

        for param in PRESERVED_UTM_PARAMS:
            if param in src_qs and param not in tgt_qs:
                tgt_qs[param] = src_qs[param]

        new_query = urllib.parse.urlencode(tgt_qs, doseq=True)
        return urllib.parse.urlunparse(tgt_parsed._replace(query=new_query))
    except Exception:
        return target_url


def get_affiliate_tag_for_store(store: str, db: Optional[Session] = None) -> Optional[str]:
    """
    Recupera a tag de afiliado no banco (AffiliateRule) ou por variável de ambiente.
    Retorna None se a tag não estiver configurada.
    """
    if not store:
        return None

    store_clean = store.strip()

    if db:
        try:
            rule = db.query(AffiliateRule).filter(AffiliateRule.store.ilike(store_clean)).first()
            if rule and rule.affiliate_tag and rule.affiliate_tag.strip():
                return rule.affiliate_tag.strip()
        except Exception as e:
            logger.warning(f"[Affiliate] Erro ao consultar regra no banco para loja {store}: {e}")

    # Busca nas tags padrão do config.py
    tag = DEFAULT_AFFILIATE_TAGS.get(store_clean)
    if tag and str(tag).strip():
        return str(tag).strip()

    # Busca case-insensitive no dicionário
    for k, v in DEFAULT_AFFILIATE_TAGS.items():
        if k.lower() == store_clean.lower() and v and str(v).strip():
            return str(v).strip()

    return None


def replace_amazon_link(url: str, tag: str) -> str:
    """
    Gera link limpo de associado Amazon direto com ASIN ou injeta parâmetro tag.
    """
    asin = extract_amazon_asin(url)
    if asin:
        base_url = f"https://www.amazon.com.br/dp/{asin}?tag={tag}"
        return copy_preserved_params(url, base_url)

    parsed = urllib.parse.urlparse(url)
    query_params = urllib.parse.parse_qs(parsed.query)
    query_params["tag"] = [tag]
    new_query = urllib.parse.urlencode(query_params, doseq=True)
    return urllib.parse.urlunparse(parsed._replace(query=new_query))


def replace_mercadolivre_link(url: str, tag: str) -> str:
    """
    Injeta tag de afiliado do Mercado Livre limpando parâmetros de terceiros.
    """
    parsed = urllib.parse.urlparse(url)
    query_params = urllib.parse.parse_qs(parsed.query)

    # Remove identificadores antigos de afiliados terceiros
    for key in ["p", "tag", "matt_tool", "matt_word", "tracking_id"]:
        query_params.pop(key, None)

    query_params["tag"] = [tag]
    new_query = urllib.parse.urlencode(query_params, doseq=True)
    return urllib.parse.urlunparse(parsed._replace(query=new_query))


def replace_magalu_link(url: str, tag: str) -> str:
    """
    Substitui link da Magazine Luiza direcionando para vitrine oficial do parceiro.
    """
    parsed = urllib.parse.urlparse(url)
    path = parsed.path

    if "magazinevoce.com.br" in url:
        new_url = re.sub(r"magazinevoce\.com\.br/[^/]+/", f"magazinevoce.com.br/{tag}/", url)
        return copy_preserved_params(url, new_url)

    if "magazineluiza.com.br" in url:
        new_url = f"https://www.magazinevoce.com.br/{tag}{path}"
        return copy_preserved_params(url, new_url)

    query_params = urllib.parse.parse_qs(parsed.query)
    query_params["parceiro"] = [tag]
    new_query = urllib.parse.urlencode(query_params, doseq=True)
    return urllib.parse.urlunparse(parsed._replace(query=new_query))


def replace_generic_link(url: str, param_name: str, tag: str) -> str:
    """
    Injeta o parâmetro de afiliado em qualquer URL genérica preservando o restante da query.
    """
    parsed = urllib.parse.urlparse(url)
    query_params = urllib.parse.parse_qs(parsed.query)
    query_params[param_name] = [tag]
    new_query = urllib.parse.urlencode(query_params, doseq=True)
    return urllib.parse.urlunparse(parsed._replace(query=new_query))


SHORTENER_DOMAINS = [
    "amzn.to", "amzn.com", "bit.ly", "tinyurl.com", "t.co", "shp.ee",
    "is.gd", "cutt.ly", "linkr.bio", "s.shopee.com.br"
]


def resolve_redirect_url(url: str, timeout: float = 4.0) -> str:
    """
    Expande URLs encurtadas (amzn.to, shp.ee, bit.ly, etc.) seguindo redirecionamentos
    para obter a URL canônica do produto antes da troca da tag de afiliado.
    """
    if not url or not url.startswith("http"):
        return url

    parsed = urllib.parse.urlparse(url)
    domain = parsed.netloc.lower()
    path = parsed.path.lower()

    needs_resolution = (
        any(s in domain for s in SHORTENER_DOMAINS)
        or "mercadolivre.com/sec" in f"{domain}{path}"
        or "mercadolivre.com.br/sec" in f"{domain}{path}"
    )

    if not needs_resolution:
        return url

    try:
        import httpx
        with httpx.Client(follow_redirects=True, timeout=timeout, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}) as client:
            resp = client.head(url)
            if resp.status_code >= 400 or str(resp.url) == url:
                resp = client.get(url)
            resolved = str(resp.url)
            logger.info(f"[Affiliate] Link desencurtado com sucesso: {url} -> {resolved}")
            return resolved
    except Exception as e:
        logger.warning(f"[Affiliate] Não foi possível desencurtar {url}: {e}")
        return url


def generate_affiliate_link(
    original_link: str,
    store: str,
    db: Optional[Session] = None,
) -> str:
    """
    Função principal para troca automática do link original pelo link de afiliado oficial.
    Se a tag não estiver configurada, mantém o link original como fallback seguro.
    Gera logs de auditoria detalhados para cada substituição.
    """
    if not original_link or not original_link.startswith("http"):
        return original_link or ""

    # Desencurta links (ex: amzn.to -> amazon.com.br/dp/ASIN) para garantir a troca correta de tag
    original_link = resolve_redirect_url(original_link)

    try:
        tag = get_affiliate_tag_for_store(store, db)
        if not tag:
            logger.warning(
                f"[Affiliate Pendente] Tag de afiliado para a loja '{store}' não configurada no ambiente. "
                f"Mantendo link original como fallback seguro: {original_link}"
            )
            return original_link

        store_lower = store.lower()
        affiliate_url = original_link

        if "amazon" in store_lower:
            affiliate_url = replace_amazon_link(original_link, tag)
        elif "mercado livre" in store_lower or "mercadolivre" in store_lower:
            affiliate_url = replace_mercadolivre_link(original_link, tag)
        elif "magazine" in store_lower or "magalu" in store_lower:
            affiliate_url = replace_magalu_link(original_link, tag)
        elif "kabum" in store_lower:
            affiliate_url = replace_generic_link(original_link, "tag", tag)
        elif "shopee" in store_lower:
            affiliate_url = replace_generic_link(original_link, "af_siteid", tag)
        elif "aliexpress" in store_lower:
            affiliate_url = replace_generic_link(original_link, "aff_fcid", tag)
        elif "casas bahia" in store_lower or "casasbahia" in store_lower:
            affiliate_url = replace_generic_link(original_link, "parceiro", tag)
        else:
            param_name = AFFILIATE_PARAM_NAMES.get(store, "tag")
            affiliate_url = replace_generic_link(original_link, param_name, tag)

        logger.info(
            f"[Affiliate Audit] Link substituído para '{store}': "
            f"Original='{original_link}' -> Afiliado='{affiliate_url}'"
        )
        return affiliate_url

    except Exception as e:
        logger.error(f"[Affiliate Erro] Falha na conversão de link para {store} ({original_link}): {e}")
        return original_link
