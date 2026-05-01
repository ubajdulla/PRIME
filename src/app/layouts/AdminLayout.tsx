import { Outlet, NavLink } from "react-router";
import { CalendarDays, Users } from "lucide-react";

export function AdminLayout() {
  return (
    <div className="min-h-screen bg-[#0e1621] flex flex-col">
      <div className="bg-[#17212b] border-b border-[#101923] px-4 sticky top-0 z-10">
        <div className="max-w-[900px] mx-auto">
          <div className="flex items-center gap-2 pt-4 pb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ccff00]" />
            <span className="text-[#ccff00] font-black uppercase tracking-widest text-[10px]">Admin Panel</span>
          </div>
          <div className="flex gap-1">
            <AdminTab to="/admin/events" label="Events" icon={<CalendarDays size={14} />} />
            <AdminTab to="/admin/players" label="Players" icon={<Users size={14} />} />
          </div>
        </div>
      </div>
      <div className="flex-1">
        <Outlet />
      </div>
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
