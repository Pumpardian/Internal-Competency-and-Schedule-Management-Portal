import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RoomPage } from "../components/RoomPage";
import {
  fetchBookings, createBooking, deleteBooking,
  currentUser, getProfile, getRole, fetchRolePermissions,
} from "../api";
import type { Booking, Employee } from "../types";

vi.mock("../api", () => ({
  fetchBookings: vi.fn(), createBooking: vi.fn(), deleteBooking: vi.fn(),
  currentUser: vi.fn(), getProfile: vi.fn(), getRole: vi.fn(), fetchRolePermissions: vi.fn(),
}));
const mFetch = vi.mocked(fetchBookings);
const mMe = vi.mocked(currentUser);
const mProfile = vi.mocked(getProfile);
const mRole = vi.mocked(getRole);
const mPerms = vi.mocked(fetchRolePermissions);

const ivanov: Employee = { id: 1, name: "Иванов Иван", firstName: "Иван", lastName: "Иванов", position: "" };
const booking: Booking = { id: 1, topic: "Планёрка", empId: 1, startH: 9, startM: 0, endH: 10, endM: 0 };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createBooking).mockResolvedValue(booking);
  vi.mocked(deleteBooking).mockResolvedValue();
  mMe.mockReturnValue({ id: 1, username: "ivanov" });
  mProfile.mockResolvedValue(ivanov);
  mRole.mockResolvedValue({ id: 1, name: "user" });
  mPerms.mockResolvedValue([]);
});

describe("RoomPage", () => {
  it("рисует сетку часов и брони дня", async () => {
    mFetch.mockResolvedValue([booking]);
    render(<RoomPage employees={[ivanov]} push={vi.fn()} />);
    expect(await screen.findByText("Планёрка")).toBeTruthy();
    expect(screen.getByText("09:00")).toBeTruthy();
    expect(screen.getByText("17:00")).toBeTruthy();
  });

  it("клик по свободному слоту открывает окно создания брони", async () => {
    mFetch.mockResolvedValue([booking]);
    const { container } = render(<RoomPage employees={[ivanov]} push={vi.fn()} />);
    // Ждём загрузку прав/профиля: появляется крестик отмены своей брони.
    await waitFor(() => expect(container.querySelector(".ev-del")).toBeTruthy());
    fireEvent.click(container.querySelectorAll(".cal-track")[2]);
    expect(await screen.findByText(/Новая бронь/)).toBeTruthy();
  });

  it("показывает ошибку загрузки броней", async () => {
    mFetch.mockRejectedValue(new Error("Сервер недоступен"));
    render(<RoomPage employees={[ivanov]} push={vi.fn()} />);
    expect(await screen.findByText(/Не удалось загрузить брони/)).toBeTruthy();
  });
});
