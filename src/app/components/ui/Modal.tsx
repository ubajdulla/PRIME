import type { CSSProperties, ReactNode, Ref } from "react";

// Shared modal shell — backdrop + centered box. Every popup in the app
// (confirmations, the join modal, publish scheduler) renders through this
// so a style tweak here (radius, border, backdrop) applies everywhere at
// once instead of being copy-pasted per modal. Content-specific layout
// (headers, forms, custom entrance animation) stays with the caller —
// only the overlay/box chrome is shared.
export function ModalOverlay({
  onClose,
  children,
  boxClassName = "p-6",
  boxRef,
  boxStyle,
  overlayClassName = "",
  clipOverflow = true,
  rounded = "rounded-2xl",
}: {
  onClose?: () => void;
  children: ReactNode;
  boxClassName?: string;
  boxRef?: Ref<HTMLDivElement>;
  boxStyle?: CSSProperties;
  overlayClassName?: string;
  // Content that touches the box edges (PublishEventModal's header bar) needs
  // this true so it doesn't poke out past the rounded corners. Anything with
  // a popup that must escape the box (SelectField/DatePickerField dropdowns)
  // needs it false - overflow-hidden clips those instead of just the corners.
  clipOverflow?: boolean;
  // Corner radius override — callers that want a rounder box (e.g. PublishEventModal)
  // pass their own instead of the shared default.
  rounded?: string;
}) {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm ${overlayClassName}`}
      onClick={onClose}
    >
      <div
        ref={boxRef}
        style={boxStyle}
        className={`w-full max-w-sm bg-[#212121] border border-white/10 ${rounded} shadow-2xl ${clipOverflow ? "overflow-hidden" : ""} ${boxClassName}`}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// Same design as the join-event modal in EventDetail: icon+title+sub header
// is optional (plain confirms like "Log out?" just use title). `children`
// is for custom content between the header and the buttons (form fields);
// `body` is for a plain description line. Single-tap confirm, no ripple -
// matches the join modal exactly, not a separate style.
export function ConfirmModal({
  icon,
  iconBg,
  title,
  sub,
  body,
  children,
  cancelLabel,
  onCancel,
  confirmLabel,
  onConfirm,
  confirmCls = "bg-[#462ed1] text-white",
  confirmDisabled,
}: {
  icon?: ReactNode;
  iconBg?: string;
  title: string;
  sub?: string;
  body?: ReactNode;
  children?: ReactNode;
  cancelLabel: string;
  onCancel: () => void;
  confirmLabel: string;
  onConfirm: () => void;
  confirmCls?: string;
  confirmDisabled?: boolean;
}) {
  return (
    <ModalOverlay onClose={onCancel} clipOverflow={false}>
      {icon ? (
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
          <div>
            <h3 className="font-black italic uppercase tracking-widest text-white text-base">{title}</h3>
            {sub && <p className="text-[#79828b] text-xs">{sub}</p>}
          </div>
        </div>
      ) : (
        <h3 className="font-black italic uppercase tracking-widest text-white text-lg mb-1">{title}</h3>
      )}
      {body && <p className={`text-[#79828b] text-sm ${icon ? "mb-5" : "mb-6"}`}>{body}</p>}
      {children && <div className="mb-4">{children}</div>}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-full border border-white/10 text-[#79828b] font-bold text-sm hover:text-white transition-colors"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          disabled={confirmDisabled}
          className={`flex-1 py-2.5 rounded-full font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed ${confirmCls}`}
        >
          {confirmLabel}
        </button>
      </div>
    </ModalOverlay>
  );
}
