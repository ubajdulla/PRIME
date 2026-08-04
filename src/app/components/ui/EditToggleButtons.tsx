import type { ReactNode } from "react";
import { useLang } from "../../i18n";

// Crossfades between the "idle" trigger (a pencil button, a kebab menu -
// whatever the caller uses to enter edit mode) and the Cancel/Save pair
// instead of swapping instantly - both stay mounted, stacked in the same
// grid cell (so the row doesn't jump width) and faded via opacity only.
// Deliberately no transform/translate here: it creates a stacking context
// that traps the idle slot's popovers (the kebab dropdown) inside it,
// so they can't paint above later siblings on the page - opacity-only
// keeps the fade without that side effect.
export function EditToggleButtons({
  editing, idle, onCancel, onSave, saving, cancelLabel, saveLabel,
}: {
  editing: boolean;
  idle: ReactNode;
  onCancel: () => void;
  onSave: () => void;
  saving?: boolean;
  cancelLabel?: string;
  saveLabel?: string;
}) {
  const { t } = useLang();
  const resolvedCancelLabel = cancelLabel ?? t.common.cancel;
  const resolvedSaveLabel = saveLabel ?? t.common.save;
  return (
    <div className="grid items-center justify-items-end">
      <div
        className={`col-start-1 row-start-1 flex items-center gap-3 transition-opacity duration-200 ease-out ${
          editing ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <button
          type="button"
          onClick={onCancel}
          tabIndex={editing ? 0 : -1}
          className="text-sm text-[#aaa] font-medium active:opacity-60 transition-opacity"
        >
          {resolvedCancelLabel}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          tabIndex={editing ? 0 : -1}
          className="text-sm text-[var(--brand)] font-medium active:opacity-70 transition-opacity disabled:opacity-50"
        >
          {saving ? "…" : resolvedSaveLabel}
        </button>
      </div>
      <div
        className={`col-start-1 row-start-1 transition-opacity duration-200 ease-out ${
          editing ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        {idle}
      </div>
    </div>
  );
}
