import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, Button, CircularProgress, Stepper, Step, StepLabel } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import StructuredAIAssistant from '../../components/wizard/StructuredAIAssistant';
import { v4 as uuidv4 } from 'uuid';

const wizardSteps = ['Provider', 'Region', 'Services', 'Config', 'Review'];

// Helper to determine active step based on answers
function getActiveStep() {
  const answers = JSON.parse(localStorage.getItem('ai_wizard_answers') || '{}');
  if (!answers['provider']) return 0;
  if (!answers['region']) return 1;
  if (!answers['services']) return 2;
  if (!answers['config']) return 3;
  // If all previous are answered, show Review
  return 4;
}

const AIWizardPage: React.FC = () => {
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeStep, setActiveStep] = useState<number>(getActiveStep());
  
  // Update active step when answers change
  useEffect(() => {
    const handleStorage = () => setActiveStep(getActiveStep());
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);
  
  // Generate a unique session ID on component mount
  useEffect(() => {
    const newSessionId = uuidv4();
    setSessionId(newSessionId);
    setIsLoading(false);
    
    // Store the session ID in localStorage for future reference
    localStorage.setItem('ai_wizard_session_id', newSessionId);
    
    // Log the session start to MongoDB (if needed)
    const logSessionStart = async () => {
      try {
        const response = await fetch('/api/ai/session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: newSessionId,
            action: 'start',
            timestamp: new Date().toISOString(),
          }),
        });
        
        if (!response.ok) {
          console.error('Failed to log session start');
        }
      } catch (error) {
        console.error('Error logging session start:', error);
      }
    };
    
    logSessionStart();
    
    // Clean up on unmount
    return () => {
      // Optional: Log session end
      const logSessionEnd = async () => {
        try {
          await fetch('/api/ai/session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              session_id: newSessionId,
              action: 'end',
              timestamp: new Date().toISOString(),
            }),
          });
        } catch (error) {
          console.error('Error logging session end:', error);
        }
      };
      
      logSessionEnd();
    };
  }, []);
  
  // Handle answer submission (store in state or send to backend)
  const handleAnswerSubmitted = (questionId: string, answer: any) => {
    console.log(`Question ${questionId} answered:`, answer);
    
    // Store the answer in localStorage for persistence
    const currentAnswers = JSON.parse(localStorage.getItem('ai_wizard_answers') || '{}');
    currentAnswers[questionId] = answer;
    localStorage.setItem('ai_wizard_answers', JSON.stringify(currentAnswers));
    
    setActiveStep(getActiveStep()); // Update stepper
    
    // Log to MongoDB for future reference
    const logAnswer = async () => {
      try {
        await fetch('/api/ai/session/answers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: sessionId,
            question_id: questionId,
            answer: answer,
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (error) {
        console.error('Error logging answer:', error);
      }
    };
    
    logAnswer();
  };
  
  // Navigation controls
  const handleBackToDashboard = () => {
    navigate('/');
  };
  
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Grid container spacing={2} sx={{ height: '100%', p: 2 }}>
      <Grid item xs={12}>
        {/* Stepper at the top */}
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 2 }}>
          {wizardSteps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h5" sx={{ mb: 1 }}>
            AI-Driven Infrastructure Wizard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Our intelligent assistant will guide you through designing your cloud infrastructure by asking
            questions about your workload, requirements, and preferences. All conversation history
            is stored for future reference.
          </Typography>
        </Paper>
      </Grid>
      
      <Grid item xs={12} sx={{ height: 'calc(100vh - 180px)' }}>
        <Box sx={{ height: '100%' }}>
          <StructuredAIAssistant 
            sessionId={sessionId} 
            onAnswerSubmitted={handleAnswerSubmitted}
          />
        </Box>
      </Grid>
      
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
          <Button 
            variant="outlined" 
            onClick={handleBackToDashboard}
          >
            Back to Dashboard
          </Button>
          <Button 
            variant="contained" 
            onClick={() => navigate('/terraform-preview')}
          >
            Generate Terraform
          </Button>
        </Box>
      </Grid>
    </Grid>
  );
};

export default AIWizardPage; 