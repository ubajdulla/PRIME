import { Volleyball, Trophy, Dumbbell, Palmtree, PartyPopper, type LucideProps } from "lucide-react";
import { getCategoryIconName } from "../../data/adminData";

const ICONS = {
  volleyball: Volleyball,
  trophy: Trophy,
  dumbbell: Dumbbell,
  palmtree: Palmtree,
  party: PartyPopper,
};

export function CategoryIcon({ category, ...props }: { category: string | null | undefined } & LucideProps) {
  if (!category) return null;
  const Icon = ICONS[getCategoryIconName(category)];
  return <Icon {...props} />;
}
