import { useState, useCallback, useEffect, useRef, type InputHTMLAttributes } from "react";
import { clampNumber } from "@/lib/validation";

/**
 * NumberInput — 数字输入框组件
 *
 * 使用本地 state 编辑，仅在 blur 或 Enter 键时将值提交到外部。
 * 提交时自动 clamp 到 [min, max] 范围内。
 */
interface NumberInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: number;
  onChange: (value: number) => void;
}

export function NumberInput({ value, onChange, min, max, className, ...rest }: NumberInputProps) {
  const [localValue, setLocalValue] = useState(String(value));
  const committedRef = useRef(value);

  // 当外部 value 变化时（如撤销、其他来源更新），同步到 local
  useEffect(() => {
    if (value !== committedRef.current) {
      committedRef.current = value;
      setLocalValue(String(value));
    }
  }, [value]);

  const commit = useCallback(() => {
    const parsed = parseFloat(localValue);
    if (isNaN(parsed)) {
      // 恢复为合法值
      setLocalValue(String(committedRef.current));
      return;
    }
    const lo = min != null ? Number(min) : -Infinity;
    const hi = max != null ? Number(max) : Infinity;
    const clamped = clampNumber(parsed, lo, hi);
    if (clamped !== committedRef.current) {
      committedRef.current = clamped;
      onChange(clamped);
    }
    // Normalize display
    setLocalValue(String(clamped));
  }, [localValue, onChange, min, max]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        (e.target as HTMLInputElement).blur();
      }
    },
    [],
  );

  // Single-step increment/decrement — no auto-repeat
  const stepOnce = useCallback(
    (dir: 1 | -1) => {
      const lo = min != null ? Number(min) : -Infinity;
      const hi = max != null ? Number(max) : Infinity;
      const current = parseFloat(localValue) || 0;
      const clamped = clampNumber(current + dir, lo, hi);
      setLocalValue(String(clamped));
      committedRef.current = clamped;
      onChange(clamped);
    },
    [localValue, onChange, min, max],
  );

  return (
    <div className="relative flex items-center">
      <input
        type="number"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        min={min}
        max={max}
        className={className + " pr-6"}
        {...rest}
      />
      <div className="absolute right-0.5 top-0 bottom-0 flex flex-col items-center justify-center">
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => { e.preventDefault(); stepOnce(1); }}
          className="flex h-3 w-4 items-center justify-center text-[9px] text-slate-400 hover:text-slate-200"
        >
          ▲
        </button>
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => { e.preventDefault(); stepOnce(-1); }}
          className="flex h-3 w-4 items-center justify-center text-[9px] text-slate-400 hover:text-slate-200"
        >
          ▼
        </button>
      </div>
    </div>
  );
}