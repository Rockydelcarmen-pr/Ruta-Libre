import { useState } from "react";
import { useTranslation } from "react-i18next";

const ACK_KEY = "pt-disclosure-ack";

export function Disclosure() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(
    () => localStorage.getItem(ACK_KEY) !== "1",
  );

  if (!open) return null;

  const current = i18n.language.startsWith("es") ? "es" : "en";
  const dismiss = () => {
    localStorage.setItem(ACK_KEY, "1");
    setOpen(false);
  };

  return (
    <div
      className="disclosure"
      role="dialog"
      aria-modal="true"
      aria-labelledby="disc-h"
    >
      <div className="disc-card" data-lenis-prevent>
        <div className="disc-top">
          <span className="disc-tag">{t("disclosure.tag")}</span>
          <div
            className="segmented disc-seg"
            role="group"
            aria-label={t("lang.label")}
          >
            <button
              type="button"
              className={current === "es" ? "segmented-on" : ""}
              aria-pressed={current === "es"}
              onClick={() => void i18n.changeLanguage("es")}
            >
              {t("lang.es")}
            </button>
            <button
              type="button"
              className={current === "en" ? "segmented-on" : ""}
              aria-pressed={current === "en"}
              onClick={() => void i18n.changeLanguage("en")}
            >
              {t("lang.en")}
            </button>
          </div>
        </div>
        <h2 id="disc-h">{t("disclosure.heading")}</h2>
        <p>{t("disclosure.p1")}</p>
        <p>{t("disclosure.p2")}</p>
        <p className="disc-dev">{t("disclosure.p3")}</p>
        <button type="button" className="btn" onClick={dismiss}>
          {t("disclosure.ok")}
        </button>
      </div>
    </div>
  );
}
