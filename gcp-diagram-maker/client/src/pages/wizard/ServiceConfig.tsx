import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  FormHelperText,
  Switch,
  FormControlLabel,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Tooltip,
  Alert,
  Slider,
  SelectChangeEvent,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  Save as SaveIcon,
  Settings as SettingsIcon,
  Storage as StorageIcon,
  Memory as ComputeIcon,
  Route as NetworkIcon,
  AddToQueue as DatabaseIcon,
  Backup as BackupIcon,
} from '@mui/icons-material';
import { useWizard } from './WizardContext';

// Interface for service configuration
interface ServiceConfig {
  serviceId: string;
  provider: string;
  displayName: string;
  configOptions: ConfigOption[];
  configData?: Record<string, any>;
}

// Interface for configuration options
interface ConfigOption {
  id: string;
  displayName: string;
  type: 'select' | 'text' | 'number' | 'boolean' | 'slider';
  options?: string[] | { value: string, label: string }[];
  defaultValue?: any;
  required?: boolean;
  helpText?: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

// Hard-coded selected services (fix syntax around 'enable-backup')
const selectedServices: ServiceConfig[] = [
  {
    serviceId: 'azure-vm',
    provider: 'azure',
    displayName: 'Azure Virtual Machine',
    configOptions: [
      {
        id: 'vm-size',
        displayName: 'VM Size',
        type: 'select',
        options: ['standard_b1s', 'standard_b2s', 'standard_d2s_v3', 'standard_d4s_v3'],
        required: true,
        defaultValue: 'standard_b2s',
        helpText: 'Select a VM size based on your workload requirements.'
      },
      {
        id: 'os-type',
        displayName: 'Operating System',
        type: 'select',
        options: ['windows', 'linux'],
        required: true,
        defaultValue: 'linux',
        helpText: 'Select the operating system for your VM.'
      },
      {
        id: 'disk-size',
        displayName: 'Disk Size (GB)',
        type: 'number',
        defaultValue: 128,
        required: true,
        helpText: 'Specify the disk size in GB (32-4095).'
      },
      {
        id: 'enable-backup',
        name: 'Enable Backup',
        provider: 'azure',
        category: 'Storage',
        icon: <BackupIcon />
      }
    ],
    configData: {
      'vm-size': 'standard_b2s',
      'os-type': 'linux',
      'disk-size': 128,
      'enable-backup': false,
    },
  },
  {
    serviceId: 'azure-blob',
    provider: 'azure',
    displayName: 'Azure Blob Storage',
    configOptions: [
      {
        id: 'account-tier',
        displayName: 'Performance Tier',
        type: 'select',
        options: ['Standard', 'Premium'],
        required: true,
        defaultValue: 'Standard',
        helpText: 'Standard for general purpose, Premium for high-performance workloads',
      },
      {
        id: 'replication',
        displayName: 'Replication Type',
        type: 'select',
        options: ['LRS', 'ZRS', 'GRS'],
        required: true,
        defaultValue: 'LRS',
        helpText: 'Choose redundancy option based on your data protection needs',
      },
      {
        id: 'container-count',
        displayName: 'Number of Containers',
        type: 'number',
        required: true,
        defaultValue: 1,
        min: 1,
        max: 5,
        helpText: 'Logical containers for organizing blobs',
      },
    ],
    configData: {
      'account-tier': 'Standard',
      'replication': 'LRS',
      'container-count': 1,
    },
  },
  {
    serviceId: 'aws-ec2',
    provider: 'aws',
    displayName: 'AWS EC2',
    configOptions: [
      {
        id: 'instance-type',
        displayName: 'Instance Type',
        type: 'select',
        options: ['t3.nano', 't3.micro', 't3.small', 't3.medium', 'm5.large'],
        required: true,
        defaultValue: 't3.micro',
        helpText: 'Select the EC2 instance type based on your workload requirements',
      },
      {
        id: 'instance-count',
        displayName: 'Instance Count',
        type: 'number',
        required: true,
        defaultValue: 1,
        min: 1,
        max: 10,
        helpText: 'Number of identical instances to deploy',
      },
      {
        id: 'ebs-size',
        displayName: 'EBS Volume Size (GB)',
        type: 'slider',
        required: true,
        defaultValue: 30,
        min: 8,
        max: 1000,
        step: 1,
        unit: 'GB',
        helpText: 'Size of the attached EBS volume',
      },
    ],
    configData: {
      'instance-type': 't3.micro',
      'instance-count': 1,
      'ebs-size': 30,
    },
  },
];

// Provider colors
const providerColors: Record<string, string> = {
  aws: '#FF9900',
  azure: '#0078D4',
  gcp: '#4285F4',
};

// Category icons
const categoryIcons: Record<string, React.ReactNode> = {
  compute: <ComputeIcon />,
  storage: <StorageIcon />,
  network: <NetworkIcon />,
  database: <DatabaseIcon />,
};

const ServiceConfig = () => {
  const navigate = useNavigate();
  
  // State for configuration data
  const [configData, setConfigData] = useState<Record<string, Record<string, any>>>(
    // Initialize with default values from services
    selectedServices.reduce((acc, service) => {
      acc[service.serviceId] = service.configData || {};
      return acc;
    }, {} as Record<string, Record<string, any>>)
  );
  
  // Update config value
  const handleConfigChange = (serviceId: string, optionId: string, value: any) => {
    setConfigData(prev => ({
      ...prev,
      [serviceId]: {
        ...prev[serviceId],
        [optionId]: value,
      },
    }));
  };
  
  // Handle input change based on option type
  const handleInputChange = (
    serviceId: string, 
    option: ConfigOption, 
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent
  ) => {
    let value;
    
    switch (option.type) {
      case 'boolean':
        value = (event as React.ChangeEvent<HTMLInputElement>).target.checked;
        break;
      case 'number':
        value = parseInt((event as React.ChangeEvent<HTMLInputElement>).target.value, 10) || 0;
        break;
      case 'slider':
        value = event;
        break;
      default:
        value = event.target.value;
    }
    
    handleConfigChange(serviceId, option.id, value);
  };
  
  // Handle slider change
  const handleSliderChange = (serviceId: string, optionId: string, value: number) => {
    handleConfigChange(serviceId, optionId, value);
  };
  
  // Navigate to next step
  const handleNext = () => {
    // In a real app, we'd validate all inputs before proceeding
    navigate('/wizard/review');
  };
  
  // Navigate to previous step
  const handleBack = () => {
    navigate('/wizard/services');
  };
  
  // Group services by provider
  const servicesByProvider = selectedServices.reduce<Record<string, ServiceConfig[]>>((acc, service) => {
    if (!acc[service.provider]) {
      acc[service.provider] = [];
    }
    acc[service.provider].push(service);
    return acc;
  }, {});
  
  // Render configuration input based on option type
  const renderConfigInput = (serviceId: string, option: ConfigOption) => {
    const value = configData[serviceId][option.id];
    
    switch (option.type) {
      case 'text':
        return (
          <TextField
            id={`${serviceId}-${option.id}`}
            fullWidth
            label={option.displayName}
            required={option.required}
            value={value}
            onChange={(e) => handleInputChange(serviceId, option, e)}
            helperText={option.helpText}
          />
        );
        
      case 'number':
        return (
          <TextField
            id={`${serviceId}-${option.id}`}
            fullWidth
            label={option.displayName}
            type="number"
            required={option.required}
            value={value}
            onChange={(e) => handleInputChange(serviceId, option, e)}
            InputProps={{
              inputProps: {
                min: option.min,
                max: option.max,
              },
            }}
            helperText={option.helpText}
          />
        );
        
      case 'select':
        return (
          <FormControl fullWidth required={option.required}>
            <InputLabel id={`${serviceId}-${option.id}-label`}>{option.displayName}</InputLabel>
            <Select
              labelId={`${serviceId}-${option.id}-label`}
              id={`${serviceId}-${option.id}`}
              value={value}
              label={option.displayName}
              onChange={(e) => handleInputChange(serviceId, option, e)}
            >
              {(Array.isArray(option.options) ? option.options : []).map((opt) => {
                // Handle both string options and object options
                const optValue = typeof opt === 'string' ? opt : opt.value;
                const optLabel = typeof opt === 'string' ? opt : opt.label;
                
                return (
                  <MenuItem key={optValue} value={optValue}>
                    {optLabel}
                  </MenuItem>
                );
              })}
            </Select>
            {option.helpText && <FormHelperText>{option.helpText}</FormHelperText>}
          </FormControl>
        );
        
      case 'boolean':
        return (
          <FormControl component="fieldset" fullWidth required={option.required}>
            <FormControlLabel
              control={
                <Switch
                  id={`${serviceId}-${option.id}`}
                  checked={value}
                  onChange={(e) => handleInputChange(serviceId, option, e)}
                />
              }
              label={option.displayName}
            />
            {option.helpText && <FormHelperText>{option.helpText}</FormHelperText>}
          </FormControl>
        );
        
      case 'slider':
        return (
          <Box sx={{ width: '100%', mt: 2, mb: 2 }}>
            <Typography id={`${serviceId}-${option.id}-label`} gutterBottom>
              {option.displayName}: {value} {option.unit}
            </Typography>
            <Slider
              value={value}
              min={option.min}
              max={option.max}
              step={option.step}
              valueLabelDisplay="auto"
              onChange={(_, newValue) => handleSliderChange(serviceId, option.id, newValue as number)}
              aria-labelledby={`${serviceId}-${option.id}-label`}
            />
            {option.helpText && (
              <Typography variant="caption" color="text.secondary">
                {option.helpText}
              </Typography>
            )}
          </Box>
        );
        
      default:
        return <Typography color="error">Unknown option type: {option.type}</Typography>;
    }
  };

  return (
    <Box>
      {/* Wizard Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
          Configure Services
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Set specific parameters for each selected service
        </Typography>
      </Box>
      
      {/* Configuration tip/hint */}
      <Alert severity="info" sx={{ mb: 4 }}>
        <Typography variant="body2">
          Configure each service with appropriate parameters. Default values are pre-selected based on common usage patterns.
        </Typography>
      </Alert>
      
      {/* Service configuration by provider */}
      {Object.entries(servicesByProvider).map(([provider, services]) => (
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
            {provider.toUpperCase()} Services
          </Typography>
          
          {/* Service configuration cards */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {services.map((service) => (
              <Box key={service.serviceId}>
                <Paper sx={{ p: 0, overflow: 'hidden' }}>
                  <Box 
                    sx={{ 
                      p: 2, 
                      bgcolor: `${providerColors[service.provider]}22`,
                      borderBottom: 1,
                      borderColor: 'divider',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Box sx={{ mr: 1 }}>
                      {categoryIcons[service.serviceId.split('-')[0]]}
                    </Box>
                    <Typography variant="h6">
                      {service.displayName}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                      {service.configOptions.map((option) => (
                        <Box key={option.id} sx={{ width: { xs: '100%', md: 'calc(50% - 12px)' } }}>
                          {renderConfigInput(service.serviceId, option)}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Paper>
              </Box>
            ))}
          </Box>
        </Box>
      ))}
      
      {/* Navigation Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
        >
          Back: Services
        </Button>
        
        <Button 
          variant="contained" 
          endIcon={<ArrowForwardIcon />}
          onClick={handleNext}
        >
          Next: Review
        </Button>
      </Box>
    </Box>
  );
};

export default ServiceConfig; 