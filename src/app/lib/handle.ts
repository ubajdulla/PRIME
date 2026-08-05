// Normalizes a stored telegram/instagram handle for display/linking. The
// stored value may or may not already include a leading "@" depending on
// where it was entered, so every read path funnels through here instead of
// prepending/stripping "@" ad hoc (which is how "@@handle" bugs happened).
export function stripHandle(value: string | null | undefined): string {
  return (value ?? "").replace(/^@+/, "").trim();
}

export function displayHandle(value: string | null | undefined): string {
  const stripped = stripHandle(value);
  return stripped ? `@${stripped}` : "";
}
