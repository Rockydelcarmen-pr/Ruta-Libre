import { useTranslation } from "react-i18next";
import type { Theme } from "../lib/theme";
import { PR_MUNICIPALITIES } from "../lib/municipalities";
import { SettingsMenu } from "./SettingsMenu";

interface Props {
  mode: "home" | "map";
  q: string;
  onQChange: (q: string) => void;
  onHome: () => void;
  onToggleMap: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  organizerActive: boolean;
  onToggleOrganizer: () => void;
}

export function BottomBar({
  mode,
  q,
  onQChange,
  onHome,
  onToggleMap,
  theme,
  onToggleTheme,
  organizerActive,
  onToggleOrganizer,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="bottom-bar" role="toolbar" aria-label={t("nav.appBar", "App navigation")}>
      {mode === "home" && (
        <div className="bottom-pill search-pill">
          <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M20 20l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            className="search-pill-input"
            placeholder={t("search.placeholder")}
            value={q}
            onChange={(e) => onQChange(e.target.value)}
            aria-label={t("search.placeholder")}
            list="pr-municipalities"
          />
          <datalist id="pr-municipalities">
            {PR_MUNICIPALITIES.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
      )}

      {mode === "home" && (
        <button
          type="button"
          className="bottom-pill pill-btn"
          aria-label={t("nav.home", "Home")}
          title={t("nav.home", "Home")}
          onClick={onHome}
        >
          <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
            <path
              d="M4 11.5 12 4l8 7.5M6 10v9h5v-5h2v5h5v-9"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      <button
        type="button"
        className={mode === "map" ? "bottom-pill pill-btn on" : "bottom-pill pill-btn"}
        aria-pressed={mode === "map"}
        aria-label={mode === "map" ? t("nav.backHome", "Back to home") : t("nav.map", "Map")}
        title={mode === "map" ? t("nav.backHome", "Back to home") : t("nav.map", "Map")}
        onClick={onToggleMap}
      >
        {mode === "map" ? (
          <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
            <path
              d="M4 11.5 12 4l8 7.5M6 10v9h5v-5h2v5h5v-9"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
            <path
              d="M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path d="M9 4v14M15 6v14" stroke="currentColor" strokeWidth="2" />
          </svg>
        )}
      </button>

      {mode === "home" && (
        <div className="bottom-pill pill-btn settings-slot">
          <SettingsMenu
            theme={theme}
            onToggleTheme={onToggleTheme}
            organizerActive={organizerActive}
            onToggleOrganizer={onToggleOrganizer}
            anchor="bottom"
          />
        </div>
      )}
    </div>
  );
}
