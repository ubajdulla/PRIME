import { Outlet, NavLink, useNavigate, useLocation, useBlocker } from "react-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Calendar, User, Bell, ShieldCheck, ChevronDown, Check, Settings, Moon, Sun, Monitor } from "lucide-react";
import logo from "../../imports/Prime_logo_nobg_white_border.png";
import { useLang, LANG_CYCLE, type Lang } from "../i18n";
import { useTheme, type Theme } from "../theme";
import { navDir } from "../lib/navDir";
import { getHub } from "../lib/hub";
import { DropdownPanel } from "../components/ui/DropdownMenu";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { checkEventReminders } from "../lib/eventReminders";
import { useKeyboardInset } from "../lib/useKeyboardInset";
import { useModalOpen } from "../lib/useModalOpen";
import { useExclusiveOpen } from "../lib/exclusiveOpen";

const LANG_OPTIONS: { code: Lang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "ru", label: "Русский" },
];

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: "system", label: "System", icon: <Monitor size={14} /> },
  { value: "dark", label: "Dark", icon: <Moon size={14} /> },
  { value: "light", label: "Light", icon: <Sun size={14} /> },
];

function NavigationGuard() {
  // Only block a POP (back/forward) that would cross from one navbar hub into
  // another — content pushed within a hub (e.g. alerts -> notification -> event
  // detail) always allows going back, since it carries its launching hub forward.
  const blocker = useBlocker(({ currentLocation, nextLocation, historyAction }) => {
    if (historyAction !== "POP") return false;
    return getHub(currentLocation) !== getHub(nextLocation);
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
  const { theme, setTheme } = useTheme();
  const mainRef = useRef<HTMLElement>(null);
  const desktopLangRef = useRef<HTMLDivElement>(null);
  const mobileLangRef = useRef<HTMLDivElement>(null);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  useExclusiveOpen(showLangDropdown, () => setShowLangDropdown(false));
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [adminHasNewSignups, setAdminHasNewSignups] = useState(false);
  const { isAdmin, user } = useAuth();
  // Hide the mobile chrome (top header, bottom tab bar) whenever the
  // on-screen keyboard is open - otherwise both stay in the layout taking
  // up their normal space (they're not position: fixed, just flex children
  // that don't shrink), squeezing the already-keyboard-shrunk content area
  // even further and fighting a focused field's fixed bottom sheet for
  // the same corner of the screen.
  const keyboardOpen = useKeyboardInset() > 0;
  // Same reasoning for any open modal (ModalOverlay self-registers): the
  // chrome isn't fixed, so it sits visually above the modal backdrop and
  // eats taps meant for it, blocking the user from moving/closing it.
  const modalOpen = useModalOpen();
  const hideChrome = keyboardOpen || modalOpen;

  // No realtime in this app - re-check on every navigation (cheap count-only
  // query) so the badge clears shortly after the user reads/actions an alert.
  useEffect(() => {
    if (!user) { setUnreadAlerts(0); return; }
    supabase.from("notifications").select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id).eq("read", false)
      .then(({ count }) => setUnreadAlerts(count ?? 0));
  }, [user?.id, location.pathname]);

  // Same re-check-on-every-navigation approach as unreadAlerts above, just a
  // plain dot instead of a count - see admin_has_new_signups() (038).
  useEffect(() => {
    if (!isAdmin || !user) { setAdminHasNewSignups(false); return; }
    supabase.rpc("admin_has_new_signups", { p_admin_id: user.id })
      .then(({ data }) => setAdminHasNewSignups(!!data));
  }, [user?.id, isAdmin, location.pathname]);

  // Once per session, not per navigation - checking is a couple of light
  // queries, no need to repeat it on every route change.
  useEffect(() => {
    if (user) checkEventReminders(user.id);
  }, [user?.id]);

  useLayoutEffect(() => {
    mainRef.current?.scrollTo(0, 0);
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
  }, [location.pathname]);

  // Close lang dropdown on outside click
  useEffect(() => {
    if (!showLangDropdown) return;
    function close(e: PointerEvent) {
      if (desktopLangRef.current?.contains(e.target as Node)) return;
      if (mobileLangRef.current?.contains(e.target as Node)) return;
      setShowLangDropdown(false);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [showLangDropdown]);

  function handleLogoClick(e: React.MouseEvent) {
    e.preventDefault();
    navDir.none();
    navigate("/", { replace: true });
  }

  return (
    <div className="h-full md:min-h-screen bg-[var(--surface-0)] text-[var(--ink)] font-sans flex flex-col md:block">
      <NavigationGuard />

      {/* ── Desktop Sidebar ─────────────────────────────────── */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen z-50 w-[72px] bg-[var(--surface-1)] border-r border-[var(--divider)] shadow-2xl">
        <div className="flex items-center h-[72px] shrink-0 px-3">
          <a
            href="/"
            onClick={handleLogoClick}
            className="flex items-center justify-center w-12 h-12 rounded-full hover:opacity-80 transition-opacity duration-200"
          >
            <img src={logo} alt="Prime Logo" className="w-9 h-9 object-contain" />
          </a>
        </div>
        <nav className="flex flex-col flex-1 justify-center gap-0.5 px-3">
          <NavItem to="/" end icon={<Calendar size={22} />} label={t.nav.events} />
          <NavItem to="/alerts"  icon={<Bell size={22} />}        label={t.nav.alerts}  badge={unreadAlerts} />
          <NavItem to="/profile" icon={<User size={22} />}        label={t.nav.profile} />
          {isAdmin && <NavItem to="/admin" icon={<ShieldCheck size={22} />} label={t.nav.admin} dot={adminHasNewSignups} />}
        </nav>

        {/* Desktop lang button — dropdown opens to the right */}
        <div className="shrink-0 px-3 pb-6">
          <div ref={desktopLangRef} className="relative">
            <button
              onClick={() => setShowLangDropdown(v => !v)}
              className="flex items-center justify-center w-12 h-12 rounded-full text-[#8899a6] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors"
              title="Settings"
            >
              <Settings size={20} />
            </button>

            {showLangDropdown && (
              <div className="absolute left-full bottom-0 ml-3 z-50 w-[148px]">
                <DropdownPanel>
                  {LANG_OPTIONS.map(opt => (
                    <button
                      key={opt.code}
                      onClick={() => { setLang(opt.code); setShowLangDropdown(false); }}
                      className={`flex items-center justify-between w-full px-4 py-3 text-sm font-semibold text-left transition-colors ${
                        lang === opt.code
                          ? "text-[var(--ink)] bg-[var(--surface-active)]"
                          : "text-[#79828b] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)]"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {lang === opt.code && <Check size={13} className="text-[var(--brand)] shrink-0" />}
                    </button>
                  ))}
                  <div className="my-1 border-t border-[var(--ink)]/10" />
                  {THEME_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setTheme(opt.value); setShowLangDropdown(false); }}
                      className={`flex items-center justify-between w-full px-4 py-3 text-sm font-semibold text-left transition-colors ${
                        theme === opt.value
                          ? "text-[var(--ink)] bg-[var(--surface-active)]"
                          : "text-[#79828b] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)]"
                      }`}
                    >
                      <span className="flex items-center gap-2">{opt.icon}{opt.label}</span>
                      {theme === opt.value && <Check size={13} className="text-[var(--brand)] shrink-0" />}
                    </button>
                  ))}
                </DropdownPanel>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Mobile Top Header ──────────────────────────────── */}
      <div className={`md:hidden relative shrink-0 w-full items-center justify-center px-4 py-3 bg-[var(--surface-1)] shadow-sm border-b border-[var(--divider)] ${hideChrome ? "hidden" : "flex"}`}>
        {/* Logo stays centered */}
        <div className="flex items-center gap-2">
          <img src={logo} alt="Prime Logo" className="h-7 object-contain" />
          <span className="font-black italic text-xl tracking-tighter text-[var(--ink)]">PRIME</span>
        </div>

        {/* Lang trigger — absolutely right, doesn't affect logo centering */}
        <div ref={mobileLangRef} className="absolute right-4">
          <button
            onClick={() => setShowLangDropdown(v => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[var(--surface-hover)] text-[#79828b] hover:text-[var(--ink)] transition-colors"
          >
            <Settings size={16} />
            <ChevronDown
              size={12}
              className={`transition-transform duration-200 ${showLangDropdown ? "rotate-180" : ""}`}
            />
          </button>

          {/* Dropdown anchored to header bottom — never clipped by the button wrapper */}
          {showLangDropdown && (
            <div className="absolute right-0 top-full mt-1.5 z-50 w-[148px]">
              <DropdownPanel>
                {LANG_OPTIONS.map(opt => (
                  <button
                    key={opt.code}
                    onClick={() => { setLang(opt.code); setShowLangDropdown(false); }}
                    className={`flex items-center justify-between w-full px-4 py-3 text-sm font-semibold text-left transition-colors ${
                      lang === opt.code
                        ? "text-[var(--ink)] bg-[var(--surface-active)]"
                        : "text-[#79828b] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {lang === opt.code && <Check size={13} className="text-[var(--brand)] shrink-0" />}
                  </button>
                ))}
                <div className="my-1 border-t border-[var(--ink)]/10" />
                {THEME_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setTheme(opt.value); setShowLangDropdown(false); }}
                    className={`flex items-center justify-between w-full px-4 py-3 text-sm font-semibold text-left transition-colors ${
                      theme === opt.value
                        ? "text-[var(--ink)] bg-[var(--surface-active)]"
                        : "text-[#79828b] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    <span className="flex items-center gap-2">{opt.icon}{opt.label}</span>
                    {theme === opt.value && <Check size={13} className="text-[var(--brand)] shrink-0" />}
                  </button>
                ))}
              </DropdownPanel>
            </div>
          )}
        </div>
      </div>

      {/* Main scroll container */}
      <main ref={mainRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-none md:overflow-visible md:overscroll-auto md:flex-none md:ml-[72px] md:min-h-screen [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <Outlet />
      </main>

      {/* ── Mobile Bottom Nav ─────────────────────────────── */}
      <nav className={`md:hidden shrink-0 w-full bg-[var(--surface-1)] border-t border-[var(--divider)] justify-around items-center p-2 z-50 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-[0_-4px_20px_rgba(0,0,0,0.2)] ${hideChrome ? "hidden" : "flex"}`}>
        <MobileNavItem to="/" end icon={<Calendar size={24} />} label={t.nav.events} />
        <MobileNavItem to="/alerts"  icon={<Bell size={24} />}  label={t.nav.alerts}  badge={unreadAlerts} />
        <MobileNavItem to="/profile" icon={<User size={24} />}  label={t.nav.profile} />
        {isAdmin && <MobileNavItem to="/admin" icon={<ShieldCheck size={24} />} label={t.nav.admin} dot={adminHasNewSignups} />}
      </nav>
    </div>
  );
}

function NavItem({ to, icon, label, end, badge, dot }: { to: string; icon: React.ReactNode; label: string; end?: boolean; badge?: number; dot?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      replace
      onClick={() => navDir.none()}
      className={({ isActive }) =>
        `relative flex items-center justify-center w-12 h-12 rounded-full transition-colors
         ${isActive ? "bg-[var(--surface-active)] text-[var(--ink)]" : "text-[#8899a6] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)]"}`
      }
      title={label}
    >
      {icon}
      {!!badge && (
        <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[var(--brand)] text-white text-[10px] font-bold flex items-center justify-center">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
      {!badge && dot && (
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--brand)]" />
      )}
    </NavLink>
  );
}

function MobileNavItem({ to, icon, label, end, badge, dot }: { to: string; icon: React.ReactNode; label: string; end?: boolean; badge?: number; dot?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      replace
      onClick={() => navDir.none()}
      className={({ isActive }) =>
        `relative flex flex-col items-center gap-1 p-2 min-w-[56px] transition-colors ${
          isActive ? "text-[var(--brand)]" : "text-[#79828b]"
        }`
      }
    >
      <div className="relative">
        {icon}
        {!!badge && (
          <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 px-1 rounded-full bg-[var(--brand)] text-white text-[9px] font-bold flex items-center justify-center">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
        {!badge && dot && (
          <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-[var(--brand)]" />
        )}
      </div>
      <span className="text-[10px] font-bold">{label}</span>
    </NavLink>
  );
}
