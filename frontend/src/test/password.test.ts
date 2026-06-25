import { describe, it, expect } from "vitest";
import { passwordChecks, isPasswordStrong } from "../password";

describe("passwordChecks / isPasswordStrong", () => {
  it("слабый пароль не проходит и видны невыполненные критерии", () => {
    expect(isPasswordStrong("pass")).toBe(false);
    expect(passwordChecks("pass")).toEqual({
      length: false, upper: false, lower: true, digit: false, special: false,
    });
  });

  it("сильный пароль проходит все правила", () => {
    expect(isPasswordStrong("Passw0rd!")).toBe(true);
    expect(passwordChecks("Passw0rd!")).toEqual({
      length: true, upper: true, lower: true, digit: true, special: true,
    });
  });

  it("проверяет отдельные критерии", () => {
    expect(passwordChecks("ABCDEFGH").upper).toBe(true);
    expect(passwordChecks("ABCDEFGH").lower).toBe(false);
    expect(passwordChecks("abcd1234").digit).toBe(true);
    expect(passwordChecks("Aa1!aaaa").special).toBe(true);
    expect(passwordChecks("Aa1aaaaa").special).toBe(false);
  });
});
