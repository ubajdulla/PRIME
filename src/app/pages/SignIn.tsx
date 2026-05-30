import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { useLang } from "../i18n";

type Screen = "signin" | "signup" | "forgot";

export function SignIn() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [screen, setScreen] = useState<Screen>("signin");
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [remember, setRemember]       = useState(false);

  const [form, setForm] = useState({
    name: "", email: "", password: "", confirm: "",
  });

  function set(k: keyof typeof form, v: string) {
    setForm(p => ({ ...p, [k]: v }));
  }

  function handleBack() {
    if (screen === "signin") navigate("/");
    else setScreen("signin");
  }

  function handleSubmit() {
    localStorage.setItem("prime_logged_in", "true");
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-[#0e1621] text-white font-sans flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-[420px] bg-[#17212b] rounded-2xl border border-white/5 shadow-2xl p-6 sm:p-8">

      {/* Back arrow */}
      <button
        onClick={handleBack}
        className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors mb-6 shrink-0"
      >
        <ChevronLeft size={20} />
      </button>

      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-2">
          {screen === "signin"  && t.signin.logIn}
          {screen === "signup"  && t.signin.createAccount}
          {screen === "forgot"  && t.signin.forgotPassword}
        </h1>
        <p className="text-[#79828b] text-sm leading-relaxed">
          {screen === "signin"  && t.signin.logInDesc}
          {screen === "signup"  && t.signin.createAccountDesc}
          {screen === "forgot"  && t.signin.forgotPasswordDesc}
        </p>
      </div>

      {/* ── SIGN IN ── */}
      {screen === "signin" && (
        <>
          <div className="flex flex-col gap-3 mb-4">
            <InputField
              icon={<Mail size={16} />}
              type="email"
              placeholder={t.signin.emailPlaceholder}
              value={form.email}
              onChange={v => set("email", v)}
            />
            <PasswordField
              placeholder={t.signin.passwordPlaceholder}
              value={form.password}
              show={showPass}
              onToggle={() => setShowPass(v => !v)}
              onChange={v => set("password", v)}
            />
          </div>

          {/* Remember me + Forgot */}
          <div className="flex items-center justify-between mb-6">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                onClick={() => setRemember(v => !v)}
                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                  remember ? "bg-[#3390ec] border-[#3390ec]" : "border-white/20 bg-white/5"
                }`}
              >
                {remember && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span className="text-sm text-[#79828b]">{t.signin.rememberMe}</span>
            </label>
            <button
              onClick={() => setScreen("forgot")}
              className="text-sm text-[#3390ec] font-bold hover:text-white transition-colors"
            >
              {t.signin.forgotLink}
            </button>
          </div>

          <button
            onClick={handleSubmit}
            className="w-full py-3.5 rounded-xl bg-[#3390ec] text-white font-bold text-sm active:scale-[0.98] transition-transform shadow-[0_0_20px_rgba(51,144,236,0.25)] mb-5"
          >
            {t.signin.loginBtn}
          </button>

          <p className="text-center text-sm text-[#79828b] mb-8">
            {t.signin.noAccount}{" "}
            <button onClick={() => setScreen("signup")} className="text-[#3390ec] font-bold hover:text-white transition-colors">
              {t.signin.signUpLink}
            </button>
          </p>

          <SocialSection onSelect={handleSubmit} />
        </>
      )}

      {/* ── SIGN UP ── */}
      {screen === "signup" && (
        <>
          <div className="flex flex-col gap-3 mb-6">
            <InputField
              icon={<User size={16} />}
              type="text"
              placeholder={t.signin.namePlaceholder}
              value={form.name}
              onChange={v => set("name", v)}
            />
            <InputField
              icon={<Mail size={16} />}
              type="email"
              placeholder={t.signin.emailPlaceholder}
              value={form.email}
              onChange={v => set("email", v)}
            />
            <PasswordField
              placeholder={t.signin.passwordPlaceholder}
              value={form.password}
              show={showPass}
              onToggle={() => setShowPass(v => !v)}
              onChange={v => set("password", v)}
            />
            <PasswordField
              placeholder={t.signin.confirmPlaceholder}
              value={form.confirm}
              show={showConfirm}
              onToggle={() => setShowConfirm(v => !v)}
              onChange={v => set("confirm", v)}
            />
          </div>

          <button
            onClick={handleSubmit}
            className="w-full py-3.5 rounded-xl bg-[#3390ec] text-white font-bold text-sm active:scale-[0.98] transition-transform shadow-[0_0_20px_rgba(51,144,236,0.25)] mb-5"
          >
            {t.signin.createBtn}
          </button>

          <p className="text-center text-sm text-[#79828b] mb-8">
            {t.signin.haveAccount}{" "}
            <button onClick={() => setScreen("signin")} className="text-[#3390ec] font-bold hover:text-white transition-colors">
              {t.signin.signInLink}
            </button>
          </p>

          <SocialSection onSelect={handleSubmit} />
        </>
      )}

      {/* ── FORGOT PASSWORD ── */}
      {screen === "forgot" && (
        <>
          <div className="flex flex-col gap-3 mb-6">
            <InputField
              icon={<Mail size={16} />}
              type="email"
              placeholder={t.signin.emailPlaceholder}
              value={form.email}
              onChange={v => set("email", v)}
            />
          </div>

          <button
            onClick={() => setScreen("signin")}
            className="w-full py-3.5 rounded-xl bg-[#3390ec] text-white font-bold text-sm active:scale-[0.98] transition-transform shadow-[0_0_20px_rgba(51,144,236,0.25)]"
          >
            {t.signin.continueBtn}
          </button>
        </>
      )}

      </div>
    </div>
  );
}

// ── Shared sub-components ────────────────────────────────────────────────────

function InputField({
  icon, type, placeholder, value, onChange,
}: {
  icon: React.ReactNode;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 bg-[#0e1621]/60 border border-white/10 rounded-xl focus-within:border-[#3390ec]/50 transition-colors">
      <span className="text-[#79828b] shrink-0">{icon}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="flex-1 bg-transparent text-white text-sm placeholder:text-[#79828b]/60 focus:outline-none"
      />
    </div>
  );
}

function PasswordField({
  placeholder, value, show, onToggle, onChange,
}: {
  placeholder: string;
  value: string;
  show: boolean;
  onToggle: () => void;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 bg-[#0e1621]/60 border border-white/10 rounded-xl focus-within:border-[#3390ec]/50 transition-colors">
      <span className="text-[#79828b] shrink-0"><Lock size={16} /></span>
      <input
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="flex-1 bg-transparent text-white text-sm placeholder:text-[#79828b]/60 focus:outline-none"
      />
      <button type="button" onClick={onToggle} className="text-[#79828b] hover:text-white transition-colors shrink-0">
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

function SocialSection({ onSelect }: { onSelect: () => void }) {
  const { t } = useLang();
  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-[#79828b] text-xs font-bold uppercase tracking-widest shrink-0">{t.signin.orContinueWith}</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      <div className="flex justify-center gap-4">
        <SocialBtn onClick={onSelect} label="Google">
          <GoogleIcon />
        </SocialBtn>
        <SocialBtn onClick={onSelect} label="Apple">
          <AppleIcon />
        </SocialBtn>
        <SocialBtn onClick={onSelect} label="Telegram">
          <TelegramIcon />
        </SocialBtn>
      </div>
    </>
  );
}

function SocialBtn({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="w-14 h-14 rounded-full bg-[#17212b] border border-white/10 flex items-center justify-center hover:border-white/25 hover:bg-white/5 active:scale-95 transition-all"
    >
      {children}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#3390ec">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
    </svg>
  );
}
