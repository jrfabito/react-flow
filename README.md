# React Flow Experiments

A prototype of an **AWS Glue–style visual ETL job builder**. Drag data sources, transforms, and targets onto a canvas, wire them together into a directed data pipeline, configure each step through a properties panel, and monitor job runs — all in the browser.

Built with [React Flow](https://reactflow.dev/) (`@xyflow/react`) for the node-graph canvas and the [Cloudscape Design System](https://cloudscape.design/) for the AWS-console look and feel.

## Features

- **Visual pipeline canvas** — add Source, Transform, and Target nodes and connect them into an ETL flow.
- **Connection rules** — connections are validated so that flows stay valid: sources feed transforms, transforms feed transforms or targets, fan-in limits are enforced (e.g. Join accepts two inputs, Apply mapping one), and cycles are prevented.
- **Node configuration** — each node opens a properties panel with a schema-driven form (S3 / RDS sources, Apply mapping and Join transforms, S3 target, and a fallback form for not-yet-built node types).
- **Job management** — list jobs, create and edit jobs, and drill into individual run details.
- **Monitoring dashboard** — a monitoring page with run history and a failure heatmap backed by mock data.

## Tech stack

- [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- [`@xyflow/react`](https://reactflow.dev/) — node-based canvas
- [Cloudscape Design](https://cloudscape.design/) components, global styles, and code view
- [React Router](https://reactrouter.com/) for navigation
- [D3](https://d3js.org/) for the monitoring visualizations

## Getting started

```bash
npm install      # install dependencies
npm run dev      # start the Vite dev server
npm run build    # production build to dist/
npm run preview  # preview the production build locally
```

## Routes

| Path            | Page              | Description                          |
| --------------- | ----------------- | ------------------------------------ |
| `/`             | `JobsPage`        | List of ETL jobs                     |
| `/create`       | `CreateJobPage`   | Build a new job on the canvas        |
| `/jobs/:jobId`  | `CreateJobPage`   | Edit an existing job                 |
| `/runs/:runId`  | `RunDetailsPage`  | Details for a single job run         |
| `/monitoring`   | `MonitoringPage`  | Monitoring dashboard & failure heatmap |

## Project structure

```
src/
  main.jsx                 App entry + React Router routes
  components/              Pages and canvas UI
    ETLCanvas.jsx          React Flow canvas
    ETLEdge.jsx            Custom edge rendering
    NodeToolbar.jsx        Node palette / add-node toolbar
    NodePropertiesPanel.jsx Per-node configuration panel
    JobsPage / CreateJobPage / RunDetailsPage / AuthoringView
    FailureHeatmap.jsx
  pages/
    MonitoringPage.jsx
  nodes/
    nodeRegistry.js        Catalog of Source/Transform/Target node types
    DataNode.jsx           Canvas node component
    iconMap.jsx / serviceIconRegistry.js
  forms/                   Schema-driven config forms per node type
  utils/
    connectionRules.js     Connection validation, fan-in limits, cycle detection
  data/                    Mock job, run, and sample CSV/JSON data
  public/images/           Service and transform SVG icons
```

## Node catalog

Node types are defined in [src/nodes/nodeRegistry.js](src/nodes/nodeRegistry.js). Each entry has an `enabled` flag controlling whether it is currently available in the toolbar:

- **Sources** — S3 and RDS are enabled; Redshift, Kinesis, Kafka, DynamoDB, SQL Server, DocDB, and MongoDB are scaffolded but disabled.
- **Transforms** — Apply mapping and Join are enabled; Select/Drop/Rename fields, Spigot, Union, Split, Filter, Custom transform, Spark SQL, and others are scaffolded but disabled.
- **Targets** — Amazon S3 is enabled; Glue Data Catalog is scaffolded but disabled.

## Deployment

Configured for [Vercel](https://vercel.com/) via [vercel.json](vercel.json), which rewrites all routes to `index.html` for client-side routing.

> **Note:** This is an experimental prototype. Job and run data is mocked locally — there is no backend.
