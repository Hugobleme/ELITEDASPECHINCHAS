import re
import urllib.parse
import unicodedata
from typing import Dict, Any, Optional, Tuple, List
from pydantic import BaseModel, Field


# ==============================================================================
# Modelos Pydantic Padronizados
# ==============================================================================
class ParsedOffer(BaseModel):
    """
    Estrutura de dados tipada e padronizada para ofertas extraídas de mensagens.
    """
    title: str = ""
    price_current: float = 0.0
    price_original: float = 0.0
    discount_pct: int = 0
    store: str = ""
    category: str = "eletronicos"
    image_url: Optional[str] = None
    original_link: Optional[str] = None
    coupon_code: Optional[str] = None
    coupon_validity: Optional[str] = None
    items_count: int = 1
    raw_text: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Converte para dicionário compatível com o pipeline existente."""
        return {
            "title": self.title,
            "price_current": self.price_current,
            "price_original": self.price_original,
            "discount_pct": self.discount_pct,
            "store": self.store,
            "category": self.category,
            "image_url": self.image_url,
            "original_link": self.original_link,
            "coupon_code": self.coupon_code,
            "coupon_validity": self.coupon_validity,
            "items_count": self.items_count,
        }

    def is_valid(self) -> bool:
        """Verifica se os campos essenciais mínimos foram extraídos com sucesso."""
        return bool(self.title and self.price_current > 0 and self.original_link)


# ==============================================================================
# Mapeamentos de Domínio e Categorias
# ==============================================================================
DOMAIN_STORE_MAP = {
    "amazon.com.br": "Amazon",
    "amazon.com": "Amazon",
    "amzn.to": "Amazon",
    "amzn.com": "Amazon",
    "mercadolivre.com.br": "Mercado Livre",
    "mercadolivre.com": "Mercado Livre",
    "produto.mercadolivre.com.br": "Mercado Livre",
    "meli.la": "Mercado Livre",
    "kabum.com.br": "Kabum",
    "magazineluiza.com.br": "Magazine Luiza",
    "magazinevoce.com.br": "Magazine Luiza",
    "influenciadormagalu.com.br": "Magazine Luiza",
    "shopee.com.br": "Shopee",
    "shp.ee": "Shopee",
    "aliexpress.com": "AliExpress",
    "pt.aliexpress.com": "AliExpress",
    "casasbahia.com.br": "Casas Bahia",
    "samsung.com": "Samsung",
    "samsung.com.br": "Samsung",
    "fastshop.com.br": "Fast Shop",
    "pichau.com.br": "Pichau",
    "terabyteshop.com.br": "Terabyte",
}

STORE_TEXT_KEYWORDS = {
    "Amazon": ["amazon", "amzn", "prime day", "echo dot", "kindle", "fire stick"],
    "Mercado Livre": ["mercado livre", "mercadolivre", "ml", "full", "meli"],
    "Magazine Luiza": ["magazine luiza", "magalu", "magazine voce", "magazineluiza"],
    "Kabum": ["kabum", "ninja kabum"],
    "Shopee": ["shopee", "shp.ee"],
    "AliExpress": ["aliexpress", "ali express"],
    "Casas Bahia": ["casas bahia", "casasbahia", "dedicacao total"],
    "Samsung": ["samsung", "galaxy store"],
    "Fast Shop": ["fast shop", "fastshop"],
    "Pichau": ["pichau"],
    "Terabyte": ["terabyte", "terabyteshop"],
}

CATEGORY_KEYWORDS = {
    "smartphones": [
        "celular", "smartphone", "iphone", "galaxy", "xiaomi", "redmi", "poco",
        "motorola", "moto g", "moto edge", "zenfone", "galaxy s", "galaxy a"
    ],
    "informatica": [
        "notebook", "laptop", "monitor", "teclado", "mouse", "placa de video",
        "rtx", "geforce", "radeon", "processador", "ryzen", "core i", "ssd", "ram",
        "memoria ram", "fonte", "gabinete", "impressora", "computador", "pc gamer"
    ],
    "games": [
        "playstation", "ps5", "ps4", "xbox", "series s", "series x", "nintendo",
        "switch", "joy-con", "dualsense", "game", "jogo", "console", "steam deck"
    ],
    "tv-e-audio": [
        "tv", "smart tv", "oled", "qled", "soundbar", "fone", "headphone",
        "headset", "earbuds", "airpods", "jbl", "caixa de som", "bluetooth speaker"
    ],

    "casa-e-cozinha": [
        "air fryer", "fritadeira", "aspirador", "robo aspirador", "cafeteira",
        "nespresso", "geladeira", "micro-ondas", "fogao", "liquidificador",
        "batedeira", "panela eletrica", "lavadora", "maquina de lavar", "ar condicionado"
    ],
    "moda": [
        "tenis", "sapato", "camisa", "camiseta", "calca", "mochila", "casaco",
        "jaqueta", "nike", "adidas", "puma", "vans", "chinelo", "bermuda", "relogio"
    ],
    "eletronicos": [
        "tablet", "ipad", "kindle", "smartwatch", "relogio inteligente", "carregador",
        "power bank", "camera", "drone", "filmadora", "bateria externa"
    ],
}

CATEGORY_DEFAULT_IMAGES = {
    "smartphones": "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&auto=format&fit=crop&q=80",
    "games": "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=600&auto=format&fit=crop&q=80",
    "tv-e-audio": "https://images.unsplash.com/photo-1593784991095-a205069470b6?w=600&auto=format&fit=crop&q=80",
    "informatica": "https://images.unsplash.com/photo-1547082299-de196ea013d6?w=600&auto=format&fit=crop&q=80",
    "casa-e-cozinha": "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=600&auto=format&fit=crop&q=80",
    "moda": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",
    "eletronicos": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
}


# ==============================================================================
# Funções de Parsing e Extração
# ==============================================================================

def is_valid_url(url: Optional[str]) -> bool:
    """
    Valida se uma URL é sintaticamente válida com esquema http ou https e domínio.
    """
    if not url or not isinstance(url, str):
        return False
    try:
        parsed = urllib.parse.urlparse(url.strip())
        return parsed.scheme in ("http", "https") and bool(parsed.netloc)
    except Exception:
        return False


def clean_text_title(raw_text: str) -> str:
    """
    Remove emojis, hashtags e termos promocionais agressivos do início do título.
    Retorna string vazia se não houver texto válido.
    """
    if not raw_text or not raw_text.strip():
        return ""

    lines = [line.strip() for line in raw_text.split("\n") if line.strip()]
    if not lines:
        return ""

    # Ignora linhas que são puramente URLs ou cabeçalhos de alerta sem produto
    first_line = lines[0]
    idx = 0
    while idx < len(lines):
        candidate = lines[idx]
        if candidate.startswith("http://") or candidate.startswith("https://"):
            idx += 1
            continue

        # Remove emojis para inspecionar palavras da linha
        candidate_words = re.sub(r"^[🚨🔥⚡💥😱📢🏷️📦🎯👑⭐🛒🏆🎉📌\s\-•*`#]+", "", candidate).strip()

        # Se for cabeçalho de anúncio genérico sem produto (ex: "🔥 SUPER DESCONTO NA AMAZON!", "🚨 MENOR PREÇO HISTÓRICO!", "🚨 CORRE QUE ACABA")
        is_alert_header = bool(
            re.search(
                r"^(ALERTA|SUPER|OFERTA|MEGA|CORRE|PROMOÇÃO|PROMO|ACHADO|DESCONTO|IMPERDÍVEL|RELÂMPAGO|ATENÇÃO|URGENTE|MENOR|BAIXOU|HISTÓRICO|OPORTUNIDADE|SURREAL|QUEIMA|NOVIDADE)",
                candidate_words,
                re.IGNORECASE,
            )
            or re.search(
                r"\b(MENOR PRE[CÇ]O|PRE[CÇ]O BAIXOU|SUPER DESCONTO|OFERTA REL[AÂ]MPAGO|SUPER OFERTA|CORRE|ALERTA|PRE[CÇ]O HIST[OÓ]RICO)\b",
                candidate_words,
                re.IGNORECASE,
            )
        )
        has_pricing = bool(re.search(r"(R\$|\d+%)", candidate))
        words_count = len(candidate_words.split())

        # Se for cabeçalho curto de alerta e houver mais linhas abaixo, pula para a próxima linha
        if is_alert_header and not has_pricing and words_count <= 8 and (idx + 1 < len(lines)):
            idx += 1
            continue

        first_line = candidate
        break

    # Remove emojis e pontuações excessivas do início e fim
    cleaned = re.sub(r"^[🚨🔥⚡💥😱📢🏷️📦🎯👑⭐🛒🏆🎉📌\s\-•*`#]+", "", first_line)
    # Remove chamadas promocionais coladas no início do produto (ex: "CORRE QUE TÁ BARATO! 🔥 Smart TV")
    cleaned = re.sub(
        r"^(CORRE QUE T[AÁ] BARATO|SUPER OFERTA|MEGA PROMO[CÇ][AÃ]O|ALERTA DE OFERTA|SUPER DESCONTO|OFERTA REL[AÂ]MPAGO)[!:\s🔥🚨⚡💥*]+",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(r"^[🚨🔥⚡💥😱📢🏷️📦🎯👑⭐🛒🏆🎉📌\s\-•*`#]+", "", cleaned)
    cleaned = re.sub(r"[🚨🔥⚡💥😱📢🏷️📦🎯👑⭐🛒🏆🎉📌\s\-•*`#]+$", "", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    return cleaned


def parse_price(price_str: str) -> Optional[float]:
    """
    Converte uma string contendo representação monetária para float.
    Suporta:
      - '1.299,90' -> 1299.90
      - '89,00' -> 89.0
      - '250.00' -> 250.0
      - 'R$ 99,90' -> 99.90
      - '99.90' -> 99.90
      - '1299' -> 1299.0
    """
    if not price_str or not isinstance(price_str, str):
        return None
    try:
        clean = price_str.strip()
        clean = re.sub(r"[^\d\.,]", "", clean)
        if not clean:
            return None

        # Padrão brasileiro: 1.299,90 -> remove '.' de milhar e troca ',' por '.'
        if "." in clean and "," in clean:
            clean = clean.replace(".", "").replace(",", ".")
        elif "," in clean:
            clean = clean.replace(",", ".")
        elif "." in clean:
            # Caso como '1.299' (milhar sem centavos) vs '99.90' (centavos)
            parts = clean.split(".")
            if len(parts) == 2 and len(parts[1]) == 3:
                # Provável milhar: 1.299 -> 1299
                clean = clean.replace(".", "")
            # Caso contrário, mantém '.' como separador decimal

        val = round(float(clean), 2)
        return val if val > 0 else None
    except (ValueError, TypeError):
        return None


def extract_prices_and_discount(text: str) -> Tuple[float, float, int]:
    """
    Identifica o preço atual, o preço original e a porcentagem de desconto.
    Lida com variações PT-BR, frete, múltiplos valores e deduções.
    """
    price_current = 0.0
    price_original = 0.0
    discount_pct = 0

    if not text:
        return price_current, price_original, discount_pct

    # Remove trechos de frete da análise para não confundir com preço do produto (ex: "Frete R$ 15,90")
    sanitized_text = re.sub(r"frete(?:\s*:\s*|\s+gr[áa]tis|\s+r?\$?\s*[\d\.,]+)?", " ", text, flags=re.IGNORECASE)

    # 1. Busca por percentual de desconto explícito (ex: '40% OFF', '35% de desconto', '-20%')
    disc_match = re.search(r"(?:-|de\s+)?(\d{1,2})%\s*(?:OFF|de\s+desconto|no\s+pix)?", sanitized_text, re.IGNORECASE)
    if disc_match:
        try:
            discount_pct = int(disc_match.group(1))
        except (ValueError, TypeError):
            pass

    # 2. Busca por preço original 'De: R$ XXX', 'De R$ XXX' ou 'Era: R$ XXX'
    de_match = re.search(
        r"(?:de|de:|era|era:)\s*R?\$?\s*([\d\.,]+)",
        sanitized_text,
        re.IGNORECASE,
    )
    if de_match:
        parsed_de = parse_price(de_match.group(1))
        if parsed_de:
            price_original = parsed_de

    # 3. Busca por preço atual 'Por: R$ XXX', 'Por R$ XXX', 'Apenas R$ XXX', 'Sai por R$ XXX'
    por_match = re.search(
        r"(?:por|por:|sai\s+por|apenas|apenas:)\s*R?\$?\s*([\d\.,]+)",
        sanitized_text,
        re.IGNORECASE,
    )
    if por_match:
        parsed_por = parse_price(por_match.group(1))
        if parsed_por:
            price_current = parsed_por

    # 4. Se não encontrou "Por", busca preços com símbolo R$ explícito
    if not price_current:
        all_r_prices = re.findall(r"R\$\s*([\d\.,]+)", sanitized_text, re.IGNORECASE)
        parsed_prices = [p for p in (parse_price(x) for x in all_r_prices) if p and p > 1.0]
        if parsed_prices:
            if price_original:
                # O preço atual deve ser menor que o original se houver desconto
                candidates = [p for p in parsed_prices if p < price_original]
                price_current = candidates[0] if candidates else parsed_prices[-1]
            else:
                price_current = parsed_prices[-1]

    # 5. Fallback para números isolados com formato de moeda (ex: "99.90" ou "99,90")
    if not price_current:
        isolated = re.findall(r"\b(\d{1,5}[\.,]\d{2})\b", sanitized_text)
        parsed_isolated = [p for p in (parse_price(x) for x in isolated) if p and p > 1.0]
        if parsed_isolated:
            price_current = parsed_isolated[0]

    # 6. Reconciliação dos preços e desconto
    if price_current > 0 and discount_pct > 0 and not price_original:
        price_original = round(price_current / (1 - (discount_pct / 100)), 2)

    if price_original > price_current > 0:
        calculated_disc = round(((price_original - price_current) / price_original) * 100)
        if not discount_pct:
            discount_pct = calculated_disc

    # Se não houver preço original detectado, assume o preço atual
    if not price_original:
        price_original = price_current

    return price_current, price_original, discount_pct


def extract_first_url(text: str) -> Optional[str]:
    """
    Extrai a primeira URL encontrada no texto, seja formato markdown [texto](url) ou URL pura.
    """
    if not text:
        return None

    # Verifica primeiro se há link markdown [nome](url)
    md_match = re.search(r"\[.*?\]\((https?://[^\s\)]+)\)", text)
    if md_match:
        return md_match.group(1).rstrip(".,;")

    # Busca URL pura
    url_pattern = r"(https?://[^\s\)\"'>]+)"
    match = re.search(url_pattern, text)
    if match:
        return match.group(1).rstrip(".,;")
    return None


def extract_all_urls(text: str) -> List[str]:
    """Extrai todas as URLs válidas encontradas no texto."""
    if not text:
        return []
    urls = []
    # Markdown
    for m in re.finditer(r"\[.*?\]\((https?://[^\s\)]+)\)", text):
        clean = m.group(1).rstrip(".,;")
        if is_valid_url(clean) and clean not in urls:
            urls.append(clean)
    # Plain URLs
    for m in re.finditer(r"(https?://[^\s\)\"'>]+)", text):
        clean = m.group(1).rstrip(".,;")
        if is_valid_url(clean) and clean not in urls:
            urls.append(clean)
    return urls


def extract_image_url(text: str) -> Optional[str]:
    """
    Detecta URL direta de imagem no texto (formatos comuns de imagem ou tags markdown).
    """
    if not text:
        return None

    # Markdown de imagem ![alt](url)
    md_img = re.search(r"!\[.*?\]\((https?://[^\s\)]+)\)", text)
    if md_img:
        return md_img.group(1)

    # URL direta de imagem terminada em extensões padrão
    img_pattern = r"(https?://[^\s\)\"'>]+\.(?:jpg|jpeg|png|webp|gif))"
    match = re.search(img_pattern, text, re.IGNORECASE)
    if match:
        return match.group(1)

    return None


def detect_store(url: Optional[str], text: str = "") -> str:
    """
    Detecta a loja a partir do domínio do link ou pelo conteúdo do texto.
    """
    if url:
        try:
            parsed = urllib.parse.urlparse(url)
            netloc = parsed.netloc.lower()
            for domain, store_name in DOMAIN_STORE_MAP.items():
                if domain in netloc:
                    return store_name
        except Exception:
            pass

    # Heurística textual por palavras-chave
    if text:
        text_lower = text.lower()
        for store_name, kws in STORE_TEXT_KEYWORDS.items():
            for kw in kws:
                if re.search(r"\b" + re.escape(kw) + r"\b", text_lower):
                    return store_name

    return ""


def detect_category(title: str, text: str = "") -> str:
    """
    Identifica a categoria do produto baseado no título e descrição, com suporte a acentos.
    """
    raw_combined = f"{title} {text}".lower()
    normalized = unicodedata.normalize("NFKD", raw_combined).encode("ASCII", "ignore").decode("utf-8")

    for category, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            kw_norm = unicodedata.normalize("NFKD", kw).encode("ASCII", "ignore").decode("utf-8")
            if re.search(r"\b" + re.escape(kw_norm) + r"\b", normalized):
                return category

    return "eletronicos"


def extract_coupon(text: str) -> Optional[str]:
    """
    Extrai o código do cupom de desconto se especificado no texto.
    Exemplos: 'CUPOM: OFERTA10', 'Use o cupom VALE20', 'Cupom: `DESCONTO`'
    """
    if not text:
        return None

    if re.search(r"\b(sem\s+cupom|n[aã]o\s+precisa\s+de\s+cupom)\b", text, re.IGNORECASE):
        return None

    patterns = [
        r"cupom(?:\s*de\s*desconto)?\s*[:=]\s*`?([A-Z0-9_\-]{3,20})`?",
        r"código(?:\s*promocional)?\s*[:=]\s*`?([A-Z0-9_\-]{3,20})`?",
        r"use\s+o\s+cupom\s+`?([A-Z0-9_\-]{3,20})`?",
        r"cupom\s*:\s*`?([A-Z0-9_\-]+)`?",
        r"aplique\s+o\s+cupom\s+`?([A-Z0-9_\-]{3,20})`?",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            code = m.group(1).strip().upper()
            stop_words = {
                "DE", "R$", "OFF", "LINK", "AQUI", "NOVO", "APP", "HOJE",
                "FISCAL", "VALIDO", "VÁLIDO", "APENAS", "DISPONIVEL", "DISPONÍVEL",
                "EXCLUSIVO", "NAO", "NÃO", "SEM", "DIRETO", "SITE"
            }
            if code not in stop_words and len(code) >= 3:
                return code
    return None


def extract_coupon_validity(text: str) -> Optional[str]:
    """
    Extrai informações sobre a validade do cupom quando mencionada na mensagem.
    Exemplos: 'válido até 31/12', 'expira em 25/10/2026', 'válido hoje'
    """
    if not text:
        return None

    validity_patterns = [
        r"v[aá]lido\s+at[eé]\s*([\d]{1,2}/[\d]{1,2}(?:/[\d]{2,4})?)",
        r"expira\s+em\s*([\d]{1,2}/[\d]{1,2}(?:/[\d]{2,4})?)",
        r"at[eé]\s*([\d]{1,2}/[\d]{1,2}(?:/[\d]{2,4})?)",
        r"v[aá]lido\s+(hoje|amanh[aã])",
    ]
    for pat in validity_patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            return m.group(1).strip()

    return None


# ==============================================================================
# Funções Principais de Parsing
# ==============================================================================

def unwrap_pechinchou_offer(url: str, timeout: float = 6.0) -> Optional[Dict[str, Any]]:
    """
    Desempacota metadados de ofertas do Pechinchou (pechin.co ou pechinchou.com.br)
    extraindo dados estruturados do __NEXT_DATA__ (preço antigo, preço atual, loja, link real e imagem).
    """
    if not url or not ("pechin.co" in url.lower() or "pechinchou.com.br" in url.lower()):
        return None
    try:
        import json
        import httpx
        with httpx.Client(follow_redirects=True, timeout=timeout, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}) as client:
            resp = client.get(url)
            if not resp.is_success:
                return None
            m = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', resp.text)
            if not m:
                return None
            data = json.loads(m.group(1))
            page_props = data.get("props", {}).get("pageProps", {})
            promo = page_props.get("promo")
            if not isinstance(promo, dict):
                return None

            store_val = promo.get("store")
            store_name = store_val.get("name") if isinstance(store_val, dict) else store_val

            coupon_val = promo.get("coupon")
            if not coupon_val and promo.get("coupons"):
                first_c = promo.get("coupons")[0]
                coupon_val = first_c.get("name") if isinstance(first_c, dict) else str(first_c)

            dest_url = promo.get("long_url") or promo.get("short_url")

            def _to_float(v):
                if v is None:
                    return 0.0
                try:
                    return float(str(v).replace(",", "."))
                except (ValueError, TypeError):
                    return 0.0

            price = _to_float(promo.get("price"))
            old_price = _to_float(promo.get("old_price"))

            return {
                "title": promo.get("title") or "",
                "price_current": price,
                "price_original": old_price if old_price > 0 else price,
                "destination_url": dest_url,
                "image_url": promo.get("image"),
                "store": store_name or "",
                "coupon_code": coupon_val,
            }
    except Exception as e:
        return None


def parse_telegram_message(
    text: str,
    media_url: Optional[str] = None,
    entities_links: Optional[list] = None,
) -> Dict[str, Any]:
    """
    Função principal de parsing de mensagens do Telegram.
    Retorna dicionário padronizado pronto para validação de regras e persistência.
    """
    if not text:
        text = ""

    # 1. Extração de Links válidos
    original_link = None
    if entities_links and len(entities_links) > 0:
        for link in entities_links:
            if is_valid_url(link):
                original_link = link.strip()
                break

    if not original_link:
        candidate_url = extract_first_url(text)
        if is_valid_url(candidate_url):
            original_link = candidate_url.strip()

    # 2. Título limpo
    title = clean_text_title(text)

    # 3. Preços e Desconto
    price_current, price_original, discount_pct = extract_prices_and_discount(text)

    # 4. Loja e Categoria
    store = detect_store(original_link, text)
    category = detect_category(title, text)

    # 5. Cupom e Validade
    coupon_code = extract_coupon(text)
    coupon_validity = extract_coupon_validity(text)

    # 6. Imagem
    extracted_img = extract_image_url(text)
    image_url = media_url or extracted_img or CATEGORY_DEFAULT_IMAGES.get(category, CATEGORY_DEFAULT_IMAGES["eletronicos"])

    # 7. Contagem de produtos na mensagem
    all_links = extract_all_urls(text)
    items_count = max(1, len(all_links)) if len(all_links) > 1 else 1

    # 8. Desempacotamento de Links Intermediários / Canais Parceiros (Pechinchou)
    if original_link and ("pechin.co" in original_link.lower() or "pechinchou.com.br" in original_link.lower()):
        unwrapped = unwrap_pechinchou_offer(original_link)
        if unwrapped:
            if unwrapped.get("destination_url") and is_valid_url(unwrapped["destination_url"]):
                original_link = unwrapped["destination_url"]
            if unwrapped.get("title") and len(unwrapped["title"]) >= 10:
                title = unwrapped["title"]
            if unwrapped.get("price_current") and unwrapped["price_current"] > 0:
                price_current = unwrapped["price_current"]
            if unwrapped.get("price_original") and unwrapped["price_original"] > 0:
                price_original = unwrapped["price_original"]
            if price_original > price_current > 0:
                discount_pct = round(((price_original - price_current) / price_original) * 100)
            if unwrapped.get("image_url") and is_valid_url(unwrapped["image_url"]):
                image_url = unwrapped["image_url"]
            if unwrapped.get("store") and unwrapped["store"].strip():
                store = unwrapped["store"].strip()
            elif not store:
                store = detect_store(original_link, text)
            if unwrapped.get("coupon_code"):
                coupon_code = unwrapped["coupon_code"]

    parsed_obj = ParsedOffer(
        title=title,
        price_current=price_current,
        price_original=price_original,
        discount_pct=discount_pct,
        store=store,
        category=category,
        image_url=image_url,
        original_link=original_link,
        coupon_code=coupon_code,
        coupon_validity=coupon_validity,
        items_count=items_count,
        raw_text=text,
    )

    return parsed_obj.to_dict()


def parse_multi_product_message(text: str) -> List[ParsedOffer]:
    """
    Identifica se a mensagem contém múltiplos produtos e tenta particioná-la em ofertas individuais.
    Retorna uma lista com uma ou mais instâncias de ParsedOffer.
    """
    if not text or not text.strip():
        return []

    # Se houver divisores claros por linha em lista (ex: "1.", "2." ou "•" com link em cada)
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    blocks = []
    current_block = []

    for line in lines:
        is_new_item = bool(re.match(r"^(?:\d+[\.\)\-]|•|[-*])\s+[A-Za-z0-9]", line))
        if is_new_item and current_block:
            blocks.append("\n".join(current_block))
            current_block = [line]
        else:
            current_block.append(line)

    if current_block:
        blocks.append("\n".join(current_block))

    # Se conseguiu particionar em múltiplos blocos com URLs próprias
    results: List[ParsedOffer] = []
    if len(blocks) > 1:
        for blk in blocks:
            p_dict = parse_telegram_message(blk)
            if p_dict.get("original_link") and p_dict.get("price_current", 0) > 0:
                results.append(ParsedOffer(**p_dict))

    # Fallback se não for lista particionável ou se particionamento não deu certo
    if not results:
        p_dict = parse_telegram_message(text)
        results.append(ParsedOffer(**p_dict))

    return results
