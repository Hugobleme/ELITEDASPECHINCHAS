import re
import urllib.parse
import unicodedata
from typing import Dict, Any, Optional, Tuple

# Mapeamento de domínios para nomes padronizados de lojas
DOMAIN_STORE_MAP = {
    "amazon.com.br": "Amazon",
    "amazon.com": "Amazon",
    "amzn.to": "Amazon",
    "amzn.com": "Amazon",
    "mercadolivre.com.br": "Mercado Livre",
    "mercadolivre.com": "Mercado Livre",
    "produto.mercadolivre.com.br": "Mercado Livre",
    "kabum.com.br": "Kabum",
    "magazineluiza.com.br": "Magazine Luiza",
    "magazinevoce.com.br": "Magazine Luiza",
    "shopee.com.br": "Shopee",
    "shp.ee": "Shopee",
    "aliexpress.com": "AliExpress",
    "pt.aliexpress.com": "AliExpress",
    "casasbahia.com.br": "Casas Bahia",
    "samsung.com": "Samsung",
    "samsung.com.br": "Samsung",
}

# Heurística de categorização por palavras-chave
CATEGORY_KEYWORDS = {
    "smartphones": [
        "celular", "smartphone", "iphone", "galaxy", "xiaomi", "redmi", "poco",
        "motorola", "moto g", "moto edge", "zenfone"
    ],
    "games": [
        "playstation", "ps5", "ps4", "xbox", "series s", "series x", "nintendo",
        "switch", "joy-con", "dualsense", "game", "jogo", "console"
    ],
    "tv-e-audio": [
        "tv", "smart tv", "oled", "qled", "soundbar", "fone", "headphone",
        "headset", "earbuds", "airpods", "jbl", "caixa de som"
    ],
    "informatica": [
        "notebook", "laptop", "monitor", "teclado", "mouse", "placa de video",
        "rtx", "geforce", "radeon", "processador", "ryzen", "core i", "ssd", "ram",
        "memoria ram", "fonte", "gabinete", "impressora"
    ],
    "casa-e-cozinha": [
        "air fryer", "fritadeira", "aspirador", "robo aspirador", "cafeteira",
        "nespresso", "geladeira", "micro-ondas", "fogao", "liquidificador",
        "batedeira", "panela eletrica"
    ],
    "moda": [
        "tenis", "sapato", "camisa", "camiseta", "calca", "mochila", "casaco",
        "jaqueta", "nike", "adidas", "puma", "vans", "chinelo", "bermuda"
    ],
    "eletronicos": [
        "tablet", "ipad", "kindle", "smartwatch", "relogio", "carregador",
        "power bank", "camera"
    ],
}

# Imagens de fallback por categoria caso a mensagem não contenha foto
CATEGORY_DEFAULT_IMAGES = {
    "smartphones": "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&auto=format&fit=crop&q=80",
    "games": "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=600&auto=format&fit=crop&q=80",
    "tv-e-audio": "https://images.unsplash.com/photo-1593784991095-a205069470b6?w=600&auto=format&fit=crop&q=80",
    "informatica": "https://images.unsplash.com/photo-1547082299-de196ea013d6?w=600&auto=format&fit=crop&q=80",
    "casa-e-cozinha": "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=600&auto=format&fit=crop&q=80",
    "moda": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",
    "eletronicos": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
}



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

    # Seleciona a primeira ou segunda linha que contenha texto descritivo
    first_line = lines[0]
    # Se a primeira linha for apenas um alerta como "🚨 SUPER PROMOÇÃO 🚨", pega a segunda linha
    if re.search(r"^(🚨|🔥|⚡|💥|😱|SUPER|OFERTA|ALERTA|MEGA|CORRE|PROMOÇÃO)", first_line, re.IGNORECASE) and len(lines) > 1:
        if not re.search(r"(R\$|\d+%)", first_line):
            first_line = lines[1]

    # Remove emojis e pontuações excessivas
    cleaned = re.sub(r"^[🚨🔥⚡💥😱📢🏷️📦🎯👑⭐🛒\s\-•]+", "", first_line)
    cleaned = re.sub(r"[🚨🔥⚡💥😱📢🏷️📦🎯👑⭐🛒\s\-•]+$", "", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    return cleaned


def parse_price(price_str: str) -> Optional[float]:
    """
    Converte uma string contendo representação monetária para float.
    Exemplos: '1.299,90' -> 1299.90, '89,00' -> 89.0, '250.00' -> 250.0
    """
    try:
        clean = price_str.strip().replace("R$", "").strip()
        # Formato brasileiro com ponto de milhar e vírgula de centavos: 1.299,99
        if "." in clean and "," in clean:
            clean = clean.replace(".", "").replace(",", ".")
        elif "," in clean:
            clean = clean.replace(",", ".")
        return round(float(clean), 2)
    except (ValueError, TypeError):
        return None


def extract_prices_and_discount(text: str) -> Tuple[float, float, int]:
    """
    Identifica o preço atual, o preço original e a porcentagem de desconto.
    """
    price_current = 0.0
    price_original = 0.0
    discount_pct = 0

    # 1. Busca por percentual de desconto explícito (ex: '40% OFF', '35% de desconto')
    disc_match = re.search(r"(\d{1,2})%\s*(?:OFF|de desconto)", text, re.IGNORECASE)
    if disc_match:
        discount_pct = int(disc_match.group(1))

    # 2. Busca por preço original 'De: R$ XXX'
    de_match = re.search(
        r"(?:de|de:)\s*R?\$?\s*([\d\.,]+)",
        text,
        re.IGNORECASE,
    )
    if de_match:
        parsed_de = parse_price(de_match.group(1))
        if parsed_de:
            price_original = parsed_de

    # 3. Busca por preço atual 'Por: R$ XXX' ou 'R$ XXX'
    por_match = re.search(
        r"(?:por|por:)\s*R?\$?\s*([\d\.,]+)",
        text,
        re.IGNORECASE,
    )
    if por_match:
        parsed_por = parse_price(por_match.group(1))
        if parsed_por:
            price_current = parsed_por

    # Se não encontrou "Por", busca qualquer valor monetário após o "De" ou isolado
    if not price_current:
        all_prices = re.findall(r"R\$\s*([\d\.,]+)", text, re.IGNORECASE)
        parsed_prices = [p for p in (parse_price(x) for x in all_prices) if p and p > 1.0]
        if parsed_prices:
            if price_original and parsed_prices:
                # O preço atual deve ser menor que o original
                candidates = [p for p in parsed_prices if p < price_original]
                price_current = candidates[0] if candidates else parsed_prices[-1]
            else:
                price_current = parsed_prices[-1]

    # Se temos preço atual e desconto %, mas não preço original:
    if price_current > 0 and discount_pct > 0 and not price_original:
        price_original = round(price_current / (1 - (discount_pct / 100)), 2)

    # Se temos ambos os preços, calcula desconto percentual real:
    if price_original > price_current > 0:
        calculated_disc = round(((price_original - price_current) / price_original) * 100)
        if not discount_pct:
            discount_pct = calculated_disc

    # Fallback se não tiver preço original
    if not price_original:
        price_original = price_current

    return price_current, price_original, discount_pct


def extract_first_url(text: str) -> Optional[str]:
    """
    Extrai a primeira URL encontrada no texto.
    """
    url_pattern = r"(https?://[^\s\)\"'>]+)"
    match = re.search(url_pattern, text)
    if match:
        return match.group(1).rstrip(".,;")
    return None


def detect_store(url: Optional[str], text: str = "") -> str:
    """
    Detecta a loja a partir do domínio do link ou pelo conteúdo do texto.
    Retorna string vazia caso nenhuma loja seja identificada.
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

    # Heurística textual se a URL não tiver domínio reconhecido
    if text:
        text_lower = text.lower()
        for domain, store_name in DOMAIN_STORE_MAP.items():
            if store_name.lower() in text_lower:
                return store_name

    return ""


def detect_category(title: str, text: str = "") -> str:
    """
    Identifica a categoria do produto baseado no título e descrição, com suporte a acentos.
    """
    raw_combined = f"{title} {text}".lower()
    # Remove acentos para compatibilidade máxima (ex: tênis -> tenis, fogão -> fogao)
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

    # Verifica se a mensagem explicitamente indica falta de cupom
    if re.search(r"\b(sem\s+cupom|n[aã]o\s+precisa\s+de\s+cupom)\b", text, re.IGNORECASE):
        return None

    patterns = [
        r"cupom(?:\s*de\s*desconto)?\s*[:=]\s*`?([A-Z0-9_\-]{3,20})`?",
        r"código(?:\s*promocional)?\s*[:=]\s*`?([A-Z0-9_\-]{3,20})`?",
        r"use\s+o\s+cupom\s+`?([A-Z0-9_\-]{3,20})`?",
        r"cupom\s*:\s*`?([A-Z0-9_\-]+)`?",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            code = m.group(1).strip().upper()
            # Ignora falsos positivos comuns
            stop_words = {
                "DE", "R$", "OFF", "LINK", "AQUI", "NOVO", "APP", "HOJE",
                "FISCAL", "VALIDO", "VÁLIDO", "APENAS", "DISPONIVEL", "DISPONÍVEL",
                "EXCLUSIVO", "NAO", "NÃO", "SEM", "DIRETO", "SITE"
            }
            if code not in stop_words and len(code) >= 3:
                return code
    return None



def parse_telegram_message(
    text: str,
    media_url: Optional[str] = None,
    entities_links: Optional[list] = None,
) -> Dict[str, Any]:
    """
    Função principal de parsing de mensagens do Telegram.
    Retorna dicionário pronto para validação de regras e persistência.
    Não injeta links nem dados fictícios.
    """
    if not text:
        text = ""

    # Extração de Links válidos (sem fallback para URLs fictícias)
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

    # Extração de Título
    title = clean_text_title(text)

    # Extração de Preços e Desconto
    price_current, price_original, discount_pct = extract_prices_and_discount(text)

    # Detecção de Loja e Categoria
    store = detect_store(original_link, text)
    category = detect_category(title, text)

    # Extração de Cupom
    coupon_code = extract_coupon(text)

    # Imagem
    image_url = media_url or CATEGORY_DEFAULT_IMAGES.get(category, CATEGORY_DEFAULT_IMAGES["eletronicos"])

    return {
        "title": title,
        "price_current": price_current,
        "price_original": price_original,
        "discount_pct": discount_pct,
        "store": store,
        "category": category,
        "image_url": image_url,
        "original_link": original_link,
        "coupon_code": coupon_code,
    }
