import { Calendar } from "lucide-react";
import { BirthDateField } from "./BirthDateField";
import { useLang } from "../../i18n";

function formatDate(d: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function calcAge(birthDate: string): number | null {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// Same 56px row shape as ContactRow, shared between the player's own Profile
// page and the admin player view so both show identical fields - Date of
// Birth needs a calendar picker instead of a plain text input, so it can't
// reuse ContactRow itself.
export function DateOfBirthRow({
  editing, value, draftValue, onChange,
}: {
  editing: boolean;
  value: string | null;
  draftValue: string;
  onChange: (v: string) => void;
}) {
  const { t } = useLang();
  return (
    <div className="relative flex items-center gap-3 px-4 h-[56px] shrink-0 before:absolute before:top-0 before:left-4 before:right-4 before:h-px before:bg-white/[0.06] first:before:hidden">
      <div className="w-8 h-8 rounded-full bg-[#462ed1]/15 flex items-center justify-center shrink-0">
        <Calendar size={15} className="text-[#462ed1]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-[#aaa] mb-0.5 h-[13px]">{t.signin.birthDateLabel}</div>
        <div className="grid h-5">
          <div
            className={`col-start-1 row-start-1 flex items-center transition-opacity duration-200 ease-out ${
              editing ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <BirthDateField
              value={draftValue}
              onChange={onChange}
              placeholder={t.signin.birthDatePlaceholder}
              inline
            />
          </div>
          <div
            className={`col-start-1 row-start-1 flex items-center transition-opacity duration-200 ease-out ${
              editing ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}
          >
            {value ? (
              <div className="text-sm text-white leading-5 truncate">
                {formatDate(value)}
                <span className="text-[#79828b] ml-1.5">· {calcAge(value)}</span>
              </div>
            ) : (
              <div className="text-sm text-[#79828b] leading-5">—</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
