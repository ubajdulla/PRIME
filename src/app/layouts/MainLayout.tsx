import { Outlet, NavLink, useNavigate, useLocation, useOutlet } from "react-router";
import { useLayoutEffect, useState } from "react";
import { motion, AnimatePresence, useIsPresent } from "motion/react";
import { Calendar, User, Bell, ShieldCheck } from "lucide-react";
import logo from "../../imports/Prime_logo_nobg_white_border.png";
import { useLang, LANG_CYCLE } from "../i18n";
import { navDir } from "../lib/navDir";

const isEventsRoute = (p: string) => p === "/" || p.startsWith("/events");
const isDetailPage  = (p: string) => p.startsWith("/events/");

const EASE: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];
const SLIDE_TRANSITION = { type: "tween" as const, duration: 0.28, ease: EASE };

// Freezes outlet at mount so the exiting element shows the OLD page content.
function FrozenOutlet() {
  const o = useOutlet();
  const [outlet] = useState(o);
  return <>{outlet}</>;
}

// Captures whether this page is a detail page at mount time so the animation
// stays correct even when location.pathname changes during the exit animation.
//
// Detail pages use position:fixed so they slide over the feed at the current
// viewport position — eliminating the scroll-to-top flash before the transition.
// Feed/home pages stay in normal flow and just hold their position during the slide.
function AnimatedPage({ pathname, children }: { pathname: string; children: React.ReactNode }) {
  const [isDetail] = useState(() => isDetailPage(pathname));
  const isPresent = useIsPresent();

  return isDetail ? (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%", transition: SLIDE_TRANSITION }}
      transition={SLIDE_TRANSITION}
      className="pb-[80px] md:pb-0 bg-[#0e1621] overflow-y-auto"
      style={{ position: "fixed", inset: 0, zIndex: 20, pointerEvents: isPresent ? undefined : "none" }}
    >
      {children}
    </motion.div>
  ) : (
    <motion.div
      initial={false}
      animate={{ x: 0 }}
      exit={{ x: 0, transition: SLIDE_TRANSITION }}
      className="w-full pb-[80px] md:pb-0"
      style={{ zIndex: 1, pointerEvents: isPresent ? undefined : "none" }}
    >
      {children}
    </motion.div>
  );
}

export function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, t, setLang } = useLang();
  const nextLang = LANG_CYCLE[(LANG_CYCLE.indexOf(lang) + 1) % LANG_CYCLE.length];
  const LANG_LABEL: Record<string, string> = { en: "English", cs: "Čeština", ru: "Русский" };

  const eventsRoute = isEventsRoute(location.pathname);

  useLayoutEffect(() => {
    // Skip scroll-reset when entering a detail page — EventDetail is position:fixed
    // and covers the viewport regardless of scroll, so resetting here would cause
    // a visible flash of the feed jumping to top before the slide animation starts.
    if (isDetailPage(location.pathname)) return;
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.pathname]);

  function handleLogoClick(e: React.MouseEvent) {
    e.preventDefault();
    navDir.none();
    navigate("/", { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-h-screen bg-[#0e1621] text-white font-sans">
      {/* Desktop Sidebar — fixed icon-only, no hover expansion */}
      <aside
        className="hidden md:flex flex-col fixed left-0 top-0 h-screen z-50
          w-[72px] bg-[#17212b] border-r border-[#101923] shadow-2xl"
      >
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
          <NavItem to="/alerts"  icon={<Bell size={22} />}        label={t.nav.alerts}   />
          <NavItem to="/profile" icon={<User size={22} />}        label={t.nav.profile}  />
          <NavItem to="/admin"   icon={<ShieldCheck size={22} />} label={t.nav.admin}    />
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

      {/* Main content */}
      <main className="md:ml-[72px] min-h-screen">
        <div className="md:hidden w-full flex justify-center items-center py-4 bg-[#17212b] shadow-sm border-b border-[#101923] gap-2">
          <img src={logo} alt="Prime Logo" className="h-7 object-contain" />
          <span className="font-black italic text-xl tracking-tighter text-white">PRIME</span>
        </div>

        {/* overflow-x:clip hides the sliding pages without creating a BFC */}
        <div className="relative" style={{ overflowX: "clip" }}>
          {eventsRoute ? (
            <AnimatePresence mode="sync" initial={false}>
              <AnimatedPage key={location.pathname} pathname={location.pathname}>
                <FrozenOutlet />
              </AnimatedPage>
            </AnimatePresence>
          ) : (
            <div className="w-full pb-[80px] md:pb-0">
              <Outlet />
            </div>
          )}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 w-full bg-[#17212b] border-t border-[#101923] flex justify-around items-center p-2 z-50 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
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
