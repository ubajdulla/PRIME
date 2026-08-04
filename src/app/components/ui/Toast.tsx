import { useEffect } from "react";
import { Check, Copy, Send, AlertTriangle } from "lucide-react";

type ToastVariant = "success" | "copied" | "publish" | "error";

interface ToastProps {
  message: string;
  visible: boolean;
  variant?: ToastVariant;
  onHide?: () => void;
}

export function Toast({ message, visible, variant = "success", onHide }: ToastProps) {
  useEffect(() => {
    if (visible && onHide) {
      const t = setTimeout(onHide, 2500);
      return () => clearTimeout(t);
    }
  }, [visible, onHide]);

  if (!visible) return null;

  const iconMap: Record<ToastVariant, React.ReactNode> = {
    success: <Check size={12} strokeWidth={3} />,
    copied:  <Copy size={12} strokeWidth={3} />,
    publish: <Send size={12} strokeWidth={3} />,
    error:   <AlertTriangle size={12} strokeWidth={3} />,
  };

  const colorMap: Record<ToastVariant, string> = {
    success: "text-[#4dcd5e]",
    copied:  "text-[var(--brand)]",
    publish: "text-[var(--brand)]",
    error:   "text-[#ef4444]",
  };

  return (
    <div className="fixed bottom-24 sm:bottom-6 z-[60] pointer-events-none flex justify-end px-4 inset-x-0">
      <div className="bg-[var(--surface-0)]/95 border border-[var(--ink)]/5 rounded-full px-[10px] py-[3px] shadow-[0_4px_10px_rgba(0,0,0,0.25)] flex items-center gap-1.5 max-w-[180px]">
        <span className={`shrink-0 flex ${colorMap[variant]}`}>{iconMap[variant]}</span>
        <span className="text-[var(--ink)]/90 text-[11px] font-medium leading-tight whitespace-nowrap overflow-hidden text-ellipsis">{message}</span>
      </div>
    </div>
  );
}
