import { Outlet, Navigate, NavLink, useLocation } from "react-router";
import { CalendarDays, Users } from "lucide-react";
import { navDir } from "../lib/navDir";
import { useAuth } from "../lib/AuthContext";

export function AdminLayout() {
  const { pathname } = useLocation();
  const { isAdmin, loading } = useAuth();
  const segments = pathname.replace(/^\/admin\/?/, "").split("/").filter(Boolean);
  const isSubPage = segments.length >= 2;

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="bg-[#0e1621]">
      {!isSubPage && (
        <div className="sticky top-0 z-10 bg-[#0e1621] border-b border-white/5 px-4">
          <div className="max-w-[700px] mx-auto flex">
            <AdminTab to="/admin/events" label="Events" icon={<CalendarDays size={15} />} />
            <AdminTab to="/admin/players" label="Players" icon={<Users size={15} />} />
          </div>
        </div>
      )}
      <Outlet />
    </div>
  );
}

// Admin sub-navbar tab — navDir.none() so switching tabs has no slide animation
function AdminTab({ to, label, icon }: { to: string; label: string; icon: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      onClick={() => navDir.none()}
      className={({ isActive }) =>
        `flex items-center gap-2 px-1 py-3 mr-6 text-sm font-bold border-b-2 transition-colors ${
          isActive
            ? "border-white/70 text-white"
            : "border-transparent text-[#79828b] hover:text-white"
        }`
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}
