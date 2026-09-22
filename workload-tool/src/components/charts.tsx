import type { ReactNode } from "react";

// Charts as inline SVG — no charting dependency, nothing shipped to the client.
//
// Palette slots are validated (dataviz six-checks, light surface #ffffff):
//   series A / B      #2a78d6 / #eb6834   adjacent CVD ΔE 24.7
//   on time / breached #2a78d6 / #d03b3b  adjacent CVD ΔE 23.8
//     (green/red was rejected: ΔE 4.1 deutan — the red-green confusion)
//   complexity ordinal #86b6ef→#3987e5→#1c5cab  monotone, single hue
//
// Every chart carries a legend when it has two series, direct labels where they
// fit, and a <title> per mark so hovering states the value. Colour never carries
// meaning on its own.

export const VIZ = {
  seriesA: "#2a78d6",
  seriesB: "#eb6834",
  onTime: "#2a78d6",
  breached: "#d03b3b",
  ordinal: ["#86b6ef", "#3987e5", "#1c5cab"],
  grid: "#e1e0d9",
  axis: "#c3c2b7",
  muted: "#898781",
  ink: "#52514e",
} as const;

export function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 10 }}>
      {items.map((i) => (
        <span
          key={i.label}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: VIZ.ink }}
        >
          <span
            aria-hidden
            style={{ width: 10, height: 10, borderRadius: 3, background: i.color, display: "inline-block" }}
          />
          {i.label}
        </span>
      ))}
    </div>
  );
}

/** Screen-reader and no-colour fallback for every chart. */
export function DataTable({
  caption,
  head,
  rows,
}: {
  caption: string;
  head: string[];
  rows: (string | number)[][];
}) {
  return (
    <details style={{ marginTop: 10 }}>
      <summary style={{ cursor: "pointer", fontSize: 12, color: VIZ.muted }}>
        View {caption} as a table
      </summary>
      <table className="table" style={{ marginTop: 8 }}>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className={typeof c === "number" ? "tnum" : undefined}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

export interface GroupedBarDatum {
  label: string;
  a: number;
  b: number;
}

/**
 * Two series over time, side by side.
 *
 * Grouped rather than stacked: received and resolved are independent counts, and
 * stacking them would imply a total that means nothing.
 */
export function GroupedBars({
  data,
  labelA,
  labelB,
  height = 190,
}: {
  data: GroupedBarDatum[];
  labelA: string;
  labelB: string;
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.a, d.b)));
  const W = 760;
  const padL = 30;
  const padB = 26;
  const padT = 10;
  const plotH = height - padB - padT;
  const slot = (W - padL) / Math.max(1, data.length);
  const barW = Math.max(3, Math.min(11, slot / 2 - 3));

  const y = (v: number) => padT + plotH - (v / max) * plotH;

  return (
    <>
      <Legend items={[{ color: VIZ.seriesA, label: labelA }, { color: VIZ.seriesB, label: labelB }]} />
      <svg viewBox={`0 0 ${W} ${height}`} width="100%" height={height} role="img"
           aria-label={`${labelA} and ${labelB} per day`}>
        {[0, 0.5, 1].map((f) => (
          <line key={f} x1={padL} x2={W} y1={padT + plotH * f} y2={padT + plotH * f}
                stroke={VIZ.grid} strokeWidth={1} />
        ))}
        {[max, Math.round(max / 2)].map((v, i) => (
          <text key={v} x={0} y={y(v) + 4} fontSize={10} fill={VIZ.muted}>
            {i === 0 ? max : Math.round(max / 2)}
          </text>
        ))}

        {data.map((d, i) => {
          const x = padL + i * slot + slot / 2;
          return (
            <g key={d.label}>
              {/* 2px surface gap between the pair, per the mark spec. */}
              <rect x={x - barW - 1} y={y(d.a)} width={barW} height={Math.max(0, padT + plotH - y(d.a))}
                    fill={VIZ.seriesA} rx={3}>
                <title>{`${d.label}: ${d.a} ${labelA.toLowerCase()}`}</title>
              </rect>
              <rect x={x + 1} y={y(d.b)} width={barW} height={Math.max(0, padT + plotH - y(d.b))}
                    fill={VIZ.seriesB} rx={3}>
                <title>{`${d.label}: ${d.b} ${labelB.toLowerCase()}`}</title>
              </rect>
              {i % Math.ceil(data.length / 7) === 0 && (
                <text x={x} y={height - 8} fontSize={10} fill={VIZ.muted} textAnchor="middle">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
        <line x1={padL} x2={W} y1={padT + plotH} y2={padT + plotH} stroke={VIZ.axis} strokeWidth={1} />
      </svg>
    </>
  );
}

/** Single-series magnitude across ordered bins (hour of day). */
export function ColumnChart({
  data,
  color = VIZ.seriesA,
  height = 150,
  labelEvery = 3,
  unit = "",
}: {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  labelEvery?: number;
  unit?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const W = 760;
  const padL = 26;
  const padB = 22;
  const padT = 8;
  const plotH = height - padB - padT;
  const slot = (W - padL) / Math.max(1, data.length);
  const barW = Math.max(4, slot - 5);

  return (
    <svg viewBox={`0 0 ${W} ${height}`} width="100%" height={height} role="img"
         aria-label="Distribution across bins">
      <line x1={padL} x2={W} y1={padT} y2={padT} stroke={VIZ.grid} strokeWidth={1} />
      <text x={0} y={padT + 4} fontSize={10} fill={VIZ.muted}>{max}</text>
      {data.map((d, i) => {
        const h = (d.value / max) * plotH;
        const x = padL + i * slot + 2;
        return (
          <g key={d.label}>
            <rect x={x} y={padT + plotH - h} width={barW} height={Math.max(0, h)} fill={color} rx={3}>
              <title>{`${d.label}${unit}: ${d.value}`}</title>
            </rect>
            {i % labelEvery === 0 && (
              <text x={x + barW / 2} y={height - 7} fontSize={10} fill={VIZ.muted} textAnchor="middle">
                {d.label}
              </text>
            )}
          </g>
        );
      })}
      <line x1={padL} x2={W} y1={padT + plotH} y2={padT + plotH} stroke={VIZ.axis} strokeWidth={1} />
    </svg>
  );
}

/** Horizontal bars with the value direct-labelled — for ranked lists. */
export function RankedBars({
  data,
  color = VIZ.seriesA,
  suffix = "",
  max: forcedMax,
  marker,
}: {
  data: { label: string; value: number; note?: string }[];
  color?: string;
  suffix?: string;
  max?: number;
  marker?: { value: number; label: string };
}) {
  const max = Math.max(1, forcedMax ?? Math.max(...data.map((d) => d.value)));

  return (
    <div>
      {data.map((d) => (
        <div key={d.label} style={{ marginBottom: 11 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12 }}>
            <span style={{ color: VIZ.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {d.label}
            </span>
            <b className="tnum" style={{ color: VIZ.ink, flex: "none" }}>
              {d.value}
              {suffix}
              {d.note ? <span style={{ color: VIZ.muted, fontWeight: 400 }}> · {d.note}</span> : null}
            </b>
          </div>
          <div style={{ position: "relative", marginTop: 4 }}>
            <div style={{ height: 8, background: "#edf0f4", borderRadius: 5, overflow: "hidden" }}>
              <div
                style={{
                  width: `${Math.min(100, (d.value / max) * 100)}%`,
                  height: "100%",
                  background: color,
                  borderRadius: 5,
                }}
                title={`${d.label}: ${d.value}${suffix}`}
              />
            </div>
            {marker && (
              <span
                aria-hidden
                title={marker.label}
                style={{
                  position: "absolute",
                  left: `${Math.min(100, (marker.value / max) * 100)}%`,
                  top: -2,
                  width: 2,
                  height: 12,
                  background: VIZ.ink,
                }}
              />
            )}
          </div>
        </div>
      ))}
      {marker && (
        <p style={{ fontSize: 11, color: VIZ.muted, margin: "2px 0 0" }}>
          Vertical rule marks {marker.label}.
        </p>
      )}
    </div>
  );
}

/** Proportion of a whole, as one horizontal stacked bar with a legend. */
export function StackedShare({
  segments,
  caption,
}: {
  segments: { label: string; value: number; color: string }[];
  caption?: ReactNode;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) return <p className="empty">Nothing recorded in this period.</p>;

  return (
    <div>
      <div style={{ display: "flex", gap: 2, height: 16, marginBottom: 10 }}>
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <div
              key={s.label}
              title={`${s.label}: ${s.value} (${Math.round((s.value / total) * 100)}%)`}
              style={{
                width: `${(s.value / total) * 100}%`,
                background: s.color,
                borderRadius: 4,
              }}
            />
          ))}
      </div>
      <Legend items={segments.filter((s) => s.value > 0).map((s) => ({ color: s.color, label: `${s.label} · ${s.value}` }))} />
      {caption}
    </div>
  );
}
