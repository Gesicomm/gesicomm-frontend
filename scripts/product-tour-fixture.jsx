// Local capture entry only. No route in the application imports this module.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../src/pages/dashboard/MiDashboard';
import '../src/index.css';
import '../src/styles/settingsTypography.css';
import '../src/styles/systemTypography.css';
import '@fontsource-variable/plus-jakarta-sans';

createRoot(document.getElementById('root')).render(<MemoryRouter><Dashboard /></MemoryRouter>);
