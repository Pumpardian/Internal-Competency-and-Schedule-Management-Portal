"""Интеграционные тесты эндпоинтов броней (включая исправленный PATCH)."""


def iso(h, m=0):
    return f"2026-06-08T{h:02d}:{m:02d}:00"


def make(client, hdr, emp, h1, h2, topic="T"):
    """Создаёт бронь и возвращает её id."""
    r = client.post(
        "/api/bookings",
        json={"employee_id": emp, "topic": topic, "start_time": iso(h1), "end_time": iso(h2)},
        headers=hdr,
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


def test_bookings_require_auth(app_client):
    r = app_client.get("/api/bookings", params={"book_date": "2026-06-08"})
    assert r.status_code == 401


def test_user_creates_own_booking(app_client, headers):
    emp = app_client.ids["usr_emp"]
    r = app_client.post(
        "/api/bookings",
        json={"employee_id": emp, "topic": "Планёрка", "start_time": iso(9), "end_time": iso(10)},
        headers=headers["user"],
    )
    assert r.status_code == 201, r.text
    assert r.json()["topic"] == "Планёрка"


def test_overlapping_booking_409(app_client, headers):
    emp = app_client.ids["usr_emp"]
    make(app_client, headers["user"], emp, 9, 10, "A")
    r = app_client.post(
        "/api/bookings",
        json={"employee_id": emp, "topic": "B", "start_time": iso(9, 30), "end_time": iso(10, 30)},
        headers=headers["user"],
    )
    assert r.status_code == 409


def test_user_cannot_book_for_others_403(app_client, headers):
    other = app_client.ids["mgr_emp"]
    r = app_client.post(
        "/api/bookings",
        json={"employee_id": other, "topic": "X", "start_time": iso(11), "end_time": iso(12)},
        headers=headers["user"],
    )
    assert r.status_code == 403


def test_admin_can_book_for_others_201(app_client, headers):
    other = app_client.ids["usr_emp"]
    r = app_client.post(
        "/api/bookings",
        json={"employee_id": other, "topic": "От админа", "start_time": iso(13), "end_time": iso(14)},
        headers=headers["admin"],
    )
    assert r.status_code == 201


# ---- PATCH /bookings/{id} (исправленный) ----

def test_update_changes_fields_without_self_overlap(app_client, headers):
    """Главный фикс: правка своей брони не конфликтует сама с собой и реально меняет поля."""
    emp = app_client.ids["usr_emp"]
    bid = make(app_client, headers["user"], emp, 9, 10, "Старое")
    r = app_client.patch(
        f"/api/bookings/{bid}",
        json={"employee_id": emp, "topic": "Новое", "start_time": iso(9), "end_time": iso(11)},
        headers=headers["user"],
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["topic"] == "Новое"  # фикс висячих запятых — поле обновляется
    assert body["end_time"].startswith("2026-06-08T11")


def test_update_nonexistent_404(app_client, headers):
    emp = app_client.ids["usr_emp"]
    r = app_client.patch(
        "/api/bookings/999999",
        json={"employee_id": emp, "topic": "X", "start_time": iso(9), "end_time": iso(10)},
        headers=headers["user"],
    )
    assert r.status_code == 404


def test_update_real_overlap_409(app_client, headers):
    emp = app_client.ids["usr_emp"]
    make(app_client, headers["user"], emp, 9, 10, "A")
    b = make(app_client, headers["user"], emp, 11, 12, "B")
    # двигаем B на время A → пересечение с ДРУГОЙ бронью → 409
    r = app_client.patch(
        f"/api/bookings/{b}",
        json={"employee_id": emp, "topic": "B", "start_time": iso(9), "end_time": iso(10)},
        headers=headers["user"],
    )
    assert r.status_code == 409


def test_user_cannot_update_others_403(app_client, headers):
    mgr_emp = app_client.ids["mgr_emp"]
    bid = make(app_client, headers["manager"], mgr_emp, 14, 15, "Менеджерская")
    r = app_client.patch(
        f"/api/bookings/{bid}",
        json={"employee_id": mgr_emp, "topic": "Взлом", "start_time": iso(14), "end_time": iso(15)},
        headers=headers["user"],
    )
    assert r.status_code == 403


def test_delete_own_booking_200(app_client, headers):
    emp = app_client.ids["usr_emp"]
    bid = make(app_client, headers["user"], emp, 9, 10)
    r = app_client.delete(f"/api/bookings/{bid}", headers=headers["user"])
    assert r.status_code == 200
    # после удаления список за день пуст
    r2 = app_client.get("/api/bookings", params={"book_date": "2026-06-08"}, headers=headers["user"])
    assert r2.status_code == 200
    assert r2.json() == []
