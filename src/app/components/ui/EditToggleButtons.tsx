import type { ReactNode } from "react";

// Crossfades between the "idle" trigger (a pencil button, a kebab menu -
// whatever the caller uses to enter edit mode) and the Cancel/Save pair
// instead of swapping instantly - both stay mounted, stacked in the same
// grid cell (so the row doesn't jump width) and faded via opacity +
// translate-y, the same idiom already used for the search-cancel button
// in AdminPlayers and the FadeIn wrapper elsewhere in the app.
export function EditToggleButtons({
  editing, idle, onCancel, onSave, saving, cancelLabel = "Cancel", saveLabel = "Save",
}: {
  editing: boolean;
  idle: ReactNode;
  onCancel: () => void;
  onSave: () => void;
  saving?: boolean;
  cancelLabel?: string;
  saveLabel?: string;
}) {
  return (
    <div className="grid items-center">
      <div
        className={`col-start-1 row-start-1 flex items-center gap-3 transition-all duration-200 ease-out ${
          editing ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1 pointer-events-none"
        }`}
      >
        <button
          type="button"
          onClick={onCancel}
          tabIndex={editing ? 0 : -1}
          className="text-sm text-[#aaa] font-medium active:opacity-60 transition-opacity"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          tabIndex={editing ? 0 : -1}
          className="text-sm text-[#462ed1] font-medium active:opacity-70 transition-opacity disabled:opacity-50"
        >
          {saving ? "…" : saveLabel}
        </button>
      </div>
      <div
        className={`col-start-1 row-start-1 transition-all duration-200 ease-out ${
          editing ? "opacity-0 -translate-y-1 pointer-events-none" : "opacity-100 translate-y-0"
        }`}
      >
        {idle}
      </div>
    </div>
  );
}
