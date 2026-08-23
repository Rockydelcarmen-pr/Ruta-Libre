import { useState } from "react";
import { useTranslation } from "react-i18next";

export function LoginForm({
  onLogin,
}: {
  onLogin: (email: string, password: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    setBusy(true);
    try {
      await onLogin(email.trim(), password);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="org-form" onSubmit={submit}>
      <div className="eyebrow">{t("org.eyebrow")}</div>
      <h2 className="org-h">{t("org.loginHeading")}</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        {t("org.loginNote")}
      </p>

      <label className="field-label" htmlFor="org-email">
        {t("org.email")}
      </label>
      <input
        id="org-email"
        className="text-input"
        type="email"
        autoComplete="username"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <label className="field-label" htmlFor="org-pass">
        {t("org.password")}
      </label>
      <input
        id="org-pass"
        className="text-input"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      {error && <p className="error-text">{t("org.loginError")}</p>}

      <button className="btn" type="submit" disabled={busy}>
        {busy ? t("org.working") : t("org.signIn")}
      </button>
    </form>
  );
}
