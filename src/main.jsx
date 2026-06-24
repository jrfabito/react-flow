import '@cloudscape-design/global-styles/index.css';
import '@xyflow/react/dist/style.css';
import './canvas.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import JobsPage      from './components/JobsPage.jsx';
import CreateJobPage from './components/CreateJobPage.jsx';
import RunDetailsPage from './components/RunDetailsPage.jsx';
import MonitoringPage from './pages/MonitoringPage.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/"              element={<JobsPage />}      />
        <Route path="/create"        element={<CreateJobPage />} />
        <Route path="/jobs/:jobId"   element={<CreateJobPage />} />
        <Route path="/runs/:runId"   element={<RunDetailsPage />} />
        <Route path="/monitoring"    element={<MonitoringPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
