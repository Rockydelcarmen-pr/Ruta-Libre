import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

export function InfoModal({
  tag,
  heading,
  paragraphs,
  onClose,
}: {
  tag: string;
  heading: string;
  paragraphs: string[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return createPortal(
    <div
      className="disclosure"
      role="dialog"
      aria-modal="true"
      aria-labelledby="info-modal-h"
      onClick={onClose}
    >
      <div className="disc-card" data-lenis-prevent onClick={(e) => e.stopPropagation()}>
        <div className="disc-top">
          <span className="disc-tag">{tag}</span>
        </div>
        <h2 id="info-modal-h">{heading}</h2>
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        <button type="button" className="btn" onClick={onClose}>
          {t("common.close")}
        </button>
      </div>
    </div>,
    document.body,
  );
}
