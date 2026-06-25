"""Интеграционные тесты связей «сотрудник-навык»."""


def new_skill(app_client, headers, name):
    return app_client.post("/api/skills", json={"name": name, "category": "language"}, headers=headers["admin"]).json()["id"]


def test_get_skills_requires_auth(app_client):
    assert app_client.get("/api/employees/1/skills").status_code == 401


def test_get_skills_of_missing_employee_404(app_client, headers):
    assert app_client.get("/api/employees/999999/skills", headers=headers["user"]).status_code == 404


def test_assign_requires_permission(app_client, headers):
    sid = new_skill(app_client, headers, "Go")
    emp = app_client.ids["usr_emp"]
    r = app_client.post(f"/api/employees/{emp}/skills/{sid}", json={"level": 2}, headers=headers["user"])
    assert r.status_code == 403


def test_manager_assign_patch_delete(app_client, headers):
    sid = new_skill(app_client, headers, "Rust")
    emp = app_client.ids["usr_emp"]

    # менеджер имеет права employee_skill.*
    r = app_client.post(f"/api/employees/{emp}/skills/{sid}", json={"level": 2}, headers=headers["manager"])
    assert r.status_code == 201, r.text

    # повторное назначение → 409
    assert app_client.post(f"/api/employees/{emp}/skills/{sid}", json={"level": 4}, headers=headers["manager"]).status_code == 409

    # навык появился в списке с уровнем 2
    g = app_client.get(f"/api/employees/{emp}/skills", headers=headers["user"])
    assert g.status_code == 200
    assert any(x["id"] == sid and x["level"] == 2 for x in g.json())

    # смена уровня
    p = app_client.patch(f"/api/employees/{emp}/skills/{sid}", json={"level": 5}, headers=headers["manager"])
    assert p.status_code == 200
    assert p.json()["level"] == 5

    # снятие навыка
    assert app_client.delete(f"/api/employees/{emp}/skills/{sid}", headers=headers["manager"]).status_code == 200


def test_invalid_level_422(app_client, headers):
    sid = new_skill(app_client, headers, "Kotlin")
    emp = app_client.ids["usr_emp"]
    assert app_client.post(f"/api/employees/{emp}/skills/{sid}", json={"level": 9}, headers=headers["manager"]).status_code == 422
