export function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2 rounded-full font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap flex-shrink-0 ${
        active
          ? "bg-[#462ed1] text-white"
          : "bg-transparent text-white/70 hover:bg-white/5 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}
