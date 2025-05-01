import React, { useState, useEffect } from 'react';
import {
  Typography,
  Paper,
  Grid,
  Checkbox,
    FormControlLabel, 
  Card,
  CardContent,
    CardActionArea,
    Box,
    Button,
    Divider,
    FormGroup
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { useWizard } from './WizardContext';

// Styled components
const RegionCard = styled(Card, {
    shouldForwardProp: (prop) => prop !== 'selected'
})<{ selected?: boolean }>(({ theme, selected }) => ({
    height: '100%',
    transition: 'all 0.2s ease-in-out',
    border: selected ? `2px solid ${theme.palette.primary.main}` : '2px solid transparent',
    '&:hover': {
        borderColor: selected ? theme.palette.primary.main : theme.palette.divider
    }
}));

// Azure regions
const azureRegions = [
    { id: 'eastus', name: 'East US', location: 'Virginia', latency: 'Low', zonal: true },
    { id: 'westus2', name: 'West US 2', location: 'Washington', latency: 'Medium', zonal: true },
    { id: 'centralus', name: 'Central US', location: 'Iowa', latency: 'Medium', zonal: true },
    { id: 'northeurope', name: 'North Europe', location: 'Ireland', latency: 'High', zonal: true },
    { id: 'westeurope', name: 'West Europe', location: 'Netherlands', latency: 'High', zonal: true },
    { id: 'southeastasia', name: 'Southeast Asia', location: 'Singapore', latency: 'Very High', zonal: true },
];

// AWS regions
const awsRegions = [
    { id: 'us-east-1', name: 'US East (N. Virginia)', location: 'Virginia', latency: 'Low', zonal: true },
    { id: 'us-west-2', name: 'US West (Oregon)', location: 'Oregon', latency: 'Medium', zonal: true },
    { id: 'eu-west-1', name: 'EU West (Ireland)', location: 'Ireland', latency: 'High', zonal: true },
    { id: 'ap-southeast-1', name: 'Asia Pacific (Singapore)', location: 'Singapore', latency: 'Very High', zonal: true },
    { id: 'ap-northeast-1', name: 'Asia Pacific (Tokyo)', location: 'Tokyo', latency: 'Very High', zonal: true },
];

const RegionSelection: React.FC = () => {
  const navigate = useNavigate();
    const { answers, updateAnswers } = useWizard();
  
    // Get selected providers from context
    const selectedProviders = answers['cloud-provider'] || ['azure'];
  
  // State for selected regions
    const [selectedAzureRegions, setSelectedAzureRegions] = useState<string[]>(
        answers['azure-region'] || []
    );
    const [selectedAwsRegions, setSelectedAwsRegions] = useState<string[]>(
        answers['aws-region'] || []
    );
    
    // State for multi-region and zone redundancy
    const [multiRegion, setMultiRegion] = useState<boolean>(
        answers['multi-region-deployment'] || false
    );
    
    const [azureZoneRedundancy, setAzureZoneRedundancy] = useState<boolean>(
        answers['azure-zone-redundancy'] || false
    );
    
    const [awsMultiAz, setAwsMultiAz] = useState<boolean>(
        answers['aws-multi-az'] || false
    );

    // Toggle region selection
    const toggleAzureRegion = (regionId: string) => {
        setSelectedAzureRegions(prev => {
            if (prev.includes(regionId)) {
                return prev.filter(id => id !== regionId);
      } else {
                return [...prev, regionId];
      }
    });
  };
  
    const toggleAwsRegion = (regionId: string) => {
        setSelectedAwsRegions(prev => {
            if (prev.includes(regionId)) {
                return prev.filter(id => id !== regionId);
            } else {
                return [...prev, regionId];
            }
        });
  };
  
  // Navigate to previous step
  const handleBack = () => {
    navigate('/wizard/provider');
  };

    // Navigate to next step
    const handleNext = () => {
        // Update context with selected regions
        const updates: Record<string, any> = {
            'multi-region-deployment': multiRegion
        };
        
        // Add Azure regions if Azure is selected
        if (selectedProviders.includes('azure')) {
            updates['azure-region'] = selectedAzureRegions;
            updates['azure-zone-redundancy'] = azureZoneRedundancy;
        }
        
        // Add AWS regions if AWS is selected
        if (selectedProviders.includes('aws')) {
            updates['aws-region'] = selectedAwsRegions;
            updates['aws-multi-az'] = awsMultiAz;
        }
        
        // Update context
        updateAnswers(updates);
        
        // Navigate to next step
        navigate('/wizard/services');
    };

    // Determine if Next button should be enabled
    const isNextEnabled = () => {
        let hasRegions = true;
        
        if (selectedProviders.includes('azure') && selectedAzureRegions.length === 0) {
            hasRegions = false;
        }
        
        if (selectedProviders.includes('aws') && selectedAwsRegions.length === 0) {
            hasRegions = false;
        }
        
        return hasRegions;
    };

  return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Select Region(s)
        </Typography>
            
            <Typography variant="body1" paragraph>
                Choose the geographic regions where you want to deploy your infrastructure.
        </Typography>
            
            <Box sx={{ mb: 4 }}>
                <FormGroup>
                    <FormControlLabel
                        control={
                            <Checkbox 
                                checked={multiRegion}
                                onChange={(e) => setMultiRegion(e.target.checked)}
                            />
                        }
                        label="Enable multi-region deployment for high availability"
                    />
                </FormGroup>
                
                {multiRegion && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Multi-region deployment provides protection against regional outages but may increase cost and complexity.
                    </Typography>
                )}
            </Box>
            
            {/* Azure Regions */}
            {selectedProviders.includes('azure') && (
                <Paper sx={{ p: 3, mb: 4 }}>
                    <Typography variant="h5" component="h2" gutterBottom>
                        Azure Regions
          </Typography>
          
                    <Box sx={{ mb: 2 }}>
                        <FormGroup>
                            <FormControlLabel
                                control={
                                    <Checkbox 
                                        checked={azureZoneRedundancy}
                                        onChange={(e) => setAzureZoneRedundancy(e.target.checked)}
                                    />
                                }
                                label="Enable zone redundancy within regions"
                            />
                        </FormGroup>
                    </Box>
                    
                    <Grid container spacing={2}>
                        {azureRegions.map(region => (
                            <Grid item xs={12} sm={6} md={4} key={region.id}>
                                <RegionCard selected={selectedAzureRegions.includes(region.id)}>
                                    <CardActionArea onClick={() => toggleAzureRegion(region.id)}>
                  <CardContent>
                                            <Typography variant="h6" component="div">
                      {region.name}
                    </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Location: {region.location}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Latency: {region.latency}
                    </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Availability Zones: {region.zonal ? 'Yes' : 'No'}
                    </Typography>
                  </CardContent>
                                    </CardActionArea>
                                </RegionCard>
                            </Grid>
                        ))}
                    </Grid>
                </Paper>
            )}
            
            {/* AWS Regions */}
            {selectedProviders.includes('aws') && (
      <Paper sx={{ p: 3, mb: 4 }}>
                    <Typography variant="h5" component="h2" gutterBottom>
                        AWS Regions
          </Typography>
                    
                    <Box sx={{ mb: 2 }}>
                        <FormGroup>
                            <FormControlLabel
                                control={
                                    <Checkbox 
                                        checked={awsMultiAz}
                                        onChange={(e) => setAwsMultiAz(e.target.checked)}
                                    />
                                }
                                label="Enable Multi-AZ deployment"
                            />
                        </FormGroup>
        </Box>
        
                    <Grid container spacing={2}>
                        {awsRegions.map(region => (
                            <Grid item xs={12} sm={6} md={4} key={region.id}>
                                <RegionCard selected={selectedAwsRegions.includes(region.id)}>
                                    <CardActionArea onClick={() => toggleAwsRegion(region.id)}>
                                        <CardContent>
                                            <Typography variant="h6" component="div">
                                                {region.name}
        </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Location: {region.location}
        </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Latency: {region.latency}
            </Typography>
                                        </CardContent>
                                    </CardActionArea>
                                </RegionCard>
                            </Grid>
                        ))}
                    </Grid>
      </Paper>
            )}
            
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
                <Button variant="outlined" onClick={handleBack}>
                    Back to Providers
        </Button>
        
        <Button 
          variant="contained" 
                    color="primary" 
          onClick={handleNext}
                    disabled={!isNextEnabled()}
        >
                    Continue to Services
        </Button>
      </Box>
    </Box>
  );
};

export default RegionSelection; 