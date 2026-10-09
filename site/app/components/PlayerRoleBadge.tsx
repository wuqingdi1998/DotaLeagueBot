import styles from "./PlayerRoleBadge.module.css";

export function PlayerRoleBadge({ positions }: { positions?: string | null }) {
  return (
    <span className={styles.badge} title="Игровые позиции"
      aria-label={positions ? `Игровые позиции: ${positions}` : "Игровые позиции не указаны"}>
      {positions || "—"}
    </span>
  );
}
