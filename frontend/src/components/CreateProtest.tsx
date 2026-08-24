import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ApiError,
  createOrganization,
  createProtest,
  getOrganizations,
  getProtestForEdit,
  updateProtest,
  type CreateProtestBody,
} from "../lib/api";
import { RouteDrawMap } from "./RouteDrawMap";

type Pt = [number, number];

export function CreateProtest({
  token,
  editId,
  onCreated,
}: {
  token: string;
  editId?: string;
  onCreated: () => void;
}) {
  const { t } = useTranslation();
  const isEdit = Boolean(editId);

  const [points, setPoints] = useState<Pt[]>([]);
  const [titleEs, setTitleEs] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [causeEs, setCauseEs] = useState("");
  const [causeEn, setCauseEn] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);
  const [newOrg, setNewOrg] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    getOrganizations()
      .then(setOrgs)
      .catch(() => setOrgs([]));
  }, []);

  // Edit mode: load the existing protest and pre-fill every field + the route.
  useEffect(() => {
    if (!editId) return;
    getProtestForEdit(token, editId)
      .then((d) => {
        setTitleEs(d.title_es ?? "");
        setTitleEn(d.title_en ?? "");
        setCauseEs(d.cause_es ?? "");
        setCauseEn(d.cause_en ?? "");
        setDate(d.event_date ?? "");
        setStartTime(d.start_time ?? "");
        setDuration(
          d.estimated_duration_minutes != null
            ? String(d.estimated_duration_minutes)
            : "",
        );
        setTagsInput(d.tags.join(", "));
        setSelectedOrgs(d.organization_ids);
        setPoints(d.coordinates);
      })
      .catch(() => setError(t("org.editLoadError")));
  }, [editId, token, t]);

  const addOrg = async () => {
    const name = newOrg.trim();
    if (!name) return;
    try {
      const org = await createOrganization(token, { name });
      setOrgs((prev) => [...prev, org].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedOrgs((prev) => [...prev, org.id]);
      setNewOrg("");
    } catch {
      setError(t("org.orgError"));
    }
  };

  const toggleOrg = (id: string) => {
    setSelectedOrgs((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (points.length < 2) {
      setError(t("org.needRoute"));
      return;
    }
    if (!titleEs && !titleEn) {
      setError(t("org.needTitle"));
      return;
    }
    if (!date) {
      setError(t("org.needDate"));
      return;
    }

    const tags = tagsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const body: CreateProtestBody = {
      title_es: titleEs || undefined,
      title_en: titleEn || undefined,
      cause_es: causeEs || undefined,
      cause_en: causeEn || undefined,
      event_date: date,
      start_time: startTime || undefined,
      estimated_duration_minutes: duration ? Number(duration) : undefined,
      route: { type: "LineString", coordinates: points },
      tags,
      organizations: selectedOrgs.map((id) => ({
        organization_id: id,
        role: "organizer" as const,
      })),
      status: "approved",
    };

    setBusy(true);
    try {
      if (isEdit && editId) {
        await updateProtest(token, editId, body);
      } else {
        await createProtest(token, body);
      }
      setDone(true);
      onCreated();
    } catch (err) {
      const detail = err instanceof ApiError ? err.message : undefined;
      const base = isEdit ? t("org.updateError") : t("org.createError");
      setError(detail ? `${base} (${detail})` : base);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setPoints([]);
    setTitleEs("");
    setTitleEn("");
    setCauseEs("");
    setCauseEn("");
    setDate("");
    setStartTime("");
    setDuration("");
    setTagsInput("");
    setSelectedOrgs([]);
    setDone(false);
    setError(null);
  };

  if (done) {
    return (
      <div className="org-form">
        <h2 className="org-h">{t("org.created")}</h2>
        <p className="muted">{t("org.createdNote")}</p>
        <button className="btn" type="button" onClick={reset}>
          {t("org.createAnother")}
        </button>
      </div>
    );
  }

  return (
    <form className="org-form" onSubmit={submit}>
      <div className="eyebrow">{t("org.eyebrow")}</div>
      <h2 className="org-h">
        {isEdit ? t("org.editHeading") : t("org.createHeading")}
      </h2>

      <div className="field-label">{t("org.route")}</div>
      <p className="muted" style={{ marginTop: 0 }}>
        {t("org.routeHelp")}
      </p>
      <p className="warn-box">{t("org.routeAccuracyWarning")}</p>
      <RouteDrawMap
        points={points}
        autoFit={isEdit}
        onAddPoint={(p) => setPoints((prev) => [...prev, p])}
        onMovePoint={(i, p) =>
          setPoints((prev) => prev.map((pt, idx) => (idx === i ? p : pt)))
        }
        onRemovePoint={(i) =>
          setPoints((prev) => prev.filter((_, idx) => idx !== i))
        }
      />
      <div className="route-tools">
        <span className="pill">
          {points.length} {t("org.points")}
        </span>
        <button
          type="button"
          className="mini-btn"
          onClick={() => setPoints((prev) => prev.slice(0, -1))}
          disabled={points.length === 0}
        >
          {t("org.undo")}
        </button>
        <button
          type="button"
          className="mini-btn"
          onClick={() => setPoints([])}
          disabled={points.length === 0}
        >
          {t("org.clear")}
        </button>
      </div>

      <div className="grid-2">
        <div>
          <label className="field-label" htmlFor="t-es">
            {t("org.titleEs")}
          </label>
          <input id="t-es" className="text-input" value={titleEs} onChange={(e) => setTitleEs(e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="t-en">
            {t("org.titleEn")}
          </label>
          <input id="t-en" className="text-input" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
        </div>
      </div>

      <div className="grid-2">
        <div>
          <label className="field-label" htmlFor="c-es">
            {t("org.causeEs")}
          </label>
          <textarea id="c-es" className="text-input" rows={2} value={causeEs} onChange={(e) => setCauseEs(e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="c-en">
            {t("org.causeEn")}
          </label>
          <textarea id="c-en" className="text-input" rows={2} value={causeEn} onChange={(e) => setCauseEn(e.target.value)} />
        </div>
      </div>

      <div className="grid-3">
        <div>
          <label className="field-label" htmlFor="d-date">
            {t("org.date")}
          </label>
          <input id="d-date" className="text-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="d-time">
            {t("org.time")}
          </label>
          <input id="d-time" className="text-input" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="d-dur">
            {t("org.duration")}
          </label>
          <input id="d-dur" className="text-input" type="number" min="1" value={duration} onChange={(e) => setDuration(e.target.value)} />
        </div>
      </div>

      <label className="field-label" htmlFor="d-tags">
        {t("org.tags")}
      </label>
      <input id="d-tags" className="text-input" placeholder="MVC, PIP, 2028" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} />

      <div className="field-label">{t("org.organizers")}</div>
      <div className="org-picker">
        {orgs.map((o) => (
          <button
            type="button"
            key={o.id}
            className={selectedOrgs.includes(o.id) ? "org-chip on" : "org-chip"}
            onClick={() => toggleOrg(o.id)}
          >
            {o.name}
          </button>
        ))}
      </div>
      <div className="route-tools">
        <input className="text-input" style={{ flex: 1 }} placeholder={t("org.newOrg")} value={newOrg} onChange={(e) => setNewOrg(e.target.value)} />
        <button type="button" className="mini-btn" onClick={() => void addOrg()} disabled={!newOrg.trim()}>
          {t("org.addOrg")}
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}

      <button className="btn go" type="submit" disabled={busy}>
        {busy
          ? t("org.working")
          : isEdit
            ? t("org.saveChanges")
            : t("org.publish")}
      </button>
    </form>
  );
}
