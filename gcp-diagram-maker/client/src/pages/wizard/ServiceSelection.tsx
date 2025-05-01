import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActionArea,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  FormGroup,
  FormControlLabel,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Storage as StorageIcon,
  Memory as ComputeIcon,
  Route as NetworkIcon,
  VpnLock as SecurityIcon,
  AddToQueue as DatabaseIcon,
  Apps as IntegrationIcon,
  Dns as DnsIcon,
  Analytics as AnalyticsIcon,
  Cloud as CloudIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import React from 'react';

// Service category type
interface ServiceCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
}

// Service definition type
interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  provider: 'azure' | 'aws' | 'gcp';
  popular: boolean;
}

// Define categories
const categories: ServiceCategory[] = [
  { id: 'compute', name: 'Compute', icon: <ComputeIcon /> },
  { id: 'storage', name: 'Storage', icon: <StorageIcon /> },
  { id: 'network', name: 'Networking', icon: <NetworkIcon /> },
  { id: 'database', name: 'Databases', icon: <DatabaseIcon /> },
  { id: 'security', name: 'Security', icon: <SecurityIcon /> },
  { id: 'integration', name: 'Integration', icon: <IntegrationIcon /> },
  { id: 'analytics', name: 'Analytics', icon: <AnalyticsIcon /> },
  { id: 'other', name: 'Other Services', icon: <CloudIcon /> },
];

// Define services by provider and category
const services: Service[] = [
  // Azure Compute
  { 
    id: 'azure-vm', 
    name: 'Virtual Machines', 
    description: 'Provision Windows and Linux virtual machines',
    category: 'compute',
    provider: 'azure',
    popular: true,
  },
  { 
    id: 'azure-aks', 
    name: 'Kubernetes Service (AKS)', 
    description: 'Managed Kubernetes container orchestration service',
    category: 'compute',
    provider: 'azure',
    popular: true,
  },
  { 
    id: 'azure-functions', 
    name: 'Functions', 
    description: 'Serverless compute for event-driven applications',
    category: 'compute',
    provider: 'azure',
    popular: false,
  },
  
  // Azure Storage
  { 
    id: 'azure-blob', 
    name: 'Blob Storage', 
    description: 'Massively scalable object storage for unstructured data',
    category: 'storage',
    provider: 'azure',
    popular: true,
  },
  { 
    id: 'azure-files', 
    name: 'Files Storage', 
    description: 'Fully managed file shares in the cloud',
    category: 'storage',
    provider: 'azure',
    popular: false,
  },
  
  // Azure Network
  { 
    id: 'azure-vnet', 
    name: 'Virtual Network', 
    description: 'Isolated and secure network in Azure',
    category: 'network',
    provider: 'azure',
    popular: true,
  },
  { 
    id: 'azure-lb', 
    name: 'Load Balancer', 
    description: 'High-performance, low-latency load balancing',
    category: 'network',
    provider: 'azure',
    popular: false,
  },
  
  // Azure Database
  { 
    id: 'azure-sql', 
    name: 'SQL Database', 
    description: 'Managed, intelligent SQL database service',
    category: 'database',
    provider: 'azure',
    popular: true,
  },
  { 
    id: 'azure-cosmos', 
    name: 'Cosmos DB', 
    description: 'Globally distributed, multi-model database service',
    category: 'database',
    provider: 'azure',
    popular: true,
  },
  
  // AWS Compute
  { 
    id: 'aws-ec2', 
    name: 'EC2', 
    description: 'Scalable virtual servers in the cloud',
    category: 'compute',
    provider: 'aws',
    popular: true,
  },
  { 
    id: 'aws-eks', 
    name: 'Elastic Kubernetes Service (EKS)', 
    description: 'Managed Kubernetes service',
    category: 'compute',
    provider: 'aws',
    popular: true,
  },
  { 
    id: 'aws-lambda', 
    name: 'Lambda', 
    description: 'Run code without thinking about servers',
    category: 'compute',
    provider: 'aws',
    popular: true,
  },
  
  // AWS Storage
  { 
    id: 'aws-s3', 
    name: 'S3', 
    description: 'Scalable storage in the cloud',
    category: 'storage',
    provider: 'aws',
    popular: true,
  },
  { 
    id: 'aws-ebs', 
    name: 'EBS', 
    description: 'High-performance block storage',
    category: 'storage',
    provider: 'aws',
    popular: false,
  },
  
  // AWS Network
  { 
    id: 'aws-vpc', 
    name: 'VPC', 
    description: 'Isolated cloud resources',
    category: 'network',
    provider: 'aws',
    popular: true,
  },
  { 
    id: 'aws-elb', 
    name: 'Elastic Load Balancing', 
    description: 'Distribute traffic across services',
    category: 'network',
    provider: 'aws',
    popular: false,
  },
  
  // AWS Database
  { 
    id: 'aws-rds', 
    name: 'RDS', 
    description: 'Managed relational database service',
    category: 'database',
    provider: 'aws',
    popular: true,
  },
  { 
    id: 'aws-dynamo', 
    name: 'DynamoDB', 
    description: 'Fast and flexible NoSQL database',
    category: 'database',
    provider: 'aws',
    popular: true,
  },
];

// Provider colors
const providerColors: Record<string, string> = {
  aws: '#FF9900',
  azure: '#0078D4',
  gcp: '#4285F4',
};

const ServiceSelection = () => {
  const navigate = useNavigate();
  
  // In a real app, we'd get the selected providers from previous steps
  const selectedProviders = ['azure', 'aws'];
  
  // State for active category
  const [activeCategory, setActiveCategory] = useState<string>('compute');
  
  // State for selected services
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  
  // Filter services by providers and active category
  const filteredServices = services.filter(
    service => 
      selectedProviders.includes(service.provider) && 
      service.category === activeCategory
  );
  
  // Handle category change
  const handleCategoryChange = (_event: React.SyntheticEvent, newValue: string) => {
    setActiveCategory(newValue);
  };
  
  // Toggle service selection
  const toggleService = (serviceId: string) => {
    setSelectedServices(prev => {
      if (prev.includes(serviceId)) {
        return prev.filter(id => id !== serviceId);
      } else {
        return [...prev, serviceId];
      }
    });
  };
  
  // Check if a service is selected
  const isServiceSelected = (serviceId: string) => {
    return selectedServices.includes(serviceId);
  };
  
  // Navigate to next step
  const handleNext = () => {
    if (selectedServices.length > 0) {
      navigate('/wizard/config');
    }
  };
  
  // Navigate to previous step
  const handleBack = () => {
    navigate('/wizard/region');
  };
  
  // Group services by provider
  const servicesByProvider = selectedProviders.reduce<Record<string, Service[]>>((acc, provider) => {
    acc[provider] = filteredServices.filter(service => service.provider === provider);
    return acc;
  }, {});

  return (
    <Box>
      {/* Wizard Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
          Select Services
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Choose cloud services to include in your infrastructure
        </Typography>
      </Box>
      
      {/* Category tabs */}
      <Paper sx={{ mb: 4 }}>
        <Tabs
          value={activeCategory}
          onChange={handleCategoryChange}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          aria-label="service categories"
        >
          {categories.map(category => (
            <Tab 
              key={category.id} 
              value={category.id} 
              label={category.name}
            />
          ))}
        </Tabs>
      </Paper>
      
      {/* Services by provider */}
      {selectedProviders.map(provider => (
        <Box key={provider} sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
            <Box
              sx={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                bgcolor: providerColors[provider],
                mr: 1,
              }}
            />
            {provider.toUpperCase()} {categories.find(c => c.id === activeCategory)?.name}
          </Typography>
          
          {servicesByProvider[provider]?.length > 0 ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {servicesByProvider[provider].map(service => (
                <Box key={service.id} sx={{ width: { xs: '100%', md: 'calc(50% - 8px)', lg: 'calc(33.333% - 10.667px)' } }}>
                  <Card 
                    variant="outlined"
                    sx={{ 
                      cursor: 'pointer',
                      position: 'relative',
                      borderColor: isServiceSelected(service.id) 
                        ? providerColors[service.provider] 
                        : 'divider',
                      borderWidth: isServiceSelected(service.id) ? 2 : 1,
                      height: '100%',
                    }}
                    onClick={() => toggleService(service.id)}
                  >
                    {isServiceSelected(service.id) && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          bgcolor: providerColors[service.provider],
                          color: 'white',
                          borderRadius: '50%',
                          width: 24,
                          height: 24,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 1,
                        }}
                      >
                        <CheckIcon fontSize="small" />
                      </Box>
                    )}
                    <CardActionArea onClick={() => toggleService(service.id)} sx={{ height: '100%' }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Typography variant="h6" sx={{ flexGrow: 1 }}>
                            {service.name}
                          </Typography>
                          {service.popular && (
                            <Chip 
                              label="Popular" 
                              size="small" 
                              color="primary" 
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {service.description}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No {activeCategory} services available for {provider.toUpperCase()}.
            </Typography>
          )}
        </Box>
      ))}
      
      {/* Selected Services Summary */}
      {selectedServices.length > 0 && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Selected Services ({selectedServices.length})
          </Typography>
          <List dense>
            {selectedServices.map(serviceId => {
              const service = services.find(s => s.id === serviceId);
              if (!service) return null;
              
              return (
                <ListItem key={serviceId}>
                  <ListItemIcon>
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        bgcolor: providerColors[service.provider],
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText 
                    primary={service.name} 
                    secondary={`${service.provider.toUpperCase()} - ${service.description.slice(0, 50)}${service.description.length > 50 ? '...' : ''}`} 
                  />
                </ListItem>
              );
            })}
          </List>
        </Paper>
      )}
      
      {/* Navigation Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
        >
          Back: Regions
        </Button>
        
        <Button 
          variant="contained" 
          endIcon={<ArrowForwardIcon />}
          onClick={handleNext}
          disabled={selectedServices.length === 0}
        >
          Next: Configure Services
        </Button>
      </Box>
    </Box>
  );
};

export default ServiceSelection; 