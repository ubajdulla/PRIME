import { Outlet, NavLink, useNavigate, useLocation, useBlocker } from "react-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Calendar, User, Bell, ShieldCheck, ChevronDown, Check } from "lucide-react";
import logo from "../../imports/Prime_logo_nobg_white_border.png";
import { useLang, LANG_CYCLE, type Lang } from "../i18n";
import { navDir } from "../lib/navDir";

const LANG_OPTIONS: { code: Lang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "cs", label: "Čeština" },
  { code: "ru", label: "Русский" },
];

function getSection(path: string): string {
  if (path === "/" || path.startsWith("/events")) return "events";
  if (path.startsWith("/alerts")) return "alerts";
  if (path.startsWith("/profile")) return "profile";
  if (path.startsWith("/players")) return "players";
  if (path.startsWith("/admin/player/")) return "admin-player";
  if (path.startsWith("/admin")) return "admin";
  return path;
}

function NavigationGuard() {
  const blocker = useBlocker(({ currentLocation, nextLocation, historyAction }) => {
    if (historyAction !== "POP") return false;
    const from = getSection(currentLocation.pathname);
    const to   = getSection(nextLocation.pathname);
    // Player profile pages are a universal "pass-through" — always allow POP to/from them
    if (from === "players" || to === "players") return false;
    if (from === "admin-player" || to === "admin-player") return false;
    return from !== to;
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
  const mainRef = useRef<HTMLElement>(null);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const isLoggedIn = localStorage.getItem("prime_logged_in") !== "false";

  useLayoutEffect(() => {
    mainRef.current?.scrollTo(0, 0);
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
  }, [location.pathname]);

  // Close lang dropdown on outside click
  useEffect(() => {
    if (!showLangDropdown) return;
    function close() { setShowLangDropdown(false); }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [showLangDropdown]);

  function handleLogoClick(e: React.MouseEvent) {
    e.preventDefault();
    navDir.none();
    navigate("/", { replace: true });
  }

  return (
    <div className="h-full md:min-h-screen bg-[#0e1621] text-white font-sans flex flex-col md:block">
      <NavigationGuard />

      {/* ── Desktop Sidebar ─────────────────────────────────── */}
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
          {isLoggedIn && <NavItem to="/admin" icon={<ShieldCheck size={22} />} label={t.nav.admin} />}
        </nav>

        {/* Desktop lang button — dropdown opens to the right */}
        <div className="shrink-0 px-3 pb-6">
          <div
            className="relative"
            onMouseDown={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowLangDropdown(v => !v)}
              className="flex items-center justify-center w-12 h-12 rounded-xl text-[#8899a6] hover:text-white hover:bg-white/5 transition-colors"
              title="Language"
            >
              <span className="font-black text-sm tracking-widest">{lang.toUpperCase()}</span>
            </button>

            {showLangDropdown && (
              <div className="absolute left-full bottom-0 ml-3 bg-[#222f3e] border border-white/10 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.6)] overflow-hidden z-50 w-[148px]">
                {LANG_OPTIONS.map(opt => (
                  <button
                    key={opt.code}
                    onClick={() => { setLang(opt.code); setShowLangDropdown(false); }}
                    className={`flex items-center justify-between w-full px-4 py-3 text-sm font-bold text-left transition-colors border-b border-white/5 last:border-0 ${
                      lang === opt.code
                        ? "text-white bg-white/5"
                        : "text-[#79828b] hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {lang === opt.code && <Check size={13} className="text-[#3390ec] shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Mobile Top Header ──────────────────────────────── */}
      <div className="md:hidden relative shrink-0 w-full flex items-center justify-center px-4 py-3 bg-[#17212b] shadow-sm border-b border-[#101923]">
        {/* Logo stays centered */}
        <div className="flex items-center gap-2">
          <img src={logo} alt="Prime Logo" className="h-7 object-contain" />
          <span className="font-black italic text-xl tracking-tighter text-white">PRIME</span>
        </div>

        {/* Lang trigger — absolutely right, doesn't affect logo centering */}
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={() => setShowLangDropdown(v => !v)}
          className="absolute right-4 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 text-[#79828b] hover:text-white transition-colors"
        >
          <span className="font-black text-[13px] tracking-widest">{lang.toUpperCase()}</span>
          <ChevronDown
            size={12}
            className={`transition-transform duration-200 ${showLangDropdown ? "rotate-180" : ""}`}
          />
        </button>

        {/* Dropdown anchored to header bottom — never clipped by the button wrapper */}
        {showLangDropdown && (
          <div
            onMouseDown={e => e.stopPropagation()}
            className="absolute right-4 top-full mt-1.5 bg-[#222f3e] border border-white/10 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.6)] overflow-hidden z-50 w-[148px]"
          >
            {LANG_OPTIONS.map(opt => (
              <button
                key={opt.code}
                onClick={() => { setLang(opt.code); setShowLangDropdown(false); }}
                className={`flex items-center justify-between w-full px-4 py-3 text-sm font-bold text-left transition-colors border-b border-white/5 last:border-0 ${
                  lang === opt.code
                    ? "text-white bg-white/5"
                    : "text-[#79828b] hover:text-white hover:bg-white/5"
                }`}
              >
                <span>{opt.label}</span>
                {lang === opt.code && <Check size={13} className="text-[#3390ec] shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main scroll container */}
      <main ref={mainRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-none md:overflow-visible md:overscroll-auto md:flex-none md:ml-[72px] md:min-h-screen">
        <Outlet />
      </main>

      {/* ── Mobile Bottom Nav ─────────────────────────────── */}
      <nav className="md:hidden shrink-0 w-full bg-[#17212b] border-t border-[#101923] flex justify-around items-center p-2 z-50 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
        <MobileNavItem to="/" end icon={<Calendar size={24} />} label={t.nav.events} />
        <MobileNavItem to="/alerts"  icon={<Bell size={24} />}  label={t.nav.alerts}  />
        <MobileNavItem to="/profile" icon={<User size={24} />}  label={t.nav.profile} />
        {isLoggedIn && <MobileNavItem to="/admin" icon={<ShieldCheck size={24} />} label={t.nav.admin} />}
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
