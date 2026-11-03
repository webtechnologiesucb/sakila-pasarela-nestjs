import { statusClass } from '../utils/format';

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return <span className={statusClass(status)}>{label || status}</span>;
}
