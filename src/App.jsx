import { useEffect, useState } from "react";
import { SheetProvider, useSheet } from "./state/SheetContext.jsx";
import HomeScreen from "./components/layout/HomeScreen.jsx";
import SectionScreen from "./components/layout/SectionScreen.jsx";
import SummaryScreen from "./components/layout/SummaryScreen.jsx";
import TrivialScreen from "./components/layout/TrivialScreen.jsx";
import RomanosScreen from "./components/layout/RomanosScreen.jsx";

function Shell() {
  const { state } = useSheet();
  // El Trivial y los Números romanos son apartados aparte: viven fuera
  // del flujo de fichas.
  const [trivial, setTrivial] = useState(false);
  const [romanos, setRomanos] = useState(false);

  // Al cambiar de pantalla o de ejercicio, volvemos arriba.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [state.screen, state.sectionIndex, state.itemIndex, trivial, romanos]);

  return (
    <div className="app">
      {trivial ? (
        <TrivialScreen onExit={() => setTrivial(false)} />
      ) : romanos ? (
        <RomanosScreen onExit={() => setRomanos(false)} />
      ) : (
        <>
          {state.screen === "home" && (
            <HomeScreen
              onOpenTrivial={() => setTrivial(true)}
              onOpenRomanos={() => setRomanos(true)}
            />
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
