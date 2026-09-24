import html
import re
from typing import Optional, Dict, Any, List


def format_currency_br(value: float) -> str:
    """Formata valor em reais no padrão brasileiro: R$ 1.299,90"""
    try:
        val = float(value)
        return f"R$ {val:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    except (ValueError, TypeError):
        return "R$ 0,00"


def generate_hashtags(store: str, category: str, is_coupon: bool = False) -> str:
    """
    Gera hashtags padronizadas para postagem no Telegram.
    Ex: #Oferta #Amazon #Smartphones #Cupom
    """
    tags = ["#Oferta"]
    if is_coupon:
        tags.append("#Cupom")

    clean_store = re.sub(r"[^\w]", "", store.strip())
    if clean_store:
        tags.append(f"#{clean_store}")

    clean_cat = re.sub(r"[^\w]", "", category.strip().capitalize())
    if clean_cat:
        tags.append(f"#{clean_cat}")

    tags.append("#EliteDasPechinchas")
    return " ".join(tags)


def format_telegram_card_html(offer_data: Dict[str, Any]) -> str:
    """
    Formata o card de oferta no padrão Telegram usando HTML seguro.
    Inclui título, preços, desconto %, cupom (se houver), botão de afiliado e hashtags.
    Garante respeito ao limite de caracteres do Telegram.
    """
    raw_title = str(offer_data.get("title", "Oferta Imperdível")).strip()
    if len(raw_title) > 130:
        raw_title = raw_title[:127] + "..."
    title = html.escape(raw_title)
    price_current = float(offer_data.get("price_current", 0.0) or 0.0)
    price_original = float(offer_data.get("price_original", 0.0) or 0.0)
    discount_pct = int(offer_data.get("discount_pct", 0) or 0)
    raw_store = str(offer_data.get("store", "Loja Parceira"))
    store = html.escape(raw_store)
    category = str(offer_data.get("category", "eletronicos"))
    coupon_code = offer_data.get("coupon_code")
    coupon_validity = offer_data.get("coupon_validity")
    affiliate_link = offer_data.get("affiliate_link", "")

    lines = [
        f"🔥 <b>OFERTA IMPERDÍVEL</b> | 🏬 <b>{store.upper()}</b>\n",
        f"📦 <b>{title}</b>\n",
    ]

    # Preços e Desconto
    if price_original > price_current > 0:
        orig_str = format_currency_br(price_original)
        curr_str = format_currency_br(price_current)
        lines.append(f"❌ De: <s>{orig_str}</s>")
        lines.append(f"✅ <b>Por apenas: {curr_str}</b> (-{discount_pct}% OFF!)\n")
    elif price_current > 0:
        curr_str = format_currency_br(price_current)
        lines.append(f"✅ <b>Por apenas: {curr_str}</b>\n")

    # Cupom de desconto
    if coupon_code:
        clean_coupon = html.escape(str(coupon_code))
        coupon_line = f"🎟 <b>Cupom:</b> <code>{clean_coupon}</code> <i>(Toque para copiar)</i>"
        if coupon_validity:
            coupon_line += f" | <i>Válido até: {html.escape(str(coupon_validity))}</i>"
        lines.append(coupon_line + "\n")

    # Botão de Ação / Link de Afiliado
    if affiliate_link:
        lines.append(f"🛒 <b><a href=\"{affiliate_link}\">👉 RESGATAR PROMOÇÃO AQUI</a></b>\n")

    # Rodapé institucional e hashtags
    lines.append("⚡ <i>Preços sujeitos a alteração a qualquer momento.</i>")
    lines.append(f"📢 <b>Siga:</b> @elitedaspechinchas")
    lines.append(f"\n{generate_hashtags(raw_store, category, is_coupon=bool(coupon_code))}")

    return "\n".join(lines)[:4096]


def format_telegram_coupon_html(coupon_data: Dict[str, Any]) -> str:
    """
    Formata mensagem dedicada para divulgação de cupons de desconto.
    """
    raw_store = str(coupon_data.get("store", "Loja Parceira"))
    store = html.escape(raw_store)
    code = html.escape(str(coupon_data.get("code", coupon_data.get("coupon_code", "DESCONTO"))))
    discount_text = html.escape(str(coupon_data.get("discount_text", coupon_data.get("description", "Desconto Especial"))))
    validity = html.escape(str(coupon_data.get("valid_until", coupon_data.get("coupon_validity", "Tempo limitado"))))
    category = str(coupon_data.get("category", "geral"))
    affiliate_link = coupon_data.get("affiliate_link", coupon_data.get("store_url", ""))

    lines = [
        f"🏷️ <b>CUPOM EXCLUSIVO</b> | 🏬 <b>{store.upper()}</b>\n",
        f"✨ <b>{discount_text}</b>\n",
        f"🎟 <b>Código:</b> <code>{code}</code>",
        f"📅 <b>Validade:</b> {validity}\n",
    ]

    if affiliate_link:
        lines.append(f"🛒 <b><a href=\"{affiliate_link}\">👉 ATIVAR CUPOM NO SITE</a></b>\n")

    lines.append("⚡ <i>Regras e produtos aplicáveis conferir no site.</i>")
    lines.append("📢 <b>Canal Oficial:</b> @elitedaspechinchas")
    lines.append(f"\n{generate_hashtags(raw_store, category, is_coupon=True)}")

    return "\n".join(lines)[:4096]


def format_telegram_card_markdown(offer_data: Dict[str, Any]) -> str:
    """
    Formatação alternativa em Markdown clássico.
    """
    title = str(offer_data.get("title", "Oferta")).replace("*", "")
    price_current = float(offer_data.get("price_current", 0.0) or 0.0)
    price_original = float(offer_data.get("price_original", 0.0) or 0.0)
    discount_pct = int(offer_data.get("discount_pct", 0) or 0)
    store = str(offer_data.get("store", "Loja Parceira"))
    category = str(offer_data.get("category", "eletronicos"))
    coupon_code = offer_data.get("coupon_code")
    affiliate_link = offer_data.get("affiliate_link", "")

    curr_str = format_currency_br(price_current)

    msg = f"🔥 *{title}*\n\n"
    msg += f"🏬 Loja: *{store}*\n"
    if price_original > price_current > 0:
        orig_str = format_currency_br(price_original)
        msg += f"❌ De: ~{orig_str}~\n"
        msg += f"✅ *Por: {curr_str}* (-{discount_pct}% OFF)\n"
    elif price_current > 0:
        msg += f"✅ *Por: {curr_str}*\n"

    if coupon_code:
        msg += f"🎟 Use o cupom: `{coupon_code}`\n"

    if affiliate_link:
        msg += f"\n👉 [COMPRE COM DESCONTO AQUI]({affiliate_link})\n\n"

    msg += "⚡ Canal Oficial: @elitedaspechinchas\n"
    msg += generate_hashtags(store, category, is_coupon=bool(coupon_code))

    return msg[:4096]
