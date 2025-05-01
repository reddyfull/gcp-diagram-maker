import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Button,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Check as CheckIcon,
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon,
  Download as DownloadIcon,
  CloudDone as CloudDoneIcon,
} from '@mui/icons-material';

// Mock data for the review page
// In a real app, this would come from context/redux state
const selectedProviders = ['azure', 'aws'];
const selectedRegions = {
  azure: ['eastus', 'westus'],
  aws: ['us-east-1'],
};

// Same mock data structure as in ServiceConfig
const selectedServices = [
  {
    id: 'azure-vm',
    name: 'Azure Virtual Machines',
    provider: 'azure',
    category: 'compute',
    configData: {
      'vm-size': 'Standard_D2s_v3',
      'vm-count': 2,
      'os-type': 'linux',
      'availability-set': true,
    },
  },
  {
    id: 'azure-blob',
    name: 'Azure Blob Storage',
    provider: 'azure',
    category: 'storage',
    configData: {
      'account-tier': 'Standard',
      'replication': 'LRS',
      'container-count': 1,
    },
  },
  {
    id: 'aws-ec2',
    name: 'AWS EC2',
    provider: 'aws',
    category: 'compute',
    configData: {
      'instance-type': 't3.micro',
      'instance-count': 1,
      'ebs-size': 30,
    },
  },
];

// Provider-specific colors
const providerColors = {
  azure: '#0078D4',
  aws: '#FF9900',
  gcp: '#4285F4',
};

const ReviewConfig = () => {
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Group services by provider
  const servicesByProvider = selectedServices.reduce((acc, service) => {
    const provider = service.provider as string;
    if (!acc[provider]) {
      acc[provider] = [];
    }
    acc[provider].push(service);
    return acc;
  }, {} as Record<string, any[]>);
  
  // Handle back button
  const handleBack = () => {
    navigate('/wizard/configure');
  };
  
  // Handle generate Terraform
  const handleGenerateTerraform = () => {
    setGenerating(true);
    
    // Simulate API call to generate Terraform
    setTimeout(() => {
      setGenerating(false);
      setSuccess(true);
      
      // Simulate a delay before redirecting to terraform preview
      setTimeout(() => {
        navigate('/terraform');
      }, 1500);
    }, 2000);
  };
  
  // Handle edit configuration
  const handleEditService = (serviceId: string) => {
    // Navigate back to the configuration page
    // In a real app, we'd pass the serviceId to focus on that service
    navigate('/wizard/configure');
  };
  
  return (
    <Box>
      {/* Wizard Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
          Review Configuration
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Review your cloud infrastructure configuration before generating Terraform code
        </Typography>
      </Box>
      
      {/* Success message */}
      {success && (
        <Alert 
          severity="success" 
          sx={{ mb: 4 }}
          icon={<CloudDoneIcon fontSize="inherit" />}
        >
          <Typography variant="body1">
            Terraform configuration successfully generated! Redirecting to preview...
          </Typography>
        </Alert>
      )}
      
      {/* Provider and Region Summary */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Providers and Regions
        </Typography>
        
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Provider</TableCell>
              <TableCell>Regions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {selectedProviders.map((provider) => (
              <TableRow key={provider}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: providerColors[provider as keyof typeof providerColors] || '#ccc',
                        mr: 1,
                      }}
                    />
                    {provider.toUpperCase()}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {selectedRegions[provider as keyof typeof selectedRegions]?.map((region) => (
                      <Chip 
                        key={region} 
                        label={region} 
                        size="small" 
                        variant="outlined" 
                      />
                    ))}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      
      {/* Services Configuration Summary */}
      <Typography variant="h6" gutterBottom>
        Services Configuration
      </Typography>
      
      {Object.entries(servicesByProvider).map(([provider, services]) => (
        <Box key={provider} sx={{ mb: 3 }}>
          <Typography 
            variant="subtitle1" 
            sx={{ 
              mb: 2, 
              display: 'flex', 
              alignItems: 'center',
              color: providerColors[provider as keyof typeof providerColors] || 'text.primary' 
            }}
          >
            {provider.toUpperCase()} Services
          </Typography>
          
          {services.map((service) => (
            <Accordion key={service.id} sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>{service.name}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button 
                    size="small" 
                    startIcon={<EditIcon />}
                    onClick={() => handleEditService(service.id)}
                  >
                    Edit Configuration
                  </Button>
                </Box>
                
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Parameter</TableCell>
                        <TableCell>Value</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(service.configData).map(([key, value]) => (
                        <TableRow key={key}>
                          <TableCell sx={{ fontWeight: 500 }}>
                            {key.split('-').map(word => 
                              word.charAt(0).toUpperCase() + word.slice(1)
                            ).join(' ')}
                          </TableCell>
                          <TableCell>
                            {typeof value === 'boolean' 
                              ? (value ? 'Yes' : 'No')
                              : value.toString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      ))}
      
      {/* Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
        >
          Back: Configure
        </Button>
        
        <Box>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            sx={{ mr: 2 }}
            disabled={generating}
          >
            Export Configuration
          </Button>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={generating ? null : <CheckIcon />}
            onClick={handleGenerateTerraform}
            disabled={generating || success}
          >
            {generating ? 'Generating...' : 'Generate Terraform'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default ReviewConfig; 