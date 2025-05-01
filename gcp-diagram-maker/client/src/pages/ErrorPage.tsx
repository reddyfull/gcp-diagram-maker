import { useRouteError } from 'react-router-dom';
import { Box, Typography, Container, Button } from '@mui/material';
import { Error as ErrorIcon } from '@mui/icons-material';

const ErrorPage = () => {
  const error = useRouteError();
  const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
  
  return (
    <Container maxWidth="md">
      <Box 
        sx={{ 
          mt: 8, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          textAlign: 'center'
        }}
      >
        <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
        
        <Typography variant="h4" component="h1" gutterBottom>
          Oops! Something went wrong
        </Typography>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          {errorMessage}
        </Typography>
        
        <Button 
          variant="contained" 
          color="primary" 
          href="/"
          sx={{ mt: 2 }}
        >
          Return to Dashboard
        </Button>
      </Box>
    </Container>
  );
};

export default ErrorPage; 