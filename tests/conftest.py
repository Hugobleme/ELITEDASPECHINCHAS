import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database.connection import Base, get_db
from database.models import User, Offer
from api.main import app
from api.security import create_access_token, get_password_hash

# SQLite in-memory para testes isolados
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db_session):
    user = User(
        email="testuser@example.com",
        name="Test User",
        password_hash=get_password_hash("password123"),
        provider="email",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user):
    token = create_access_token({"sub": str(test_user.id), "email": test_user.email})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def sample_offer(db_session):
    offer = Offer(
        id="offer-test-01",
        title='Smart TV 55" 4K UHD Samsung Crystal',
        price_current=2199.00,
        price_original=3499.00,
        discount_pct=37,
        store="Amazon",
        category="tv-e-audio",
        image_url="https://example.com/tv.jpg",
        affiliate_link="https://amazon.com.br/dp/B0CX?tag=promoradar-20",
        status="published",
    )
    db_session.add(offer)
    db_session.commit()
    db_session.refresh(offer)
    return offer
