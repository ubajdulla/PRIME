import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { DropdownPanel } from "./DropdownMenu";
import { useExclusiveOpen } from "../../lib/exclusiveOpen";
import { useCoarsePointer } from "../../lib/useCoarsePointer";

type Option<T extends string> = T | { value: T; label: string; icon?: ReactNode };

const DEFAULT_TRIGGER = "flex items-center justify-between gap-2 w-full h-12 bg-[var(--surface-1)] border border-[var(--ink)]/10 rounded-xl px-3 text-[var(--ink)] text-sm font-bold transition-colors focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed";

export function SelectField<T extends string>({
  value,
  options,
  onChange,
  disabled,
  triggerClassName = DEFAULT_TRIGGER,
  panelClassName = "absolute left-0 right-0 top-full mt-1.5 z-30",
  panelWidthClassName = "",
  // Plain option lists (no icons) can hand off to the OS's own picker on
  // touch devices instead of our custom dropdown - native wheel/list UI on
  // iOS and Android, no custom open/close/scroll logic to fight with. Kept
  // opt-in rather than automatic so callers with icon options (which a
  // native <option> can't render) or that need the custom look everywhere
  // stay unaffected.
  nativeOnMobile = false,
}: {
  value: T;
  options: readonly Option<T>[];
  onChange: (v: T) => void;
  disabled?: boolean;
  triggerClassName?: string;
  panelClassName?: string;
  panelWidthClassName?: string;
  nativeOnMobile?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const coarse = useCoarsePointer();
  useExclusiveOpen(open, () => setOpen(false), t => ref.current?.contains(t) ?? false);

  useEffect(() => {
    if (!open) return;
    function close(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const opts = options.map(o => (typeof o === "string" ? { value: o, label: o as string, icon: undefined as ReactNode } : o));
  const current = opts.find(o => o.value === value);

  if (nativeOnMobile && coarse) {
    return (
      <div className="relative">
        <select
          value={value}
          disabled={disabled}
          onChange={e => onChange(e.target.value as T)}
          className={`${triggerClassName} appearance-none pr-8`}
        >
          {opts.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 shrink-0 text-[#79828b]" />
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        className={triggerClassName}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          {current?.icon}
          <span className="truncate">{current?.label ?? value}</span>
        </span>
        <ChevronDown size={14} className={`shrink-0 text-[#79828b] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className={`${panelClassName} ${panelWidthClassName}`}>
          <DropdownPanel scrollable>
            {opts.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={`flex items-center gap-2 w-full px-4 py-2.5 text-sm font-semibold text-left transition-colors focus:outline-none ${
                  o.value === value ? "bg-[var(--brand)]/20 text-[var(--ink)]" : "text-[var(--ink)]/80 hover:bg-[var(--surface-active)]"
                }`}
              >
                {o.icon}
                {o.label}
              </button>
            ))}
          </DropdownPanel>
        </div>
      )}
    </div>
  );
}
