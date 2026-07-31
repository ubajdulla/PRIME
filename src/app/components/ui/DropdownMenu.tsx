export function DropdownPanel({
  children,
  className = "",
  scrollable = false,
}: {
  children: React.ReactNode;
  className?: string;
  /** Clips to the rounded shape while allowing vertical scroll, instead of hard overflow-hidden. */
  scrollable?: boolean;
}) {
  return (
    <div
      className={`bg-[var(--surface-hover)] rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] ${
        scrollable
          ? "overflow-y-auto max-h-64 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          : "overflow-hidden"
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function DropdownItem({
  icon,
  label,
  onClick,
  variant = "default",
}: {
  icon: React.ReactNode;
  label: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "destructive" | "warning";
}) {
  const color =
    variant === "destructive" ? "text-[#ef4444] hover:bg-[#ef4444]/10" :
    variant === "warning" ? "text-[#eab308] hover:bg-[#eab308]/10" :
    "text-white hover:bg-[var(--surface-active)]";
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full h-11 px-4 text-sm font-semibold text-left transition-colors focus:outline-none ${color}`}
    >
      <span className="shrink-0 flex items-center justify-center [&>svg]:w-[18px] [&>svg]:h-[18px]">{icon}</span>
      {label}
    </button>
  );
}

/** Dropdown row that arms on first tap (sweeps in a solid fill + confirm label/icon) and fires on the second tap. */
export function ConfirmDropdownItem({
  icon,
  label,
  confirmLabel = "Tap to Confirm",
  variant = "default",
  armed,
  onArm,
  onConfirm,
}: {
  icon: React.ReactNode;
  label: React.ReactNode;
  confirmLabel?: React.ReactNode;
  variant?: "default" | "destructive" | "warning";
  armed: boolean;
  onArm: () => void;
  onConfirm: () => void;
}) {
  const fill =
    variant === "destructive" ? "bg-[#ef4444]" :
    variant === "warning" ? "bg-[#eab308]" :
    "bg-white/10";
  const idleColor =
    variant === "destructive" ? "text-[#ef4444]" :
    variant === "warning" ? "text-[#eab308]" :
    "text-white";
  const idleHover =
    variant === "destructive" ? "hover:bg-[#ef4444]/10" :
    variant === "warning" ? "hover:bg-[#eab308]/10" :
    "hover:bg-[var(--surface-active)]";
  const armedColor = variant === "warning" ? "text-black" : "text-white";

  return (
    <button
      onClick={armed ? onConfirm : onArm}
      className={`relative flex items-center justify-between gap-3 w-full h-11 px-4 text-sm font-semibold text-left overflow-hidden focus:outline-none transition-colors ${
        armed ? "" : idleHover
      }`}
    >
      <span
        aria-hidden
        className={`absolute inset-0 ${fill} transition-transform duration-300 ease-out ${armed ? "translate-x-0" : "translate-x-full"}`}
      />
      <span className={`relative z-10 transition-colors duration-200 ${armed ? armedColor : idleColor}`}>
        {armed ? confirmLabel : label}
      </span>
      <span className={`relative z-10 shrink-0 flex items-center justify-center [&>svg]:w-[18px] [&>svg]:h-[18px] transition-transform duration-300 ${
        armed ? `${armedColor} rotate-12` : idleColor
      }`}>
        {icon}
      </span>
    </button>
  );
}
