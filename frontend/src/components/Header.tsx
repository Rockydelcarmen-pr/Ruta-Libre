import { useTranslation } from "react-i18next";
import type { Theme } from "../lib/theme";
import { Brand } from "./Brand";
import { LanguageToggle } from "./LanguageToggle";
import { ThemeToggle } from "./ThemeToggle";

interface Props {
  theme: Theme;
  onToggleTheme: () => void;
  organizerActive: boolean;
  onToggleOrganizer: () => void;
}

export function Header({
  theme,
  onToggleTheme,
  organizerActive,
  onToggleOrganizer,
}: Props) {
  const { t } = useTranslation();
  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <Brand />
        <div className="header-controls">
          <button
            type="button"
            className="org-link"
            onClick={onToggleOrganizer}
          >
            {organizerActive ? t("header.backToFeed") : t("header.organizer")}
          </button>
          <LanguageToggle />
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </div>
    </header>
  );
}
