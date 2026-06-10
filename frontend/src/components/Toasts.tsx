/**
 * Контейнер всплывающих уведомлений (toast).
 * Отрисовывает очередь уведомлений из хука useToasts в правом верхнем углу.
 */
import type { Toast } from "../types";

interface ToastsProps {
  /** Очередь уведомлений для отображения. */
  toasts: Toast[];
}

/** Список уведомлений; ошибки выделяются классом-модификатором. */
export function Toasts({ toasts }: ToastsProps) {
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={"toast" + (t.type === "error" ? " error" : "")}>
          <div className={"t-title" + (t.type === "error" ? " error" : "")}>{t.title}</div>
          <div className="t-msg">{t.msg}</div>
        </div>
      ))}
    </div>
  );
}
