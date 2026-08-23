import { useTranslation } from "react-i18next";

export function Brand() {
  const { t } = useTranslation();
  return (
    <div className="brand">
      <span className="flag-chip" aria-hidden="true">
        <i></i>
        <i></i>
        <i></i>
        <b></b>
      </span>
      <div>
        <div className="brand-name">
          Ruta <span>Libre</span>
        </div>
        <div className="brand-tag">{t("brand.tag")}</div>
      </div>
    </div>
  );
}
