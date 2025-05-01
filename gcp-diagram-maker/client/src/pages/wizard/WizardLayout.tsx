import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Paper, Container } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import WizardProgress from '../../components/wizard/WizardProgress';
import { WizardProvider } from './WizardContext';

const WizardLayout: React.FC = () => {
  const theme = useTheme();

  return (
    <WizardProvider>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Paper 
          elevation={3}
          sx={{ 
            p: 2, 
            mb: 4, 
            bgcolor: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100' 
          }}
        >
          <WizardProgress />
        </Paper>
        
        <Paper 
          elevation={3}
          sx={{ 
            p: 0, 
            minHeight: '500px',
            bgcolor: theme.palette.mode === 'dark' ? 'grey.800' : 'background.paper'
          }}
        >
          <Box sx={{ p: 0 }}>
            <Outlet />
          </Box>
        </Paper>
      </Container>
    </WizardProvider>
  );
};

export default WizardLayout; 