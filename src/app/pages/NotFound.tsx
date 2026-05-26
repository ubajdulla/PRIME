import { useNavigate } from "react-router";

export function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#0e1621] flex flex-col items-center justify-center gap-5 px-4 font-sans">
      <div className="text-[80px] font-black italic text-white/5 leading-none select-none">404</div>
      <div className="text-center -mt-4">
        <h1 className="text-xl font-black italic uppercase tracking-widest text-white mb-2">Page Not Found</h1>
        <p className="text-[#79828b] text-sm">The page you're looking for doesn't exist.</p>
      </div>
      <button
        onClick={() => navigate("/")}
        className="px-6 py-2.5 rounded-xl bg-[#3390ec] text-white font-bold text-sm active:scale-[0.98] transition-transform"
      >
        Back to Events
      </button>
    </div>
  );
}
