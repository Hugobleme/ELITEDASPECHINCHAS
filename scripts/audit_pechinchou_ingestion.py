import asyncio
import os
import sys
from telethon import TelegramClient
from telethon.sessions import StringSession

# Add workspace to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from config import TELEGRAM_API_ID, TELEGRAM_API_HASH
from database.connection import SessionLocal
from processor.parser import parse_telegram_message
from processor.rules import evaluate_rules
from bot.formatter import format_telegram_card_html
from bot.listener import extract_entities_urls

async def run_audit():
    with open("session.txt", "r", encoding="utf-8") as f:
        session_str = f.read().strip()

    client = TelegramClient(StringSession(session_str), TELEGRAM_API_ID, TELEGRAM_API_HASH)
    await client.connect()
    
    if not await client.is_user_authorized():
        print("ERROR: User not authorized!")
        return

    print("Connected to Telegram successfully!")
    db = SessionLocal()

    entity = await client.get_entity("@pechinchou")
    print(f"Target entity: {entity.title} (ID: {entity.id})")

    messages = []
    async for m in client.iter_messages(entity, limit=50):
        if m.text and m.text.strip():
            messages.append(m)

    print(f"Fetched {len(messages)} recent messages with text.\n")
    
    total = len(messages)
    approved_count = 0
    rejected_count = 0
    rejections_by_reason = {}
    stores_found = {}
    long_captions = []

    print("=" * 80)
    print("DETAILED AUDIT OF LAST 50 PECHINCHOU PROMOTIONS")
    print("=" * 80)

    for idx, msg in enumerate(reversed(messages), 1):
        entities_links = extract_entities_urls(msg)
        parsed = parse_telegram_message(
            text=msg.text,
            media_url=None,
            entities_links=entities_links
        )

        approved, reason, status = evaluate_rules(
            parsed_data=parsed,
            db=db,
            telegram_msg_id=msg.id,
            source_name="@pechinchou",
        )

        store = parsed.get("store") or "DESCONHECIDA"
        stores_found[store] = stores_found.get(store, 0) + 1

        card_html = format_telegram_card_html(parsed)
        if len(card_html) > 1024:
            long_captions.append((msg.id, len(card_html), parsed.get("title")))

        if approved:
            approved_count += 1
            print(f"[{idx:02d}] [APPROVED] ID: {msg.id} | Loja: {store:<15} | Preço: R$ {parsed.get('price_current', 0):>7.2f} | Desc: {parsed.get('discount_pct', 0):>2}% | Titulo: {parsed.get('title')[:40]}...")
        else:
            rejected_count += 1
            reason_category = reason.split(":")[0] if ":" in reason else reason
            rejections_by_reason[reason] = rejections_by_reason.get(reason, 0) + 1
            print(f"[{idx:02d}] [REJECTED] ID: {msg.id} | Motivo: {reason} | Preço: R$ {parsed.get('price_current', 0):>7.2f} | Desc: {parsed.get('discount_pct', 0):>2}% | Titulo: {parsed.get('title')[:40]}...")

    db.close()
    await client.disconnect()

    print("\n" + "=" * 80)
    print("AUDIT SUMMARY REPORT")
    print("=" * 80)
    print(f"Total Processed: {total}")
    print(f"Approved:        {approved_count} ({approved_count/total*100:.1f}%)")
    print(f"Rejected:        {rejected_count} ({rejected_count/total*100:.1f}%)")
    
    print("\nRejection Breakdown:")
    for reason, count in rejections_by_reason.items():
        print(f"  - ({count}x) {reason}")

    print("\nStores Detected:")
    for store, count in sorted(stores_found.items(), key=lambda x: x[1], reverse=True):
        print(f"  - {store}: {count}")

    print(f"\nCaptions exceeding Telegram 1024-char limit: {len(long_captions)}")
    for cid, clen, ctitle in long_captions:
        print(f"  - Msg {cid}: {clen} chars -> {ctitle[:50]}...")

if __name__ == "__main__":
    asyncio.run(run_audit())
