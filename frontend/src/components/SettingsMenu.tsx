import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { Theme } from "../lib/theme";
import { InfoModal } from "./InfoModal";

type Panel = "howto" | "about" | null;

export function SettingsMenu({
  theme,
  onToggleTheme,
  organizerActive,
  onToggleOrganizer,
}: {
  theme: Theme;
  onToggleTheme: () => void;
  organizerActive: boolean;
  onToggleOrganizer: () => void;
}) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const currentLang = i18n.language.startsWith("es") ? "es" : "en";

  useEffect(() => {
    if (!open) return;
    const onDocPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDocPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDocPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggleOpen = () => {
    if (!open && buttonRef.current) {
      const r = buttonRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
    }
    setOpen((o) => !o);
  };

  return (
    <div className="settings-menu">
      <button
        ref={buttonRef}
        type="button"
        className="icon-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("menu.label")}
        title={t("menu.label")}
        onClick={toggleOpen}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </g>
        </svg>
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            className="settings-panel"
            role="menu"
            ref={panelRef}
            style={{ top: pos.top, right: pos.right }}
          >
          <div className="settings-row">
            <span className="settings-row-label">{t("theme.label")}</span>
            <button
              type="button"
              className="icon-btn"
              onClick={onToggleTheme}
              aria-label={theme === "dark" ? t("theme.toLight") : t("theme.toDark")}
              title={theme === "dark" ? t("theme.toLight") : t("theme.toDark")}
            >
              {theme === "dark" ? (
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                  <circle cx="12" cy="12" r="4.5" fill="currentColor" />
                  <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
                  </g>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                  <path
                    d="M20 14.5A8 8 0 0 1 9.5 4 6.5 6.5 0 1 0 20 14.5z"
                    fill="currentColor"
                  />
                </svg>
              )}
            </button>
          </div>

          <div className="settings-row">
            <span className="settings-row-label">{t("lang.label")}</span>
            <div className="segmented" role="group" aria-label={t("lang.label")}>
              <button
                type="button"
                className={currentLang === "en" ? "segmented-on" : ""}
                aria-pressed={currentLang === "en"}
                onClick={() => void i18n.changeLanguage("en")}
              >
                {t("lang.en")}
              </button>
              <button
                type="button"
                className={currentLang === "es" ? "segmented-on" : ""}
                aria-pressed={currentLang === "es"}
                onClick={() => void i18n.changeLanguage("es")}
              >
                {t("lang.es")}
              </button>
            </div>
          </div>

          <div className="settings-divider" />

          <button
            type="button"
            className="settings-item"
            role="menuitem"
            onClick={() => {
              onToggleOrganizer();
              setOpen(false);
            }}
          >
            {organizerActive ? t("header.backToFeed") : t("header.organizer")}
          </button>

          <button
            type="button"
            className="settings-item"
            role="menuitem"
            onClick={() => {
              setPanel("howto");
              setOpen(false);
            }}
          >
            {t("menu.howTo")}
          </button>

          <button
            type="button"
            className="settings-item"
            role="menuitem"
            onClick={() => {
              setPanel("about");
              setOpen(false);
            }}
          >
            {t("menu.about")}
          </button>
          </div>,
          document.body,
        )}

      {panel === "howto" && (
        <InfoModal
          tag={t("menu.howToTag")}
          heading={t("menu.howToHeading")}
          paragraphs={[
            t("menu.howToP1"),
            t("menu.howToP2"),
            t("menu.howToP3"),
            t("menu.howToP4"),
          ]}
          onClose={() => setPanel(null)}
        />
      )}

      {panel === "about" && (
        <InfoModal
          tag={t("menu.aboutTag")}
          heading={t("menu.aboutHeading")}
          paragraphs={[t("menu.aboutP1"), t("menu.aboutP2"), t("menu.aboutP3")]}
          onClose={() => setPanel(null)}
        />
      )}
    </div>
  );
}
