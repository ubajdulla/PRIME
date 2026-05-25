import { Outlet, NavLink, useLocation } from "react-router";
import { CalendarDays, Users } from "lucide-react";

export function AdminLayout() {
  const { pathname } = useLocation();
  const segments = pathname.replace(/^\/admin\/?/, "").split("/").filter(Boolean);
  const isSubPage = segments.length >= 2;

  return (
    <div className="min-h-screen bg-[#0e1621]">
      {!isSubPage && (
        <div className="border-b border-white/[0.06] px-4">
          <div className="max-w-[900px] mx-auto flex gap-1">
            <AdminTab to="/admin/events" label="Events" icon={<CalendarDays size={14} />} />
            <AdminTab to="/admin/players" label="Players" icon={<Users size={14} />} />
          </div>
        </div>
      )}
      <Outlet />
    </div>
  );
}

function AdminTab({ to, label, icon }: { to: string; label: string; icon: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-black uppercase tracking-widest border-b-2 transition-colors ${
          isActive
            ? "border-[#3390ec] text-[#3390ec]"
            : "border-transparent text-[#79828b] hover:text-white"
        }`
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}
