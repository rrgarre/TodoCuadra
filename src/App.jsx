import { useEffect, useState } from "react";
import { SheetProvider, useSheet } from "./state/SheetContext.jsx";
import HomeScreen from "./components/layout/HomeScreen.jsx";
import SectionScreen from "./components/layout/SectionScreen.jsx";
import SummaryScreen from "./components/layout/SummaryScreen.jsx";
import TrivialScreen from "./components/layout/TrivialScreen.jsx";
import RomanosScreen from "./components/layout/RomanosScreen.jsx";
import LingoScreen from "./components/layout/LingoScreen.jsx";

function Shell() {
  const { state } = useSheet();
  // El Trivial, los Números romanos y el Lingo son apartados aparte:
  // viven fuera del flujo de fichas.
  const [trivial, setTrivial] = useState(false);
  const [romanos, setRomanos] = useState(false);
  const [lingo, setLingo] = useState(false);

  // Al cambiar de pantalla o de ejercicio, volvemos arriba.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [state.screen, state.sectionIndex, state.itemIndex, trivial, romanos, lingo]);

  return (
    <div className="app">
      {trivial ? (
        <TrivialScreen onExit={() => setTrivial(false)} />
      ) : romanos ? (
        <RomanosScreen onExit={() => setRomanos(false)} />
      ) : lingo ? (
        <LingoScreen onExit={() => setLingo(false)} />
      ) : (
        <>
          {state.screen === "home" && (
            <HomeScreen
              onOpenTrivial={() => setTrivial(true)}
              onOpenRomanos={() => setRomanos(true)}
              onOpenLingo={() => setLingo(true)}
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
