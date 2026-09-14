"""
Script de Seed Idempotente — Elite das Pechinchas (Etapa 3)
Popula de ponta a ponta:
1. Lojas Parceiras Oficiais (stores)
2. Categorias Taxonômicas (categories)
3. Regras de Afiliados (affiliate_rules)
4. Fontes de Monitoramento do Telegram (sources)
5. Cupons de Desconto Ativos (coupons)
6. Ofertas Iniciais Verificadas (offers)
7. Usuário Administrador Padrão (users)

Execução: python seed.py
"""

import sys
import uuid

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from datetime import datetime, timezone
from database.connection import SessionLocal, engine, Base
from database.models import (
    Store,
    Category,
    Coupon,
    Offer,
    Source,
    AffiliateRule,
    User,
)
from config import SOURCE_CHANNELS, DEFAULT_AFFILIATE_TAGS, AFFILIATE_PARAM_NAMES
from api.security import get_password_hash
from api.services.mock_data import PYTHON_MOCK_COUPONS, PYTHON_MOCK_CATEGORIES, PYTHON_MOCK_STORES


from typing import Optional
from sqlalchemy.orm import Session
from database.connection import SessionLocal, engine, Base


def seed_database(session: Optional[Session] = None):
    print("🌱 Iniciando o Seed Oficial do Banco de Dados (Etapa 3)...")

    should_close = False
    if session is not None:
        db = session
    else:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        should_close = True

    now_utc = datetime.now(timezone.utc)

    try:
        # ======================================================================
        # 1. Lojas Parceiras (stores)
        # ======================================================================
        print("\n🏬 1. Populando Lojas Parceiras...")
        stores_data = [
            {"name": "Amazon", "slug": "amazon", "url": "https://www.amazon.com.br", "logo_url": "https://images.unsplash.com/photo-1523474255658-4af61b1684c2?w=120"},
            {"name": "Mercado Livre", "slug": "mercadolivre", "url": "https://www.mercadolivre.com.br", "logo_url": "https://images.unsplash.com/photo-1556742049-0a67e5572263?w=120"},
            {"name": "Magazine Luiza", "slug": "magalu", "url": "https://www.magazineluiza.com.br", "logo_url": "https://images.unsplash.com/photo-1556742044-3c52d6e88c62?w=120"},
            {"name": "Kabum", "slug": "kabum", "url": "https://www.kabum.com.br", "logo_url": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=120"},
            {"name": "Shopee", "slug": "shopee", "url": "https://www.shopee.com.br", "logo_url": "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=120"},
            {"name": "AliExpress", "slug": "aliexpress", "url": "https://pt.aliexpress.com", "logo_url": "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=120"},
            {"name": "Casas Bahia", "slug": "casasbahia", "url": "https://www.casasbahia.com.br", "logo_url": "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=120"},
            {"name": "Fast Shop", "slug": "fastshop", "url": "https://www.fastshop.com.br", "logo_url": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=120"},
            {"name": "Pichau", "slug": "pichau", "url": "https://www.pichau.com.br", "logo_url": "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=120"},
            {"name": "Terabyte", "slug": "terabyte", "url": "https://www.terabyteshop.com.br", "logo_url": "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=120"},
            {"name": "Samsung", "slug": "samsung", "url": "https://www.samsung.com/br", "logo_url": "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=120"},
        ]

        store_map = {}
        stores_count = 0
        for s_item in stores_data:
            st = db.query(Store).filter((Store.slug == s_item["slug"]) | (Store.name == s_item["name"])).first()
            if not st:
                st = Store(
                    name=s_item["name"],
                    slug=s_item["slug"],
                    website_url=s_item["url"],
                    logo_url=s_item["logo_url"],
                    is_trusted=True,
                    created_at=now_utc,
                    updated_at=now_utc,
                )
                db.add(st)
                stores_count += 1
                print(f"  + Loja criada: {s_item['name']} ({s_item['slug']})")
            store_map[s_item["name"].lower()] = st
            store_map[s_item["slug"].lower()] = st

        db.commit()

        # ======================================================================
        # 2. Categorias (categories)
        # ======================================================================
        print("\n🏷️ 2. Populando Categorias...")
        categories_data = [
            {"name": "Smartphones", "slug": "smartphones", "description": "Celulares, iPhones e acessórios móveis."},
            {"name": "Informática", "slug": "informatica", "description": "Notebooks, hardware, monitores e periféricos."},
            {"name": "Eletrônicos", "slug": "eletronicos", "description": "Smartwatches, tablets, fones e caixas de som."},
            {"name": "Games", "slug": "games", "description": "Consoles PS5, Xbox Series, Switch e jogos."},
            {"name": "Casa e Cozinha", "slug": "casa-e-cozinha", "description": "Air fryers, eletroportáteis e cafeteiras."},
            {"name": "TV e Áudio", "slug": "tv-e-audio", "description": "Smart TVs 4K, soundbars e home theaters."},
            {"name": "Moda", "slug": "moda", "description": "Tênis, vestuário, calçados e mochilas."},
        ]

        category_map = {}
        categories_count = 0
        for c_item in categories_data:
            cat = db.query(Category).filter(Category.slug == c_item["slug"]).first()
            if not cat:
                cat = Category(
                    name=c_item["name"],
                    slug=c_item["slug"],
                    description=c_item["description"],
                    created_at=now_utc,
                    updated_at=now_utc,
                )
                db.add(cat)
                categories_count += 1
                print(f"  + Categoria criada: {c_item['name']} ({c_item['slug']})")
            category_map[c_item["slug"].lower()] = cat

        db.commit()

        # ======================================================================
        # 3. Fontes de Monitoramento (sources)
        # ======================================================================
        print("\n📡 3. Populando Fontes de Monitoramento...")
        sources_count = 0
        for channel in SOURCE_CHANNELS:
            clean_ch = channel.strip()
            if not clean_ch:
                continue
            src = db.query(Source).filter(Source.channel_username == clean_ch).first()
            if not src:
                name_friendly = clean_ch.replace("@", "").replace("_", " ").title()
                src = Source(
                    name=f"Grupo {name_friendly}",
                    channel_username=clean_ch,
                    is_active=True,
                    created_at=now_utc,
                )
                db.add(src)
                sources_count += 1
                print(f"  + Fonte criada: {clean_ch}")

        # ======================================================================
        # 4. Regras de Afiliados (affiliate_rules)
        # ======================================================================
        print("\n🛒 4. Populando Regras de Afiliados...")
        rules_count = 0
        for store_name, tag in DEFAULT_AFFILIATE_TAGS.items():
            param = AFFILIATE_PARAM_NAMES.get(store_name, "tag")
            rule = db.query(AffiliateRule).filter(AffiliateRule.store.ilike(store_name)).first()
            if not rule:
                rule = AffiliateRule(
                    store=store_name,
                    tag_param=param,
                    affiliate_tag=tag or "elitedaspechinchas-20",
                )
                db.add(rule)
                rules_count += 1
                print(f"  + Regra de afiliado criada: {store_name} ({param})")

        db.commit()

        # ======================================================================
        # 5. Cupons de Desconto (coupons)
        # ======================================================================
        print("\n🎟️ 5. Populando Cupons de Desconto...")
        coupons_count = 0
        for coup_data in PYTHON_MOCK_COUPONS:
            cp = db.query(Coupon).filter(Coupon.code == coup_data["code"]).first()
            if not cp:
                store_obj = store_map.get(coup_data.get("store_slug", "").lower()) or store_map.get(coup_data["store"].lower())
                cat_obj = category_map.get(coup_data.get("category", "").lower())

                cp = Coupon(
                    id=coup_data["id"],
                    code=coup_data["code"],
                    store=coup_data["store"],
                    store_id=store_obj.id if store_obj else None,
                    store_slug=coup_data.get("store_slug"),
                    discount_text=coup_data["discount_text"],
                    rule_text=coup_data.get("rule_text"),
                    description=coup_data.get("description"),
                    category=coup_data["category"],
                    category_id=cat_obj.id if cat_obj else None,
                    valid_until=coup_data.get("valid_until"),
                    affiliate_link=coup_data.get("affiliate_link"),
                    is_active=True,
                    is_verified=coup_data.get("is_verified", True),
                    created_at=now_utc,
                    updated_at=now_utc,
                )
                db.add(cp)
                coupons_count += 1
                print(f"  + Cupom adicionado: {coup_data['code']} ({coup_data['store']})")

        db.commit()

        # ======================================================================
        # 6. Ofertas Iniciais Verificadas (offers)
        # ======================================================================
        print("\n📦 6. Populando Ofertas Iniciais...")
        initial_offers = [
            {
                "id": "offer-01",
                "title": "Smartphone Samsung Galaxy S24 Ultra 256GB Titânio Cinza",
                "price_current": 5999.00,
                "price_original": 8999.00,
                "discount_pct": 33,
                "store": "Amazon",
                "category": "smartphones",
                "image_url": "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600",
                "original_link": "https://www.amazon.com.br/dp/B0CX8R1234",
                "affiliate_link": "https://www.amazon.com.br/dp/B0CX8R1234?tag=elitedaspechinchas-20",
                "coupon_code": "GALAXY100",
            },
            {
                "id": "offer-02",
                "title": "Notebook Dell Inspiron 15 Core i5 8GB 512GB SSD Tela 15.6 Full HD",
                "price_current": 2699.00,
                "price_original": 3899.00,
                "discount_pct": 31,
                "store": "Mercado Livre",
                "category": "informatica",
                "image_url": "https://images.unsplash.com/photo-1547082299-de196ea013d6?w=600",
                "original_link": "https://produto.mercadolivre.com.br/MLB-1122334455",
                "affiliate_link": "https://produto.mercadolivre.com.br/MLB-1122334455?tag=elitedaspechinchas",
                "coupon_code": "DELL200",
            },
            {
                "id": "offer-03",
                "title": "Fritadeira Air Fryer Mondial 4L Digital Sem Óleo Preta",
                "price_current": 289.90,
                "price_original": 449.90,
                "discount_pct": 36,
                "store": "Magazine Luiza",
                "category": "casa-e-cozinha",
                "image_url": "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=600",
                "original_link": "https://www.magazineluiza.com.br/item/1234",
                "affiliate_link": "https://www.magazinevoce.com.br/elitedaspechinchas/item/1234",
                "coupon_code": "MAGALU30",
            },
            {
                "id": "offer-04",
                "title": "Console PlayStation 5 Edição Digital com 2 Jogos",
                "price_current": 3399.00,
                "price_original": 4299.00,
                "discount_pct": 21,
                "store": "Kabum",
                "category": "games",
                "image_url": "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=600",
                "original_link": "https://www.kabum.com.br/produto/556677",
                "affiliate_link": "https://www.kabum.com.br/produto/556677?tag=elitedaspechinchas",
                "coupon_code": "PLAY100",
            },
            {
                "id": "offer-05",
                "title": "Smart TV 55 Polegadas 4K LG OLED Evo C3 120Hz Dolby Vision",
                "price_current": 4799.00,
                "price_original": 6999.00,
                "discount_pct": 31,
                "store": "Fast Shop",
                "category": "tv-e-audio",
                "image_url": "https://images.unsplash.com/photo-1593784991095-a205069470b6?w=600",
                "original_link": "https://www.fastshop.com.br/p/oled55c3",
                "affiliate_link": "https://www.fastshop.com.br/p/oled55c3?tag=elitedaspechinchas",
                "coupon_code": "FAST200",
            },
            {
                "id": "offer-06",
                "title": "Tênis Nike Air Pegasus 40 Corrida Masculino Preto",
                "price_current": 549.90,
                "price_original": 899.90,
                "discount_pct": 39,
                "store": "Shopee",
                "category": "moda",
                "image_url": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600",
                "original_link": "https://shopee.com.br/product/99/88",
                "affiliate_link": "https://shopee.com.br/product/99/88?af_siteid=elitedaspechinchas",
                "coupon_code": "NIKESHOPEE",
            },
        ]

        offers_count = 0
        for off_data in initial_offers:
            of = db.query(Offer).filter(Offer.id == off_data["id"]).first()
            if not of:
                st_obj = store_map.get(off_data["store"].lower())
                cat_obj = category_map.get(off_data["category"].lower())

                of = Offer(
                    id=off_data["id"],
                    title=off_data["title"],
                    price_current=off_data["price_current"],
                    price_original=off_data["price_original"],
                    discount_pct=off_data["discount_pct"],
                    store=off_data["store"],
                    store_id=st_obj.id if st_obj else None,
                    category=off_data["category"],
                    category_id=cat_obj.id if cat_obj else None,
                    image_url=off_data["image_url"],
                    original_link=off_data["original_link"],
                    affiliate_link=off_data["affiliate_link"],
                    coupon_code=off_data.get("coupon_code"),
                    status="published",
                    is_active=True,
                    published_at=now_utc,
                    created_at=now_utc,
                    updated_at=now_utc,
                )
                db.add(of)
                offers_count += 1
                print(f"  + Oferta adicionada: {off_data['title'][:40]}... (R$ {off_data['price_current']:.2f})")

        db.commit()

        # ======================================================================
        # 7. Usuário Administrador (users)
        # ======================================================================
        print("\n👑 7. Populando Usuário Administrador Padrão...")
        admin_email = "admin@elitedaspechinchas.com.br"
        admin_user = db.query(User).filter(User.email == admin_email).first()
        if not admin_user:
            admin_user = User(
                email=admin_email,
                name="Administrador Elite",
                password_hash=get_password_hash("AdminMaster2026!"),
                role="admin",
                is_active=True,
                provider="email",
                created_at=now_utc,
                updated_at=now_utc,
            )
            db.add(admin_user)
            db.commit()
            print(f"  + Admin criado com sucesso: {admin_email}")
        else:
            admin_user.role = "admin"
            admin_user.is_active = True
            db.commit()
            print(f"  • Admin já existente e verificado: {admin_email}")

        print(f"\n✨ SEED CONCLUÍDO COM SUCESSO:")
        print(f"   • Lojas: {len(stores_data)} ({stores_count} novas)")
        print(f"   • Categorias: {len(categories_data)} ({categories_count} novas)")
        print(f"   • Cupons: {len(PYTHON_MOCK_COUPONS)} ({coupons_count} novos)")
        print(f"   • Ofertas: {len(initial_offers)} ({offers_count} novas)")
        print(f"   • Fontes Telegram: {sources_count} novas")
        print(f"   • Regras Afiliados: {rules_count} novas")
        print(f"   • Admin: {admin_email}")

        return {
            "status": "success",
            "stores": len(stores_data),
            "categories": len(categories_data),
            "coupons": len(PYTHON_MOCK_COUPONS),
            "offers": len(initial_offers),
        }

    except Exception as e:
        db.rollback()
        print(f"\n❌ Erro durante a execução do seed: {e}", file=sys.stderr)
        raise
    finally:
        if should_close:
            db.close()


if __name__ == "__main__":
    seed_database()
