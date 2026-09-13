"""
Script de Seed — Elite das Pechinchas
Popula as tabelas 'sources' e 'affiliate_rules' no PostgreSQL com as configurações padrão.
Execução: python seed.py
"""

import sys
from datetime import datetime
from database.connection import SessionLocal, engine, Base
from database.models import Source, AffiliateRule
from config import SOURCE_CHANNELS, DEFAULT_AFFILIATE_TAGS, AFFILIATE_PARAM_NAMES


def seed_database():
    print("🌱 Iniciando o seed de fontes e regras de afiliados...")

    # Garante que as tabelas existam
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # 1. Popula fontes de monitoramento (sources)
        print("\n📡 Configurando fontes de grupos do Telegram...")
        sources_seeded = 0
        for channel in SOURCE_CHANNELS:
            clean_channel = channel.strip()
            if not clean_channel:
                continue

            existing = db.query(Source).filter(Source.channel_username == clean_channel).first()
            if not existing:
                friendly_name = clean_channel.replace("@", "").replace("_", " ").title()
                source = Source(
                    name=f"Grupo {friendly_name}",
                    channel_username=clean_channel,
                    is_active=True,
                    created_at=datetime.utcnow(),
                )
                db.add(source)
                sources_seeded += 1
                print(f"  + Fonte adicionada: {clean_channel}")
            else:
                print(f"  • Fonte já existe: {clean_channel}")

        # 2. Popula regras de afiliados (affiliate_rules)
        print("\n🛒 Configurando regras de afiliados por loja...")
        rules_seeded = 0
        for store, tag in DEFAULT_AFFILIATE_TAGS.items():
            param = AFFILIATE_PARAM_NAMES.get(store, "tag")
            existing = db.query(AffiliateRule).filter(AffiliateRule.store.ilike(store)).first()

            if not existing:
                rule = AffiliateRule(
                    store=store,
                    tag_param=param,
                    affiliate_tag=tag,
                )
                db.add(rule)
                rules_seeded += 1
                print(f"  + Regra adicionada: {store} -> {param}={tag}")
            else:
                # Atualiza caso a tag tenha mudado
                existing.affiliate_tag = tag
                existing.tag_param = param
                print(f"  • Regra atualizada: {store} -> {param}={tag}")

        db.commit()
        print(f"\n✅ Seed finalizado com sucesso! ({sources_seeded} novas fontes, {rules_seeded} novas regras)")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Erro durante o seed: {e}", file=sys.stderr)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
