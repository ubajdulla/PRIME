import { Eye, EyeOff } from "lucide-react";

const HIDDEN_MASK = "----------";

// Fixed-height contact/info row (56px) shared between the player's own
// Profile page and the admin player view - identical edit affordance
// everywhere, so a field never resizes when it flips into edit mode: the
// input uses a bottom box-shadow instead of a border, which doesn't add to
// the box height the way a real border would.
export function ContactRow({
  editing, href, external, icon, iconBg, label, displayValue, editValue, prefix, onChange,
  showToOthers, onToggleShowToOthers,
}: {
  editing: boolean;
  href?: string;
  external?: boolean;
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  displayValue: string;
  editValue: string;
  prefix?: string;
  onChange: (v: string) => void;
  showToOthers?: boolean;
  onToggleShowToOthers?: () => void;
}) {
  const isHidden = showToOthers === false;
  const shownValue = isHidden ? HIDDEN_MASK : (displayValue || "—");
  return (
    <div className="relative flex items-center gap-3 px-4 h-[56px] shrink-0 before:absolute before:top-0 before:left-4 before:right-4 before:h-px before:bg-white/[0.06] first:before:hidden">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-[#aaa] mb-0.5 h-[13px]">{label}</div>
        <div className="grid h-5">
          <div
            className={`col-start-1 row-start-1 flex items-center gap-0.5 transition-all duration-200 ease-out ${
              editing ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1 pointer-events-none"
            }`}
          >
            {prefix && <span className="text-[#aaa] text-sm shrink-0">{prefix}</span>}
            <input
              value={editValue}
              onChange={e => onChange(e.target.value)}
              onClick={e => e.preventDefault()}
              tabIndex={editing ? 0 : -1}
              className="flex-1 bg-transparent text-white text-sm leading-5 focus:outline-none shadow-[0_1px_0_0_rgba(255,255,255,0.15)] focus:shadow-[0_1px_0_0_#462ed1] transition-shadow min-w-0"
            />
          </div>
          <div
            className={`col-start-1 row-start-1 flex items-center transition-all duration-200 ease-out ${
              editing ? "opacity-0 translate-y-1 pointer-events-none" : "opacity-100 translate-y-0"
            }`}
          >
            {href && !isHidden ? (
              <a href={href} tabIndex={editing ? -1 : 0} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="text-sm leading-5 truncate block text-white">
                {shownValue}
              </a>
            ) : (
              <div className={`text-sm leading-5 truncate ${isHidden ? "text-white/40" : "text-white"}`}>{shownValue}</div>
            )}
          </div>
        </div>
      </div>
      {showToOthers !== undefined && onToggleShowToOthers && (
        <button
          onClick={onToggleShowToOthers}
          disabled={editing}
          className={`text-[#79828b] hover:text-white transition-all duration-200 ease-out shrink-0 ${editing ? "opacity-0 pointer-events-none" : ""}`}
        >
          {showToOthers ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
      )}
    </div>
  );
}
