import { useId, useState } from 'react';
import type { AdminAiDailyUsagePoint } from '../types';

interface AdminAiUsageChartProps {
  data: AdminAiDailyUsagePoint[];
}

export function AdminAiUsageChart({ data }: AdminAiUsageChartProps) {
  const chartId = useId();
  const [hoveredPoint, setHoveredPoint] =
    useState<AdminAiDailyUsagePoint | null>(null);

  if (data.length === 0) {
    return (
      <div
        className="flex h-64 items-center justify-center rounded-card border border-border bg-card p-6 text-sm text-muted-foreground"
        data-testid="ai-chart-empty"
      >
        No daily usage telemetry available for the selected period.
      </div>
    );
  }

  const maxCalls = Math.max(
    ...data.map((d) =>
      Math.max(d.total_calls, d.successful_calls + d.failed_calls),
    ),
    5,
  );

  // SVG viewBox settings
  const width = 800;
  const height = 220;
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const stepX =
    data.length > 1 ? chartWidth / (data.length - 1) : chartWidth / 2;

  // Generate path data for total calls and successful calls
  const points = data.map((d, index) => {
    const x =
      data.length === 1
        ? paddingLeft + chartWidth / 2
        : paddingLeft + index * stepX;
    const yTotal =
      paddingTop + chartHeight - (d.total_calls / maxCalls) * chartHeight;
    const ySuccess =
      paddingTop + chartHeight - (d.successful_calls / maxCalls) * chartHeight;
    const yFail =
      paddingTop + chartHeight - (d.failed_calls / maxCalls) * chartHeight;

    return { ...d, x, yTotal, ySuccess, yFail };
  });

  const totalPath = points
    .map(
      (p, i) =>
        `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.yTotal.toFixed(1)}`,
    )
    .join(' ');

  const successPath = points
    .map(
      (p, i) =>
        `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.ySuccess.toFixed(1)}`,
    )
    .join(' ');

  const areaTotalPath = `${totalPath} L ${points[points.length - 1].x.toFixed(1)} ${(paddingTop + chartHeight).toFixed(1)} L ${points[0].x.toFixed(1)} ${(paddingTop + chartHeight).toFixed(1)} Z`;

  // Format short date for axis
  function formatTickDate(dateStr: string): string {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[1]}/${parts[2]}`;
    }
    return dateStr;
  }

  // Calculate ticks for Y axis
  const yTicks = [0, Math.round(maxCalls / 2), maxCalls];

  // Pick select dates for X axis to avoid overcrowding
  const labelInterval = Math.max(1, Math.ceil(data.length / 7));
  const xLabels = points.filter(
    (_, i) => i === 0 || i === points.length - 1 || i % labelInterval === 0,
  );

  return (
    <div
      className="rounded-card border border-border bg-card p-5 shadow-card"
      data-testid="ai-usage-chart"
    >
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Daily AI call volume
          </h2>
          <p className="text-xs text-muted-foreground">
            Total requests, successful replies, and failed or throttled calls.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-full bg-primary" />
            <span className="text-muted-foreground">Total calls</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-full bg-positive" />
            <span className="text-muted-foreground">Successful</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-full bg-destructive" />
            <span className="text-muted-foreground">Errors / limits</span>
          </div>
        </div>
      </div>

      {/* Hover details tooltip */}
      <div
        className="mt-3 flex min-h-[32px] items-center justify-between rounded-control bg-muted/50 px-3 py-1.5 text-xs text-foreground"
        aria-live="polite"
      >
        {hoveredPoint ? (
          <>
            <span className="font-semibold text-foreground">
              {hoveredPoint.date}
            </span>
            <div className="flex items-center gap-4">
              <span>
                Total:{' '}
                <strong className="text-primary">
                  {hoveredPoint.total_calls}
                </strong>
              </span>
              <span>
                Success:{' '}
                <strong className="text-positive">
                  {hoveredPoint.successful_calls}
                </strong>
              </span>
              <span>
                Failed:{' '}
                <strong className="text-destructive">
                  {hoveredPoint.failed_calls}
                </strong>
              </span>
              <span>
                Tokens:{' '}
                <strong>
                  {hoveredPoint.total_tokens.toLocaleString('en-US')}
                </strong>
              </span>
              <span>
                Avg Latency: <strong>{hoveredPoint.avg_latency_ms} ms</strong>
              </span>
            </div>
          </>
        ) : (
          <span className="text-muted-foreground">
            Hover over any day point to inspect latency, tokens, and errors.
          </span>
        )}
      </div>

      <div className="relative mt-2 w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[500px] h-auto overflow-visible select-none"
          role="img"
          aria-labelledby={`${chartId}-title`}
        >
          <title id={`${chartId}-title`}>Daily AI request volume chart</title>
          <defs>
            <linearGradient
              id={`${chartId}-gradient`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="var(--color-primary)"
                stopOpacity="0.15"
              />
              <stop
                offset="100%"
                stopColor="var(--color-primary)"
                stopOpacity="0"
              />
            </linearGradient>
          </defs>

          {/* Grid lines and Y axis ticks */}
          {yTicks.map((tick) => {
            const y =
              paddingTop + chartHeight - (tick / maxCalls) * chartHeight;
            return (
              <g key={`y-${tick}`}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="currentColor"
                  className="text-border"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-muted-foreground text-[10px] font-mono"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Shaded Area */}
          <path d={areaTotalPath} fill={`url(#${chartId}-gradient)`} />

          {/* Total Line */}
          <path
            d={totalPath}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Success Line */}
          <path
            d={successPath}
            fill="none"
            stroke="var(--color-positive)"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="2 2"
          />

          {/* Data Points */}
          {points.map((p) => (
            <g
              key={p.date}
              tabIndex={0}
              role="button"
              aria-label={`${p.date}: ${p.total_calls} calls, ${p.successful_calls} successful, ${p.failed_calls} failed`}
              onMouseEnter={() => setHoveredPoint(p)}
              onMouseLeave={() => setHoveredPoint(null)}
              onFocus={() => setHoveredPoint(p)}
              onBlur={() => setHoveredPoint(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setHoveredPoint(p);
                }
              }}
              className="cursor-pointer transition-transform hover:scale-125 focus-visible:outline-none"
            >
              {/* Invisible large hit area */}
              <circle cx={p.x} cy={p.yTotal} r={12} fill="transparent" />

              {/* Total Call Point */}
              <circle
                cx={p.x}
                cy={p.yTotal}
                r={hoveredPoint?.date === p.date ? 5 : 3.5}
                className="fill-primary stroke-card"
                strokeWidth="2"
              />

              {/* Fail Call Indicator (red dot when failed > 0) */}
              {p.failed_calls > 0 && (
                <circle
                  cx={p.x}
                  cy={p.yFail}
                  r={3}
                  className="fill-destructive stroke-card"
                  strokeWidth="1.5"
                />
              )}
            </g>
          ))}

          {/* X axis labels */}
          {xLabels.map((p) => (
            <text
              key={`x-${p.date}`}
              x={p.x}
              y={height - 12}
              textAnchor="middle"
              className="fill-muted-foreground text-[10px] font-mono"
            >
              {formatTickDate(p.date)}
            </text>
          ))}
        </svg>
      </div>

      {/* Accessible data table for screen readers */}
      <table className="sr-only">
        <caption>Daily AI Call Volume</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Total Calls</th>
            <th scope="col">Successful Calls</th>
            <th scope="col">Failed Calls</th>
            <th scope="col">Tokens</th>
            <th scope="col">Avg Latency (ms)</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <td>{d.date}</td>
              <td>{d.total_calls}</td>
              <td>{d.successful_calls}</td>
              <td>{d.failed_calls}</td>
              <td>{d.total_tokens}</td>
              <td>{d.avg_latency_ms}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
