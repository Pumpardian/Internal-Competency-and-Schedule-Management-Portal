"""Интеграционные тесты эндпоинтов навыков."""


def test_list_requires_auth(app_client):
    assert app_client.get("/api/skills").status_code == 401


def test_list_skills_paginated(app_client, headers):
    r = app_client.get("/api/skills", headers=headers["user"])
    assert r.status_code == 200
    assert {"page_size", "current_page", "total_pages", "data"} <= set(r.json().keys())


def test_create_requires_permission(app_client, headers):
    r = app_client.post("/api/skills", json={"name": "Python", "category": "language"}, headers=headers["user"])
    assert r.status_code == 403


def test_admin_skill_crud(app_client, headers):
    r = app_client.post("/api/skills", json={"name": "Python", "category": "language"}, headers=headers["admin"])
    assert r.status_code == 201, r.text
    sid = r.json()["id"]

    # дубликат имени → 409
    assert app_client.post("/api/skills", json={"name": "Python", "category": "language"}, headers=headers["admin"]).status_code == 409
    # несуществующая категория → 422
    assert app_client.post("/api/skills", json={"name": "Прочее", "category": "badcat"}, headers=headers["admin"]).status_code == 422

    # переименование
    patched = app_client.patch(f"/api/skills/{sid}", json={"name": "Python3", "category": "language"}, headers=headers["admin"])
    assert patched.status_code == 200
    assert patched.json()["name"] == "Python3"

    # удаление
    assert app_client.delete(f"/api/skills/{sid}", headers=headers["admin"]).status_code == 200


def test_get_skill_404(app_client, headers):
    assert app_client.get("/api/skills/999999", headers=headers["user"]).status_code == 404


def test_delete_skill_in_use_409(app_client, headers):
    sid = app_client.post("/api/skills", json={"name": "SQL", "category": "database"}, headers=headers["admin"]).json()["id"]
    emp = app_client.ids["usr_emp"]
    assign = app_client.post(f"/api/employees/{emp}/skills/{sid}", json={"level": 3}, headers=headers["admin"])
    assert assign.status_code == 201, assign.text
    # навык используется сотрудником → удалить нельзя
    assert app_client.delete(f"/api/skills/{sid}", headers=headers["admin"]).status_code == 409
