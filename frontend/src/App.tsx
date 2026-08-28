import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "./hooks/useTheme";
import { useSmoothScroll } from "./hooks/useSmoothScroll";
import { useAuth } from "./hooks/useAuth";
import { useProtests } from "./hooks/useProtests";
import { useMarchChips } from "./hooks/useMarchChips";
import { Header } from "./components/Header";
import { Disclosure } from "./components/Disclosure";
import { MarchesFeed } from "./components/MarchesFeed";
import { OrganizationsView } from "./components/OrganizationsView";
import { OrganizerPanel } from "./components/OrganizerPanel";
import { BottomBar } from "./components/BottomBar";
import { TopSearchBar } from "./components/TopSearchBar";
import { MapScreen } from "./components/MapScreen";
import type { Lang } from "./lib/types";

type View = "feed" | "orgs" | "organizer" | "map";

export function App() {
  const { t, i18n } = useTranslation();
  const { theme, toggle } = useTheme();
  useSmoothScroll();
  const auth = useAuth();
  const [view, setView] = useState<View>("feed");
  const [reloadKey, setReloadKey] = useState(0);
  const [q, setQ] = useState("");
  const lang: Lang = i18n.language.startsWith("es") ? "es" : "en";
  const { marches, loading, usingSample } = useProtests(lang);
  const { chips, bump: bumpChips } = useMarchChips(marches);

  // Keep the public feed data fresh; the organizer panel handles its own nav.
  const onCreated = () => setReloadKey((k) => k + 1);

  const isMap = view === "map";

  return (
    <>
      <Disclosure />
      {!isMap && <Header />}
      <main className={isMap ? "map-main" : undefined}>
        {isMap ? (
          <MapScreen
            marches={marches}
            chips={chips}
            q={q}
            lang={lang}
            auth={auth}
            onChipsChanged={bumpChips}
          />
        ) : view === "organizer" ? (
          <OrganizerPanel auth={auth} lang={lang} onCreated={onCreated} />
        ) : (
          <>
            <nav className="pubnav container" aria-label="Sections">
              <button
                type="button"
                className={view === "feed" ? "pubnav-btn on" : "pubnav-btn"}
                aria-pressed={view === "feed"}
                onClick={() => setView("feed")}
              >
                {t("nav.marches")}
              </button>
              <button
                type="button"
                className={view === "orgs" ? "pubnav-btn on" : "pubnav-btn"}
                aria-pressed={view === "orgs"}
                onClick={() => setView("orgs")}
              >
                {t("nav.orgs")}
              </button>
            </nav>

            {view === "feed" ? (
              <>
                <section className="hero container">
                  <span className="kicker">{t("hero.kicker")}</span>
                  <h1>
                    {t("hero.titleLine1")}
                    <br />
                    <em>{t("hero.titleAccent")}</em>
                  </h1>
                  <p className="lede">{t("hero.lede")}</p>
                </section>
                <MarchesFeed
                  key={reloadKey}
                  lang={lang}
                  auth={auth}
                  marches={marches}
                  loading={loading}
                  usingSample={usingSample}
                  chips={chips}
                  onChipsChanged={bumpChips}
                  onOpenMap={() => setView("map")}
                  q={q}
                />
              </>
            ) : (
              <OrganizationsView lang={lang} />
            )}
          </>
        )}
      </main>

      {isMap && <TopSearchBar q={q} onQChange={setQ} />}
      <BottomBar
        mode={isMap ? "map" : "home"}
        q={q}
        onQChange={setQ}
        onHome={() => setView("feed")}
        onToggleMap={() => setView((v) => (v === "map" ? "feed" : "map"))}
        theme={theme}
        onToggleTheme={toggle}
        organizerActive={view === "organizer"}
        onToggleOrganizer={() =>
          setView((v) => (v === "organizer" ? "feed" : "organizer"))
        }
      />
    </>
  );
}
