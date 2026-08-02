import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { DropdownPanel } from "./DropdownMenu";

type Option<T extends string> = T | { value: T; label: string; icon?: ReactNode };

const DEFAULT_TRIGGER = "flex items-center justify-between gap-2 w-full h-12 bg-[var(--surface-1)] border border-white/10 rounded-xl px-3 text-white text-sm font-bold transition-colors focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed";

export function SelectField<T extends string>({
  value,
  options,
  onChange,
  disabled,
  triggerClassName = DEFAULT_TRIGGER,
  panelClassName = "absolute left-0 right-0 top-full mt-1.5 z-30",
  panelWidthClassName = "",
}: {
  value: T;
  options: readonly Option<T>[];
  onChange: (v: T) => void;
  disabled?: boolean;
  triggerClassName?: string;
  panelClassName?: string;
  panelWidthClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
                  o.value === value ? "bg-[#462ed1]/20 text-white" : "text-white/80 hover:bg-[var(--surface-active)]"
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
