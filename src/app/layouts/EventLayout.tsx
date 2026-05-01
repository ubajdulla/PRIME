import { Outlet } from "react-router";

export function EventLayout() {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-white font-sans overflow-x-hidden">
      <Outlet />
    </div>
  );
}