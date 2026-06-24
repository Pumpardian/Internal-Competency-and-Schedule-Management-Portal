import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LanguageProvider, useT } from "../i18n";

/** Пробник: показывает перевод ключа и кнопки смены языка. */
function Probe() {
  const { t, lang, setLang } = useT();
  return (
    <div>
      <span data-testid="v">{t("nav.team")}</span>
      <span data-testid="lang">{lang}</span>
      <button onClick={() => setLang("en")}>en</button>
      <button onClick={() => setLang("be")}>be</button>
    </div>
  );
}

beforeEach(() => localStorage.clear());

describe("i18n", () => {
  it("по умолчанию русский, переключается на en и be", () => {
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );
    expect(screen.getByTestId("v").textContent).toBe("Команда и навыки");
    fireEvent.click(screen.getByText("en"));
    expect(screen.getByTestId("v").textContent).toBe("Team & skills");
    fireEvent.click(screen.getByText("be"));
    expect(screen.getByTestId("v").textContent).toBe("Каманда і навыкі");
  });

  it("вне провайдера откатывается на русский", () => {
    render(<Probe />);
    expect(screen.getByTestId("v").textContent).toBe("Команда и навыки");
  });

  it("неизвестный ключ возвращает сам ключ", () => {
    function P() {
      const { t } = useT();
      return <span>{t("no.such.key")}</span>;
    }
    render(<P />);
    expect(screen.getByText("no.such.key")).toBeTruthy();
  });
});
