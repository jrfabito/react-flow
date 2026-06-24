import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollection } from '@cloudscape-design/collection-hooks';
import Alert from '@cloudscape-design/components/alert';
import AppLayoutToolbar from '@cloudscape-design/components/app-layout-toolbar';
import BarChart from '@cloudscape-design/components/bar-chart';
import Box from '@cloudscape-design/components/box';
import BreadcrumbGroup from '@cloudscape-design/components/breadcrumb-group';
import Button from '@cloudscape-design/components/button';
import ButtonDropdown from '@cloudscape-design/components/button-dropdown';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import Container from '@cloudscape-design/components/container';
import DateRangePicker from '@cloudscape-design/components/date-range-picker';
import FormField from '@cloudscape-design/components/form-field';
import Grid from '@cloudscape-design/components/grid';
import Header from '@cloudscape-design/components/header';
import LineChart from '@cloudscape-design/components/line-chart';
import Link from '@cloudscape-design/components/link';
import PieChart from '@cloudscape-design/components/pie-chart';
import PropertyFilter from '@cloudscape-design/components/property-filter';
import SideNavigation from '@cloudscape-design/components/side-navigation';
import SpaceBetween from '@cloudscape-design/components/space-between';
import SplitPanel from '@cloudscape-design/components/split-panel';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import Table from '@cloudscape-design/components/table';
import TopNavigation from '@cloudscape-design/components/top-navigation';
import FailureHeatmap from '../components/FailureHeatmap.jsx';
import runs, {
  filterRuns,
  getSummaryStats,
  getSuccessRate,
  getTotalDpuHours,
  getRunsByDay,
  getDurationTrendByJob,
  getFailureHeatmap,
  getDpuOverTime,
} from '../data/mockMonitoringData.js';
import JOBS from '../data/glue-jobs.json';
import awsLogoUrl from '../public/images/aws-logo.svg';

// Map a run's job name to its job id so the table can link to the job page.
const JOB_ID_BY_NAME = Object.fromEntries(JOBS.map((job) => [job.name, job.id]));

// ── Static config ───────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { type: 'link', text: 'Jobs',       href: '/'            },
  { type: 'link', text: 'Monitoring', href: '/monitoring' },
  { type: 'divider' },
  { type: 'link', text: 'Settings',   href: '#/settings'   },
];

const FILTERING_PROPERTIES = [
  { key: 'jobName', propertyLabel: 'Job name', groupValuesLabel: 'Job name values', operators: ['=', '!='] },
  { key: 'status',  propertyLabel: 'Status',   groupValuesLabel: 'Status values',   operators: ['=', '!='] },
  { key: 'date',    propertyLabel: 'Date',     groupValuesLabel: 'Date values',     operators: ['='] },
];

const DATE_RANGE_RELATIVE_OPTIONS = [
  { key: 'previous-7-days',   amount: 7,  unit: 'day',   type: 'relative' },
  { key: 'previous-30-days',  amount: 30, unit: 'day',   type: 'relative' },
  { key: 'previous-3-months', amount: 3,  unit: 'month', type: 'relative' },
];

const STATUS_MAP = {
  succeeded: { type: 'success',     label: 'Succeeded' },
  failed:    { type: 'error',       label: 'Failed'    },
  running:   { type: 'loading',     label: 'Running'   },
  stopped:   { type: 'stopped',     label: 'Stopped'   },
};

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// Value suggestions for the PropertyFilter, derived from the run data.
// `date` values use the same "Mon D" format that filterRuns matches on.
const FILTERING_OPTIONS = [
  ...Array.from(new Set(runs.map((r) => r.jobName))).map((value) => ({ propertyKey: 'jobName', value })),
  ...Array.from(new Set(runs.map((r) => r.status))).map((value) => ({ propertyKey: 'status', value })),
  ...Array.from(new Set(runs.map((r) => `${MONTHS[r.startTime.getMonth()]} ${r.startTime.getDate()}`))).map((value) => ({ propertyKey: 'date', value })),
];

// Format durationSeconds as "Xm Ys" (running runs have null duration).
function formatDuration(seconds) {
  if (seconds == null) return '-';
  const minutes = Math.floor(seconds / 60);
  const secs = String(seconds % 60).padStart(2, '0');
  return `${minutes}m ${secs}s`;
}

// Format a Date as e.g. "May 15, 2026 8:32 AM".
function formatStartTime(date) {
  let hours = date.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} ${hours}:${minutes} ${ampm}`;
}

// ── Split panel: job runs table ───────────────────────────────────────────────

// Comparator for nullable values (running runs have null duration/end time);
// nulls sort below any real value.
function nullableComparator(getValue) {
  return (a, b) => {
    const av = getValue(a);
    const bv = getValue(b);
    if (av == null && bv == null) return 0;
    if (av == null) return -1;
    if (bv == null) return 1;
    return av < bv ? -1 : av > bv ? 1 : 0;
  };
}

const RUN_COLUMNS = [
  {
    id: 'jobName',
    header: 'Job name',
    sortingField: 'jobName',
    cell: (item) => {
      const jobId = JOB_ID_BY_NAME[item.jobName];
      return (
        <Link external href={jobId ? `/jobs/${jobId}` : '/create'}>
          {item.jobName}
        </Link>
      );
    },
  },
  { id: 'runId', header: 'Run ID', sortingField: 'runId', cell: (item) => item.runId },
  {
    id: 'status',
    header: 'Status',
    sortingField: 'status',
    cell: (item) => {
      const mapped = STATUS_MAP[item.status];
      return <StatusIndicator type={mapped.type}>{mapped.label}</StatusIndicator>;
    },
  },
  {
    id: 'duration',
    header: 'Duration',
    sortingComparator: nullableComparator((item) => item.durationSeconds),
    cell: (item) => formatDuration(item.durationSeconds),
  },
  {
    id: 'records',
    header: 'Records processed',
    sortingComparator: nullableComparator((item) => item.recordsProcessed),
    cell: (item) => (item.recordsProcessed == null ? '-' : item.recordsProcessed.toLocaleString()),
  },
  {
    id: 'startTime',
    header: 'Start time',
    sortingComparator: nullableComparator((item) => item.startTime),
    cell: (item) => formatStartTime(item.startTime),
  },
  {
    id: 'endTime',
    header: 'End time',
    sortingComparator: nullableComparator((item) => item.endTime),
    cell: (item) => (item.endTime == null ? '-' : formatStartTime(item.endTime)),
  },
];

const START_TIME_COLUMN = RUN_COLUMNS.find((c) => c.id === 'startTime');

function JobRunsTable({ runs: items }) {
  const navigate = useNavigate();
  const { items: sortedItems, collectionProps } = useCollection(items, {
    sorting: { defaultState: { sortingColumn: START_TIME_COLUMN, isDescending: true } },
  });

  // Override the runId cell with a navigation link; other column definitions
  // (and the startTime sort reference) are left untouched.
  const columnDefinitions = RUN_COLUMNS.map((col) => {
    if (col.id === 'runId') {
      return {
        ...col,
        cell: (item) => (
          <Link
            href={`/runs/${item.runId}`}
            onFollow={(e) => {
              e.preventDefault();
              navigate(`/runs/${item.runId}`);
            }}
          >
            {item.runId}
          </Link>
        ),
      };
    }
    return col;
  });

  return (
    <Table
      {...collectionProps}
      variant="borderless"
      items={sortedItems}
      trackBy="runId"
      empty="No job runs match the current filters."
      columnDefinitions={columnDefinitions}
    />
  );
}

// ── Filter utilities ──────────────────────────────────────────────────────────

// Resolve a DateRangePicker value into absolute { start, end } dates.
function resolveDateRange(range) {
  const now = new Date('2026-05-15T23:59:59');
  if (!range) return { start: null, end: null };
  if (range.type === 'absolute') {
    return { start: new Date(range.startDate), end: new Date(range.endDate) };
  }
  const start = new Date(now);
  if (range.unit === 'day')   start.setDate(now.getDate() - range.amount);
  if (range.unit === 'month') start.setMonth(now.getMonth() - range.amount);
  return { start, end: now };
}

// Convert PropertyFilter tokens into the filterRuns({ jobName, status, date }) shape.
function tokensToFilters(tokens) {
  const filters = {};
  tokens.forEach((token) => {
    if (token.propertyKey === 'jobName') filters.jobName = token.value;
    if (token.propertyKey === 'status')  filters.status  = token.value;
    if (token.propertyKey === 'date')    filters.date    = token.value;
  });
  return filters;
}

// Return an error message if a date token falls outside the resolved date range.
function getDateConflict(tokens, dateRange) {
  const dateToken = tokens.find((t) => t.propertyKey === 'date');
  if (!dateToken) return null;
  const { start, end } = resolveDateRange(dateRange);
  if (!start || !end) return null;
  const tokenDate = new Date(dateToken.value + ', 2026');
  if (tokenDate < start || tokenDate > end) {
    return `The date filter "${dateToken.value}" falls outside the selected date range. Expand the date range or choose a date within it.`;
  }
  return null;
}

// ── Page content ──────────────────────────────────────────────────────────────

function PageContent({
  filteredRuns,
  filterQuery,
  dateRange,
  onFilterChange,
  onDateRangeChange,
  onStatusFilter,
  dateConflictError,
  onDismissDateConflict,
  failedAlertVisible,
  onDismissFailedAlert,
}) {
  const stats = getSummaryStats(filteredRuns);
  const successRate = getSuccessRate(filteredRuns);
  const totalDpuHours = getTotalDpuHours(filteredRuns);
  const runsByDay = getRunsByDay(filteredRuns);
  const durationByJob = getDurationTrendByJob(filteredRuns);
  const dpuOverTime = getDpuOverTime(filteredRuns);
  const dpuMax = Math.max(1, ...dpuOverTime.map((p) => p.dpuHours));
  const heatmapData = getFailureHeatmap(filteredRuns);
  const nonSuccessRuns = filteredRuns.filter((r) => r.status === 'failed' || r.status === 'stopped');

  return (
    <div style={{ maxWidth: 1440, margin: '0 auto' }}>
      {/* Page header */}
      <div className="monitoring-page-header">
        <Header
          variant="h1"
          description="Track performance, resource utilization, and run history across all Glue jobs."
        >
          Glue Job Monitoring
        </Header>
      </div>

      <div className="monitoring-page-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Filter bar */}
        <Grid
          gridDefinition={[
            { colspan: { default: 12, s: 8 } },
            { colspan: { default: 12, s: 4 } },
          ]}
        >
            <div>
              <FormField label="Filter by job name, status, and date to update the page charts and table">
              <PropertyFilter
                query={filterQuery}
                onChange={onFilterChange}
                filteringProperties={FILTERING_PROPERTIES}
                filteringOptions={FILTERING_OPTIONS}
                filteringPlaceholder="Filter by job name, status, and date"
                i18nStrings={{
                  filteringAriaLabel: 'Filter by job name, status, and date',
                  dismissAriaLabel: 'Dismiss',
                  clearFiltersText: 'Clear filters',
                  groupPropertiesText: 'Properties',
                  groupValuesText: 'Values',
                  operatorAndText: 'and',
                  operatorOrText: 'or',
                  operatorLessText: 'less than',
                  operatorLessOrEqualText: 'less than or equal',
                  operatorGreaterText: 'greater than',
                  operatorGreaterOrEqualText: 'greater than or equal',
                  operatorContainsText: 'contains',
                  operatorDoesNotContainText: 'does not contain',
                  operatorEqualsText: 'equals',
                  operatorDoesNotEqualText: 'does not equal',
                  clearOperatorAriaLabel: 'Clear operator',
                  removeTokenButtonAriaLabel: (token) => `Remove token ${token.propertyKey} ${token.operator} ${token.value}`,
                  enteredTextLabel: (text) => `Use: "${text}"`,
                }}
                expandToViewport={true}
                i18nStrings={{
                  filteringAriaLabel: 'Filter job runs',
                  dismissAriaLabel: 'Dismiss',
                  clearFiltersText: 'Clear filters',
                  groupPropertiesText: 'Properties',
                  groupValuesText: 'Values',
                  operatorLessText: 'less than',
                  operatorLessOrEqualText: 'less than or equal',
                  operatorGreaterText: 'greater than',
                  operatorGreaterOrEqualText: 'greater than or equal',
                  operationAndText: 'and',
                  operationOrText: 'or',
                  operatorContainsText: 'Contains',
                  operatorDoesNotContainText: 'Does not contain',
                  operatorEqualsText: 'Equals',
                  operatorDoesNotEqualText: 'Does not equal',
                  propertyText: 'Property',
                  operatorText: 'Operator',
                  valueText: 'Value',
                  cancelActionText: 'Cancel',
                  applyActionText: 'Apply',
                  allPropertiesLabel: 'All properties',
                  tokenLimitShowMore: 'Show more',
                  tokenLimitShowFewer: 'Show fewer',
                  enteredTextLabel: (text) => `Use: "${text}"`,
                }}
              />
              </FormField>
            </div>
            <FormField label="Date range">
            <DateRangePicker
              relativeOptions={DATE_RANGE_RELATIVE_OPTIONS}
              value={dateRange}
              isValidRange={() => ({ valid: true })}
              onChange={onDateRangeChange}
              rangeSelectorMode="relative-only"
              placeholder="Filter by date range"
              i18nStrings={{
                ariaLabel: 'Filter by date range',
                clearButtonLabel: 'Clear',
                cancelButtonLabel: 'Cancel',
                applyButtonLabel: 'Apply',
                relativeModeTitle: 'Relative range',
                absoluteModeTitle: 'Absolute range',
                relativeRangeSelectionHeading: 'Choose a range',
                customRelativeRangeOptionLabel: 'Custom range',
                customRelativeRangeOptionDescription: 'Set a custom range in the past',
                customRelativeRangeUnitLabel: 'Unit of time',
                customRelativeRangeDurationLabel: 'Duration',
                customRelativeRangeDurationPlaceholder: 'Enter duration',
                startDateLabel: 'Start date',
                endDateLabel: 'End date',
                startTimeLabel: 'Start time',
                endTimeLabel: 'End time',
                dateTimeConstraintText: 'Range must be between 1 and 30 days.',
                todayAriaLabel: 'Today',
                nextMonthAriaLabel: 'Next month',
                previousMonthAriaLabel: 'Previous month',
                formatRelativeRange: (range) => {
                  const unit = range.amount === 1 ? range.unit : `${range.unit}s`;
                  return `Last ${range.amount} ${unit}`;
                },
                formatUnit: (unit, value) => (value === 1 ? unit : `${unit}s`),
              }}
            />
            </FormField>
        </Grid>

        {/* Date filter conflict alert */}
        {dateConflictError && (
          <Alert
            type="error"
            dismissible
            onDismiss={onDismissDateConflict}
            header="Date filter conflict"
          >
            {dateConflictError}
          </Alert>
        )}

        {/* Summary cards row */}
        <Grid
          gridDefinition={[
            { colspan: { default: 12, s: 4 } },
            { colspan: { default: 12, s: 4 } },
            { colspan: { default: 12, s: 4 } },
          ]}
        >
          <Container
            header={
              <Header
                variant="h2"
                actions={
                  <ButtonDropdown
                    items={[
                      { id: 'failed',    text: 'View failed'     },
                      { id: 'running',   text: 'View running'    },
                      { id: 'succeeded', text: 'View successful' },
                      { id: 'stopped',   text: 'View stopped'    },
                    ]}
                    onItemClick={({ detail }) => onStatusFilter(detail.id)}
                  >
                    Filter by status
                  </ButtonDropdown>
                }
              >
                Job runs summary
              </Header>
            }
            fitHeight
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <Box variant="awsui-key-label">Total runs</Box>
                <Box fontSize="display-l" fontWeight="bold">{stats.total}</Box>
              </div>
              <div>
                <Box variant="awsui-key-label">Running</Box>
                <Box fontSize="display-l" fontWeight="bold" color="text-status-info">{stats.running}</Box>
              </div>
              <div>
                <Box variant="awsui-key-label">Succeeded</Box>
                <Box fontSize="display-l" fontWeight="bold" color="text-status-success">{stats.succeeded}</Box>
              </div>
              <div>
                <Box variant="awsui-key-label">Failed</Box>
                <Box fontSize="display-l" fontWeight="bold" color="text-status-error">{stats.failed}</Box>
              </div>
              <div>
                <Box variant="awsui-key-label">Stopped</Box>
                <Box fontSize="display-l" fontWeight="bold" color="text-status-inactive">{stats.stopped}</Box>
              </div>
            </div>
            {nonSuccessRuns.length > 0 && failedAlertVisible && (
              <div style={{ marginTop: '16px' }}>
                <Alert
                  type="error"
                  // dismissible
                  onDismiss={onDismissFailedAlert}
                  dismissAriaLabel="Close alert"
                  statusIconAriaLabel="Error"
                  header={`${nonSuccessRuns.length} run${nonSuccessRuns.length > 1 ? 's' : ''} did not complete in the selected period.`}
                >
                </Alert>
              </div>
            )}
          </Container>

          <Container header={<Header variant="h2">Job run success rate</Header>} fitHeight>
            <PieChart
              variant="donut"
              data={[
                { title: 'Succeeded', value: stats.succeeded, color: '#639922' },
                { title: 'Failed',    value: stats.failed,    color: '#E24B4A' },
                { title: 'Running',  value: stats.running,   color: '#378ADD' },
                { title: 'Stopped',  value: stats.stopped,   color: '#8d99a8' },
              ]}
              innerMetricValue={`${successRate}%`}
              innerMetricDescription="Success rate"
              hideFilter
              hideLegend={false}
              size="medium"
              i18nStrings={{
                detailsValue: 'Runs',
                detailsPercentage: 'Percentage',
                filterLabel: 'Filter',
                filterPlaceholder: 'Filter data',
                filterSelectedAriaLabel: 'selected',
                detailPopoverDismissAriaLabel: 'Dismiss',
                legendAriaLabel: 'Legend',
                chartAriaRoleDescription: 'pie chart',
                segmentAriaRoleDescription: 'segment',
              }}
            />
          </Container>

          <Container header={<Header variant="h2" description="DPUs consumed by all job runs in the selected period.">DPU usage</Header>} fitHeight>
            <Box fontSize="display-l" fontWeight="bold">{totalDpuHours}</Box>
            <Box color="text-status-inactive">DPU hours this period</Box>
            <div style={{ marginTop: '12px' }}>
              <LineChart
                series={[
                  {
                    title: 'DPU hours',
                    type: 'line',
                    data: dpuOverTime.map((p) => ({ x: p.date, y: p.dpuHours })),
                  },
                ]}
                xScaleType="categorical"
                xDomain={dpuOverTime.map((p) => p.date)}
                yDomain={[0, dpuMax]}
                xTitle="Date"
                yTitle="DPU Hours"
                hideFilter
                hideLegend
                height={200}
                i18nStrings={{
                  xTickFormatter: (x) => x,
                  yTickFormatter: (y) => String(y),
                }}
              />
            </div>
          </Container>
        </Grid>

        {/* Chart placeholders row */}
        <Grid
          gridDefinition={[
            { colspan: { default: 12, s: 6 } },
            { colspan: { default: 12, s: 6 } },
          ]}
        >
            <Container
              fitHeight
              header={
                <Header variant="h2" description="Daily run counts by status over the selected period.">
                  Job runs timeline
                </Header>
              }
            >
              <BarChart
                stackedBars
                series={[
                  { title: 'Succeeded', type: 'bar', data: runsByDay.map((d) => ({ x: d.date, y: d.succeeded })), color: '#639922' },
                  { title: 'Failed',    type: 'bar', data: runsByDay.map((d) => ({ x: d.date, y: d.failed    })), color: '#E24B4A' },
                  { title: 'Running',  type: 'bar', data: runsByDay.map((d) => ({ x: d.date, y: d.running   })), color: '#378ADD' },
                  { title: 'Stopped',  type: 'bar', data: runsByDay.map((d) => ({ x: d.date, y: d.stopped   })), color: '#8d99a8' },
                ]}
                xDomain={runsByDay.map((d) => d.date)}
                yDomain={[0, 10]}
                xTitle=""
                yTitle="Runs"
                hideFilter
                height={160}
                i18nStrings={{
                  xTickFormatter: (d) => d,
                  yTickFormatter: (d) => String(d),
                }}
              />
            </Container>
            <Container
              fitHeight
              header={
                <Header variant="h2" description="Failure rate by day and hour. Darker cells indicate higher failure rates. Use this to identify recurring failure windows and optimize job scheduling.">
                  Run failure heatmap
                </Header>
              }
            >
              <FailureHeatmap data={heatmapData} />
            </Container>
        </Grid>

        {/* Duration trend placeholder */}
        <Container
          header={
            <Header variant="h2" description="Run duration per job over the selected period. Upward trends may indicate growing data volumes or pipeline inefficiencies worth investigating">
              Duration trend
            </Header>
          }
        >
          <LineChart
            series={Object.entries(durationByJob).map(([jobName, points]) => ({
              title: jobName,
              type: 'line',
              data: points.map((p) => ({ x: p.date, y: p.durationMinutes })),
            }))}
            xScaleType="categorical"
            xDomain={runsByDay.map((d) => d.date)}
            yDomain={[0, 25]}
            xTitle=""
            yTitle="Minutes"
            hideFilter
            height={140}
            i18nStrings={{
              xTickFormatter: (d) => d,
              yTickFormatter: (d) => `${d}m`,
            }}
          />
        </Container>
      </div>
    </div>
  );
}

// ── MonitoringPage ──────────────────────────────────────────────────────────

export default function MonitoringPage() {
  const [filterQuery, setFilterQuery] = useState({ tokens: [], operation: 'and' });
  const [dateRange, setDateRange] = useState({ type: 'relative', amount: 7, unit: 'day', key: 'previous-7-days' });
  const [dateConflictError, setDateConflictError] = useState(null);
  const [failedAlertVisible, setFailedAlertVisible] = useState(true);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [splitPanelOpen, setSplitPanelOpen] = useState(true);
  const [splitPanelSize, setSplitPanelSize] = useState(280);
  const [splitPanelPreferences, setSplitPanelPreferences] = useState({ position: 'bottom' });

  const { start, end } = resolveDateRange(dateRange);
  const filters = tokensToFilters(filterQuery.tokens);

  const filteredRuns = filterRuns(runs, filters).filter((r) => {
    if (!start || !end) return true;
    return r.startTime >= start && r.startTime <= end;
  });

  const handleFilterChange = ({ detail }) => {
    setFilterQuery(detail);
    setDateConflictError(getDateConflict(detail.tokens, dateRange));
  };

  const handleDateRangeChange = ({ detail }) => {
    setDateRange(detail.value);
    setDateConflictError(getDateConflict(filterQuery.tokens, detail.value));
  };

  // Replace any existing status token with one for the chosen status.
  const handleStatusFilter = (status) => {
    const newTokens = [
      ...filterQuery.tokens.filter((t) => t.propertyKey !== 'status'),
      { propertyKey: 'status', operator: '=', value: status },
    ];
    setFilterQuery({ ...filterQuery, tokens: newTokens });
  };

  return (
    <>
      <div id="top-nav">
        <TopNavigation
          identity={{
            href: '/',
            logo: { src: awsLogoUrl, alt: 'AWS' },
          }}
          utilities={[
            {
              type: 'button',
              iconName: 'notification',
              title: 'Notifications',
              ariaLabel: 'Notifications',
              badge: false,
            },
            {
              type: 'menu-dropdown',
              iconName: 'settings',
              ariaLabel: 'Settings',
              title: 'Settings',
              items: [{ id: 'preferences', text: 'Preferences' }],
            },
            {
              type: 'menu-dropdown',
              text: 'User',
              description: 'user@example.com',
              iconName: 'user-profile',
              items: [{ id: 'signout', text: 'Sign out' }],
            },
          ]}
        />
      </div>

      <AppLayoutToolbar
        headerSelector="#top-nav"
        navigationHide={false}
        navigationOpen={navigationOpen}
        onNavigationChange={({ detail }) => setNavigationOpen(detail.open)}
        maxContentWidth={1440}
        breadcrumbs={
          <BreadcrumbGroup
            items={[
              { text: 'AWS Glue Studio', href: '/' },
              { text: 'Monitoring',      href: '/monitoring' },
            ]}
            ariaLabel="Breadcrumbs"
          />
        }
        navigation={
          <SideNavigation
            header={{ text: 'AWS Glue Studio', href: '/' }}
            activeHref="/monitoring"
            items={NAV_ITEMS}
          />
        }
        toolsHide={true}
        disableContentPaddings={true}
        splitPanelOpen={splitPanelOpen}
        onSplitPanelToggle={({ detail }) => setSplitPanelOpen(detail.open)}
        splitPanelSize={splitPanelSize}
        onSplitPanelResize={({ detail }) => setSplitPanelSize(detail.size)}
        splitPanelPreferences={splitPanelPreferences}
        onSplitPanelPreferencesChange={({ detail }) => setSplitPanelPreferences(detail)}
        splitPanel={
          <SplitPanel
            header="Job runs"
            i18nStrings={{
              closeButtonAriaLabel: 'Close panel',
              openButtonAriaLabel: 'Open panel',
              preferencesTitle: 'Split panel preferences',
              preferencesPositionLabel: 'Split panel position',
              preferencesPositionDescription: 'Choose the default split panel position for the service.',
              preferencesPositionSide: 'Side',
              preferencesPositionBottom: 'Bottom',
              preferencesConfirm: 'Confirm',
              preferencesCancel: 'Cancel',
              resizeHandleAriaLabel: 'Resize split panel',
            }}
          >
            <JobRunsTable runs={filteredRuns} />
          </SplitPanel>
        }
        content={
          <PageContent
            filteredRuns={filteredRuns}
            filterQuery={filterQuery}
            dateRange={dateRange}
            onFilterChange={handleFilterChange}
            onDateRangeChange={handleDateRangeChange}
            onStatusFilter={handleStatusFilter}
            dateConflictError={dateConflictError}
            onDismissDateConflict={() => setDateConflictError(null)}
            failedAlertVisible={failedAlertVisible}
            onDismissFailedAlert={() => setFailedAlertVisible(false)}
          />
        }
      />
    </>
  );
}
