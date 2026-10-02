import { useEffect, useState } from "react";
import { Builder } from "./builder/Builder";
import { Dashboard } from "./dashboard/Dashboard";
import { createState } from "./engine/create";
import { presetConfig } from "./engine/presets";
import type { ColonyConfig, SimState } from "./engine/types";
import { storageMode, type StorageMode } from "./api";
import styles from "./Sim.module.css";

export default function SimulatorApp() {
  const [config, setConfig] = useState<ColonyConfig>(() => presetConfig("settlement"));
  const [colonyId, setColonyId] = useState<string | undefined>();
  const [run, setRun] = useState<SimState | null>(null);
  const [mode, setMode] = useState<StorageMode | null>(null);

  useEffect(() => {
    document.title = "Colony simulator — MARSIS";
    storageMode().then(setMode);
    return () => {
      document.title = "MARSIS — The Infrastructure Layer for Life on Mars";
    };
  }, []);

  return (
    <div className={styles.root}>
      {run ? (
        <Dashboard
          key={run.id}
          initial={run}
          storage={mode}
          onExit={(edit) => {
            if (edit) setConfig(structuredClone(run.config));
            setRun(null);
            window.scrollTo({ top: 0 });
          }}
          onRestart={() => setRun(createState({ ...run.config }))}
        />
      ) : (
        <Builder
          config={config}
          onChange={setConfig}
          colonyId={colonyId}
          onColonyId={setColonyId}
          storage={mode}
          onLaunch={() => {
            setRun(createState(config));
            window.scrollTo({ top: 0 });
          }}
          onResume={(s) => setRun(s)}
        />
      )}
    </div>
  );
}
