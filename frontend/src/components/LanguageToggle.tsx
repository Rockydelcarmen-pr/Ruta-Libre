import { useTranslation } from "react-i18next";

export function LanguageToggle() {
  const { i18n, t } = useTranslation();
  const current = i18n.language.startsWith("es") ? "es" : "en";

  return (
    <div className="segmented" role="group" aria-label={t("lang.label")}>
      <button
        type="button"
        className={current === "en" ? "segmented-on" : ""}
        aria-pressed={current === "en"}
        onClick={() => void i18n.changeLanguage("en")}
      >
        {t("lang.en")}
      </button>
      <button
        type="button"
        className={current === "es" ? "segmented-on" : ""}
        aria-pressed={current === "es"}
        onClick={() => void i18n.changeLanguage("es")}
      >
        {t("lang.es")}
      </button>
    </div>
  );
}
