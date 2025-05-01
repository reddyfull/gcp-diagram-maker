import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  Card,
  CardContent,
  CardActions,
  Divider,
  IconButton,
  Chip,
  Avatar,
  Container,
} from '@mui/material';
import {
  Add as AddIcon,
  CloudUpload as UploadIcon,
  Cloud as CloudIcon,
  Code as CodeIcon,
  Chat as ChatIcon,
  History as HistoryIcon,
  ArrowForward as ArrowForwardIcon,
  SmartToy as SmartToyIcon,
  FileUpload as FileUploadIcon,
  Architecture as DiagramIcon,
  BarChart as BarChartIcon,
  Sync as SyncIcon,
} from '@mui/icons-material';

// Define recent session type
interface RecentSession {
  id: string;
  name: string;
  date: string;
  provider: 'aws' | 'azure' | 'gcp';
  resources: number;
  sessionId?: string; // Optional session ID for diagram sessions
}

// Mock recent sessions data
const recentSessions: RecentSession[] = [
  {
    id: '1',
    name: 'Web App with Database',
    date: '2024-04-01',
    provider: 'azure',
    resources: 5,
    sessionId: 'session_12345_20240415123456', // Sample session ID
  },
  {
    id: '2',
    name: 'Data Lake Storage',
    date: '2024-03-28',
    provider: 'azure',
    resources: 3,
    sessionId: 'session_67890_20240410134556', // Sample session ID
  },
  {
    id: '3',
    name: 'Kubernetes Cluster',
    date: '2024-03-25',
    provider: 'aws',
    resources: 8,
  },
];

// Provider colors
const providerColors = {
  aws: '#FF9900',
  azure: '#0078D4',
  gcp: '#4285F4',
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  
  // Navigate to different sections
  const navigateTo = (path: string) => {
    navigate(path);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* Welcome Card */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column' }}>
            <Typography component="h1" variant="h4" color="primary" gutterBottom>
              Welcome to Azure Diagram Maker
            </Typography>
            <Typography variant="body1" paragraph>
              Design, visualize, and deploy cloud infrastructure with ease. Get started by using our step-by-step wizard
              or upload an existing diagram.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<AddIcon />}
                onClick={() => navigate('/wizard/provider')}
              >
                Start Wizard
              </Button>
              <Button 
                variant="contained" 
                color="primary" 
                size="large" 
                startIcon={<SmartToyIcon />}
                onClick={() => navigate('/ai-wizard')}
                sx={{ mb: 2 }}
              >
                Start AI Wizard
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<FileUploadIcon />}
                onClick={() => navigate('/diagram')}
              >
                Upload Diagram
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        {/* Quick Actions */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' },
            }}
            onClick={() => navigateTo('/wizard/provider')}
          >
            <CloudIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
            <Typography variant="body1" fontWeight={500}>
              Start Wizard
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              Configure step-by-step
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' },
            }}
            onClick={() => navigateTo('/diagram')}
          >
            <UploadIcon color="secondary" sx={{ fontSize: 48, mb: 1 }} />
            <Typography variant="body1" fontWeight={500}>
              Upload Diagram
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              Create from image
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' },
            }}
            onClick={() => navigateTo('/chat')}
          >
            <ChatIcon sx={{ fontSize: 48, mb: 1, color: '#4caf50' }} />
            <Typography variant="body1" fontWeight={500}>
              AI Chat
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              Get assistance
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' },
              border: '2px solid #651fff',
              borderRadius: 1,
            }}
            onClick={() => navigateTo('/diagram-chat')}
          >
            <Box sx={{ position: 'relative' }}>
              <DiagramIcon sx={{ fontSize: 48, mb: 1, color: '#651fff' }} />
              <SmartToyIcon sx={{ 
                fontSize: 24, 
                position: 'absolute', 
                bottom: 8, 
                right: -12,
                bgcolor: '#651fff',
                color: 'white',
                borderRadius: '50%',
                p: 0.3,
              }} />
            </Box>
            <Typography variant="body1" fontWeight={500}>
              AI Diagram Editor
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              Design with AI assistance
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' },
            }}
            onClick={() => navigateTo('/terraform')}
          >
            <CodeIcon sx={{ fontSize: 48, mb: 1, color: '#9c27b0' }} />
            <Typography variant="body1" fontWeight={500}>
              Terraform Code
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              View generated code
            </Typography>
          </Paper>
        </Grid>
        
        {/* New Feature: Real-time Sync */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' },
              border: '2px solid #ff4081',
              borderRadius: 1,
            }}
            onClick={() => {
              // Navigate to the first session that has a sessionId
              const sessionWithId = recentSessions.find(s => s.sessionId);
              if (sessionWithId?.sessionId) {
                navigateTo(`/diagram/session/${sessionWithId.sessionId}`);
              } else {
                alert('No sessions with real-time support available. Create a new one first.');
              }
            }}
          >
            <Box sx={{ position: 'relative' }}>
              <SyncIcon sx={{ fontSize: 48, mb: 1, color: '#ff4081' }} />
              <BarChartIcon sx={{ 
                fontSize: 24, 
                position: 'absolute', 
                bottom: 8, 
                right: -12,
                bgcolor: '#ff4081',
                color: 'white',
                borderRadius: '50%',
                p: 0.3,
              }} />
            </Box>
            <Typography variant="body1" fontWeight={500}>
              Diagram + Code Sync
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              Real-time bidirectional sync
            </Typography>
            <Chip 
              label="NEW" 
              size="small" 
              color="error" 
              sx={{ mt: 1, fontSize: '0.7rem' }} 
            />
          </Paper>
        </Grid>
      </Grid>
      
      {/* Recent Sessions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, mt: 4 }}>
        <Typography variant="h6">Recent Sessions</Typography>
        <Button
          variant="text"
          endIcon={<ArrowForwardIcon />}
          onClick={() => navigateTo('/resources/history')}
        >
          View All
        </Button>
      </Box>
      
      <Grid container spacing={3}>
        {recentSessions.map((session) => (
          <Grid item xs={12} md={6} lg={4} key={session.id}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 500 }}>
                    {session.name}
                  </Typography>
                  <Chip
                    label={session.provider.toUpperCase()}
                    size="small"
                    sx={{ 
                      bgcolor: providerColors[session.provider], 
                      color: 'white',
                      fontWeight: 500
                    }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {new Date(session.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Typography>
                <Typography variant="body2">
                  {session.resources} Resources
                  {session.sessionId && (
                    <Chip 
                      label="Real-time" 
                      size="small" 
                      color="secondary"
                      sx={{ ml: 1, height: 18, fontSize: '0.65rem' }} 
                    />
                  )}
                </Typography>
              </CardContent>
              <Divider />
              <CardActions>
                {session.sessionId ? (
                  <Button 
                    size="small" 
                    startIcon={<SyncIcon />}
                    color="secondary"
                    onClick={() => navigateTo(`/diagram/session/${session.sessionId}`)}
                  >
                    Open Synced Editor
                  </Button>
                ) : (
                  <Button size="small" onClick={() => navigateTo(`/session/${session.id}`)}>
                    Open
                  </Button>
                )}
                <Button size="small" onClick={() => navigateTo(`/terraform?session=${session.id}`)}>
                  View Code
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
        
        {/* Create New Card */}
        <Grid item xs={12} md={6} lg={4}>
          <Card
            variant="outlined"
            sx={{
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              p: 2,
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' },
            }}
            onClick={() => navigateTo('/wizard/provider')}
          >
            <Box sx={{ textAlign: 'center' }}>
              <IconButton
                sx={{
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': { bgcolor: 'primary.dark' },
                  mb: 1,
                }}
              >
                <AddIcon fontSize="large" />
              </IconButton>
              <Typography variant="body1">Create New Configuration</Typography>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard; 