import { Outlet, NavLink, useNavigate } from "react-router";
import { Calendar, User, Bell, ShieldCheck } from "lucide-react";
import logo from "../../imports/Prime_logo_nobg_white_border.png";
import { useLang, LANG_CYCLE } from "../i18n";

export function MainLayout() {
  const navigate = useNavigate();
  const { lang, t, setLang } = useLang();
  const nextLang = LANG_CYCLE[(LANG_CYCLE.indexOf(lang) + 1) % LANG_CYCLE.length];
  const LANG_LABEL: Record<string, string> = { en: "English", cs: "Čeština", ru: "Русский" };

  function handleLogoClick(e: React.MouseEvent) {
    e.preventDefault();
    navigate("/");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-h-screen bg-[#0e1621] text-white font-sans">

      {/* Desktop Sidebar — fixed overlay, expands on hover */}
      <aside
        className="hidden md:flex flex-col fixed left-0 top-0 h-screen z-50
          w-[72px] hover:w-[240px] overflow-hidden
          bg-[#17212b] border-r border-[#101923] shadow-2xl
          transition-all duration-300 ease-in-out group"
      >
        {/* Logo — no text, links to home + scrolls top */}
        <div className="flex items-center h-[72px] shrink-0 px-3">
          <a href="/" onClick={handleLogoClick} className="flex items-center justify-center w-12 h-12 rounded-xl transition-opacity duration-200 hover:opacity-80">
            <img src={logo} alt="Prime Logo" className="w-9 h-9 object-contain" />
          </a>
        </div>

        {/* Nav items — vertically centered */}
        <nav className="flex flex-col flex-1 justify-center gap-0.5 px-3">
          <NavItem to="/" end icon={<Calendar size={22} />} label={t.nav.events} />
          <NavItem to="/alerts" icon={<Bell size={22} />} label={t.nav.alerts} />
          <NavItem to="/profile" icon={<User size={22} />} label={t.nav.profile} />
          <NavItem to="/admin" icon={<ShieldCheck size={22} />} label={t.nav.admin} />
        </nav>

        {/* Language switcher */}
        <div className="shrink-0 px-3 pb-6">
          <button
            onClick={() => setLang(nextLang)}
            className="group/item flex items-center w-full rounded-xl whitespace-nowrap text-[#8899a6] hover:text-white transition-all duration-200"
            title={`Switch to ${LANG_LABEL[nextLang]}`}
          >
            <span className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0 font-black text-sm tracking-widest transition-all duration-200 group-hover/item:bg-white/10">
              {lang.toUpperCase()}
            </span>
            <span className="text-[15px] font-bold ml-1 select-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              {LANG_LABEL[nextLang]}
            </span>
          </button>
        </div>
      </aside>

      {/* Main content — offset only by collapsed sidebar width */}
      <main className="md:ml-[72px] pb-[80px] md:pb-0 min-h-screen">
        {/* Mobile Header */}
        <div className="md:hidden w-full flex justify-center items-center py-4 bg-[#17212b] shadow-sm sticky top-0 z-10 border-b border-[#101923] gap-2">
          <img src={logo} alt="Prime Logo" className="h-7 object-contain" />
          <span className="font-black italic text-xl tracking-tighter text-white">PRIME</span>
        </div>
        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 w-full bg-[#17212b] border-t border-[#101923] flex justify-around items-center p-2 z-50 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
        <MobileNavItem to="/" end icon={<Calendar size={24} />} label={t.nav.events} />
        <MobileNavItem to="/alerts" icon={<Bell size={24} />} label={t.nav.alerts} />
        <MobileNavItem to="/profile" icon={<User size={24} />} label={t.nav.profile} />
        <MobileNavItem to="/admin" icon={<ShieldCheck size={24} />} label={t.nav.admin} />
        <button
          onClick={() => setLang(nextLang)}
          className="flex flex-col items-center gap-1 p-2 min-w-[56px] text-[#79828b] hover:text-white transition-colors"
        >
          <span className="text-[14px] font-black">{lang.toUpperCase()}</span>
          <span className="text-[10px] font-bold">{nextLang.toUpperCase()}</span>
        </button>
      </nav>
    </div>
  );
}

function NavItem({ to, icon, label, end }: { to: string; icon: React.ReactNode; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `group/item flex items-center w-full rounded-xl whitespace-nowrap
         transition-all duration-200
         ${isActive
           ? "text-white"
           : "text-[#8899a6] hover:text-white"
         }`
      }
    >
      {({ isActive }) => (
        <>
          {/* Icon — gets highlight background on row hover */}
          <span
            className={`flex items-center justify-center w-12 h-12 rounded-xl shrink-0
              transition-all duration-200
              ${isActive
                ? "bg-white/[0.12] text-white"
                : "group-hover/item:bg-white/10"
              }`}
          >
            {icon}
          </span>

          {/* Label — fades in when sidebar is hovered */}
          <span
            className={`text-[15px] font-bold ml-1 select-none
              opacity-0 group-hover:opacity-100 transition-opacity duration-150
              ${isActive ? "text-white" : ""}`}
          >
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}

function MobileNavItem({ to, icon, label, end }: { to: string; icon: React.ReactNode; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex flex-col items-center gap-1 p-2 min-w-[56px] transition-colors ${
          isActive ? "text-[#3390ec]" : "text-[#79828b]"
        }`
      }
    >
      {icon}
      <span className="text-[10px] font-bold">{label}</span>
    </NavLink>
  );
}
