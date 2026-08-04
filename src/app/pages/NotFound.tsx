import { useNavigate } from "react-router";
import { useLang } from "../i18n";

export function NotFound() {
  const navigate = useNavigate();
  const { t } = useLang();
  return (
    <div className="min-h-screen bg-[var(--surface-0)] flex flex-col items-center justify-center gap-5 px-4 font-sans">
      <div className="text-[80px] font-black italic text-[var(--ink)]/5 leading-none select-none">404</div>
      <div className="text-center -mt-4">
        <h1 className="text-xl font-black italic uppercase tracking-widest text-[var(--ink)] mb-2">{t.common.notFound}</h1>
        <p className="text-[#79828b] text-sm">The page you're looking for doesn't exist.</p>
      </div>
      <button
        onClick={() => navigate("/")}
        className="px-6 py-2.5 rounded-xl bg-[var(--brand)] text-white font-bold text-sm transition-transform"
      >
        {t.nav.events}
      </button>
    </div>
  );
}
