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
            className={organizerActive ? "org-link home-link" : "org-link"}
            onClick={onToggleOrganizer}
            aria-label={organizerActive ? t("header.home") : undefined}
            title={organizerActive ? t("header.home") : undefined}
          >
            {organizerActive ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 11.5 12 4l9 7.5" />
                <path d="M5.5 9.5V20h13V9.5" />
              </svg>
            ) : (
              t("header.organizer")
            )}
          </button>
          <LanguageToggle />
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </div>
    </header>
  );
}
