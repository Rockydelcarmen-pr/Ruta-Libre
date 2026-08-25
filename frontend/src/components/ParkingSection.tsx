import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ApiError,
  deleteChipAdmin,
  dropChip,
  getChips,
  getParking,
  takeChip,
} from "../lib/api";
import { getDeviceToken } from "../lib/device";
import { distanceToRouteMeters } from "../lib/geo";
import type { Auth } from "../hooks/useAuth";
import type { Chip, ParkingSpot } from "../lib/types";
import type { MarchView } from "../lib/sampleProtests";
import { PinPickerMap } from "./PinPickerMap";

type Pt = [number, number];
type Stage = "idle" | "locating" | "placing" | "submitting";

/** Reports must come from within this distance of the route itself — this is
    a report-parking-here feature, not a plan-ahead-from-home one. */
const MAX_REPORT_DISTANCE_M = 1000;

function minutesAgo(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

const REPORT_OPENS_BEFORE_MIN = 30;
const DEFAULT_DURATION_MIN = 180;

/** Parking reports are only accepted from 30 minutes before the march starts
    until it's estimated to end. */
function reportWindow(m: MarchView): { opensAt: Date; closesAt: Date } | null {
  const start = new Date(`${m.event_date}T${m.start_time ?? "09:00"}:00`);
  if (Number.isNaN(start.getTime())) return null;
  const durationMin = m.estimated_duration_minutes ?? DEFAULT_DURATION_MIN;
  return {
    opensAt: new Date(start.getTime() - REPORT_OPENS_BEFORE_MIN * 60000),
    closesAt: new Date(start.getTime() + durationMin * 60000),
  };
}

export function ParkingSection({
  march,
  auth,
  onChipsChange,
}: {
  march: MarchView;
  auth?: Auth;
  onChipsChange?: (chips: Chip[]) => void;
}) {
  const { t } = useTranslation();
  const start = march.route_geojson?.coordinates[0];
  const route = march.route_geojson?.coordinates;
  const isAdmin = auth?.user?.role === "admin";

  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [chips, setChips] = useState<Chip[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [stage, setStage] = useState<Stage>("idle");
  const [pin, setPin] = useState<Pt | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const load = () => {
    if (!start) return;
    const [lng, lat] = start;
    Promise.all([getParking(lat, lng), getChips(lat, lng)])
      .then(([p, c]) => {
        const available = c.chips.filter((chip) => chip.status === "available");
        setSpots(p.spots);
        setChips(available);
        onChipsChange?.(available);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  };

  useEffect(load, [start?.[0], start?.[1]]);

  if (!start) return null;

  const win = reportWindow(march);
  const now = new Date();
  const reportingOpen = win ? now >= win.opensAt && now <= win.closesAt : true;
  const notYetOpen = win ? now < win.opensAt : false;

  const beginReport = () => {
    setError(null);
    setOk(false);
    if (!reportingOpen) {
      setError(notYetOpen ? t("parking.notYetOpen") : t("parking.closed"));
      return;
    }
    if (!navigator.geolocation) {
      setError(t("parking.geoUnsupported"));
      return;
    }
    setStage("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (
          route &&
          distanceToRouteMeters(latitude, longitude, route) > MAX_REPORT_DISTANCE_M
        ) {
          setError(t("parking.tooFar"));
          setStage("idle");
          return;
        }
        setPin([longitude, latitude]);
        setStage("placing");
      },
      () => {
        setError(t("parking.geoDenied"));
        setStage("idle");
      },
    );
  };

  const cancelReport = () => {
    setStage("idle");
    setPin(null);
    setNote("");
  };

  const confirmReport = async () => {
    if (!pin) return;
    setStage("submitting");
    setError(null);
    try {
      const token = await getDeviceToken();
      await dropChip(token, {
        lat: pin[1],
        lng: pin[0],
        note: note.trim() || undefined,
      });
      setOk(true);
      setStage("idle");
      setPin(null);
      setNote("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("parking.reportError"));
      setStage("placing");
    }
  };

  const markTaken = async (id: string) => {
    try {
      const token = await getDeviceToken();
      await takeChip(token, id);
      setChips((prev) => {
        const next = prev.filter((c) => c.id !== id);
        onChipsChange?.(next);
        return next;
      });
    } catch {
      /* best-effort; the chip will still expire on its own */
    }
  };

  const removeAsAdmin = async (id: string) => {
    if (!auth?.token) return;
    try {
      await deleteChipAdmin(auth.token, id);
      setChips((prev) => {
        const next = prev.filter((c) => c.id !== id);
        onChipsChange?.(next);
        return next;
      });
    } catch {
      setError(t("parking.reportError"));
    }
  };

  return (
    <div className="parking-section">
      <div className="lbl">{t("parking.heading")}</div>

      {loaded && spots.length === 0 && chips.length === 0 && (
        <p className="muted parking-empty">{t("parking.empty")}</p>
      )}

      {chips.length > 0 && (
        <ul className="parking-list">
          {chips.map((c) => (
            <li key={c.id} className="parking-item chip">
              <span className="parking-dot" aria-hidden="true" />
              <div className="parking-item-body">
                <span className="parking-item-title">
                  {t("parking.reportedAgo", { minutes: minutesAgo(c.created_at) })}
                </span>
                {c.note && <span className="parking-item-note">{c.note}</span>}
              </div>
              <button
                type="button"
                className="mini-btn"
                onClick={() => void markTaken(c.id)}
              >
                {t("parking.takeBtn")}
              </button>
              {isAdmin && (
                <button
                  type="button"
                  className="mini-btn danger"
                  onClick={() => void removeAsAdmin(c.id)}
                >
                  {t("parking.removeBtn")}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {spots.length > 0 && (
        <ul className="parking-list">
          {spots.map((s) => (
            <li key={`${s.source}-${s.id}`} className="parking-item legal">
              <span className="parking-dot legal" aria-hidden="true" />
              <div className="parking-item-body">
                <span className="parking-item-title">
                  {s.name ?? t("parking.unnamedSpot")}
                </span>
                {s.capacity != null && (
                  <span className="parking-item-note">
                    {t("parking.capacity", { count: s.capacity })}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {stage === "idle" && (
        <button
          type="button"
          className="mini-btn parking-report-btn"
          onClick={beginReport}
        >
          {t("parking.reportBtn")}
        </button>
      )}

      {stage === "locating" && (
        <p className="muted parking-locating">{t("parking.locating")}</p>
      )}

      {(stage === "placing" || stage === "submitting") && pin && (
        <div className="parking-report">
          <p className="muted" style={{ marginTop: 0 }}>
            {t("parking.placeHelp")}
          </p>
          <PinPickerMap center={pin} point={pin} onMove={setPin} />
          <textarea
            className="text-input"
            rows={2}
            placeholder={t("parking.notePlaceholder")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="route-tools">
            <button
              type="button"
              className="mini-btn"
              onClick={() => void confirmReport()}
              disabled={stage === "submitting"}
            >
              {stage === "submitting" ? t("org.working") : t("parking.confirmBtn")}
            </button>
            <button
              type="button"
              className="mini-btn"
              onClick={cancelReport}
              disabled={stage === "submitting"}
            >
              {t("org.clear")}
            </button>
          </div>
        </div>
      )}

      {ok && <p className="parking-ok">{t("parking.reportedOk")}</p>}
      {error && <p className="error-text">{error}</p>}
      <p className="muted parking-note-fine">{t("parking.gpsNote")}</p>
    </div>
  );
}
