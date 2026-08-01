import { User, CheckCircle2 } from "lucide-react";
import { VerifiedBadge } from "./VerifiedBadge";
import { TrustDot } from "./TrustDot";

// Shared clickable player/profile row — same component for the roster list
// and for the moderator/organizer card, so hover + click-through behave the
// same everywhere a profile is shown as a row instead of being reimplemented
// per page. `variant="card"` adds the standalone bg/border box (moderator
// card); `variant="row"` stays flush for use inside a divide-y list (roster).
interface ProfileRowProps {
  avatar: string | null;
  avatarAlt: string;
  avatarSize?: number;
  eyebrow?: string;
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  trailing?: React.ReactNode;
  checkmark?: boolean;
  verified?: boolean;
  trustLabel?: string | null;
  onClick?: () => void;
  variant?: "card" | "row";
  className?: string;
}

export function ProfileRow({
  avatar,
  avatarAlt,
  avatarSize = 40,
  eyebrow,
  primary,
  secondary,
  trailing,
  checkmark = false,
  verified,
  trustLabel,
  onClick,
  variant = "row",
  className = "",
}: ProfileRowProps) {
  const clickable = !!onClick;
  const Tag = clickable ? "button" : "div";
  const shellClass = variant === "card" ? "bg-[#212121] border border-white/5 rounded-xl p-2.5" : "p-2.5";
  const hoverClass = clickable ? `cursor-pointer hover:bg-white/[0.07] ${variant === "card" ? "rounded-xl" : ""}` : "";

  return (
    <Tag
      {...(clickable ? { type: "button" as const, onClick } : {})}
      className={`flex items-center gap-3 w-full text-left transition-colors focus:outline-none ${shellClass} ${hoverClass} ${className}`}
    >
      <div className="relative shrink-0" style={{ width: avatarSize, height: avatarSize }}>
        {avatar ? (
          <img src={avatar} alt={avatarAlt} className="w-full h-full rounded-full object-cover border border-white/10" />
        ) : (
          <div className="w-full h-full rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
            <User size={Math.round(avatarSize * 0.4)} className="text-white/30" />
          </div>
        )}
        {checkmark && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#462ed1] rounded-full flex items-center justify-center border-2 border-[#212121]">
            <CheckCircle2 size={10} className="text-white" strokeWidth={3} />
          </div>
        )}
        {verified !== undefined && <VerifiedBadge verified={verified} size={13} ringClassName="border-[#212121]" />}
        {trustLabel !== undefined && <TrustDot label={trustLabel} size={10} ringClassName="border-[#212121]" />}
      </div>
      <div className="flex-1 min-w-0">
        {eyebrow && <div className="text-[10px] font-bold text-[#79828b] uppercase tracking-widest leading-tight">{eyebrow}</div>}
        {primary}
        {secondary}
      </div>
      {trailing}
    </Tag>
  );
}
