import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import AppLayoutToolbar from '@cloudscape-design/components/app-layout-toolbar';
import Box from '@cloudscape-design/components/box';
import BreadcrumbGroup from '@cloudscape-design/components/breadcrumb-group';
import Button from '@cloudscape-design/components/button';
import ButtonDropdown from '@cloudscape-design/components/button-dropdown';
import Icon from '@cloudscape-design/components/icon';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import Table from '@cloudscape-design/components/table';
import Tabs from '@cloudscape-design/components/tabs';
import HelpPanel from '@cloudscape-design/components/help-panel';
import Link from '@cloudscape-design/components/link';
import SideNavigation from '@cloudscape-design/components/side-navigation';
import SpaceBetween from '@cloudscape-design/components/space-between';
import TopNavigation from '@cloudscape-design/components/top-navigation';
import AuthoringView from './AuthoringView.jsx';
import Header from '@cloudscape-design/components/header';
import { Badge } from '@cloudscape-design/components';
import awsLogoUrl from '../public/images/aws-logo.svg';
import JOBS from '../data/glue-jobs.json';
import CodeView from '@cloudscape-design/code-view/code-view';
import SegmentedControl from '@cloudscape-design/components/segmented-control';
import hljs from 'highlight.js/lib/core';
import python from 'highlight.js/lib/languages/python';
import scala from 'highlight.js/lib/languages/scala';
import 'highlight.js/styles/github.css';

hljs.registerLanguage('python', python);
hljs.registerLanguage('scala', scala);

const CANVAS_STORAGE_KEY = 'glue-studio-canvas';

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
  const ms           = new Date(endIso) - new Date(startIso);
  const totalSeconds = Math.floor(ms / 1000);
  const minutes      = Math.floor(totalSeconds / 60);
  const seconds      = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function generateRunId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const suffix = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `GJ-RUN-${suffix}`;
}

function makeHighlighter(language) {
  return function highlight(code) {
    const { value } = hljs.highlight(code, { language });
    const lines = value.split('\n');
    return (
      <span>
        {lines.map((line, i) => (
          <span key={i} dangerouslySetInnerHTML={{ __html: line || ' ' }} />
        ))}
      </span>
    );
  };
}

const highlightPython = makeHighlighter('python');
const highlightScala  = makeHighlighter('scala');

const NAV_ITEMS = [
  { type: 'link', text: 'Jobs',       href: '/'          },
  { type: 'link', text: 'Monitoring', href: '#/crawlers' },
  { type: 'divider' },
  { type: 'link', text: 'Settings',   href: '#/settings' },
];

export default function CreateJobPage() {
  const { jobId }              = useParams();
  const { state: locationState } = useLocation();

  const jobData  = JOBS.find(j => j.id === jobId) ?? null;
  const jobRuns  = jobData?.runs ?? [];

  const [navigationOpen, setNavigationOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [jobName, setJobName] = useState(
    locationState?.jobName ?? 'My job 01'
  );
  const [jobNameHovered, setJobNameHovered] = useState(false);
  const [jobNameTouched, setJobNameTouched] = useState(false);
  const jobNameError = jobNameTouched && !jobName.trim();
  const [activeTabId, setActiveTabId] = useState('visual');
  const [scriptLang, setScriptLang] = useState('python');
  const [canRun, setCanRun] = useState(false);
  const [selectedRunItems, setSelectedRunItems] = useState([]);
  const navigate          = useNavigate();
  const latestCanvasState = useRef({ nodes: [], edges: [] });

  const savedCanvas = useMemo(() => {
    if (locationState?.canvas) return locationState.canvas;
    // Only restore from sessionStorage when editing an existing job (returning from run page)
    if (jobId) {
      try {
        return JSON.parse(sessionStorage.getItem(CANVAS_STORAGE_KEY)) ?? { nodes: [], edges: [] };
      } catch { /* fall through */ }
    }
    return { nodes: [], edges: [] };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [hasNodes, setHasNodes] = useState(savedCanvas.nodes.length > 0);

  const handleRun = () => {
    const runId      = generateRunId();
    const startTime  = new Date();
    const durationMs = Math.floor(Math.random() * 5 * 60 * 1000) + 60 * 1000;
    const endTime    = new Date(startTime.getTime() + durationMs);
    sessionStorage.setItem(CANVAS_STORAGE_KEY, JSON.stringify(latestCanvasState.current));
    navigate(`/runs/${runId}`, {
      state: {
        jobId,
        jobName,
        runId,
        isLiveRun:    true,
        canvas:       latestCanvasState.current,
        status:       'Succeeded',
        startTime:    startTime.toISOString(),
        endTime:      endTime.toISOString(),
        totalRecords: Math.floor(Math.random() * 50000) + 1000,
        dpuHours:     parseFloat((durationMs / 3600000 * 2).toFixed(3)),
      },
    });
  };
  const [jobNameWidth, setJobNameWidth] = useState(0);
  const jobNameSizerRef = useRef(null);

  useEffect(() => {
    document.body.classList.add('canvas-page');
    return () => document.body.classList.remove('canvas-page');
  }, []);

  useEffect(() => {
    if (jobNameSizerRef.current) setJobNameWidth(jobNameSizerRef.current.offsetWidth);
  }, [jobName]);

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
        breadcrumbs={
          <BreadcrumbGroup
            items={[
              { text: 'AWS Glue Studio', href: '/' },
              { text: 'Jobs',            href: '/' },
              { text: jobId ? jobName : 'Create job', href: '#' },
            ]}
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
          <HelpPanel
            header={<h2>Create job</h2>}
            footer={
              <Link href="#" external>Learn more in the AWS Glue documentation</Link>
            }
          >
            <p>Use this page to create and configure a new AWS Glue ETL job.</p>
          </HelpPanel>
        }
        navigationOpen={navigationOpen}
        onNavigationChange={({ detail }) => setNavigationOpen(detail.open)}
        toolsOpen={toolsOpen}
        onToolsChange={({ detail }) => setToolsOpen(detail.open)}
        content={
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 24px',
              borderBottom: '1px solid #e9ebed',
              background: '#ffffff',
              flexShrink: 0,
            }}>
              <div style={{ position: 'relative' }}>
                <span
                  ref={jobNameSizerRef}
                  aria-hidden
                  style={{
                    position: 'absolute',
                    visibility: 'hidden',
                    whiteSpace: 'pre',
                    fontWeight: 700,
                    fontSize: '18px',
                    padding: '2px 6px',
                  }}
                >{jobName || ' '}</span>
                <input
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                  onBlur={() => setJobNameTouched(true)}
                  onMouseEnter={() => setJobNameHovered(true)}
                  onMouseLeave={() => setJobNameHovered(false)}
                  aria-label="Job name"
                  aria-invalid={jobNameError}
                  style={{
                    fontWeight: 700,
                    fontSize: '18px',
                    border: jobNameError
                      ? '2px solid #d91515'
                      : jobNameHovered ? '1px solid #7d8998' : '1px solid transparent',
                    borderLeft: jobNameError ? '8px solid #d91515' : jobNameHovered ? '1px solid #7d8998' : '1px solid transparent',
                    borderRadius: '4px',
                    outline: 'none',
                    background: 'transparent', 
                    padding: '2px 6px',
                    width: jobNameWidth > 0 ? `${jobNameWidth}px` : 'auto',
                    minWidth: '260px',
                  }}
                />
                {jobNameError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', color: '#d91515', fontSize: '12px' }}>
                    <Icon name="status-negative" />
                    Job name is required.
                  </div>
                )}
              </div>
              <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                <Badge>Saved: 1 min ago</Badge>
                <ButtonDropdown items={[
                  { id: 'clone',  text: 'Clone job' },
                  { id: 'close-as-script', text: 'Clone job as script', variant: 'normal' },
                  { id: 'export-1', text: 'Download script as Python' },
                  { id: 'export-2', text: 'Download script as Scala' },
                ]}>Actions</ButtonDropdown>
                {/* <Button>Save</Button> */}
                <Button variant="primary" disabled={!canRun} onClick={handleRun}>Run</Button>
              </SpaceBetween>
            </div>

            <div style={{ background: '#ffffff', flexShrink: 0, paddingLeft: '24px', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.12)', position: 'relative', zIndex: 1 }}>
              <Tabs
                activeTabId={activeTabId}
                disableContentPaddings
                onChange={({ detail }) => setActiveTabId(detail.activeTabId)}
                tabs={[
                  { id: 'visual',       label: 'Visual' },
                  { id: 'script',       label: 'Script' },
                  { id: 'properties',   label: 'Properties', disabled: true },
                  { id: 'run-history',  label: 'Run history' },
                  { id: 'run-schedule', label: 'Run schedule', disabled: true },
                ]}
              />
            </div>

            <div style={{ flex: 1, overflow: 'hidden', display: activeTabId === 'visual' ? 'flex' : 'none', flexDirection: 'column' }}>
              <AuthoringView
                onCanRunChange={setCanRun}
                onCanvasStateChange={(state) => { latestCanvasState.current = state; setHasNodes(state.nodes.length > 0); }}
                initialNodes={savedCanvas.nodes}
                initialEdges={savedCanvas.edges}
              />
            </div>

            <div style={{ display: activeTabId === 'script' ? 'flex' : 'none', flex: 1, flexDirection: 'column', overflow: 'hidden', width: '100%', padding: '16px 24px 0 48px' }}>
              <div style={{ marginBottom: '16px', flexShrink: 0 }}>
                <Header variant="h2"
                  actions={
                    <SpaceBetween direction="horizontal" size="xs">
                      <SegmentedControl
                        selectedId={scriptLang}
                        onChange={({ detail }) => setScriptLang(detail.selectedId)}
                        options={[
                          { id: 'python', text: 'Python' },
                          { id: 'scala',  text: 'Scala'  },
                        ]}
                      />
                      <Button>Clone job as script</Button>
                      <Button iconName="download">Download script</Button>
                    </SpaceBetween>
                  }
                  description="This is a read-only view of your Glue job's script. To edit it, you can download it or clone the job as a script.">
                  Script view <i> – read-only</i>
                </Header>
              </div>
              <div style={{ height: 'calc(100vh - 280px)', overflow: 'auto' }}>
                {!hasNodes ? (
                  <Box textAlign="center" color="inherit" padding={{ vertical: 'xxl' }}>
                    <Box variant="strong" color="inherit">No script generated</Box>
                    <Box variant="p" color="inherit" margin={{ top: 'xs' }}>
                      Build your ETL job in the <strong>Visual</strong> tab. The generated script will appear here once your job has been configured.
                    </Box>
                  </Box>
                ) : scriptLang === 'python' ? (
                  <CodeView
                    highlight={highlightPython}
                    content={`import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job

args = getResolvedOptions(sys.argv, ['JOB_NAME'])
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args['JOB_NAME'], args)

# ── Source 1: Raw Transactions (S3 - CSV) ─────────────────────────────────────

Transactions = glueContext.create_dynamic_frame.from_options(
    connection_type="s3",
    format="csv",
    format_options={
        "withHeader": True,
        "separator": ",",
        "quoteChar": '"',
    },
    connection_options={
        "paths": ["s3://retail-raw/transactions/2024-03-15/transactions.csv"],
        "recurse": True,
    },
    transformation_ctx="Transactions",
)

# ── Source 2: Product Catalog (RDS) ───────────────────────────────────────────

Products = glueContext.create_dynamic_frame.from_options(
    connection_type="mysql",
    connection_options={
        "useConnectionProperties": "true",
        "dbtable": "products",
        "connectionName": "retail-ops-rds",
    },
    transformation_ctx="Products",
)

# ── Transform 1: Join Transactions to Product Catalog ─────────────────────────

Joined = Join.apply(
    frame1=Transactions,
    frame2=Products,
    keys1=["product_id"],
    keys2=["product_id"],
    transformation_ctx="Joined",
)

# ── Transform 2: Apply Mapping ────────────────────────────────────────────────
# Rename fields to warehouse conventions, calculate total_amount,
# split timestamp into sale_date and sale_time, drop unused columns.

Mapped = ApplyMapping.apply(
    frame=Joined,
    mappings=[
        ("transaction_id",  "string",  "transaction_id",  "string"),
        ("store_id",        "string",  "store_id",        "string"),
        ("product_id",      "string",  "product_id",      "string"),
        ("product_name",    "string",  "product_name",    "string"),
        ("category",        "string",  "category",        "string"),
        ("department",      "string",  "department",      "string"),
        ("qty",             "long",    "quantity",        "long"),
        ("unit_price",      "double",  "unit_price",      "double"),
        ("payment_method",  "string",  "payment_method",  "string"),
        # timestamp split handled via SparkSQL below
        # supplier_code and is_active intentionally dropped
    ],
    transformation_ctx="Mapped",
)

# Calculate total_amount and split timestamp using SparkSQL
MappedDF = Mapped.toDF()
MappedDF = MappedDF.withColumn(
    "total_amount",
    (MappedDF["quantity"] * MappedDF["unit_price"]).cast("double"),
)
MappedDF = MappedDF.withColumn(
    "sale_date",
    MappedDF["timestamp"].cast("date"),
)
MappedDF = MappedDF.withColumn(
    "sale_time",
    MappedDF["timestamp"].cast("timestamp"),
)
MappedDF = MappedDF.drop("timestamp")

from awsglue.dynamicframe import DynamicFrame
Mapped = DynamicFrame.fromDF(MappedDF, glueContext, "Mapped")

# ── Target: Write to S3 as Parquet ────────────────────────────────────────────
# Partitioned by sale_date and department.
# Registered in Glue Data Catalog as retail_dw.daily_sales.

DataSink = glueContext.getSink(
    path="s3://retail-warehouse/sales/",
    connection_type="s3",
    updateBehavior="UPDATE_IN_DATABASE",
    partitionKeys=["sale_date", "department"],
    enableUpdateCatalog=True,
    transformation_ctx="DataSink",
)
DataSink.setCatalogInfo(
    catalogDatabase="retail_dw",
    catalogTableName="daily_sales",
)
DataSink.setFormat("glueparquet")
DataSink.writeFrame(Mapped)

job.commit()
`}
                    lineNumbers
                    wrapLines
                  />
                ) : (
                  <CodeView
                    highlight={highlightScala}
                    content={`import com.amazonaws.services.glue.GlueContext
import com.amazonaws.services.glue.util.GlueArgParser
import com.amazonaws.services.glue.util.Job
import com.amazonaws.services.glue.util.JsonOptions
import com.amazonaws.services.glue.DynamicFrame
import org.apache.spark.SparkContext
import org.apache.spark.sql.functions._
import scala.collection.JavaConverters._

object GlueApp {
  def main(sysArgs: Array[String]): Unit = {
    val args = GlueArgParser.getResolvedOptions(sysArgs, Seq("JOB_NAME").toArray)
    val sc: SparkContext = new SparkContext()
    val glueContext: GlueContext = new GlueContext(sc)
    val spark = glueContext.getSparkSession
    Job.init(args("JOB_NAME"), glueContext, args.asJava)

    // ── Source 1: Raw Transactions (S3 - CSV) ───────────────────────────────

    val Transactions = glueContext.getSourceWithFormat(
      connectionType = "s3",
      format = "csv",
      options = JsonOptions("""{"paths": ["s3://retail-raw/transactions/2024-03-15/transactions.csv"], "recurse": true}"""),
      formatOptions = JsonOptions("""{"withHeader": true, "separator": ",", "quoteChar": "\\""}"""),
      transformationContext = "Transactions"
    ).getDynamicFrame()

    // ── Source 2: Product Catalog (RDS) ─────────────────────────────────────

    val Products = glueContext.getSource(
      connectionType = "mysql",
      connectionOptions = JsonOptions("""{"useConnectionProperties": "true", "dbtable": "products", "connectionName": "retail-ops-rds"}"""),
      transformationContext = "Products"
    ).getDynamicFrame()

    // ── Transform 1: Join Transactions to Product Catalog ───────────────────

    val Joined = Transactions.join(
      keys1 = Seq("product_id"),
      keys2 = Seq("product_id"),
      frame2 = Products,
      transformationContext = "Joined"
    )

    // ── Transform 2: Apply Mapping ──────────────────────────────────────────
    // Rename fields to warehouse conventions, calculate total_amount,
    // split timestamp into sale_date and sale_time, drop unused columns.

    val Mapped = Joined.applyMapping(
      mappings = Seq(
        ("transaction_id", "string", "transaction_id", "string"),
        ("store_id",       "string", "store_id",       "string"),
        ("product_id",     "string", "product_id",     "string"),
        ("product_name",   "string", "product_name",   "string"),
        ("category",       "string", "category",       "string"),
        ("department",     "string", "department",     "string"),
        ("qty",            "long",   "quantity",       "long"),
        ("unit_price",     "double", "unit_price",     "double"),
        ("payment_method", "string", "payment_method", "string")
        // timestamp split handled via Spark below
        // supplier_code and is_active intentionally dropped
      ),
      caseSensitive = false,
      transformationContext = "Mapped"
    )

    // Calculate total_amount and split timestamp using Spark
    var MappedDF = Mapped.toDF()
    MappedDF = MappedDF.withColumn("total_amount", (col("quantity") * col("unit_price")).cast("double"))
    MappedDF = MappedDF.withColumn("sale_date", col("timestamp").cast("date"))
    MappedDF = MappedDF.withColumn("sale_time", col("timestamp").cast("timestamp"))
    MappedDF = MappedDF.drop("timestamp")

    val MappedFinal = DynamicFrame(MappedDF, glueContext, "Mapped")

    // ── Target: Write to S3 as Parquet ──────────────────────────────────────
    // Partitioned by sale_date and department.
    // Registered in Glue Data Catalog as retail_dw.daily_sales.

    val DataSink = glueContext.getSink(
      connectionType = "s3",
      options = JsonOptions("""{
        "path": "s3://retail-warehouse/sales/",
        "updateBehavior": "UPDATE_IN_DATABASE",
        "partitionKeys": ["sale_date", "department"],
        "enableUpdateCatalog": true
      }"""),
      transformationContext = "DataSink"
    )
    DataSink.setCatalogInfo(catalogDatabase = "retail_dw", catalogTableName = "daily_sales")
    DataSink.setFormat("glueparquet")
    DataSink.writeFrame(MappedFinal)

    Job.commit()
  }
}
`}
                    lineNumbers
                    wrapLines
                  />
                )}
              </div>
            </div>

            <div style={{ display: activeTabId === 'properties' ? 'flex' : 'none', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#5f6b7a' }}>
              Properties panel coming soon.
            </div>

            <div style={{ display: activeTabId === 'run-history' ? 'flex' : 'none', flex: 1, flexDirection: 'column', overflow: 'hidden', width: '100%', padding: '16px 24px 0 24px' }}>
              <div style={{ height: 'calc(100vh - 280px)', overflow: 'auto' }}>
                <Table
                  items={jobRuns}
                  selectionType="single"
                  selectedItems={selectedRunItems}
                  onSelectionChange={({ detail }) => setSelectedRunItems(detail.selectedItems)}
                  trackBy="runId"
                  columnDefinitions={[
                    {
                      id:     'runId',
                      header: 'Run ID',
                      cell:   run => (
                        <Link
                          href={`/runs/${run.runId}`}
                          onFollow={e => {
                            e.preventDefault();
                            navigate(`/runs/${run.runId}`, { state: { ...run, jobId, jobName, canvas: savedCanvas } });
                          }}
                        >
                          {run.runId}
                        </Link>
                      ),
                    },
                    {
                      id:     'status',
                      header: 'Run status',
                      cell:   run => (
                        <StatusIndicator type={STATUS_TYPE_MAP[run.status] ?? 'pending'}>
                          {run.status}
                        </StatusIndicator>
                      ),
                    },
                    {
                      id:     'startTime',
                      header: 'Start time',
                      cell:   run => formatDateTime(run.startTime),
                    },
                    {
                      id:     'endTime',
                      header: 'End time',
                      cell:   run => formatDateTime(run.endTime),
                    },
                    {
                      id:     'duration',
                      header: 'Duration',
                      cell:   run => formatDuration(run.startTime, run.endTime),
                    },
                  ]}
                  header={
                    <Header
                      counter={jobRuns.length > 0 ? `(${jobRuns.length})` : undefined}
                      description="View a history of all runs for this job, including their status and duration."
                      actions={
                        <SpaceBetween direction="horizontal" size="xs">
                          <Button disabled>Stop run</Button>
                          <Button disabled={selectedRunItems.length === 0}>Clone run</Button>
                          <Button disabled={selectedRunItems.length === 0} variant="primary" iconName="external" iconAlign="right">View output in S3</Button>
                        </SpaceBetween>
                      }
                    >
                      Run history
                    </Header>
                  }
                  empty={
                    <Box textAlign="center" color="inherit" padding={{ vertical: 'xxl' }}>
                      <Box variant="strong" color="inherit">No job runs yet</Box>
                      <Box variant="p" color="inherit" margin={{ top: 'xs' }}>
                        Choose <strong>Run</strong> to start your first job run.
                      </Box>
                    </Box>
                  }
                />
              </div>
            </div>

            <div style={{ display: activeTabId === 'run-schedule' ? 'flex' : 'none', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#5f6b7a' }}>
              No schedule configured.
            </div>
          </div>
        }
        disableContentPaddings
      />
    </>
  );
}
