import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router";
import { navDir } from "../../lib/navDir";

interface BackBarProps {
  /** Text shown next to the arrow */
  label: string;
  /** Explicit path to navigate to. Omit to go back in history (-1). */
  to?: string;
  /** Optional centered title */
  title?: string;
  /** Optional right-side content (share button, save button, actions, etc.) */
  children?: React.ReactNode;
  /** z-index override — default z-10 */
  zIndex?: string;
}

export function BackBar({ label, to, title, children, zIndex = "z-20" }: BackBarProps) {
  const navigate = useNavigate();

  return (
    <div className={`sticky top-0 ${zIndex} flex items-center justify-between px-4 py-3 bg-[#181818] border-b border-white/5`}>
      <button
        onClick={() => { navDir.back(); to ? navigate(to, { replace: true }) : navigate(-1); }}
        className="flex items-center gap-1.5 text-[#79828b] hover:text-white transition-colors text-sm font-bold"
      >
        <ChevronLeft size={18} />
        {label}
      </button>

      {title && (
        <span className="absolute left-1/2 -translate-x-1/2 font-black text-white text-base tracking-tight pointer-events-none">
          {title}
        </span>
      )}

      <div className="flex items-center gap-2">
        {children}
      </div>
    </div>
  );
}
