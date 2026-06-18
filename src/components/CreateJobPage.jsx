import { useState, useRef, useEffect } from 'react';
import AppLayoutToolbar from '@cloudscape-design/components/app-layout-toolbar';
import BreadcrumbGroup from '@cloudscape-design/components/breadcrumb-group';
import Button from '@cloudscape-design/components/button';
import ButtonDropdown from '@cloudscape-design/components/button-dropdown';
import Icon from '@cloudscape-design/components/icon';
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
import CodeView from '@cloudscape-design/code-view/code-view';
import hljs from 'highlight.js/lib/core';
import python from 'highlight.js/lib/languages/python';
import 'highlight.js/styles/github.css';

hljs.registerLanguage('python', python);

function highlightPython(code) {
  const { value } = hljs.highlight(code, { language: 'python' });
  const lines = value.split('\n');
  return (
    <span>
      {lines.map((line, i) => (
        <span key={i} dangerouslySetInnerHTML={{ __html: line || ' ' }} />
      ))}
    </span>
  );
}

const NAV_ITEMS = [
  { type: 'link', text: 'Jobs',      href: '#/jobs' },
  { type: 'link', text: 'Monitoring',  href: '#/crawlers' },
  { type: 'divider' },
  { type: 'link', text: 'Settings',  href: '#/settings' },
];

export default function CreateJobPage() {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [jobName, setJobName] = useState('Create job 01');
  const [jobNameHovered, setJobNameHovered] = useState(false);
  const [jobNameTouched, setJobNameTouched] = useState(false);
  const jobNameError = jobNameTouched && !jobName.trim();
  const [activeTabId, setActiveTabId] = useState('visual');
  const [jobNameWidth, setJobNameWidth] = useState(0);
  const jobNameSizerRef = useRef(null);

  useEffect(() => {
    if (jobNameSizerRef.current) setJobNameWidth(jobNameSizerRef.current.offsetWidth);
  }, [jobName]);

  return (
    <>
      <div id="top-nav">
        <TopNavigation
          identity={{
            href: '#',
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
              { text: 'AWS Glue Studio', href: '#' },
              { text: 'Jobs',            href: '#/jobs' },
              { text: 'Create job',      href: '#' },
            ]}
            ariaLabel="Breadcrumbs"
          />
        }
        navigation={
          <SideNavigation
            header={{ text: 'AWS Glue Studio', href: '#' }}
            activeHref="#/jobs"
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
                  { id: 'export', text: 'Download script' },
                ]}>Actions</ButtonDropdown>
                {/* <Button>Save</Button> */}
                <Button variant="primary">Run</Button>
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
              <AuthoringView />
            </div>

            <div style={{ display: activeTabId === 'script' ? 'flex' : 'none', flex: 1, flexDirection: 'column', overflow: 'hidden', width: '100%', padding: '16px 24px 0 48px' }}>
              <div style={{ marginBottom: '16px', flexShrink: 0 }}>
                <Header variant="h2"
                  actions={
                    <SpaceBetween direction="horizontal" size="xs">
                      <Button>Clone job as script</Button>
                      <Button iconName="download">Download script</Button>
                    </SpaceBetween>
                  }
                  description="This is a read-only view of your Glue job's script. To edit it, you can download it or clone the job as a script.">
                  Script view <i> – read-only</i>
                </Header>
              </div>
              <div style={{ height: 'calc(100vh - 280px)', overflow: 'auto' }}>
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

# ── Transform 3: Filter ───────────────────────────────────────────────────────
# Remove voided transactions (quantity < 0) and test store records.

Filtered = Filter.apply(
    frame=Mapped,
    f=lambda row: row["quantity"] > 0 and row["store_id"] != "TEST",
    transformation_ctx="Filtered",
)

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
DataSink.writeFrame(Filtered)

job.commit()
`}
                  lineNumbers
                  wrapLines
                />
              </div>
            </div>

            <div style={{ display: activeTabId === 'properties' ? 'flex' : 'none', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#5f6b7a' }}>
              Properties panel coming soon.
            </div>

            <div style={{ display: activeTabId === 'run-history' ? 'flex' : 'none', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#5f6b7a' }}>
              No run history yet.
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
