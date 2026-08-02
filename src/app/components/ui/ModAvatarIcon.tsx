import { User } from "lucide-react";
import type { ReactNode } from "react";

// Player's own avatar, desaturated, with a moderation-action icon washed
// fully over it (not a small corner badge) - reads as "this is what's
// happening to this player", not a generic warning glyph. Used both in the
// admin's Suspend/Ban confirm modals and on the player's own profile page
// while a suspension/ban is active, so the two always read as the same thing.
export function ModAvatarIcon({ avatar, tint, icon }: { avatar: string | null; tint: string; icon: ReactNode }) {
  return (
    <div className="w-full h-full rounded-full overflow-hidden relative bg-[#2a2a2a]">
      {avatar ? (
        <img src={avatar} alt="" className="w-full h-full object-cover grayscale" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <User size={16} className="text-white/20" />
        </div>
      )}
      <div className={`absolute inset-0 flex items-center justify-center ${tint}`}>
        {icon}
      </div>
    </div>
  );
}
