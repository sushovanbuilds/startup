/**
 * Isometric plate SVG fallback — the same three-plate apparatus as the 3D
 * scene (labelled SPEED / SEO / SECURITY, line-art edges in signal orange,
 * paper-tone faces). Rendered in the initial HTML so the page is complete
 * without JS, and used for mobile / reduced-motion / no-WebGL / low-power.
 */
const RX = 148;
const RY = 82;
const TH = 18;

const PLATES = [
  { cy: 86, top: '#fdfcf8', side: '#e9e6dd', label: 'SPEED' },
  { cy: 150, top: '#f9f6ee', side: '#e5e2d8', label: 'SEO' },
  { cy: 214, top: '#f3f0e7', side: '#e0ddd2', label: 'SECURITY' },
];

function diamond(cx: number, cy: number): string {
  return `${cx},${cy - RY} ${cx + RX},${cy} ${cx},${cy + RY} ${cx - RX},${cy}`;
}

function sideRight(cx: number, cy: number): string {
  return `${cx + RX},${cy} ${cx},${cy + RY} ${cx},${cy + RY + TH} ${cx + RX},${cy + TH}`;
}

function sideLeft(cx: number, cy: number): string {
  return `${cx - RX},${cy} ${cx},${cy + RY} ${cx},${cy + RY + TH} ${cx - RX},${cy + TH}`;
}

export function PlatesSvg() {
  return (
    <svg
      className="w-full h-full"
      viewBox="0 0 500 330"
      role="img"
      aria-label="Three stacked monitoring plates: speed, SEO, and security posture"
      preserveAspectRatio="xMidYMid meet"
    >
      {PLATES.map((p) => (
        <g key={p.label}>
          <polygon points={sideLeft(250, p.cy)} fill={p.side} stroke="#FF5A1F" strokeWidth="1.1" />
          <polygon points={sideRight(250, p.cy)} fill={p.side} stroke="#FF5A1F" strokeWidth="1.1" />
          <polygon points={diamond(250, p.cy)} fill={p.top} stroke="#FF5A1F" strokeWidth="1.3" />
          <line x1={250 + RX} y1={p.cy} x2={404} y2={p.cy - 10} stroke="#DCDAD3" strokeWidth="1" />
          <text
            x={410}
            y={p.cy - 13}
            fill="#111210"
            fontFamily="var(--font-mono), monospace"
            fontSize="11"
            fontWeight="700"
            letterSpacing="3"
          >
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
