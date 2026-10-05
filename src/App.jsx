import { useEffect, useState } from "react";
import { SheetProvider, useSheet } from "./state/SheetContext.jsx";
import HomeScreen from "./components/layout/HomeScreen.jsx";
import SectionScreen from "./components/layout/SectionScreen.jsx";
import SummaryScreen from "./components/layout/SummaryScreen.jsx";
import TrivialScreen from "./components/layout/TrivialScreen.jsx";

function Shell() {
  const { state } = useSheet();
  // El Trivial es un apartado aparte: vive fuera del flujo de fichas.
  const [trivial, setTrivial] = useState(false);

  // Al cambiar de pantalla o de ejercicio, volvemos arriba.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [state.screen, state.sectionIndex, state.itemIndex, trivial]);

  return (
    <div className="app">
      {trivial ? (
        <TrivialScreen onExit={() => setTrivial(false)} />
      ) : (
        <>
          {state.screen === "home" && (
            <HomeScreen onOpenTrivial={() => setTrivial(true)} />
          )}
          {state.screen === "section" && <SectionScreen />}
          {state.screen === "summary" && <SummaryScreen />}
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <SheetProvider>
      <Shell />
    </SheetProvider>
  );
}
