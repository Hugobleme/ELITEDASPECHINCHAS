import html
from typing import Optional, Dict, Any


def format_currency_br(value: float) -> str:
    """Formata valor em reais no padrão brasileiro: R$ 1.299,90"""
    return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def format_telegram_card_html(offer_data: Dict[str, Any]) -> str:
    """
    Formata o card da oferta no padrão Telegram usando HTML seguro.
    Evita quebras de sintaxe comuns do Markdown em links ou títulos com caracteres especiais.
    """
    title = html.escape(str(offer_data.get("title", "Oferta Imperdível")))
    price_current = float(offer_data.get("price_current", 0.0))
    price_original = float(offer_data.get("price_original", 0.0))
    discount_pct = int(offer_data.get("discount_pct", 0))
    store = html.escape(str(offer_data.get("store", "Loja Parceira")))
    coupon_code = offer_data.get("coupon_code")
    affiliate_link = offer_data.get("affiliate_link", "")

    lines = [
        f"🔥 <b>OFERTA IMPERDÍVEL</b> | 🏬 <b>{store.upper()}</b>\n",
        f"📦 <b>{title}</b>\n",
    ]

    # Preços
    if price_original > price_current:
        orig_str = format_currency_br(price_original)
        curr_str = format_currency_br(price_current)
        lines.append(f"❌ De: <s>{orig_str}</s>")
        lines.append(f"✅ <b>Por apenas: {curr_str}</b> (-{discount_pct}% OFF!)\n")
    else:
        curr_str = format_currency_br(price_current)
        lines.append(f"✅ <b>Por apenas: {curr_str}</b>\n")

    # Cupom de desconto
    if coupon_code:
        clean_coupon = html.escape(str(coupon_code))
        lines.append(f"🎟 <b>Cupom:</b> <code>{clean_coupon}</code>\n")

    # Botão / Link de Afiliado
    lines.append(f"🛒 <b><a href=\"{affiliate_link}\">👉 RESGATAR PROMOÇÃO AQUI</a></b>\n")
    
    # Rodapé institucional
    lines.append("⚡ <i>Preços sujeitos a alteração a qualquer momento.</i>")
    lines.append("📢 <b>Siga:</b> @elitedaspechinchas")

    return "\n".join(lines)


def format_telegram_card_markdown(offer_data: Dict[str, Any]) -> str:
    """
    Formatação alternativa em Markdown clássico.
    """
    title = str(offer_data.get("title", "Oferta")).replace("*", "")
    price_current = float(offer_data.get("price_current", 0.0))
    price_original = float(offer_data.get("price_original", 0.0))
    discount_pct = int(offer_data.get("discount_pct", 0))
    store = str(offer_data.get("store", "Loja Parceira"))
    coupon_code = offer_data.get("coupon_code")
    affiliate_link = offer_data.get("affiliate_link", "")

    curr_str = format_currency_br(price_current)

    msg = f"🔥 *{title}*\n\n"
    msg += f"🏬 Loja: *{store}*\n"
    if price_original > price_current:
        orig_str = format_currency_br(price_original)
        msg += f"❌ De: ~{orig_str}~\n"
        msg += f"✅ *Por: {curr_str}* (-{discount_pct}% OFF)\n"
    else:
        msg += f"✅ *Por: {curr_str}*\n"

    if coupon_code:
        msg += f"🎟 Use o cupom: `{coupon_code}`\n"

    msg += f"\n👉 [COMPRE COM DESCONTO AQUI]({affiliate_link})\n\n"
    msg += "⚡ Canal Oficial: @elitedaspechinchas"

    return msg
