import { Outlet } from "react-router";

export function EventLayout() {
  return (
    <div className="min-h-screen bg-[var(--surface-0)] text-[var(--ink)] font-sans overflow-x-hidden">
      <Outlet />
    </div>
  );
}