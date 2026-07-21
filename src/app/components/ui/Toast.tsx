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
    success: <Check size={16} />,
    copied:  <Copy size={16} />,
    publish: <Send size={16} />,
    error:   <AlertTriangle size={16} />,
  };

  const colorMap: Record<ToastVariant, string> = {
    success: "bg-[#4dcd5e]/15 text-[#4dcd5e]",
    copied:  "bg-[#3390ec]/15 text-[#3390ec]",
    publish: "bg-[#3390ec]/15 text-[#3390ec]",
    error:   "bg-[#ef4444]/15 text-[#ef4444]",
  };

  return (
    <div className="fixed bottom-24 sm:bottom-6 z-[60] pointer-events-none flex justify-end px-4 inset-x-0">
      <div className="bg-[#1c2b3a] border border-white/15 rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-2.5 max-w-[220px]">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${colorMap[variant]}`}>
          {iconMap[variant]}
        </div>
        <span className="text-white font-bold text-sm leading-snug">{message}</span>
      </div>
    </div>
  );
}
