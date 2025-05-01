import React, { useState, useEffect } from 'react';
import { 
    Typography, 
    Grid, 
    Card, 
    CardContent, 
    CardActionArea,
    CardMedia,
    Box,
    Button,
    Checkbox,
    FormControlLabel
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import AzureIcon from '../../assets/azure-icon.png';
import AwsIcon from '../../assets/aws-icon.png';
import GcpIcon from '../../assets/gcp-icon.png';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useWizard } from './WizardContext';

// Styled components
const ProviderCard = styled(Card)(({ theme }) => ({
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    transition: 'all 0.3s ease-in-out',
    '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: theme.shadows[6],
    },
}));

const SelectedIndicator = styled(CheckCircleIcon)(({ theme }) => ({
    position: 'absolute',
    top: 10,
    right: 10,
    color: theme.palette.primary.main,
    fontSize: 30,
}));

const ProviderSelection: React.FC = () => {
    const navigate = useNavigate();
    const { answers, updateAnswers } = useWizard();
    const [selectedProviders, setSelectedProviders] = useState<string[]>(
        answers['cloud-provider'] || []
    );

    // Provider definitions
    const providers = [
        { id: 'azure', name: 'Microsoft Azure', icon: AzureIcon, description: 'Microsoft\'s cloud platform with robust enterprise capabilities.' },
        { id: 'aws', name: 'Amazon Web Services', icon: AwsIcon, description: 'Amazon\'s comprehensive cloud platform with extensive global infrastructure.' },
        { id: 'gcp', name: 'Google Cloud Platform', icon: GcpIcon, description: 'Google\'s cloud platform with strengths in data analytics and machine learning.' },
    ];

    // Toggle provider selection
    const toggleProvider = (providerId: string) => {
        setSelectedProviders(prev => {
            if (prev.includes(providerId)) {
                return prev.filter(id => id !== providerId);
            } else {
                return [...prev, providerId];
            }
        });
    };

    // Handle next button click
    const handleNext = () => {
        // Update context with selected providers
        updateAnswers({
            'cloud-provider': selectedProviders
        });
        
        // Navigate to next step
        navigate('/wizard/region');
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Select Cloud Provider(s)
            </Typography>
            
            <Typography variant="body1" paragraph>
                Choose one or more cloud providers for your infrastructure deployment.
            </Typography>
            
            <Grid container spacing={3} sx={{ mt: 2, mb: 4 }}>
                {providers.map(provider => (
                    <Grid item xs={12} sm={6} md={4} key={provider.id}>
                        <ProviderCard>
                            <CardActionArea onClick={() => toggleProvider(provider.id)}>
                                <CardMedia
                                    component="img"
                                    height="140"
                                    image={provider.icon}
                                    alt={provider.name}
                                    sx={{ objectFit: 'contain', p: 2, bgcolor: 'background.paper' }}
                                />
                                <CardContent>
                                    <Typography gutterBottom variant="h5" component="div">
                                        {provider.name}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {provider.description}
                                    </Typography>
                                </CardContent>
                                {selectedProviders.includes(provider.id) && (
                                    <SelectedIndicator />
                                )}
                            </CardActionArea>
                        </ProviderCard>
                    </Grid>
                ))}
            </Grid>
            
            <Box sx={{ mt: 4, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                    Multi-Cloud Configuration
                </Typography>
                
                <FormControlLabel
                    control={
                        <Checkbox 
                            checked={selectedProviders.length > 1}
                            disabled
                            color="primary"
                        />
                    }
                    label="Enable multi-cloud deployment"
                />
                
                <Typography variant="body2" color="text.secondary" paragraph>
                    Selecting multiple providers enables cross-cloud deployment for enhanced availability and redundancy.
                </Typography>
            </Box>
            
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleNext}
                    disabled={selectedProviders.length === 0}
                >
                    Continue to Region Selection
                </Button>
            </Box>
        </Box>
    );
};

export default ProviderSelection; 