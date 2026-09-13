import pytest


def test_add_favorite_success(client, auth_headers, sample_offer):
    response = client.post(
        "/me/favorites",
        json={"offer_id": sample_offer.id},
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["offer_id"] == sample_offer.id
    assert data["offer"]["title"] == sample_offer.title


def test_add_favorite_duplicate(client, auth_headers, sample_offer):
    # Primeiro cadastro
    client.post(
        "/me/favorites",
        json={"offer_id": sample_offer.id},
        headers=auth_headers,
    )
    # Segunda tentativa (duplicado)
    response = client.post(
        "/me/favorites",
        json={"offer_id": sample_offer.id},
        headers=auth_headers,
    )
    assert response.status_code == 409
    assert "já está nos seus favoritos" in response.json()["detail"]


def test_list_favorites(client, auth_headers, sample_offer):
    client.post(
        "/me/favorites",
        json={"offer_id": sample_offer.id},
        headers=auth_headers,
    )
    response = client.get("/me/favorites", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["offer_id"] == sample_offer.id


def test_remove_favorite(client, auth_headers, sample_offer):
    client.post(
        "/me/favorites",
        json={"offer_id": sample_offer.id},
        headers=auth_headers,
    )
    # Remove
    del_resp = client.delete(f"/me/favorites/{sample_offer.id}", headers=auth_headers)
    assert del_resp.status_code == 204

    # Lista de novo -> vazia
    list_resp = client.get("/me/favorites", headers=auth_headers)
    assert len(list_resp.json()) == 0


def test_remove_nonexistent_favorite(client, auth_headers):
    response = client.delete("/me/favorites/id-nao-existe", headers=auth_headers)
    assert response.status_code == 404
