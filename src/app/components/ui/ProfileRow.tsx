import { User, CheckCircle2 } from "lucide-react";
import { VerifiedBadge } from "./VerifiedBadge";
import { TrustDot } from "./TrustDot";
import { useWaterRipple, RippleLayer } from "./useWaterRipple";

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
  // When true, only the avatar + name navigate to the profile - `trailing`
  // stays inert. Needed anywhere `trailing` holds its own interactive
  // button: making the whole row a <button> would nest a <button> inside a
  // <button>, which browsers handle inconsistently (the outer row swallows
  // the inner button's click).
  avatarOnly?: boolean;
  variant?: "card" | "row";
  divider?: boolean;
  className?: string;
  // Identifies this row for useTouchHoverList - set together with
  // `touchHovered` so a finger dragging down the list highlights whichever
  // row it's currently crossing, the touch equivalent of :hover.
  rowId?: string;
  touchHovered?: boolean;
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
  avatarOnly = false,
  variant = "row",
  divider = false,
  className = "",
  rowId,
  touchHovered = false,
}: ProfileRowProps) {
  const clickable = !!onClick;
  const rowClickable = clickable && !avatarOnly;
  const Tag = rowClickable ? "button" : "div";
  const shellClass = variant === "card" ? "bg-[var(--surface-1)] rounded-xl p-2.5" : "p-2.5";
  // The background-hover cue stays even in avatarOnly mode (nice on the
  // card variant), just without `cursor-pointer` - the row itself no longer
  // performs a click action, only the avatar+name button nested inside it
  // does. touchHovered (useTouchHoverList) drives the same background while
  // a finger drags down the list - :hover never fires on touch, and press
  // feedback (the ripple below) is a separate, one-shot thing on tap/release.
  const hoverClass = clickable ? `hover:bg-[var(--surface-hover)] ${rowClickable ? "cursor-pointer" : ""} ${variant === "card" ? "rounded-xl" : ""}` : "";
  const touchHoverClass = touchHovered ? "bg-[var(--surface-hover)]" : "";
  const dividerClass = divider ? "relative before:absolute before:top-0 before:left-2.5 before:right-2.5 before:h-px before:bg-[var(--ink)]/[0.06] first:before:hidden" : "";
  // Shared between the two mutually-exclusive clickable branches below (row
  // button vs. nested avatar+name button) - only one ever renders per row.
  const ripple = useWaterRipple();

  const avatarInner = (
    <>
      {avatar ? (
        <img src={avatar} alt={avatarAlt} className="w-full h-full rounded-full object-cover border border-[var(--ink)]/10" />
      ) : (
        <div className="w-full h-full rounded-full bg-[var(--ink)]/5 border border-[var(--ink)]/10 flex items-center justify-center">
          <User size={Math.round(avatarSize * 0.4)} className="text-[var(--ink)]/30" />
        </div>
      )}
      {checkmark && (
        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[var(--brand)] rounded-full flex items-center justify-center border-2 border-[var(--surface-1)]">
          <CheckCircle2 size={10} className="text-white" strokeWidth={3} />
        </div>
      )}
      {verified !== undefined && <VerifiedBadge verified={verified} size={13} ringClassName="border-[var(--surface-1)]" />}
      {trustLabel !== undefined && <TrustDot label={trustLabel} size={10} ringClassName="border-[var(--surface-1)]" />}
    </>
  );

  const nameBlock = (
    <div className="flex-1 min-w-0">
      {eyebrow && <div className="text-[10px] font-bold text-[#79828b] uppercase tracking-widest leading-tight">{eyebrow}</div>}
      {primary}
      {secondary}
    </div>
  );

  return (
    <Tag
      {...(rowClickable ? { type: "button" as const, onClick, onPointerDown: ripple.onPointerDown } : {})}
      {...(rowId ? { "data-touch-hover-id": rowId } : {})}
      className={`relative overflow-hidden flex items-center gap-3 w-full text-left transition-colors focus:outline-none ${shellClass} ${hoverClass} ${touchHoverClass} ${dividerClass} ${className}`}
    >
      {avatarOnly && clickable ? (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onClick(); }}
          onPointerDown={ripple.onPointerDown}
          className="relative overflow-hidden flex items-center gap-3 flex-1 min-w-0 text-left rounded-xl transition-colors hover:bg-[var(--surface-hover)]"
        >
          <div className="relative shrink-0" style={{ width: avatarSize, height: avatarSize }}>
            {avatarInner}
          </div>
          {nameBlock}
          <RippleLayer ripples={ripple.ripples} />
        </button>
      ) : (
        <>
          <div className="relative shrink-0" style={{ width: avatarSize, height: avatarSize }}>
            {avatarInner}
          </div>
          {nameBlock}
        </>
      )}
      {trailing}
      {rowClickable && <RippleLayer ripples={ripple.ripples} />}
    </Tag>
  );
}
