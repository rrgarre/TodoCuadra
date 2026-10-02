import { useEffect } from "react";
import { SheetProvider, useSheet } from "./state/SheetContext.jsx";
import HomeScreen from "./components/layout/HomeScreen.jsx";
import SectionScreen from "./components/layout/SectionScreen.jsx";
import SummaryScreen from "./components/layout/SummaryScreen.jsx";

function Shell() {
  const { state } = useSheet();

  // Al cambiar de pantalla o de ejercicio, volvemos arriba.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [state.screen, state.sectionIndex, state.itemIndex]);

  return (
    <div className="app">
      {state.screen === "home" && <HomeScreen />}
      {state.screen === "section" && <SectionScreen />}
      {state.screen === "summary" && <SummaryScreen />}
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
