"""Интеграционные тесты эндпоинтов сотрудников."""
import json


def form(payload):
    """Тело multipart-формы: поле `form` со строкой JSON."""
    return {"form": json.dumps(payload)}


def test_list_requires_auth(app_client):
    assert app_client.get("/api/employees").status_code == 401


def test_list_employees_paginated(app_client, headers):
    r = app_client.get("/api/employees", params={"page_size": 20}, headers=headers["user"])
    assert r.status_code == 200
    body = r.json()
    assert {"page_size", "current_page", "total_pages", "data"} <= set(body.keys())
    assert len(body["data"]) >= 3  # сиды: admin / manager1 / user1


def test_get_employee_404(app_client, headers):
    assert app_client.get("/api/employees/999999", headers=headers["user"]).status_code == 404


def test_create_requires_permission(app_client, headers):
    r = app_client.post("/api/employees", data=form({"first_name": "Анна", "last_name": "Сидорова"}), headers=headers["user"])
    assert r.status_code == 403


def test_admin_creates_updates_deletes_employee(app_client, headers):
    r = app_client.post(
        "/api/employees",
        data=form({"first_name": "Анна", "last_name": "Сидорова", "position": "Аналитик"}),
        headers=headers["admin"],
    )
    assert r.status_code == 201, r.text
    eid = r.json()["id"]
    assert r.json()["last_name"] == "Сидорова"

    # дубликат (то же ФИО) → 409
    dup = app_client.post("/api/employees", data=form({"first_name": "Анна", "last_name": "Сидорова"}), headers=headers["admin"])
    assert dup.status_code == 409

    # обновление должности
    patched = app_client.patch(f"/api/employees/{eid}", data=form({"position": "Ведущий аналитик"}), headers=headers["admin"])
    assert patched.status_code == 200
    assert patched.json()["position"] == "Ведущий аналитик"

    # удаление
    assert app_client.delete(f"/api/employees/{eid}", headers=headers["admin"]).status_code == 200
    assert app_client.get(f"/api/employees/{eid}", headers=headers["admin"]).status_code == 404


def test_delete_requires_permission(app_client, headers):
    emp = app_client.ids["usr_emp"]
    assert app_client.delete(f"/api/employees/{emp}", headers=headers["user"]).status_code == 403
