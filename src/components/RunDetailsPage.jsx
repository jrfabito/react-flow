import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import AppLayoutToolbar from '@cloudscape-design/components/app-layout-toolbar';
import Box from '@cloudscape-design/components/box';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import LineChart from '@cloudscape-design/components/line-chart';
import BreadcrumbGroup from '@cloudscape-design/components/breadcrumb-group';
import Button from '@cloudscape-design/components/button';
import Container from '@cloudscape-design/components/container';
import Flashbar from '@cloudscape-design/components/flashbar';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import Header from '@cloudscape-design/components/header';
import HelpPanel from '@cloudscape-design/components/help-panel';
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs';
import Link from '@cloudscape-design/components/link';
import SideNavigation from '@cloudscape-design/components/side-navigation';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Table from '@cloudscape-design/components/table';
import TopNavigation from '@cloudscape-design/components/top-navigation';
import ETLCanvas from './ETLCanvas.jsx';
import EdgeMarkers from './EdgeMarkers.jsx';
import { nodeTypes } from '../nodes/DataNode.jsx';
import awsLogoUrl from '../public/images/aws-logo.svg';

const NAV_ITEMS = [
  { type: 'link', text: 'Jobs',       href: '/' },
  { type: 'link', text: 'Monitoring', href: '#/crawlers' },
  { type: 'divider' },
  { type: 'link', text: 'Settings',   href: '#/settings' },
];

const STATUS_TYPE_MAP = {
  'Succeeded': 'success',
  'Failed':    'error',
  'Running':   'in-progress',
  'Stopped':   'stopped',
  'Pending':   'pending',
};

function formatDateTime(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleString('en-US', {
    month:   'short',
    day:     'numeric',
    year:    'numeric',
    hour:    'numeric',
    minute:  '2-digit',
    hour12:  true,
  });
}

function formatDuration(startIso, endIso) {
  if (!startIso || !endIso) return '—';
  const ms = new Date(endIso) - new Date(startIso);
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function fmt(n) {
  return n != null ? n.toLocaleString() : '—';
}

const METRIC_BASE = new Date('2024-03-15T08:32:00').getTime();
const METRIC_T    = [0, 48, 96, 144, 192, 240].map(s => new Date(METRIC_BASE + s * 1000));

const CHART_I18N = {
  filterLabel:                    'Filter displayed series',
  filterPlaceholder:              'Filter series',
  filterSelectedAriaLabel:        'selected',
  detailPopoverDismissAriaLabel:  'Dismiss',
  legendAriaLabel:                'Legend',
  chartAriaRoleDescription:       'line chart',
  xTickFormatter: d => {
    const h    = String(d.getHours()).padStart(2, '0');
    const m    = String(d.getMinutes()).padStart(2, '0');
    const ampm = d.getHours() < 12 ? 'am' : 'pm';
    return `${h}:${m} ${ampm}`;
  },
};

const CHART_X_DOMAIN = [METRIC_T[0], METRIC_T[5]];

const MEMORY_SERIES = [
  {
    title: 'JVM heap usage (%)',
    type:  'line',
    data:  [
      { x: METRIC_T[0], y: 25 },
      { x: METRIC_T[1], y: 35 },
      { x: METRIC_T[2], y: 65 },
      { x: METRIC_T[3], y: 50 },
      { x: METRIC_T[4], y: 38 },
      { x: METRIC_T[5], y: 35 },
    ],
  },
  { title: 'Warning threshold', type: 'threshold', y: 50 },
];

const DPU_SERIES = [
  {
    title: 'DPU-hours',
    type:  'line',
    data:  [
      { x: METRIC_T[0], y: 0  },
      { x: METRIC_T[1], y: 2  },
      { x: METRIC_T[2], y: 4  },
      { x: METRIC_T[3], y: 6  },
      { x: METRIC_T[4], y: 8  },
      { x: METRIC_T[5], y: 10 },
    ],
  },
];

const SHUFFLE_SERIES = [
  {
    title: 'Shuffle read/write data (MB)',
    type:  'line',
    data:  [
      { x: METRIC_T[0], y: 5   },
      { x: METRIC_T[1], y: 20  },
      { x: METRIC_T[2], y: 900 },
      { x: METRIC_T[3], y: 870 },
      { x: METRIC_T[4], y: 30  },
      { x: METRIC_T[5], y: 10  },
    ],
  },
];

const IO_SERIES = [
  {
    title: 'Data speed',
    type:  'line',
    data:  [
      { x: METRIC_T[0], y: 5  },
      { x: METRIC_T[1], y: 8  },
      { x: METRIC_T[2], y: 13 },
      { x: METRIC_T[3], y: 10 },
      { x: METRIC_T[4], y: 7  },
      { x: METRIC_T[5], y: 6  },
    ],
  },
];

// ── Failed-run variants — abrupt drop at t[2] reflecting a mid-pipeline crash ─

const MEMORY_SERIES_FAILED = [
  {
    title: 'JVM heap usage (%)',
    type:  'line',
    data:  [
      { x: METRIC_T[0], y: 25 },
      { x: METRIC_T[1], y: 42 },
      { x: METRIC_T[2], y: 88 },
      { x: METRIC_T[3], y: 12 },
      { x: METRIC_T[4], y: 0  },
      { x: METRIC_T[5], y: 0  },
    ],
  },
  { title: 'Warning threshold', type: 'threshold', y: 50 },
];

const DPU_SERIES_FAILED = [
  {
    title: 'DPU-hours',
    type:  'line',
    data:  [
      { x: METRIC_T[0], y: 0 },
      { x: METRIC_T[1], y: 2 },
      { x: METRIC_T[2], y: 4 },
      { x: METRIC_T[3], y: 4 },
      { x: METRIC_T[4], y: 4 },
      { x: METRIC_T[5], y: 4 },
    ],
  },
];

const SHUFFLE_SERIES_FAILED = [
  {
    title: 'Shuffle read/write data (MB)',
    type:  'line',
    data:  [
      { x: METRIC_T[0], y: 5   },
      { x: METRIC_T[1], y: 20  },
      { x: METRIC_T[2], y: 740 },
      { x: METRIC_T[3], y: 0   },
      { x: METRIC_T[4], y: 0   },
      { x: METRIC_T[5], y: 0   },
    ],
  },
];

const IO_SERIES_FAILED = [
  {
    title: 'Data speed',
    type:  'line',
    data:  [
      { x: METRIC_T[0], y: 5  },
      { x: METRIC_T[1], y: 9  },
      { x: METRIC_T[2], y: 11 },
      { x: METRIC_T[3], y: 0  },
      { x: METRIC_T[4], y: 0  },
      { x: METRIC_T[5], y: 0  },
    ],
  },
];

// ── Stopped-run variants — gradual trailing off reflecting a user-initiated stop

const MEMORY_SERIES_STOPPED = [
  {
    title: 'JVM heap usage (%)',
    type:  'line',
    data:  [
      { x: METRIC_T[0], y: 25 },
      { x: METRIC_T[1], y: 48 },
      { x: METRIC_T[2], y: 60 },
      { x: METRIC_T[3], y: 44 },
      { x: METRIC_T[4], y: 22 },
      { x: METRIC_T[5], y: 8  },
    ],
  },
  { title: 'Warning threshold', type: 'threshold', y: 50 },
];

const DPU_SERIES_STOPPED = [
  {
    title: 'DPU-hours',
    type:  'line',
    data:  [
      { x: METRIC_T[0], y: 0 },
      { x: METRIC_T[1], y: 2 },
      { x: METRIC_T[2], y: 5 },
      { x: METRIC_T[3], y: 7 },
      { x: METRIC_T[4], y: 7 },
      { x: METRIC_T[5], y: 6 },
    ],
  },
];

const SHUFFLE_SERIES_STOPPED = [
  {
    title: 'Shuffle read/write data (MB)',
    type:  'line',
    data:  [
      { x: METRIC_T[0], y: 5   },
      { x: METRIC_T[1], y: 20  },
      { x: METRIC_T[2], y: 620 },
      { x: METRIC_T[3], y: 310 },
      { x: METRIC_T[4], y: 80  },
      { x: METRIC_T[5], y: 15  },
    ],
  },
];

const IO_SERIES_STOPPED = [
  {
    title: 'Data speed',
    type:  'line',
    data:  [
      { x: METRIC_T[0], y: 5  },
      { x: METRIC_T[1], y: 10 },
      { x: METRIC_T[2], y: 13 },
      { x: METRIC_T[3], y: 9  },
      { x: METRIC_T[4], y: 4  },
      { x: METRIC_T[5], y: 1  },
    ],
  },
];

export default function RunDetailsPage() {
  const { runId }        = useParams();
  const { state: run }   = useLocation();
  const navigate         = useNavigate();
  const [navigationOpen, setNavigationOpen]           = useState(false);
  const [toolsOpen, setToolsOpen]                     = useState(false);
  const [flashDismissed, setFlashDismissed]           = useState(false);
  const [errorFlashDismissed, setErrorFlashDismissed] = useState(false);
  const [stopFlashDismissed, setStopFlashDismissed]   = useState(false);

  const jobName      = run?.jobName      ?? '—';
  const jobId        = run?.jobId        ?? null;
  const canvas       = run?.canvas       ?? null;
  const nodeStats    = run?.nodeStats    ?? {};
  const status       = run?.status       ?? '—';
  const errorNodeId  = run?.errorNodeId  ?? null;
  const isFailed     = status === 'Failed';
  const isStopped    = status === 'Stopped';

  const memorySeries  = isFailed ? MEMORY_SERIES_FAILED  : isStopped ? MEMORY_SERIES_STOPPED  : MEMORY_SERIES;
  const dpuSeries     = isFailed ? DPU_SERIES_FAILED     : isStopped ? DPU_SERIES_STOPPED     : DPU_SERIES;
  const shuffleSeries = isFailed ? SHUFFLE_SERIES_FAILED : isStopped ? SHUFFLE_SERIES_STOPPED : SHUFFLE_SERIES;
  const ioSeries      = isFailed ? IO_SERIES_FAILED      : isStopped ? IO_SERIES_STOPPED      : IO_SERIES;

  const startTime    = run?.startTime    ?? null;
  const endTime      = run?.endTime      ?? null;
  const totalRecords = run?.totalRecords != null ? run.totalRecords.toLocaleString() : '—';
  const dpuHours     = run?.dpuHours     != null ? String(run.dpuHours)              : '—';

  const canvasNodes     = canvas?.nodes ?? [];
  const firstNodeId     = canvasNodes[0]?.id ?? null;
  const errorNodeLabel  = canvasNodes.find(n => n.id === errorNodeId)?.data?.label ?? null;

  const [selectedNodeId, setSelectedNodeId] = useState(firstNodeId);

  const canvasEdges        = canvas?.edges ?? [];
  const selectedCanvasNode = canvasNodes.find(n => n.id === selectedNodeId) ?? null;
  const selectedStats      = selectedNodeId ? (nodeStats[selectedNodeId] ?? null) : null;
  const isJoin             = selectedCanvasNode?.data?.type?.includes('Join') ?? false;
  const isTarget           = selectedCanvasNode?.data?.type?.includes('Target') ?? false;

  // Target nodes have no output — use the upstream node's previewData instead
  const previewSourceNode = isTarget
    ? (() => {
        const incomingEdge = canvasEdges.find(e => e.target === selectedNodeId);
        return incomingEdge ? canvasNodes.find(n => n.id === incomingEdge.source) ?? null : null;
      })()
    : selectedCanvasNode;
  const previewData = previewSourceNode?.data?.previewData?.slice(0, 5) ?? [];

  const previewColumns = previewData.length > 0
    ? Object.keys(previewData[0]).map(key => ({
        id:     key,
        header: key,
        cell:   row => String(row[key] ?? ''),
      }))
    : [];

  const nodeType = selectedCanvasNode?.data?.type ?? '-';
  const config   = selectedCanvasNode?.data?.config ?? {};

  let locationItem = null;
  if (nodeType === 'Source - S3') {
    locationItem = {
      label: 'Data location',
      value: config.s3Url ?? '—',
    };
  } else if (nodeType === 'Source - RDS') {
    locationItem = {
      label: 'Data location',
      value: <Link href="#" external>{`${config.connection ?? '—'} / ${config.tableName ?? '—'}`}</Link>,
    };
  } else if (nodeType === 'Target - S3') {
    locationItem = {
      label: 'Output location',
      value: config.s3Location ?? '—',
    };
  }

  const kvItems = isJoin
    ? [
        { label: 'Type',                  value: nodeType                                    },
        { label: 'Rows ingested (left)',  value: fmt(selectedStats?.rowsIngestedLeft)        },
        { label: 'Rows ingested (right)', value: fmt(selectedStats?.rowsIngestedRight)       },
        { label: 'Rows processed',        value: fmt(selectedStats?.rowsProcessed)           },
        { label: 'Node duration',   value: selectedStats?.nodeExecutionTime ?? '—'     },
      ]
    : [
        { label: 'Type',                value: nodeType                                    },
        { label: 'Rows ingested',       value: fmt(selectedStats?.rowsIngested)            },
        { label: 'Rows processed',      value: fmt(selectedStats?.rowsProcessed)           },
        { label: 'Node duration', value: selectedStats?.nodeExecutionTime ?? '—'     },
        ...(locationItem ? [locationItem] : []),
      ];

  const initialNodes = canvasNodes.map(n => {
    const stats = nodeStats[n.id];
    let runStatus;
    if (status === 'Succeeded') {
      runStatus = 'success';
    } else if (n.id === errorNodeId) {
      runStatus = 'error';
    } else if (!stats || stats.nodeExecutionTime === null) {
      runStatus = 'pending';
    } else {
      runStatus = 'success';
    }
    return { ...n, selected: n.id === firstNodeId, data: { ...n.data, status: runStatus } };
  });
  const initialEdges = canvasEdges;

  return (
    <>
      <EdgeMarkers />
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
        maxContentWidth="1440"
        breadcrumbs={
          <BreadcrumbGroup
            items={[
              { text: 'AWS Glue Studio', href: '/'                                  },
              { text: 'Jobs',            href: '/'                                  },
              { text: jobName,           href: jobId ? `/jobs/${jobId}` : '/'       },
              { text: runId ?? '—',      href: '#'                                  },
            ]}
            onFollow={e => {
              e.preventDefault();
              const { href } = e.detail;
              if (jobId && href === `/jobs/${jobId}`) {
                navigate(`/jobs/${jobId}`, { state: { canvas, jobName } });
              } else {
                navigate(href);
              }
            }}
            ariaLabel="Breadcrumbs"
          />
        }
        navigation={
          <SideNavigation
            header={{ text: 'AWS Glue Studio', href: '/' }}
            activeHref="/"
            items={NAV_ITEMS}
          />
        }
        tools={
          <HelpPanel header={<h2>Run details</h2>}>
            <p>View the status and output details for this job run.</p>
          </HelpPanel>
        }
        navigationOpen={navigationOpen}
        onNavigationChange={({ detail }) => setNavigationOpen(detail.open)}
        toolsOpen={toolsOpen}
        onToolsChange={({ detail }) => setToolsOpen(detail.open)}
        content={
          <SpaceBetween direction="vertical" size="m">
            {!flashDismissed && run?.isLiveRun && status === 'Succeeded' && (
              <Flashbar
                items={[{
                  type:        'success',
                  content:     `Job run ${runId} completed successfully.`,
                  dismissible: true,
                  onDismiss:   () => setFlashDismissed(true),
                  id:          'run-success',
                }]}
              />
            )}

            {!errorFlashDismissed && isFailed && (
              <Flashbar
                items={[{
                  type:        'error',
                  header:      'Job run failed',
                  action: <Button iconName="external" iconAlign="right">View error logs</Button>,
                  content:     errorNodeLabel
                    ? `The run encountered an error at node "${errorNodeLabel}" and could not continue. Downstream nodes were not executed. Check the error logs for details.`
                    : `The run encountered an error and could not complete.`,
                  dismissible: true,
                  onDismiss:   () => setErrorFlashDismissed(true),
                  id:          'run-error',
                }]}
              />
            )}

            {!stopFlashDismissed && isStopped && (
              <Flashbar
                items={[{
                  type:        'info',
                  content:     'This job run was stopped manually before it completed. Partial results may have been written to the target.',
                  dismissible: true,
                  onDismiss:   () => setStopFlashDismissed(true),
                  id:          'run-stopped',
                }]}
              />
            )}

            <Header
              variant="h1"
              actions={
                <SpaceBetween direction="horizontal" size="xs">
                  <Button disabled>Stop run</Button>
                  <Button>Clone run</Button>
                  <Button onClick={() => jobId ? navigate(`/jobs/${jobId}`, { state: { canvas, jobName } }) : navigate('/')}>View job</Button>
                  <Button variant="primary" iconName="external" iconAlign="right">View output in S3</Button>
                </SpaceBetween>
              }
            >
              {jobName} - Run ID: {runId}
            </Header>

            <Container
              header={
                <Header
                  variant="h2"
                  actions={
                    <SpaceBetween direction="horizontal" size="xs">
                      <Button iconName="external" iconAlign="right">View logs</Button>
                      <Button iconName="external" iconAlign="right">View error logs</Button>
                    </SpaceBetween>
                  }
                >
                  Run details
                </Header>
              }
            >
              <KeyValuePairs
                columns={3}
                items={[
                  { label: 'Run status',    value: <StatusIndicator type={STATUS_TYPE_MAP[status] ?? 'info'}>{status}</StatusIndicator> },
                  { label: 'Start time',    value: formatDateTime(startTime) },
                  { label: 'End time',      value: formatDateTime(endTime) },
                  { label: 'Duration',      value: formatDuration(startTime, endTime) },
                  { label: 'Total records', value: totalRecords },
                  { label: 'DPU hours',     value: dpuHours },
                ]}
              />
            </Container>

            {canvasNodes.length > 0 && (
              <Container
                disableContentPaddings
              >
                <div style={{ display: 'flex', height: '740px' }}>
                  <div style={{ width: '50%', height: '100%', borderRight: '1px solid #e9ebed' }}>
                    <ETLCanvas
                      readOnly
                      initialNodes={initialNodes}
                      initialEdges={initialEdges}
                      nodeTypes={nodeTypes}
                      onNodeSelect={node => setSelectedNodeId(node.id)}
                    />
                  </div>

                  <div style={{ width: '50%', height: '100%', overflow: 'auto', padding: '24px' }}>
                    {selectedCanvasNode ? (
                      <SpaceBetween direction="vertical" size="l">
                        <Header variant="h2" description="View the selected node's execution details and data preview.">
                            {selectedCanvasNode.data.label}
                        </Header>

                        <KeyValuePairs columns={3} items={kvItems} />

                        <div style={{ padding: '4px 0', borderBottom: '1px solid #d1d5db', margin: '0 -24px' }} />

                        <Table
                          header={<Header variant="h3" counter={`(${previewData.length})`}>Data preview</Header>}
                          items={previewData}
                          variant="embedded"
                          columnDefinitions={previewColumns}
                          trackBy={(row, i) => String(i)}
                          empty={
                            <Box textAlign="center" color="inherit" padding={{ vertical: 'l' }}>
                              <Box variant="strong">No preview available</Box>
                            </Box>
                          }
                          wrapLines
                          stripedRows
                        />
                      </SpaceBetween>
                    ) : (
                      <Box color="text-body-secondary" textAlign="center" padding={{ top: 'xxl' }}>
                        Select a node on the canvas to view its execution details.
                      </Box>
                    )}
                  </div>
                </div>
              </Container>
            )}
            <div style={{ padding: '4px 0', borderBottom: '1px solid #d1d5db', margin: '0' }} />
            <Header variant="h2" description="Resource utilization and data throughput metrics for this job run, sampled over the run duration.">
              Job run metrics
            </Header>
            <ColumnLayout columns={2}>
              <Container
                header={
                  <Header
                    variant="h2"
                    description={
                      <Box variant="small" color="text-status-inactive">
                        JVM heap usage during the job run. Spikes indicate memory-intensive transforms such as joins.
                      </Box>
                    }
                  >
                    Memory
                  </Header>
                }
              >
                <LineChart
                  series={memorySeries}
                  xDomain={CHART_X_DOMAIN}
                  yDomain={[0, 100]}
                  xScaleType="time"
                  yTitle="JVM heap usage (%)"
                  height={200}
                  hideFilter
                  i18nStrings={CHART_I18N}
                />
              </Container>

              <Container
                header={
                  <Header
                    variant="h2"
                    description={
                      <Box variant="small" color="text-status-inactive">
                        Number of Data Processing Units allocated by Glue auto-scaling over the run duration.
                      </Box>
                    }
                  >
                    DPU scale
                  </Header>
                }
              >
                <LineChart
                  series={dpuSeries}
                  xDomain={CHART_X_DOMAIN}
                  yDomain={[0, 10]}
                  xScaleType="time"
                  yTitle="DPU-hours"
                  height={200}
                  hideFilter
                  i18nStrings={CHART_I18N}
                />
              </Container>

              <Container
                header={
                  <Header
                    variant="h2"
                    description={
                      <Box variant="small" color="text-status-inactive">
                        Volume of data shuffled between Spark executors. High values indicate expensive operations such as joins or aggregations.
                      </Box>
                    }
                  >
                    Internal transfer
                  </Header>
                }
              >
                <LineChart
                  series={shuffleSeries}
                  xDomain={CHART_X_DOMAIN}
                  yDomain={[0, 1000]}
                  xScaleType="time"
                  yTitle="Shuffle read/write data (MB)"
                  height={200}
                  hideFilter
                  i18nStrings={CHART_I18N}
                />
              </Container>

              <Container
                header={
                  <Header
                    variant="h2"
                    description={
                      <Box variant="small" color="text-status-inactive">
                        Read and write throughput over the run duration.
                      </Box>
                    }
                  >
                    Data speed (I/O)
                  </Header>
                }
              >
                <LineChart
                  series={ioSeries}
                  xDomain={CHART_X_DOMAIN}
                  yDomain={[0, 20]}
                  xScaleType="time"
                  yTitle="Data speed"
                  height={200}
                  hideFilter
                  i18nStrings={CHART_I18N}
                />
              </Container>
            </ColumnLayout>
          </SpaceBetween>
        }
      />
    </>
  );
}
