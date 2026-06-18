import '@cloudscape-design/global-styles/index.css';
import '@xyflow/react/dist/style.css';
import './canvas.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AuthoringView from './components/AuthoringView.jsx';
import CreateJobPage from './components/CreateJobPage.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CreateJobPage />
    {/* <AuthoringView /> */}
  </StrictMode>
);
