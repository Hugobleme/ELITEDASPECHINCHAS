import pytest


def test_register_success(client):
    response = client.post(
        "/auth/register",
        json={"email": "novo@example.com", "password": "securepassword", "name": "Novo Usuario"},
    )
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


def test_register_duplicate_email(client, test_user):
    response = client.post(
        "/auth/register",
        json={"email": test_user.email, "password": "anotherpassword", "name": "Duplicado"},
    )
    assert response.status_code == 409
    assert "Já existe uma conta" in response.json()["detail"]


def test_login_success(client, test_user):
    response = client.post(
        "/auth/login",
        json={"email": test_user.email, "password": "password123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data


def test_login_wrong_password(client, test_user):
    response = client.post(
        "/auth/login",
        json={"email": test_user.email, "password": "wrongpassword"},
    )
    assert response.status_code == 401
    assert "E-mail ou senha incorretos" in response.json()["detail"]


def test_get_me_authenticated(client, auth_headers, test_user):
    response = client.get("/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(test_user.id)
    assert data["email"] == test_user.email
    assert data["name"] == test_user.name
    # Garante que senha não vaza no payload
    assert "password" not in data
    assert "password_hash" not in data


def test_get_me_unauthenticated(client):
    response = client.get("/me")
    assert response.status_code == 401
