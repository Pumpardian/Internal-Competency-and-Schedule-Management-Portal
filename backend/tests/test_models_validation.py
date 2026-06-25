"""Юнит-тесты валидаторов Pydantic-моделей (без БД и приложения)."""
from datetime import datetime

import pytest
from pydantic import ValidationError

from routers.user import RegisterRequest, UserProfileUpdateRequest
from routers.bookings import BookingCreateOrUpdate


class TestPasswordComplexity:
    def test_valid_password_passes(self):
        RegisterRequest(username="ivanov", password="Passw0rd!")

    @pytest.mark.parametrize("bad", [
        "passw0rd!",   # нет заглавной
        "PASSW0RD!",   # нет строчной
        "Password!",   # нет цифры
        "Password1",   # нет спецсимвола
        "Pw0rd!",      # короче 8
    ])
    def test_weak_password_rejected(self, bad):
        with pytest.raises(ValidationError):
            RegisterRequest(username="ivanov", password=bad)

    def test_profile_new_password_optional_but_validated(self):
        # Без нового пароля — ок (меняются только данные/подтверждение).
        UserProfileUpdateRequest(password="current")
        # Слабый новый пароль — ошибка.
        with pytest.raises(ValidationError):
            UserProfileUpdateRequest(password="current", new_password="weak")
        # Сильный новый пароль — ок.
        UserProfileUpdateRequest(password="current", new_password="NewPass1!")


class TestBookingValidation:
    def test_end_after_start_required(self):
        with pytest.raises(ValidationError):
            BookingCreateOrUpdate(
                employee_id=1, topic="Встреча",
                start_time=datetime(2026, 6, 8, 10), end_time=datetime(2026, 6, 8, 9),
            )

    def test_valid_booking(self):
        b = BookingCreateOrUpdate(
            employee_id=1, topic="Встреча",
            start_time=datetime(2026, 6, 8, 9), end_time=datetime(2026, 6, 8, 10),
        )
        assert b.topic == "Встреча"

    def test_employee_id_must_be_positive(self):
        with pytest.raises(ValidationError):
            BookingCreateOrUpdate(
                employee_id=0, topic="Встреча",
                start_time=datetime(2026, 6, 8, 9), end_time=datetime(2026, 6, 8, 10),
            )

    def test_topic_required_nonempty(self):
        with pytest.raises(ValidationError):
            BookingCreateOrUpdate(
                employee_id=1, topic="",
                start_time=datetime(2026, 6, 8, 9), end_time=datetime(2026, 6, 8, 10),
            )
