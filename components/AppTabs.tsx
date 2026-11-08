"use client";
// Owner: Arya — "New check" / "History" switcher under the top bar.
import styles from "./history.module.css";

interface Props {
  current: "new" | "history";
  disabled?: boolean;
  onNew: () => void;
  onHistory: () => void;
}

export default function AppTabs({ current, disabled, onNew, onHistory }: Props) {
  return (
    <nav className={`lc-wrap ${styles.tabs}`} aria-label="LeaseCheck sections">
      <button
        type="button"
        className={styles.tab}
        aria-current={current === "new" ? "page" : undefined}
        disabled={disabled}
        onClick={onNew}
      >
        New check
      </button>
      <button
        type="button"
        className={styles.tab}
        aria-current={current === "history" ? "page" : undefined}
        disabled={disabled}
        onClick={onHistory}
      >
        History
      </button>
    </nav>
  );
}
