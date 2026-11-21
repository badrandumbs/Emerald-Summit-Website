import { RIDGES, RIDGE_WIDTH } from './skyGeometry';

const RIDGE_COLORS = ['#2C5A49', '#174333', '#0B241C'];
const RIDGE_HEIGHTS = ['48%', '39%', '31%'];

/** The original mountain profiles and central sunrise, drawn in matte greens. */
export default function SummitLandscape() {
  return (
    <div className="lp-landscape" aria-hidden="true">
      <svg className="lp-landscape__sun" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="50" fill="#8DC7A2" />
      </svg>
      {RIDGES.map((ridge, i) => (
        <svg
          key={i}
          className="lp-landscape__ridge"
          style={{ height: RIDGE_HEIGHTS[i] }}
          viewBox={`0 0 ${RIDGE_WIDTH} ${ridge.height}`}
          preserveAspectRatio="none"
        >
          <path d={ridge.path} fill={RIDGE_COLORS[i]} />
        </svg>
      ))}
    </div>
  );
}
