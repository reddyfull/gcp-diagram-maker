import React, { useState, useEffect } from 'react';
import { Container, Box, Typography, CircularProgress, Grid, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import EnhancedAIAssistant from '../../components/wizard/EnhancedAIAssistant';

const EnhancedWizardPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string>('');
  
  useEffect(() => {
    // Generate a new session ID or retrieve from localStorage
    const existingSessionId = localStorage.getItem('ai_wizard_session_id');
    const newSessionId = existingSessionId || uuidv4();
    
    if (!existingSessionId) {
      localStorage.setItem('ai_wizard_session_id', newSessionId);
    }
    
    setSessionId(newSessionId);
    setIsLoading(false);
    
    // Log the session start to server
    const logSession = async () => {
      try {
        await fetch('/api/ai/session', {
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
      } catch (error) {
        console.error('Error logging session start:', error);
      }
    };
    
    logSession();
    
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
    
    // Log to server for future reference
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
    <Container maxWidth="xl" sx={{ height: '100vh', py: 2 }}>
      <Grid container spacing={2} sx={{ height: '100%' }}>
        <Grid item xs={12}>
          <Typography variant="h4" gutterBottom>
            Infrastructure Design Wizard (Enhanced)
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            Our AI assistant will guide you through designing your cloud infrastructure
          </Typography>
        </Grid>
        
        <Grid item xs={12} sx={{ height: 'calc(100% - 100px)' }}>
          <EnhancedAIAssistant
            sessionId={sessionId}
            onAnswerSubmitted={handleAnswerSubmitted}
          />
        </Grid>
        
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
            <Button variant="outlined" onClick={handleBackToDashboard}>
              Back to Dashboard
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};

export default EnhancedWizardPage; 