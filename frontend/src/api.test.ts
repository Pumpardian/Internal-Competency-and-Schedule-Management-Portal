import { describe, it, expect, beforeEach } from "vitest";
import { currentUser, setToken, clearToken } from "./api";

/** Собирает «JWT»: header.payload.signature, где payload — base64 от JSON. */
function makeToken(payload: object): string {
  return `header.${btoa(JSON.stringify(payload))}.signature`;
}

describe("currentUser", () => {
  beforeEach(() => clearToken());

  it("возвращает null, когда токена нет", () => {
    expect(currentUser()).toBeNull();
  });

  it("достаёт id и логин из payload токена", () => {
    setToken(makeToken({ id: 7, user: "ivanov1", exp: 9999999999 }));
    expect(currentUser()).toEqual({ id: 7, username: "ivanov1" });
  });

  it("возвращает null при некорректном токене", () => {
    setToken("не-jwt");
    expect(currentUser()).toBeNull();
  });

  it("возвращает null, если в payload нет нужных полей", () => {
    setToken(makeToken({ foo: "bar" }));
    expect(currentUser()).toBeNull();
  });
});
