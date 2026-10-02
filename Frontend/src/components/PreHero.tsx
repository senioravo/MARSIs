import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import preHeroImg from "../assets/pre-hero.webp";
import styles from "./PreHero.module.css";

const WORD = "MARSIS";
const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const SCRAMBLE_STEPS = 9;
const STEP_MS = 30;
const LETTER_STAGGER = 230;

export function PreHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.75, 1], [1, 1, 0]);
  const bgScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -60]);

  const [chars, setChars] = useState<string[]>(() => WORD.split("").map(() => ""));
  const [lockedCount, setLockedCount] = useState(0);
  const [showDiscover, setShowDiscover] = useState(false);
  const [widths, setWidths] = useState<number[]>(() => WORD.split("").map(() => 0));
  const measureRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const measure = () => {
      const spans = measureRef.current?.querySelectorAll("span");
      if (!spans) return;
      setWidths(Array.from(spans).map((el) => el.getBoundingClientRect().width));
    };
    measure();
    document.fonts?.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    WORD.split("").forEach((letter, i) => {
      const start = i * LETTER_STAGGER;

      for (let s = 0; s < SCRAMBLE_STEPS; s++) {
        timeouts.push(
          setTimeout(() => {
            setChars((prev) => {
              const next = [...prev];
              next[i] = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
              return next;
            });
          }, start + s * STEP_MS)
        );
      }

      timeouts.push(
        setTimeout(() => {
          setChars((prev) => {
            const next = [...prev];
            next[i] = letter;
            return next;
          });
          setLockedCount((c) => c + 1);
        }, start + SCRAMBLE_STEPS * STEP_MS)
      );
    });

    timeouts.push(
      setTimeout(
        () => setShowDiscover(true),
        (WORD.length - 1) * LETTER_STAGGER + SCRAMBLE_STEPS * STEP_MS + 450
      )
    );

    return () => timeouts.forEach(clearTimeout);
  }, []);

  return (
    <section id="top" ref={sectionRef} className={styles.section}>
      <motion.div className={styles.pin} style={{ opacity }}>
        <motion.div className={styles.bg} style={{ scale: bgScale }}>
          <img src={preHeroImg} alt="Astronaut overlooking a Martian habitat" className={styles.bgImage} />
        </motion.div>
        <div className={styles.scrim} />

        <motion.div className={styles.content} style={{ y: contentY }}>
          <h1 className={`${styles.wordmark} ${styles.measure}`} ref={measureRef} aria-hidden="true">
            {WORD.split("").map((letter, i) => (
              <span key={i} className={styles.letter}>
                {letter}
              </span>
            ))}
          </h1>
          <h1 className={styles.wordmark} aria-label={WORD}>
            {chars.map((c, i) => (
              <span
                key={i}
                aria-hidden="true"
                style={{ width: widths[i] || undefined }}
                className={`${styles.letter} ${i < lockedCount ? styles.letterLocked : ""}`}
              >
                {c || " "}
              </span>
            ))}
          </h1>

          <motion.a
            href="#hero"
            className={styles.discover}
            initial={{ opacity: 0, y: 10 }}
            animate={showDiscover ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <span>Discover</span>
            <motion.span
              className={styles.arrow}
              animate={{ y: [0, 7, 0] }}
              transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut" }}
            >
              ↓
            </motion.span>
          </motion.a>
        </motion.div>
      </motion.div>
    </section>
  );
}
