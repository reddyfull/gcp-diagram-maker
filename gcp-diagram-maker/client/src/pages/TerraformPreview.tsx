import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Typography,
  Paper,
  Button,
  Tabs,
  Tab,
  Divider,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ContentCopy as ContentCopyIcon,
  Download as DownloadIcon,
  Check as CheckIcon,
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

// Interface for Terraform code files
interface TerraformFile {
  filename: string;
  content: string;
}

const TerraformPreview = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [terraformFiles, setTerraformFiles] = useState<TerraformFile[]>([]);
  const [documentation, setDocumentation] = useState<string>('');

  // Get wizard answers from location state or localStorage
  const getWizardAnswers = () => {
    const state = location.state as { answers?: any } | null;
    if (state && state.answers) {
      return state.answers;
    }
    
    // Try to get from localStorage
    const storedAnswers = localStorage.getItem('wizardAnswers');
    if (storedAnswers) {
      return JSON.parse(storedAnswers);
    }
    
    return {};
  };

  // Fetch Terraform code from the API
  const fetchTerraformCode = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const answers = getWizardAnswers();
      
      // If we have no answers, use a default set for testing
      if (Object.keys(answers).length === 0) {
        setError("No configuration data found. Please complete the wizard first.");
        setLoading(false);
        return;
      }
      
      const response = await axios.post('/api/ai/diagrams/terraform', {
        answers: answers
      });
      
      if (response.data && response.data.files) {
        setTerraformFiles(response.data.files);
        setDocumentation(response.data.documentation || '');
        
        // Set active tab to the first file
        if (response.data.files.length > 0) {
          setActiveTab(response.data.files[0].filename);
        }
      } else {
        setError('Invalid response format from server');
      }
    } catch (err) {
      console.error('Error fetching Terraform code:', err);
      setError('Failed to generate Terraform code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchTerraformCode();
  }, []);

  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };

  // Handle copy to clipboard
  const handleCopy = () => {
    const file = terraformFiles.find(f => f.filename === activeTab);
    if (file) {
      navigator.clipboard.writeText(file.content);
      setCopied(true);
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    }
  };

  // Handle download
  const handleDownload = () => {
    const file = terraformFiles.find(f => f.filename === activeTab);
    if (file) {
      const element = document.createElement('a');
      const fileContent = new Blob([file.content], {type: 'text/plain'});
      element.href = URL.createObjectURL(fileContent);
      element.download = file.filename;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  // Handle download all files as zip
  const handleDownloadAll = async () => {
    try {
      // Create a form with the Terraform files data
      const formData = new FormData();
      const filesBlob = new Blob([JSON.stringify({ files: terraformFiles })], {
        type: 'application/json'
      });
      formData.append('files', filesBlob);
      
      // Use axios to download the zip file
      const response = await axios.post('/api/ai/diagrams/terraform/download', 
        { files: terraformFiles },
        { responseType: 'blob' }
      );
      
      // Create a download link and trigger it
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'terraform_files.zip');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error downloading files:', err);
      alert('Failed to download files. Please try again.');
    }
  };

  // Handle deploy infrastructure
  const handleDeploy = async () => {
    try {
      setLoading(true);
      
      // Start the deployment process
      const response = await axios.post('/api/ai/diagrams/deploy', {
        files: terraformFiles
      });
      
      if (response.data && response.data.deployment_id) {
        // Navigate to deployment status page
        navigate(`/deployments/${response.data.deployment_id}`);
      } else {
        setError('Invalid response from server');
      }
    } catch (err) {
      console.error('Error deploying infrastructure:', err);
      setError('Failed to start deployment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Terraform Preview
        </Typography>
        
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<ArrowBackIcon />} 
            onClick={() => navigate('/wizard/review')}
            sx={{ mr: 1 }}
          >
            Back to Review
          </Button>
          
          <Button 
            variant="contained" 
            startIcon={<RefreshIcon />}
            onClick={fetchTerraformCode}
          >
            Regenerate
          </Button>
        </Box>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {!error && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            This is a preview of the generated Terraform code based on your configuration. You can copy or download individual files, or make further adjustments in the wizard.
          </Typography>
        </Alert>
      )}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {terraformFiles.length > 0 ? (
            <Paper sx={{ mb: 3 }}>
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ borderBottom: 1, borderColor: 'divider' }}
              >
                {terraformFiles.map((file) => (
                  <Tab key={file.filename} label={file.filename} value={file.filename} />
                ))}
              </Tabs>
              
              <Box sx={{ position: 'relative' }}>
                <Box 
                  sx={{ 
                    p: 2, 
                    overflow: 'auto',
                    maxHeight: '60vh',
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '0 0 4px 4px',
                    whiteSpace: 'pre',
                  }}
                >
                  {terraformFiles.find(f => f.filename === activeTab)?.content || 'Select a file to view'}
                </Box>
                
                <Box 
                  sx={{ 
                    position: 'absolute', 
                    top: 8, 
                    right: 8,
                    display: 'flex',
                    gap: 1,
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    borderRadius: 1,
                    padding: '4px',
                  }}
                >
                  <Tooltip title={copied ? "Copied!" : "Copy to clipboard"}>
                    <IconButton size="small" onClick={handleCopy}>
                      {copied ? <CheckIcon color="success" /> : <ContentCopyIcon />}
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="Download file">
                    <IconButton size="small" onClick={handleDownload}>
                      <DownloadIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Paper>
          ) : (
            !error && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                No Terraform files were generated. Try regenerating or check your configuration.
              </Alert>
            )
          )}
          
          {documentation && (
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Documentation
              </Typography>
              <Typography component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                {documentation}
              </Typography>
            </Paper>
          )}
          
          {terraformFiles.length > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
              <Button 
                variant="outlined" 
                startIcon={<DownloadIcon />}
                onClick={handleDownloadAll}
              >
                Download All Files
              </Button>
              
              <Button 
                variant="contained"
                onClick={handleDeploy}
              >
                Deploy Infrastructure
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default TerraformPreview; 