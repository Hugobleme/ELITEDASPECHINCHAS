import pytest
from database.models import PriceAlert, Offer
from processor.notify import match_alert


def test_match_alert_by_keyword():
    offer = Offer(
        title="Smartphone Samsung Galaxy S24 Ultra 5G",
        discount_pct=45,
        store="Mercado Livre",
        category="eletronicos",
    )
    alert = PriceAlert(
        active=True,
        keyword="Galaxy S24",
        target_discount=30,
    )
    assert match_alert(alert, offer) is True


def test_match_alert_by_category_and_store():
    offer = Offer(
        title="Smart TV 55 4K",
        discount_pct=35,
        store="Amazon",
        category="tv-e-audio",
    )
    alert = PriceAlert(
        active=True,
        category="tv-e-audio",
        store="Amazon",
        target_discount=20,
    )
    assert match_alert(alert, offer) is True


def test_fail_match_when_discount_below_target():
    offer = Offer(
        title="Console PlayStation 5 Slim",
        discount_pct=15,
        store="Kabum",
        category="games",
    )
    alert = PriceAlert(
        active=True,
        category="games",
        target_discount=20,  # Exige pelo menos 20%
    )
    assert match_alert(alert, offer) is False


def test_fail_match_when_store_differs():
    offer = Offer(
        title="Monitor Gamer AOC",
        discount_pct=40,
        store="Kabum",
        category="informatica",
    )
    alert = PriceAlert(
        active=True,
        store="Amazon",  # Alerta configurado para a Amazon
        target_discount=20,
    )
    assert match_alert(alert, offer) is False


def test_fail_match_when_alert_inactive():
    offer = Offer(
        title="Air Fryer Mondial 5L",
        discount_pct=50,
        store="Magalu",
        category="casa-e-cozinha",
    )
    alert = PriceAlert(
        active=False,  # Desativado pelo usuário
        keyword="Air Fryer",
        target_discount=30,
    )
    assert match_alert(alert, offer) is False
