import { useTranslation } from "react-i18next";
import type { Theme } from "../lib/theme";
import { LanguageToggle } from "./LanguageToggle";
import { ThemeToggle } from "./ThemeToggle";

interface Props {
  theme: Theme;
  onToggleTheme: () => void;
}

export function Header({ theme, onToggleTheme }: Props) {
  const { t } = useTranslation();

  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <div className="brand">
          <img src="/icon.svg" alt="" width="32" height="32" />
          <div>
            <h1>{t("app.title")}</h1>
            <p className="tagline">{t("app.tagline")}</p>
          </div>
        </div>
        <div className="header-controls">
          <LanguageToggle />
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </div>
    </header>
  );
}
