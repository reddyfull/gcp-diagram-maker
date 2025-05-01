import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Tabs, 
  Tab, 
  CircularProgress,
  Divider
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface WizardSummaryProps {
  answers: Record<string, any>;
}

const WizardSummary: React.FC<WizardSummaryProps> = ({ answers }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [diagram, setDiagram] = useState<string | null>(null);
  const [terraformCode, setTerraformCode] = useState<string | null>(null);
  const [armCode, setArmCode] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Generate diagram and code on component mount
  useEffect(() => {
    const generateDiagram = async () => {
      try {
        // Generate Mermaid diagram
        const diagramResponse = await axios.post('/api/ai/diagrams/generate', { answers });
        setDiagram(diagramResponse.data.diagram);
        
        // Generate Terraform code
        const terraformResponse = await axios.post('/api/ai/diagrams/terraform', { answers });
        setTerraformCode(terraformResponse.data.code);
        
        // Generate ARM template
        const armResponse = await axios.post('/api/ai/diagrams/arm', { answers });
        setArmCode(armResponse.data.code);
        
        setLoading(false);
      } catch (err) {
        console.error('Error generating infrastructure:', err);
        setError('Failed to generate infrastructure. Please try again.');
        setLoading(false);
      }
    };
    
    generateDiagram();
  }, [answers]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleNavigateBack = () => {
    navigate('/wizard/config');
  };

  const handleFinish = () => {
    navigate('/dashboard');
  };

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Infrastructure Summary
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 3 }}>
        Review your infrastructure design and generated resources.
      </Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Paper sx={{ p: 3, bgcolor: 'error.light', color: 'error.contrastText' }}>
          <Typography variant="body1">{error}</Typography>
        </Paper>
      ) : (
        <>
          <Paper sx={{ width: '100%', mb: 3 }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab label="Diagram" />
              <Tab label="Terraform" />
              <Tab label="ARM Template" />
            </Tabs>
            
            <Box sx={{ p: 3 }}>
              {activeTab === 0 && (
                <Box>
                  <Typography variant="h6" component="h2" gutterBottom>
                    Infrastructure Diagram
                  </Typography>
                  
                  <Paper 
                    elevation={0}
                    sx={{ 
                      p: 2, 
                      bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
                      maxHeight: '600px',
                      overflow: 'auto'
                    }}
                  >
                    <div dangerouslySetInnerHTML={{ __html: diagram || '' }} />
                  </Paper>
                </Box>
              )}
              
              {activeTab === 1 && (
                <Box>
                  <Typography variant="h6" component="h2" gutterBottom>
                    Terraform Code
                  </Typography>
                  
                  <Paper 
                    elevation={0}
                    sx={{ 
                      p: 2, 
                      bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
                      maxHeight: '600px',
                      overflow: 'auto'
                    }}
                  >
                    <pre>{terraformCode}</pre>
                  </Paper>
                  
                  <Button 
                    variant="outlined" 
                    color="primary" 
                    sx={{ mt: 2 }}
                    onClick={() => {
                      const blob = new Blob([terraformCode || ''], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'main.tf';
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }}
                  >
                    Download Terraform Code
                  </Button>
                </Box>
              )}
              
              {activeTab === 2 && (
                <Box>
                  <Typography variant="h6" component="h2" gutterBottom>
                    ARM Template
                  </Typography>
                  
                  <Paper 
                    elevation={0}
                    sx={{ 
                      p: 2, 
                      bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
                      maxHeight: '600px',
                      overflow: 'auto'
                    }}
                  >
                    <pre>{armCode}</pre>
                  </Paper>
                  
                  <Button 
                    variant="outlined" 
                    color="primary" 
                    sx={{ mt: 2 }}
                    onClick={() => {
                      const blob = new Blob([armCode || ''], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'template.json';
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }}
                  >
                    Download ARM Template
                  </Button>
                </Box>
              )}
            </Box>
          </Paper>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button variant="outlined" onClick={handleNavigateBack}>
              Back to Configuration
            </Button>
            <Button variant="contained" color="primary" onClick={handleFinish}>
              Finish
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
};

export default WizardSummary; 