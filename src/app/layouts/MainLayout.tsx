import { Outlet, NavLink, useNavigate, useLocation, useBlocker } from "react-router";
import { useEffect, useLayoutEffect, useRef } from "react";
import { Calendar, User, Bell, ShieldCheck } from "lucide-react";
import logo from "../../imports/Prime_logo_nobg_white_border.png";
import { useLang, LANG_CYCLE } from "../i18n";
import { navDir } from "../lib/navDir";

function getSection(path: string): string {
  if (path === "/" || path.startsWith("/events")) return "events";
  if (path.startsWith("/alerts")) return "alerts";
  if (path.startsWith("/profile")) return "profile";
  if (path.startsWith("/admin")) return "admin";
  return path;
}

// Blocks browser back/forward (POP) that would cross section boundaries.
// PUSH/REPLACE (navbar clicks, in-app links) are always allowed.
function NavigationGuard() {
  const blocker = useBlocker(({ currentLocation, nextLocation, historyAction }) => {
    if (historyAction !== "POP") return false;
    return getSection(currentLocation.pathname) !== getSection(nextLocation.pathname);
  });

  useEffect(() => {
    if (blocker.state === "blocked") {
      blocker.reset();
    }
  }, [blocker]);

  return null;
}

export function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, t, setLang } = useLang();
  const nextLang = LANG_CYCLE[(LANG_CYCLE.indexOf(lang) + 1) % LANG_CYCLE.length];
  const LANG_LABEL: Record<string, string> = { en: "English", cs: "Čeština", ru: "Русский" };
  const mainRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    // Mobile: scroll the contained main element; Desktop: scroll the document
    mainRef.current?.scrollTo(0, 0);
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
  }, [location.pathname]);

  function handleLogoClick(e: React.MouseEvent) {
    e.preventDefault();
    navDir.none();
    navigate("/", { replace: true });
  }

  return (
    <div className="h-full md:min-h-screen bg-[#0e1621] text-white font-sans flex flex-col md:block">
      <NavigationGuard />

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen z-50 w-[72px] bg-[#17212b] border-r border-[#101923] shadow-2xl">
        <div className="flex items-center h-[72px] shrink-0 px-3">
          <a
            href="/"
            onClick={handleLogoClick}
            className="flex items-center justify-center w-12 h-12 rounded-xl hover:opacity-80 transition-opacity duration-200"
          >
            <img src={logo} alt="Prime Logo" className="w-9 h-9 object-contain" />
          </a>
        </div>
        <nav className="flex flex-col flex-1 justify-center gap-0.5 px-3">
          <NavItem to="/" end icon={<Calendar size={22} />} label={t.nav.events} />
          <NavItem to="/alerts"  icon={<Bell size={22} />}        label={t.nav.alerts}  />
          <NavItem to="/profile" icon={<User size={22} />}        label={t.nav.profile} />
          <NavItem to="/admin"   icon={<ShieldCheck size={22} />} label={t.nav.admin}   />
        </nav>
        <div className="shrink-0 px-3 pb-6">
          <button
            onClick={() => setLang(nextLang)}
            className="flex items-center justify-center w-12 h-12 rounded-xl text-[#8899a6] hover:text-white transition-colors"
            title={`Switch to ${LANG_LABEL[nextLang]}`}
          >
            <span className="font-black text-sm tracking-widest">{lang.toUpperCase()}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <div className="md:hidden shrink-0 w-full flex justify-center items-center py-4 bg-[#17212b] shadow-sm border-b border-[#101923] gap-2">
        <img src={logo} alt="Prime Logo" className="h-7 object-contain" />
        <span className="font-black italic text-xl tracking-tighter text-white">PRIME</span>
      </div>

      {/* Main content — on mobile this is the scroll container so the iOS indicator stays above the bottom nav */}
      <main ref={mainRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-none md:overflow-visible md:overscroll-auto md:flex-none md:ml-[72px] md:min-h-screen">
        <Outlet />
      </main>

      {/* Mobile Bottom Nav — in document flow (not fixed), so iOS scroll indicator stops here */}
      <nav className="md:hidden shrink-0 w-full bg-[#17212b] border-t border-[#101923] flex justify-around items-center p-1 z-50 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
        <MobileNavItem to="/" end icon={<Calendar size={24} />} label={t.nav.events} />
        <MobileNavItem to="/alerts"  icon={<Bell size={24} />}  label={t.nav.alerts}  />
        <MobileNavItem to="/profile" icon={<User size={24} />}  label={t.nav.profile} />
        <MobileNavItem to="/admin"   icon={<ShieldCheck size={24} />} label={t.nav.admin} />
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
      replace
      onClick={() => navDir.none()}
      className={({ isActive }) =>
        `flex items-center justify-center w-12 h-12 rounded-xl transition-colors
         ${isActive ? "bg-white/[0.12] text-white" : "text-[#8899a6] hover:text-white hover:bg-white/10"}`
      }
      title={label}
    >
      {icon}
    </NavLink>
  );
}

function MobileNavItem({ to, icon, label, end }: { to: string; icon: React.ReactNode; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      replace
      onClick={() => navDir.none()}
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
