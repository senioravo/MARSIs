import { Suspense, lazy } from "react";
import { Nav } from "./components/Nav";
import { PreHero } from "./components/PreHero";
import { Hero } from "./components/Hero";
import { ScrollGallery } from "./components/ScrollGallery";
import { Challenge } from "./components/Challenge";
import { ResourceIntelligence } from "./components/ResourceIntelligence";
import { PredictiveOperations } from "./components/PredictiveOperations";
import { ColonyCommand } from "./components/ColonyCommand";
import { DecisionEngine } from "./components/DecisionEngine";
import { ProductShowcase } from "./components/ProductShowcase";
import { Scale } from "./components/Scale";
import { Reliability } from "./components/Reliability";
import { FinalCTA } from "./components/FinalCTA";
import { Footer } from "./components/Footer";
import { usePath } from "./router";

const SimulatorApp = lazy(() => import("./simulator/SimulatorApp"));

function Landing() {
  return (
    <>
      <div className="atmosphere" />
      <div className="noise-vignette" />
      <Nav />
      <PreHero />
      <main>
        <Hero />
        <ScrollGallery />
        <Challenge />
        <ResourceIntelligence />
        <PredictiveOperations />
        <ColonyCommand />
        <DecisionEngine />
        <ProductShowcase />
        <Scale />
        <Reliability />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}

function App() {
  const path = usePath();
  if (path.startsWith("/simulator")) {
    return (
      <Suspense fallback={<div className="sim-boot">Opening the simulator…</div>}>
        <SimulatorApp />
      </Suspense>
    );
  }
  return <Landing />;
}

export default App;
