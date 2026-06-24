"""Интеграционные тесты авторизации, регистрации, пользователей и ролей."""
import json


def test_login_success(app_client):
    r = app_client.post("/api/login", data={"username": "user1", "password": "Passw0rd!"})
    assert r.status_code == 200
    assert r.json()["access_token"]


def test_login_wrong_password_401(app_client):
    r = app_client.post("/api/login", data={"username": "user1", "password": "неверно"})
    assert r.status_code == 401


def test_register_weak_password_422(app_client):
    r = app_client.post("/api/register", data={"form": json.dumps({"username": "newbie", "password": "weak"})})
    assert r.status_code == 422


def test_register_and_duplicate_409(app_client):
    payload = {"username": "newbie2", "password": "Passw0rd!"}
    r = app_client.post("/api/register", data={"form": json.dumps(payload)})
    assert r.status_code == 201, r.text
    dup = app_client.post("/api/register", data={"form": json.dumps(payload)})
    assert dup.status_code == 409


def test_users_list_requires_permission(app_client, headers):
    # у обычного пользователя нет права user_role.update
    assert app_client.get("/api/users", headers=headers["user"]).status_code == 403
    r = app_client.get("/api/users", headers=headers["admin"])
    assert r.status_code == 200
    assert "data" in r.json()


def test_get_user_role(app_client, headers):
    uid = app_client.ids["usr_user"]
    r = app_client.get(f"/api/users/{uid}/role", headers=headers["user"])
    assert r.status_code == 200
    assert r.json()["name"] == "user"


def test_admin_changes_user_role(app_client, headers):
    uid = app_client.ids["usr_user"]
    manager_role = app_client.ids["manager_role"]
    # смена роли требует права user_role.update — у user его нет
    assert app_client.post(f"/api/users/{uid}/role", json=manager_role, headers=headers["user"]).status_code == 403
    # админ меняет роль
    r = app_client.post(f"/api/users/{uid}/role", json=manager_role, headers=headers["admin"])
    assert r.status_code == 200
    # роль действительно изменилась
    assert app_client.get(f"/api/users/{uid}/role", headers=headers["admin"]).json()["name"] == "manager"
    # вернём обратно, чтобы не влиять на другие тесты
    app_client.post(f"/api/users/{uid}/role", json=app_client.ids["user_role"], headers=headers["admin"])
