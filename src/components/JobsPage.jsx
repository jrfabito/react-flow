import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayoutToolbar from '@cloudscape-design/components/app-layout-toolbar';
import Box from '@cloudscape-design/components/box';
import BreadcrumbGroup from '@cloudscape-design/components/breadcrumb-group';
import Button from '@cloudscape-design/components/button';
import ButtonDropdown from '@cloudscape-design/components/button-dropdown';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import ExpandableSection from '@cloudscape-design/components/expandable-section';
import Header from '@cloudscape-design/components/header';
import HelpPanel from '@cloudscape-design/components/help-panel';
import Link from '@cloudscape-design/components/link';
import SideNavigation from '@cloudscape-design/components/side-navigation';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Table from '@cloudscape-design/components/table';
import TopNavigation from '@cloudscape-design/components/top-navigation';
import awsLogoUrl from '../public/images/aws-logo.svg';
import JOBS from '../data/glue-jobs.json';
import buildUrl     from '../public/images/build.svg';
import configureUrl from '../public/images/configure.svg';
import monitorUrl   from '../public/images/monitor.svg';

const NAV_ITEMS = [
  { type: 'link', text: 'Jobs',       href: '/'          },
  { type: 'link', text: 'Monitoring', href: '/monitoring' },
  { type: 'divider' },
  { type: 'link', text: 'Settings',   href: '#/settings' },
];

function formatDate(isoString) {
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

// ── How it works steps ────────────────────────────────────────────────────────

const HOW_IT_WORKS_STEPS = [
  {
    icon:        <img src={buildUrl}     alt="" style={{ height: 144 }} />,
    title:       'Build your ETL pipeline',
    description: 'Use the visual canvas to connect data sources, apply transformations, and configure targets — no code required.',
  },
  {
    icon:        <img src={configureUrl} alt="" style={{ height: 144 }} />,
    title:       'Configure and validate',
    description: 'Set connection properties, field mappings, and output formats. Node status indicators confirm each step is ready.',
  },
  {
    icon:        <img src={monitorUrl}   alt="" style={{ height: 144 }} />,
    title:       'Run and monitor',
    description: 'Execute your job and track performance metrics, record counts, and DPU consumption across all runs.',
  },
];

// ── JobsPage ──────────────────────────────────────────────────────────────────

export default function JobsPage() {
  const navigate = useNavigate();
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [toolsOpen, setToolsOpen]           = useState(false);
  const [selectedItems, setSelectedItems]   = useState([]);
  const [sortingColumn, setSortingColumn]   = useState({ sortingField: 'lastModified' });
  const [sortingDescending, setSortingDescending] = useState(true);

  const selectedJob = selectedItems[0] ?? null;

  const handleOpenJob = async (job) => {
    const canvas = job.canvasRef
      ? await fetch(`/data/${job.canvasRef}`).then(r => r.json())
      : { nodes: [], edges: [] };
    navigate(`/jobs/${job.id}`, { state: { canvas, jobName: job.name } });
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
              type:      'button',
              iconName:  'notification',
              title:     'Notifications',
              ariaLabel: 'Notifications',
              badge:     false,
            },
            {
              type:      'menu-dropdown',
              iconName:  'settings',
              ariaLabel: 'Settings',
              title:     'Settings',
              items:     [{ id: 'preferences', text: 'Preferences' }],
            },
            {
              type:        'menu-dropdown',
              text:        'User',
              description: 'user@example.com',
              iconName:    'user-profile',
              items:       [{ id: 'signout', text: 'Sign out' }],
            },
          ]}
        />
      </div>

      <AppLayoutToolbar
        maxContentWidth="1440"
        headerSelector="#top-nav"
        breadcrumbs={
          <BreadcrumbGroup
            items={[
              { text: 'AWS Glue Studio', href: '/' },
              { text: 'Jobs',            href: '/' },
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
            header={<h2>Jobs</h2>}
            footer={<Link href="#" external>Learn more in the AWS Glue documentation</Link>}
          >
            <p>AWS Glue Studio jobs read data from sources, transform it, and write results to targets you configure.</p>
          </HelpPanel>
        }
        navigationOpen={navigationOpen}
        onNavigationChange={({ detail }) => setNavigationOpen(detail.open)}
        toolsOpen={toolsOpen}
        onToolsChange={({ detail }) => setToolsOpen(detail.open)}
        content={
          <SpaceBetween direction="vertical" size="l">
            <Header
              variant="h1"
              description="Create and manage your AWS Glue Studio jobs."
            >
              Glue Studio jobs
            </Header>
            <ExpandableSection headerText="How it works" defaultExpanded variant="container">
              <ColumnLayout columns={3} variant="text-grid">
                {HOW_IT_WORKS_STEPS.map(({ icon, title, description }) => (
                  <div key={title}>
                    <div style={{ marginBottom: '12px' }}>{icon}</div>
                    <Box variant="h3" padding={{ bottom: 'xs' }}>{title}</Box>
                    <Box color="text-body-secondary">{description}</Box>
                  </div>
                ))}
              </ColumnLayout>
            </ExpandableSection>

            <Table
              selectionType="single"
              selectedItems={selectedItems}
              onSelectionChange={({ detail }) => setSelectedItems(detail.selectedItems)}
              trackBy="id"
              sortingColumn={sortingColumn}
              sortingDescending={sortingDescending}
              onSortingChange={({ detail }) => {
                setSortingColumn(detail.sortingColumn);
                setSortingDescending(detail.isDescending);
              }}
              items={[...JOBS].sort((a, b) => {
                const field = sortingColumn?.sortingField;
                if (!field) return 0;
                const valA = a[field] ?? '';
                const valB = b[field] ?? '';
                const cmp  = valA < valB ? -1 : valA > valB ? 1 : 0;
                return sortingDescending ? -cmp : cmp;
              })}
              columnDefinitions={[
                {
                  id:     'name',
                  header: 'Name',
                  cell:   job => (
                    <Link href={`/jobs/${job.id}`} onFollow={e => { e.preventDefault(); handleOpenJob(job); }}>{job.name}</Link>
                  ),
                  sortingField: 'name',
                },
                {
                  id:     'description',
                  header: 'Description',
                  cell:   job => job.description,
                },
                {
                  id:     'lastModified',
                  header: 'Last modified',
                  cell:   job => formatDate(job.lastModified),
                  sortingField: 'lastModified',
                },
              ]}
              header={
                <Header
                  counter={`(${JOBS.length})`}
                  actions={
                    <SpaceBetween direction="horizontal" size="xs">
                      <ButtonDropdown
                        items={[
                          { id: 'clone',  text: 'Clone job',  disabled: !selectedJob },
                          { id: 'delete', text: 'Delete job', disabled: !selectedJob },
                        ]}
                      >
                        Actions
                      </ButtonDropdown>
                      <Button variant="primary" onClick={() => navigate('/create')}>
                        Create job
                      </Button>
                    </SpaceBetween>
                  }
                >
                  Jobs
                </Header>
              }
              empty={
                <Box textAlign="center" color="inherit" padding={{ vertical: 'xxl' }}>
                  <Box variant="strong" color="inherit">No jobs</Box>
                  <Box variant="p" color="inherit" margin={{ top: 'xs' }}>
                    Choose <strong>Create job</strong> to build your first ETL pipeline.
                  </Box>
                </Box>
              }
            />

          </SpaceBetween>
        }
      />
    </>
  );
}
