"""Basic API tests."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_register_and_login():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        email = "testuser@example.com"
        reg = await client.post(
            "/auth/register",
            json={"email": email, "password": "testpass123", "name": "Test User"},
        )
        if reg.status_code == 400:
            login = await client.post("/auth/login", json={"email": email, "password": "testpass123"})
            assert login.status_code == 200
        else:
            assert reg.status_code == 201
            data = reg.json()
            assert "access_token" in data
