import type { TimelinePoint } from '../types';
import { formatMoney } from '../utils/format';

export function SalesChart({
  points,
  title = 'Ventas de los últimos días',
}: {
  points: TimelinePoint[];
  title?: string;
}) {
  const max = Math.max(...points.map((point) => Number(point.total)), 1);

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3>{title}</h3>
        <span className="chart-total">
          {formatMoney(points.reduce((sum, point) => sum + Number(point.total), 0))}
        </span>
      </div>
      <div className="bar-chart" role="img" aria-label={title}>
        {points.map((point) => {
          const height = Math.max(4, Math.round((Number(point.total) / max) * 100));
          return (
            <div
              className="bar-column"
              key={point.date}
              title={`${point.date}: ${formatMoney(point.total)} (${point.count} tx)`}
            >
              <div className="bar-track">
                <div className="bar-fill" style={{ height: `${height}%` }} />
              </div>
              <span className="bar-label">{point.date.slice(5)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
