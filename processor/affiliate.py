import re
import urllib.parse
import logging
from typing import Optional
from sqlalchemy.orm import Session

from database.models import AffiliateRule
from config import DEFAULT_AFFILIATE_TAGS, AFFILIATE_PARAM_NAMES

logger = logging.getLogger(__name__)


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


def get_affiliate_tag_for_store(store: str, db: Optional[Session] = None) -> Optional[str]:
    """
    Recupera a tag de afiliado no banco (AffiliateRule) ou por variável de ambiente.
    Retorna None se a tag não estiver configurada.
    """
    if not store:
        return None

    if db:
        try:
            rule = db.query(AffiliateRule).filter(AffiliateRule.store.ilike(store.strip())).first()
            if rule and rule.affiliate_tag and rule.affiliate_tag.strip():
                return rule.affiliate_tag.strip()
        except Exception as e:
            logger.warning(f"[Affiliate] Erro ao consultar regra no banco para loja {store}: {e}")

    tag = DEFAULT_AFFILIATE_TAGS.get(store)
    if tag and str(tag).strip():
        return str(tag).strip()

    return None


def replace_amazon_link(url: str, tag: str) -> str:
    """
    Gera link limpo de associado Amazon direto com ASIN.
    """
    asin = extract_amazon_asin(url)
    if asin:
        return f"https://www.amazon.com.br/dp/{asin}?tag={tag}"

    # Se não conseguir isolar o ASIN, substitui ou injeta o parâmetro tag na URL
    parsed = urllib.parse.urlparse(url)
    query_params = urllib.parse.parse_qs(parsed.query)
    query_params["tag"] = [tag]
    new_query = urllib.parse.urlencode(query_params, doseq=True)
    return urllib.parse.urlunparse(parsed._replace(query=new_query))


def replace_mercadolivre_link(url: str, tag: str) -> str:
    """
    Injeta tag de afiliado do Mercado Livre limpando parâmetros de outros afiliados.
    """
    parsed = urllib.parse.urlparse(url)
    query_params = urllib.parse.parse_qs(parsed.query)
    
    # Remove tags antigas
    for key in ["p", "tag", "matt_tool", "matt_word"]:
        query_params.pop(key, None)

    query_params["tag"] = [tag]
    new_query = urllib.parse.urlencode(query_params, doseq=True)
    return urllib.parse.urlunparse(parsed._replace(query=new_query))


def replace_magalu_link(url: str, tag: str) -> str:
    """
    Substitui link da Magazine Luiza para a vitrine do parceiro magalu.
    """
    # Se já for magazinevoce, substitui o parceiro na rota
    if "magazinevoce.com.br" in url:
        return re.sub(r"magazinevoce\.com\.br/[^/]+/", f"magazinevoce.com.br/{tag}/", url)

    # Se for magazineluiza.com.br, direciona para magazinevoce com o tag do parceiro
    if "magazineluiza.com.br" in url:
        path = urllib.parse.urlparse(url).path
        return f"https://www.magazinevoce.com.br/{tag}{path}"

    return url


def replace_generic_link(url: str, param_name: str, tag: str) -> str:
    """
    Injeta o parâmetro de afiliado em qualquer URL genérica.
    """
    parsed = urllib.parse.urlparse(url)
    query_params = urllib.parse.parse_qs(parsed.query)
    query_params[param_name] = [tag]
    new_query = urllib.parse.urlencode(query_params, doseq=True)
    return urllib.parse.urlunparse(parsed._replace(query=new_query))


def generate_affiliate_link(
    original_link: str,
    store: str,
    db: Optional[Session] = None,
) -> str:
    """
    Função principal para troca automática do link original pelo link de afiliado oficial.
    Se a tag de afiliado não estiver configurada, mantém o link original como fallback seguro
    e emite aviso de integração pendente, sem inventar tags ou quebrar a navegação.
    """
    if not original_link or not original_link.startswith("http"):
        return original_link or ""

    try:
        tag = get_affiliate_tag_for_store(store, db)
        if not tag:
            logger.warning(
                f"[Affiliate Pendente] Tag de afiliado para a loja '{store}' não configurada no ambiente. "
                f"Mantendo link original como fallback seguro."
            )
            return original_link

        store_lower = store.lower()

        if "amazon" in store_lower:
            return replace_amazon_link(original_link, tag)

        if "mercado livre" in store_lower or "mercadolivre" in store_lower:
            return replace_mercadolivre_link(original_link, tag)

        if "magazine" in store_lower or "magalu" in store_lower:
            return replace_magalu_link(original_link, tag)

        if "kabum" in store_lower:
            return replace_generic_link(original_link, "tag", tag)

        if "shopee" in store_lower:
            return replace_generic_link(original_link, "af_siteid", tag)

        if "aliexpress" in store_lower:
            return replace_generic_link(original_link, "aff_fcid", tag)

        # Se houver regra configurada no dicionário genérico
        param_name = AFFILIATE_PARAM_NAMES.get(store, "tag")
        return replace_generic_link(original_link, param_name, tag)

    except Exception as e:
        logger.error(f"[Affiliate] Falha na troca de link para {store} ({original_link}): {e}")
        # Em caso de erro na reescrita, preserva o link original
        return original_link
