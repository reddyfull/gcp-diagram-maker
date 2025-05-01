import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';

// Interface for deployment status
interface DeploymentStatus {
  deployment_id: string;
  status: 'initialized' | 'in_progress' | 'completed' | 'failed';
  resources_created: number;
  resources_total: number;
  logs: string[];
  timestamp: string;
}

const DeploymentStatus = () => {
  const { deploymentId } = useParams<{ deploymentId: string }>();
  const navigate = useNavigate();
  
  const [status, setStatus] = useState<DeploymentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Fetch deployment status
  const fetchStatus = async () => {
    if (!deploymentId) return;
    
    try {
      setLoading(true);
      const response = await axios.get(`/api/ai/diagrams/deploy/${deploymentId}/status`);
      setStatus(response.data);
      
      // If deployment is complete or failed, stop auto-refresh
      if (response.data.status === 'completed' || response.data.status === 'failed') {
        setAutoRefresh(false);
      }
    } catch (err) {
      console.error('Error fetching deployment status:', err);
      setError('Failed to fetch deployment status');
      setAutoRefresh(false);
    } finally {
      setLoading(false);
    }
  };
  
  // Download Terraform state file
  const downloadStateFile = async () => {
    if (!deploymentId) return;
    
    try {
      const response = await axios.get(`/api/ai/diagrams/deploy/${deploymentId}/state`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'terraform.tfstate');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error downloading state file:', err);
      alert('Failed to download Terraform state file');
    }
  };
  
  // Auto-refresh status
  useEffect(() => {
    fetchStatus();
    
    // Set up auto-refresh interval if enabled
    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(fetchStatus, 5000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [deploymentId, autoRefresh]);
  
  // Get step number based on status
  const getStepNumber = () => {
    if (!status) return 0;
    
    switch (status.status) {
      case 'initialized':
        return 0;
      case 'in_progress':
        return 1;
      case 'completed':
        return 2;
      case 'failed':
        return 1; // Stay at "in progress" with error state
      default:
        return 0;
    }
  };
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Deployment Status
        </Typography>
        
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<ArrowBackIcon />} 
            onClick={() => navigate('/terraform')}
            sx={{ mr: 1 }}
          >
            Back to Terraform
          </Button>
          
          <Button 
            variant="contained" 
            startIcon={<RefreshIcon />}
            onClick={fetchStatus}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Deployment: {deploymentId}
        </Typography>
        
        {loading && !status ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Stepper activeStep={getStepNumber()} sx={{ mb: 4 }}>
              <Step>
                <StepLabel>Initialized</StepLabel>
              </Step>
              <Step>
                <StepLabel error={status?.status === 'failed'}>
                  {status?.status === 'failed' ? 'Failed' : 'In Progress'}
                </StepLabel>
              </Step>
              <Step>
                <StepLabel>Completed</StepLabel>
              </Step>
            </Stepper>
            
            {status && (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body1">
                    Status: <strong>{status.status.replace('_', ' ').toUpperCase()}</strong>
                  </Typography>
                  
                  {status.status === 'in_progress' && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      <Typography variant="body1">
                        Resources: {status.resources_created} / {status.resources_total}
                      </Typography>
                    </Box>
                  )}
                  
                  {status.status === 'completed' && (
                    <Button 
                      variant="outlined" 
                      startIcon={<DownloadIcon />}
                      onClick={downloadStateFile}
                    >
                      Download State
                    </Button>
                  )}
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="h6" gutterBottom>
                  Deployment Logs
                </Typography>
                
                <Paper variant="outlined" sx={{ p: 2, maxHeight: '300px', overflow: 'auto', bgcolor: '#f5f5f5' }}>
                  <List dense>
                    {status.logs.map((log, index) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={log}
                          primaryTypographyProps={{
                            fontFamily: 'monospace',
                            fontSize: '0.875rem',
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              </>
            )}
          </>
        )}
      </Paper>
    </Box>
  );
};

export default DeploymentStatus; 