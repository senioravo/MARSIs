import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { linkTo } from "../../router";
import { Ico } from "../art/Icons";
import type { ColonyConfig, SimState } from "../engine/types";
import type { StorageMode } from "../api";
import { saveColony } from "../api";
import { Projection } from "./Projection";
import { STEPS } from "./stepList";
import { cx } from "../ui";
import styles from "./Builder.module.css";
import sim from "../Sim.module.css";

export interface StepProps {
  config: ColonyConfig;
  update: (fn: (draft: ColonyConfig) => void) => void;
  replace: (c: ColonyConfig) => void;
  storage: StorageMode | null;
  onResume: (s: SimState) => void;
  onLoadDesign: (c: ColonyConfig, id: string) => void;
}

export function Builder({
  config,
  onChange,
  colonyId,
  onColonyId,
  storage,
  onLaunch,
  onResume,
}: {
  config: ColonyConfig;
  onChange: (c: ColonyConfig) => void;
  colonyId?: string;
  onColonyId: (id: string | undefined) => void;
  storage: StorageMode | null;
  onLaunch: () => void;
  onResume: (s: SimState) => void;
}) {
  const [step, setStep] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const deferred = useDeferredValue(config);

  const update = (fn: (draft: ColonyConfig) => void) => {
    const draft = structuredClone(config);
    fn(draft);
    onChange(draft);
  };

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 3200);
    return () => clearTimeout(t);
  }, [note]);

  const Step = STEPS[step].Component;
  const progress = useMemo(() => (step / (STEPS.length - 1)) * 100, [step]);

  const save = async () => {
    try {
      const id = await saveColony(config, colonyId);
      onColonyId(id);
      setNote(storage === "database" ? "Colony design saved to the database." : "Colony design saved in this browser.");
    } catch (e) {
      setNote(`Could not save: ${(e as Error).message}`);
    }
  };

  return (
    <div className={styles.builder}>
      <header className={sim.topbar}>
        <a href="/" onClick={linkTo("/")} className={sim.brand}>
          <Ico name="back" size={16} />
          <span className={sim.brandMark} aria-hidden="true" />
          MARSIS
        </a>
        <div className={sim.topTitle}>
          <span className={sim.topKicker}>Colony simulator</span>
          <span className={sim.topName}>{config.name || "Unnamed colony"}</span>
        </div>
        <div className={sim.topActions}>
          <span className={sim.storageBadge} title={storage === "database" ? "Connected to the MARSIS database" : "No database connected — saving in this browser"}>
            <span className={cx(sim.storageDot, storage === "database" && sim.storageOn)} aria-hidden="true" />
            {storage === null ? "Checking storage" : storage === "database" ? "Database" : "Browser storage"}
          </span>
          <button type="button" className={sim.btnGhost} onClick={save}>
            <Ico name="save" size={15} /> Save design
          </button>
          <button type="button" className={sim.btnPrimary} onClick={onLaunch}>
            Launch simulation
          </button>
        </div>
      </header>

      <div className={styles.layout}>
        <nav className={styles.rail} aria-label="Builder steps">
          <div className={styles.railLine} aria-hidden="true">
            <span style={{ height: `${progress}%` }} />
          </div>
          <ol>
            {STEPS.map((s, i) => (
              <li key={s.id}>
                <button type="button" className={cx(styles.railItem, i === step && styles.railOn, i < step && styles.railDone)} onClick={() => setStep(i)} aria-current={i === step ? "step" : undefined}>
                  <span className={styles.railNum}>{i + 1}</span>
                  <span className={styles.railText}>
                    <span className={styles.railLabel}>{s.label}</span>
                    <span className={styles.railSummary}>{s.summary(config)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <main className={styles.main}>
          <div className={styles.stepHead} key={`h${step}`}>
            <span className={styles.stepCount}>
              Step {step + 1} of {STEPS.length}
            </span>
            <h1 className={styles.stepTitle}>{STEPS[step].title}</h1>
            <p className={styles.stepIntro}>{STEPS[step].intro}</p>
          </div>
          <div className={styles.stepBody} key={`b${step}`}>
            <Step
              config={config}
              update={update}
              replace={onChange}
              storage={storage}
              onResume={onResume}
              onLoadDesign={(c, id) => {
                onChange(c);
                onColonyId(id);
                setNote(`Loaded “${c.name}”.`);
              }}
            />
          </div>
          <footer className={styles.stepNav}>
            <button type="button" className={sim.btnGhost} onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
              Previous
            </button>
            {step < STEPS.length - 1 ? (
              <button type="button" className={sim.btnPrimary} onClick={() => setStep((s) => s + 1)}>
                Next: {STEPS[step + 1].label}
              </button>
            ) : (
              <button type="button" className={sim.btnPrimary} onClick={onLaunch}>
                Launch simulation
              </button>
            )}
          </footer>
        </main>

        <aside className={styles.side}>
          <Projection config={deferred} stale={deferred !== config} />
        </aside>
      </div>
      {note && (
        <div className={sim.toast} role="status">
          {note}
        </div>
      )}
    </div>
  );
}
