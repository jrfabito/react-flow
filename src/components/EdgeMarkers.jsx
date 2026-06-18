import { STROKE_DEFAULT, STROKE_SELECTED } from './ETLEdge.jsx';

// Renders a zero-size SVG at the document level so url(#etl-arrow-*) references
// from any SVG on the page resolve correctly, regardless of React Flow's SVG structure.
export default function EdgeMarkers() {
  return (
    <svg
      aria-hidden="true"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
    >
      <defs>
        <marker
          id="etl-arrow-default"
          viewBox="-10 -10 20 20"
          refX="0" refY="0"
          markerWidth="12.5" markerHeight="12.5"
          orient="auto-start-reverse"
        >
          <polyline
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1"
            points="-5,-4 0,0 -5,4 -5,-4"
            style={{ stroke: STROKE_DEFAULT, fill: STROKE_DEFAULT }}
          />
        </marker>
        <marker
          id="etl-arrow-selected"
          viewBox="-10 -10 20 20"
          refX="0" refY="0"
          markerWidth="12.5" markerHeight="12.5"
          orient="auto-start-reverse"
        >
          <polyline
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1"
            points="-5,-4 0,0 -5,4 -5,-4"
            style={{ stroke: STROKE_SELECTED, fill: STROKE_SELECTED }}
          />
        </marker>
      </defs>
    </svg>
  );
}
