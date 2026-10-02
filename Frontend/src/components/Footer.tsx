import styles from "./Footer.module.css";

const columns = [
  {
    title: "Platform",
    links: ["Resource Intelligence", "Predictive Operations", "Colony Command", "Decision Engine"],
  },
  {
    title: "Company",
    links: ["Mission", "Careers", "Contact"],
  },
  {
    title: "Legal",
    links: ["Privacy", "Terms"],
  },
];

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`section-inner ${styles.inner}`}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <span className={styles.logo}>MARSIS</span>
            <p className={styles.tagline}>The infrastructure layer for life on Mars.</p>
          </div>

          <div className={styles.columns}>
            {columns.map((col) => (
              <div className={styles.column} key={col.title}>
                <span className={styles.columnTitle}>{col.title}</span>
                <ul>
                  {col.links.map((link) => (
                    <li key={link}>
                      <a href="#top">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.bottom}>
          <span>© 2026 MARSIS. Mars Systems &amp; Infrastructure Suite.</span>
          <span className={styles.mono}>BUILT FOR THE FIRST HABITAT.</span>
        </div>
      </div>
    </footer>
  );
}
