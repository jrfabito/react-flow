import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const DAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const CELL = 22; // cell width/height in px
const GAP = 2; // gap between cells in px
const STEP = CELL + GAP;

const MARGIN = { top: 10, right: 20, bottom: 40, left: 40 };
const WIDTH = 500;
const HEIGHT = 240;

const NO_RUNS_FILL = '#e9ebed';
const NO_FAILURE_FILL = '#9DCE7A';

// Match the Cloudscape font used by the other charts on the page.
const FONT_FAMILY = '"Open Sans", "Helvetica Neue", Roboto, Arial, sans-serif';

export default function FailureHeatmap({ data }) {
  const wrapperRef = useRef(null);
  const svgRef = useRef(null);

  useEffect(() => {
    // Render the heatmap at a given total width, stretching the hour columns
    // to fill the available space.
    const draw = (width) => {
      const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);

      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();
      svg.attr('width', width).attr('height', HEIGHT).style('font-family', FONT_FAMILY);

      const g = svg
        .append('g')
        .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

      // Scales ---------------------------------------------------------------
      const x = d3
        .scaleBand()
        .domain(HOURS)
        .range([0, innerWidth])
        .paddingInner(GAP / STEP);

      const y = d3
        .scaleBand()
        .domain(DAYS)
        .range([0, STEP * DAYS.length])
        .paddingInner(GAP / STEP);

      const color = d3
        .scaleSequential()
        .domain([0, 1])
        .interpolator(d3.interpolateRgb('#F4C9C7', '#D13212'));

      // Cells ----------------------------------------------------------------
      g
        .selectAll('rect.cell')
        .data(data)
        .join('rect')
        .attr('class', 'cell')
        .attr('x', (cell) => x(cell.hour))
        .attr('y', (cell) => y(cell.day))
        .attr('width', x.bandwidth())
        .attr('height', y.bandwidth())
        .attr('rx', 2)
        .attr('fill', (cell) => {
          if (cell.totalRuns === 0) return NO_RUNS_FILL;
          if (cell.failureRate === 0) return NO_FAILURE_FILL;
          return color(cell.failureRate);
        });

      // X axis: hour labels every 2 hours ------------------------------------
      const xAxis = d3
        .axisBottom(x)
        .tickValues(HOURS.filter((h) => h % 2 === 0))
        .tickFormat((h) => h)
        .tickSize(0);

      g
        .append('g')
        .attr('transform', `translate(0,${STEP * DAYS.length + 2})`)
        .call(xAxis)
        .call((sel) => sel.select('.domain').remove())
        .selectAll('text')
        .style('font-size', '10px');

      // Y axis: day labels ---------------------------------------------------
      const yAxis = d3.axisLeft(y).tickSize(0);

      g
        .append('g')
        .call(yAxis)
        .call((sel) => sel.select('.domain').remove())
        .selectAll('text')
        .style('font-size', '10px');

      // Color legend below the heatmap ---------------------------------------
      const swatch = 10;
      const labelGap = 4;
      const itemGap = 16;
      const legendY = STEP * DAYS.length + 22;

      const gradientId = 'failure-heatmap-gradient';
      const defs = svg.append('defs');
      const gradient = defs
        .append('linearGradient')
        .attr('id', gradientId)
        .attr('x1', '0%')
        .attr('x2', '100%');
      gradient
        .append('stop')
        .attr('offset', '0%')
        .attr('stop-color', color(0));
      gradient
        .append('stop')
        .attr('offset', '100%')
        .attr('stop-color', color(1));

      const legend = g
        .append('g')
        .attr('transform', `translate(0,${legendY})`);

      // Three legend items: gray "No runs", green "No failures", gradient "Failures".
      const items = [
        { fill: NO_RUNS_FILL, label: 'No runs', width: swatch },
        { fill: NO_FAILURE_FILL, label: 'No failures', width: swatch },
        { fill: `url(#${gradientId})`, label: 'Failures', width: 40 },
      ];

      let cursor = 0;
      for (const item of items) {
        const item_g = legend
          .append('g')
          .attr('transform', `translate(${cursor},0)`);

        item_g
          .append('rect')
          .attr('width', item.width)
          .attr('height', swatch)
          .attr('rx', 2)
          .attr('fill', item.fill);

        const text = item_g
          .append('text')
          .attr('x', item.width + labelGap)
          .attr('y', swatch)
          .style('font-family', FONT_FAMILY)
          .style('font-size', '12px')
          .style('fill', '#5f6b7a')
          .text(item.label);

        // Advance cursor past swatch + label + gap.
        cursor += item.width + labelGap + text.node().getComputedTextLength() + itemGap;
      }
    };

    draw(wrapperRef.current?.clientWidth || WIDTH);

    // Re-render to fill the container whenever it resizes.
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) draw(entry.contentRect.width);
    });
    if (wrapperRef.current) observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, [data]);

  return (
    <div ref={wrapperRef} style={{ width: '100%' }}>
      <svg ref={svgRef} />
    </div>
  );
}
