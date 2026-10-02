import { useEffect, useState } from "react";
import { linkTo } from "../router";
import styles from "./Nav.module.css";

const LINKS = [
  { label: "Resource Intelligence", href: "#resource-intelligence" },
  { label: "Predictive Operations", href: "#predictive-operations" },
  { label: "Colony Command", href: "#colony-command" },
  { label: "Scale", href: "#scale" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
      setRevealed(window.scrollY > window.innerHeight * 0.65);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`${styles.nav} ${scrolled ? styles.scrolled : ""} ${revealed ? styles.revealed : ""}`}
    >
      <a href="#top" className={styles.logo}>
        <span className={styles.mark} aria-hidden="true" />
        MARSIS
      </a>
      <nav className={styles.links}>
        {LINKS.map((link) => (
          <a key={link.href} href={link.href} className={styles.link}>
            {link.label}
          </a>
        ))}
      </nav>
      <a href="/simulator" onClick={linkTo("/simulator")} className={styles.cta}>
        Try our simulator
      </a>
    </header>
  );
}
