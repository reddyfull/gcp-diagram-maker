import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import Dashboard from './pages/Dashboard';
import WizardLayout from './pages/wizard/WizardLayout';
import ProviderSelection from './pages/wizard/ProviderSelection';
import RegionSelection from './pages/wizard/RegionSelection';
import ServiceSelection from './pages/wizard/ServiceSelection';
import ServiceConfig from './pages/wizard/ServiceConfig';
import AIWizardPage from './pages/wizard/AIWizardPage';
import ReviewConfig from './pages/wizard/ReviewConfig';
import DiagramUpload from './pages/DiagramUpload';
import IconExplorer from './pages/IconExplorer';
import TerraformPreview from './pages/TerraformPreview';
import AIChat from './pages/AIChat';
import EnhancedAIChat from './pages/EnhancedAIChat';
import WizardSummary from './components/wizard/WizardSummary';
import ErrorPage from './pages/ErrorPage';
import WizardSummaryWrapper from './components/wizard/WizardSummaryWrapper';
import EnhancedWizardPage from './pages/wizard/EnhancedWizardPage';
import DiagramSessionPage from './pages/diagram/DiagramSessionPage';
import { Box, Typography, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

// Create a WizardSummaryWrapper component that uses the useWizard hook to get answers
const WizardSummaryWrapperComponent = () => {
  // We'll use useWizard hook inside this component
  // This is because we can't use hooks directly in the router configuration
  return <WizardSummary answers={{}} />;
};

// Placeholder components for routes we haven't implemented yet
const Settings = () => <div>Settings Page (Coming soon)</div>;

// Create a better 404 page that matches the screenshot
const NotFound = () => (
  <Box 
    sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      height: '70vh',
      textAlign: 'center' 
    }}
  >
    <Typography variant="h1" component="h1" gutterBottom>
      404
    </Typography>
    <Typography variant="h4" component="h2" gutterBottom>
      Page Not Found
    </Typography>
    <Typography variant="body1" paragraph>
      The page you are looking for doesn't exist or has been moved.
    </Typography>
    <Button 
      variant="contained" 
      component={RouterLink} 
      to="/"
      sx={{ mt: 2 }}
    >
      Return to Dashboard
    </Button>
  </Box>
);

// Define your routes
const Routes = () => {
  // Create specific session redirect routes
  const problemSessionIds = [
    "session_eb8f27d752_20250430121838",
    "session_862a4bfce8_20250430115736",
    "session_20f55ae117_20250430094400"
  ];
  
  // Build routes array with special cases first
  const routesConfig = [
    // Root route with all session patterns as children for pattern matching priority
    {
      path: '/',
      element: <MainLayout />,
      errorElement: <MainLayout><NotFound /></MainLayout>,
      children: [
        // Index route (dashboard)
        { index: true, element: <Dashboard /> },
        
        // PRIMARY SESSION ROUTES - Match these first (most specific)
        { 
          path: 'diagram/session/:sessionId', 
          element: <DiagramSessionPage /> 
        },
        
        // Wizard routes
        {
          path: 'wizard',
          element: <WizardLayout />,
          children: [
            { path: 'provider', element: <ProviderSelection /> },
            { path: 'region', element: <RegionSelection /> },
            { path: 'services', element: <ServiceSelection /> },
            { path: 'config', element: <ServiceConfig /> },
            { path: 'summary', element: <WizardSummaryWrapperComponent /> },
            { path: 'review', element: <ReviewConfig /> },
          ],
        },
        
        // Other main routes
        { path: 'diagram-upload', element: <DiagramUpload /> },
        { path: 'diagram-chat', element: <EnhancedAIChat /> },
        { path: 'icons', element: <IconExplorer /> },
        { path: 'chat', element: <AIChat /> },
        { path: 'terraform', element: <TerraformPreview /> },
        { path: 'ai-wizard', element: <AIWizardPage /> },
        { path: 'enhanced-wizard', element: <EnhancedWizardPage /> },
        { path: 'settings', element: <Settings /> },
        
        // Catch-all route at the end
        {
          path: '*',
          element: <NotFound />,
        },
      ],
    },
    
    // EXTERNAL SESSION ROUTES - These need to be outside the main layout
    // Catch all URLs with sessionId for direct loading
    {
      path: '/:prefix/:part/session_:id',
      element: <Navigate to={`/diagram/session/session_:id`} replace />
    },
    {
      path: '/:prefix/session_:id',
      element: <Navigate to={`/diagram/session/session_:id`} replace />
    },
    {
      path: '/session_:id',
      element: <Navigate to={`/diagram/session/session_:id`} replace />
    }
  ];

  // Add specific problematic routes
  problemSessionIds.forEach(sessionId => {
    routesConfig.push({
      path: `/*/${sessionId}`,
      element: <Navigate to={`/diagram/session/${sessionId}`} replace />
    });
    routesConfig.push({
      path: `/${sessionId}`,
      element: <Navigate to={`/diagram/session/${sessionId}`} replace />
    });
  });
  
  // Create the router
  const router = createBrowserRouter(routesConfig);

  return <RouterProvider router={router} />;
};

export default Routes;
