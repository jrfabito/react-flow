// Mock data and pure utilities for the job run monitoring dashboard.
// No React, no external dependencies. All values are hardcoded so the
// dataset is stable and reproducible across renders (no Math.random()).

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HEATMAP_DAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export const JOB_NAMES = [
  'Retail Daily Sales ETL',
  'Customer 360 Aggregation',
  'Inventory Sync Pipeline',
  'Marketing Attribution Model',
  'Financial Reconciliation',
];

// The dashboard window: 7 consecutive days, May 9 - May 15, 2026.
const RANGE_START_YEAR = 2026;
const RANGE_START_MONTH = 4; // May (0-indexed)
const RANGE_START_DAY = 9;
const RANGE_DAYS = 7;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function formatDate(date) {
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Returns the 7 Date objects covering the dashboard window, in order.
function getRangeDays() {
  const days = [];
  for (let i = 0; i < RANGE_DAYS; i += 1) {
    days.push(new Date(RANGE_START_YEAR, RANGE_START_MONTH, RANGE_START_DAY + i));
  }
  return days;
}

// Build a single run record. Pass durationSeconds === null for running runs.
function makeRun(runId, jobName, status, start, durationSeconds, recordsProcessed, dpuHours) {
  return {
    runId,
    jobName,
    status,
    startTime: start,
    endTime: durationSeconds === null ? null : new Date(start.getTime() + durationSeconds * 1000),
    durationSeconds,
    recordsProcessed,
    dpuHours,
  };
}

function d(day, hour, minute) {
  return new Date(RANGE_START_YEAR, RANGE_START_MONTH, day, hour, minute, 0, 0);
}

// ---------------------------------------------------------------------------
// Run records (45 runs, May 9 - May 15, 2026)
//   ~80% succeeded, ~12% failed, ~8% running
//   Failure clusters: May 13 02:00-04:00 (Customer 360 + Marketing Attribution),
//                     May 10 ~03:00 (Financial Reconciliation)
//   All running runs are on May 15.
// ---------------------------------------------------------------------------

const runs = [
  // --- May 9 (Sat) -- 4 succeeded (weekend jobs only) ---
  makeRun('GJ-RUN-101', 'Retail Daily Sales ETL', 'succeeded', d(9, 2, 15), 228, 13, 0.1),
  makeRun('GJ-RUN-112', 'Inventory Sync Pipeline', 'succeeded', d(9, 6, 0), 450, 11980, 0.19),
  makeRun('GJ-RUN-123', 'Financial Reconciliation', 'succeeded', d(9, 14, 20), 375, 8050, 0.15),
  makeRun('GJ-RUN-134', 'Retail Daily Sales ETL', 'succeeded', d(9, 20, 10), 273, 13, 0.11),

  // --- May 10 (Sun) -- 3 succeeded, 1 failed (Financial Reconciliation ~03:00) ---
  makeRun('GJ-RUN-145', 'Financial Reconciliation', 'failed', d(10, 3, 5), 95, 0, 0.05),
  makeRun('GJ-RUN-156', 'Retail Daily Sales ETL', 'succeeded', d(10, 5, 0), 248, 13, 0.1),
  makeRun('GJ-RUN-167', 'Inventory Sync Pipeline', 'succeeded', d(10, 11, 15), 502, 12150, 0.21),
  makeRun('GJ-RUN-178', 'Financial Reconciliation', 'succeeded', d(10, 21, 0), 342, 7950, 0.14),

  // --- May 11 (Mon) -- 5 succeeded, 1 failed ---
  makeRun('GJ-RUN-189', 'Retail Daily Sales ETL', 'succeeded', d(11, 1, 30), 245, 13, 0.1),
  makeRun('GJ-RUN-19A', 'Inventory Sync Pipeline', 'failed', d(11, 7, 20), 140, 0, 0.06),
  makeRun('GJ-RUN-1AB', 'Customer 360 Aggregation', 'succeeded', d(11, 9, 0), 770, 48500, 0.44),
  makeRun('GJ-RUN-1BC', 'Marketing Attribution Model', 'succeeded', d(11, 12, 30), 1090, 95100, 0.61),
  makeRun('GJ-RUN-1CD', 'Financial Reconciliation', 'succeeded', d(11, 15, 45), 390, 8100, 0.16),
  makeRun('GJ-RUN-1DE', 'Retail Daily Sales ETL', 'succeeded', d(11, 19, 20), 220, 13, 0.12),

  // --- May 12 (Tue) -- 6 succeeded ---
  makeRun('GJ-RUN-1EF', 'Customer 360 Aggregation', 'succeeded', d(12, 2, 45), 735, 48050, 0.41),
  makeRun('GJ-RUN-1FG', 'Retail Daily Sales ETL', 'succeeded', d(12, 5, 30), 258, 13, 0.11),
  makeRun('GJ-RUN-1GH', 'Inventory Sync Pipeline', 'succeeded', d(12, 8, 15), 468, 12000, 0.2),
  makeRun('GJ-RUN-1HI', 'Marketing Attribution Model', 'succeeded', d(12, 13, 0), 1045, 94900, 0.59),
  makeRun('GJ-RUN-1IJ', 'Financial Reconciliation', 'succeeded', d(12, 17, 30), 368, 8000, 0.15),
  makeRun('GJ-RUN-1JK', 'Inventory Sync Pipeline', 'succeeded', d(12, 22, 10), 520, 12300, 0.22),

  // --- May 13 (Wed) -- 5 succeeded, 2 failed (cluster 02:00-04:00) ---
  makeRun('GJ-RUN-1KL', 'Customer 360 Aggregation', 'failed', d(13, 2, 30), 110, 0, 0.05),
  makeRun('GJ-RUN-1LM', 'Marketing Attribution Model', 'failed', d(13, 3, 15), 165, 0, 0.08),
  makeRun('GJ-RUN-1MN', 'Retail Daily Sales ETL', 'succeeded', d(13, 6, 0), 250, 13, 0.1),
  makeRun('GJ-RUN-1NO', 'Inventory Sync Pipeline', 'succeeded', d(13, 9, 30), 485, 12020, 0.2),
  makeRun('GJ-RUN-1OP', 'Financial Reconciliation', 'succeeded', d(13, 12, 0), 350, 7900, 0.14),
  makeRun('GJ-RUN-1PQ', 'Customer 360 Aggregation', 'succeeded', d(13, 15, 20), 780, 48700, 0.45),
  makeRun('GJ-RUN-1QR', 'Marketing Attribution Model', 'succeeded', d(13, 19, 0), 1135, 95500, 0.64),

  // --- May 14 (Thu) -- 5 succeeded, 1 failed ---
  makeRun('GJ-RUN-1RS', 'Retail Daily Sales ETL', 'succeeded', d(14, 1, 15), 235, 13, 0.1),
  makeRun('GJ-RUN-1ST', 'Marketing Attribution Model', 'failed', d(14, 4, 40), 175, 0, 0.09),
  makeRun('GJ-RUN-1TU', 'Inventory Sync Pipeline', 'succeeded', d(14, 8, 0), 455, 11900, 0.19),
  makeRun('GJ-RUN-1UV', 'Customer 360 Aggregation', 'succeeded', d(14, 11, 30), 705, 48000, 0.4),
  makeRun('GJ-RUN-1VW', 'Financial Reconciliation', 'succeeded', d(14, 16, 0), 380, 8200, 0.16),
  makeRun('GJ-RUN-1WX', 'Retail Daily Sales ETL', 'succeeded', d(14, 20, 45), 252, 13, 0.11),

  // --- May 15 (Fri) -- 4 succeeded, 4 running ---
  makeRun('GJ-RUN-1XY', 'Retail Daily Sales ETL', 'succeeded', d(15, 1, 0), 247, 13, 0.1),
  makeRun('GJ-RUN-1YZ', 'Customer 360 Aggregation', 'succeeded', d(15, 4, 30), 750, 48300, 0.43),
  makeRun('GJ-RUN-200', 'Inventory Sync Pipeline', 'succeeded', d(15, 7, 0), 495, 12100, 0.21),
  makeRun('GJ-RUN-211', 'Financial Reconciliation', 'succeeded', d(15, 9, 15), 338, 7850, 0.14),
  makeRun('GJ-RUN-222', 'Marketing Attribution Model', 'running', d(15, 10, 30), null, null, 0.3),
  makeRun('GJ-RUN-233', 'Customer 360 Aggregation', 'running', d(15, 11, 0), null, null, 0.2),
  makeRun('GJ-RUN-244', 'Retail Daily Sales ETL', 'running', d(15, 11, 45), null, null, 0.05),
  makeRun('GJ-RUN-255', 'Inventory Sync Pipeline', 'running', d(15, 12, 15), null, null, 0.1),

  // --- Stopped runs (manually cancelled, spread across days/jobs) ---
  makeRun('GJ-RUN-266', 'Inventory Sync Pipeline', 'stopped', d(11, 10, 0), 130, 0, 0),
  makeRun('GJ-RUN-277', 'Financial Reconciliation', 'stopped', d(12, 15, 0), 90, 0, 0),
  makeRun('GJ-RUN-288', 'Customer 360 Aggregation', 'stopped', d(14, 9, 0), 185, 0, 0),
];

// ---------------------------------------------------------------------------
// Aggregation utilities (pure — operate on any runs array or subset)
// ---------------------------------------------------------------------------

export function getSummaryStats(runs) {
  const stats = { total: runs.length, running: 0, succeeded: 0, failed: 0, stopped: 0 };
  for (const run of runs) {
    if (run.status === 'running') stats.running += 1;
    else if (run.status === 'succeeded') stats.succeeded += 1;
    else if (run.status === 'failed') stats.failed += 1;
    else if (run.status === 'stopped') stats.stopped += 1;
  }
  return stats;
}

export function getSuccessRate(runs) {
  let succeeded = 0;
  let completed = 0;
  for (const run of runs) {
    // Denominator is all runs except running; numerator is succeeded only.
    if (run.status === 'running') continue;
    completed += 1;
    if (run.status === 'succeeded') succeeded += 1;
  }
  if (completed === 0) return 0;
  return Math.round((succeeded / completed) * 1000) / 10;
}

export function getTotalDpuHours(runs) {
  let total = 0;
  for (const run of runs) {
    total += run.dpuHours || 0;
  }
  return Math.round(total * 100) / 100;
}

export function getRunsByDay(runs) {
  return getRangeDays().map((day) => {
    const cell = { date: formatDate(day), succeeded: 0, failed: 0, running: 0, stopped: 0 };
    for (const run of runs) {
      if (isSameDay(run.startTime, day)) {
        if (run.status === 'succeeded') cell.succeeded += 1;
        else if (run.status === 'failed') cell.failed += 1;
        else if (run.status === 'running') cell.running += 1;
        else if (run.status === 'stopped') cell.stopped += 1;
      }
    }
    return cell;
  });
}

export function getDurationTrendByJob(runs) {
  const trend = {};
  for (const name of JOB_NAMES) trend[name] = [];

  const succeeded = runs
    .filter((run) => run.status === 'succeeded' && run.durationSeconds != null)
    .sort((a, b) => a.startTime - b.startTime);

  for (const run of succeeded) {
    if (!trend[run.jobName]) trend[run.jobName] = [];
    trend[run.jobName].push({
      date: formatDate(run.startTime),
      durationMinutes: Math.round((run.durationSeconds / 60) * 10) / 10,
    });
  }
  return trend;
}

export function getFailureHeatmap(runs) {
  // counts[day][hour] = { failed, total }
  const counts = {};
  for (const day of HEATMAP_DAYS) {
    counts[day] = [];
    for (let hour = 0; hour < 24; hour += 1) {
      counts[day][hour] = { failed: 0, total: 0 };
    }
  }

  for (const run of runs) {
    // Stopped runs don't count toward the failure rate (numerator or denominator).
    if (run.status === 'stopped') continue;
    const dayLabel = WEEKDAYS[run.startTime.getDay()];
    if (!counts[dayLabel]) continue;
    const hour = run.startTime.getHours();
    counts[dayLabel][hour].total += 1;
    if (run.status === 'failed') counts[dayLabel][hour].failed += 1;
  }

  const cells = [];
  for (const day of HEATMAP_DAYS) {
    for (let hour = 0; hour < 24; hour += 1) {
      const { failed, total } = counts[day][hour];
      cells.push({
        day,
        hour,
        failureRate: total === 0 ? 0 : failed / total,
        totalRuns: total,
      });
    }
  }
  return cells;
}

export function getDpuOverTime(runs) {
  return getRangeDays().map((day) => {
    let total = 0;
    for (const run of runs) {
      if (isSameDay(run.startTime, day)) total += run.dpuHours || 0;
    }
    return { date: formatDate(day), dpuHours: Math.round(total * 100) / 100 };
  });
}

// ---------------------------------------------------------------------------
// Filter utility
// ---------------------------------------------------------------------------

export function filterRuns(runs, filters = {}) {
  return runs.filter((run) => {
    if (filters.jobName && run.jobName !== filters.jobName) return false;
    if (filters.status && run.status !== filters.status) return false;
    if (filters.date && formatDate(run.startTime) !== filters.date) return false;
    return true;
  });
}

export default runs;
