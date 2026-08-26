import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "./hooks/useTheme";
import { useSmoothScroll } from "./hooks/useSmoothScroll";
import { useAuth } from "./hooks/useAuth";
import { Header } from "./components/Header";
import { Disclosure } from "./components/Disclosure";
import { MarchesFeed } from "./components/MarchesFeed";
import { OrganizationsView } from "./components/OrganizationsView";
import { OrganizerPanel } from "./components/OrganizerPanel";
import type { Lang } from "./lib/types";

type View = "feed" | "orgs" | "organizer";

export function App() {
  const { t, i18n } = useTranslation();
  const { theme, toggle } = useTheme();
  useSmoothScroll();
  const auth = useAuth();
  const [view, setView] = useState<View>("feed");
  const [reloadKey, setReloadKey] = useState(0);
  const lang: Lang = i18n.language.startsWith("es") ? "es" : "en";

  // Keep the public feed data fresh; the organizer panel handles its own nav.
  const onCreated = () => setReloadKey((k) => k + 1);

  return (
    <>
      <Disclosure />
      <Header
        theme={theme}
        onToggleTheme={toggle}
        organizerActive={view === "organizer"}
        onToggleOrganizer={() =>
          setView((v) => (v === "organizer" ? "feed" : "organizer"))
        }
      />
      <main>
        {view === "organizer" ? (
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
                <MarchesFeed key={reloadKey} lang={lang} auth={auth} />
              </>
            ) : (
              <OrganizationsView lang={lang} />
            )}
          </>
        )}
      </main>
    </>
  );
}
