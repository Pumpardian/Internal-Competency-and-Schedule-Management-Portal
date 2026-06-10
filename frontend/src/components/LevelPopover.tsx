/**
 * Поповер изменения уровня владения навыком.
 *
 * Реализует механизм назначения уровня (0..5) через интерактивный ползунок.
 * Открывается по клику на ячейку матрицы.
 */
import { useState } from "react";
import type { Employee, Skill } from "../types";

interface LevelPopoverProps {
  /** Сотрудник, чей навык редактируется. */
  emp: Employee;
  /** Редактируемый навык. */
  skill: Skill;
  /** Текущий уровень владения (0..5). */
  value: number;
  /** Необязательный колбэк живого предпросмотра при перемещении ползунка. */
  onChange?: (value: number) => void;
  /** Закрытие поповера; передаётся итоговый («подтверждённый») уровень. */
  onClose: (committed: number) => void;
}

/** Маленькая всплывающая панель с ползунком уровня и кнопкой подтверждения. */
export function LevelPopover({ emp, skill, value, onChange, onClose }: LevelPopoverProps) {
  // Локальное состояние ползунка для отображения значения рядом с ним.
  const [v, setV] = useState(value);

  return (
    // stopPropagation: клик внутри поповера не должен закрывать его (как клик по ячейке).
    <div className="popover" onClick={(e) => e.stopPropagation()}>
      <div className="pv-title">
        {emp.name} · {skill.name}
      </div>
      <input
        type="range"
        min="0"
        max="5"
        step="1"
        value={v}
        onChange={(e) => {
          const nv = +e.target.value;
          setV(nv);
          onChange?.(nv); // живой предпросмотр, если задан
        }}
      />
      <div className="pv-row">
        <span className="pv-val">{v}</span>
        <button className="btn small primary" onClick={() => onClose(v)}>
          Готово
        </button>
      </div>
    </div>
  );
}
