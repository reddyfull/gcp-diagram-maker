import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Avatar,
  TextField,
  IconButton,
  Chip,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Checkbox,
  FormGroup,
  Switch,
  Tooltip,
  Divider,
  Card,
  CardContent,
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  Help as HelpIcon,
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { wizardQuestions, WizardQuestion, QuestionChoice, getNextQuestions } from '../../data/wizardQuestions';

// Define message type
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  questionId?: string;
  choices?: string[];
}

// Define the component props
interface StructuredAIAssistantProps {
  sessionId: string;
  userId?: string;
  onAnswerSubmitted?: (questionId: string, answer: any) => void;
}

const StructuredAIAssistant: React.FC<StructuredAIAssistantProps> = ({
  sessionId,
  userId = 'anonymous',
  onAnswerSubmitted,
}) => {
  // State for conversation
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<WizardQuestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [userInput, setUserInput] = useState('');
  const [activeQuestionIds, setActiveQuestionIds] = useState<string[]>([]);
  const [storedAnswers, setStoredAnswers] = useState<Record<string, any>>({});
  
  // Ref for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // On initial load, start with welcome message and first question
  useEffect(() => {
    const welcomeMessage: Message = {
      id: 'welcome',
      text: "Welcome to the Azure Diagram Maker! I'll help you design your cloud infrastructure by asking you a series of questions. Let's start with understanding your workload type.",
      sender: 'ai',
      timestamp: new Date(),
    };
    
    setMessages([welcomeMessage]);
    
    // Set the first question
    const firstQuestion = wizardQuestions.find(q => q.id === 'workload-type');
    if (firstQuestion) {
      setCurrentQuestion(firstQuestion);
      setActiveQuestionIds(['workload-type']);
      
      // Add first question as a message
      const questionMessage: Message = {
        id: `question-${firstQuestion.id}`,
        text: firstQuestion.text,
        sender: 'ai',
        timestamp: new Date(),
        questionId: firstQuestion.id,
      };
      
      setMessages(prev => [...prev, questionMessage]);
    }
  }, []);
  
  // Auto-scroll when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Handle answer submission
  const handleAnswerSubmit = async (questionId: string, answer: any) => {
    // Update answers state
    const updatedAnswers = { ...answers, [questionId]: answer };
    setAnswers(updatedAnswers);
    
    // Find the current question
    const question = wizardQuestions.find(q => q.id === questionId);
    if (!question) return;
    
    // Format answer for display
    let answerDisplay: string;
    if (Array.isArray(answer)) {
      // For multiple choice questions
      const choiceTexts = answer.map(a => {
        const choice = question.choices?.find(c => 
          typeof c === 'string' ? c === a : c.id === a
        );
        return typeof choice === 'string' ? choice : choice?.text || a;
      });
      answerDisplay = choiceTexts.join(', ');
    } else if (typeof answer === 'boolean') {
      // For boolean questions
      answerDisplay = answer ? 'Yes' : 'No';
    } else {
      // For other types
      answerDisplay = String(answer);
    }
    
    // Add user answer as a message
    const userMessage: Message = {
      id: `answer-${questionId}-${Date.now()}`,
      text: answerDisplay,
      sender: 'user',
      timestamp: new Date(),
      questionId: questionId,
      choices: Array.isArray(answer) ? answer : [answer],
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Notify parent component
    if (onAnswerSubmitted) {
      onAnswerSubmitted(questionId, answer);
    }
    
    // Determine next questions based on this answer
    await processNextQuestions(questionId, updatedAnswers);
  };
  
  // Process next questions based on answers
  const processNextQuestions = async (currentQuestionId: string, currentAnswers: Record<string, any>) => {
    setIsLoading(true);
    
    try {
      // Get next questions based on the answer
      const nextQuestionIds = getNextQuestions(currentQuestionId, currentAnswers);
      
      // If there are follow-up questions, add them
      if (nextQuestionIds.length > 0) {
        // Update active questions
        setActiveQuestionIds(prev => [...prev.filter(id => id !== currentQuestionId), ...nextQuestionIds]);
        
        // Add AI response message first
        const response = await getAIResponse(currentQuestionId, currentAnswers);
        
        const aiMessage: Message = {
          id: `response-${currentQuestionId}-${Date.now()}`,
          text: response,
          sender: 'ai',
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, aiMessage]);
        
        // Find the next question to display
        const nextQuestion = wizardQuestions.find(q => q.id === nextQuestionIds[0]);
        if (nextQuestion) {
          setCurrentQuestion(nextQuestion);
          
          // Add next question as a message
          setTimeout(() => {
            const questionMessage: Message = {
              id: `question-${nextQuestion.id}`,
              text: nextQuestion.text,
              sender: 'ai',
              timestamp: new Date(),
              questionId: nextQuestion.id,
            };
            
            setMessages(prev => [...prev, questionMessage]);
          }, 1000); // Slight delay for natural conversation flow
        }
      } else {
        // No more questions - summarize and provide recommendations
        const finalResponse = await getAIResponse(currentQuestionId, currentAnswers, true);
        
        const summaryMessage: Message = {
          id: `summary-${Date.now()}`,
          text: finalResponse,
          sender: 'ai',
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, summaryMessage]);
        setCurrentQuestion(null);
      }
    } catch (error) {
      console.error('Error processing next questions:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        text: "I'm sorry, I encountered an error while processing your answer. Let's continue with the next question.",
        sender: 'ai',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Get AI response based on user answers using Gemini API
  const getAIResponse = async (
    questionId: string, 
    currentAnswers: Record<string, any>,
    isFinal = false
  ): Promise<string> => {
    try {
      const currentQuestion = wizardQuestions.find(q => q.id === questionId);
      const questionText = currentQuestion?.text || questionId;
      
      // Get the answer the user just provided
      const currentAnswer = currentAnswers[questionId];
      const answerValue = Array.isArray(currentAnswer) 
        ? currentAnswer.join(', ') 
        : typeof currentAnswer === 'boolean'
          ? currentAnswer ? 'Yes' : 'No'
          : currentAnswer;
      
      // Store a copy of all answers for structured access later
      setStoredAnswers(currentAnswers);
      
      // Build a comprehensive summary of all answers provided so far
      let answerSummary = "## Current Infrastructure Requirements:\n\n";
      
      // Group answers by category to organize the summary
      const categories: Record<string, Array<{key: string, value: string}>> = {
        'General': [],
        'Provider': [],
        'Region': [],
        'Compute': [],
        'Storage': [],
        'Network': [],
        'Database': [],
        'Security': [],
        'Other': []
      };
      
      // Place each answer in the appropriate category based on question ID prefix
      Object.entries(currentAnswers).forEach(([key, value]) => {
        // Skip keys that start with underscore - they're internal
        if (key.startsWith('_')) return;
        
        const displayValue = Array.isArray(value)
          ? value.join(', ')
          : typeof value === 'boolean'
            ? value ? 'Yes' : 'No'
            : value;
        
        // Find the question to get its proper text
        const question = wizardQuestions.find(q => q.id === key);
        const displayKey = question?.text || key;
        
        if (key.startsWith('workload') || key.startsWith('general')) {
          categories['General'].push({key: displayKey, value: displayValue});
        } else if (key.startsWith('provider')) {
          categories['Provider'].push({key: displayKey, value: displayValue});
        } else if (key.startsWith('region')) {
          categories['Region'].push({key: displayKey, value: displayValue});
        } else if (key.startsWith('compute')) {
          categories['Compute'].push({key: displayKey, value: displayValue});
        } else if (key.startsWith('storage')) {
          categories['Storage'].push({key: displayKey, value: displayValue});
        } else if (key.startsWith('network')) {
          categories['Network'].push({key: displayKey, value: displayValue});
        } else if (key.startsWith('database')) {
          categories['Database'].push({key: displayKey, value: displayValue});
        } else if (key.startsWith('security')) {
          categories['Security'].push({key: displayKey, value: displayValue});
        } else {
          categories['Other'].push({key: displayKey, value: displayValue});
        }
      });
      
      // Build the organized summary
      Object.entries(categories).forEach(([category, items]) => {
        if (items.length > 0) {
          answerSummary += `### ${category}\n`;
          items.forEach(({key, value}) => {
            answerSummary += `- ${key}: ${value}\n`;
          });
          answerSummary += '\n';
        }
      });
      
      // Context about current question
      const contextInfo = `
The user was just asked: "${questionText}"
Their answer was: "${answerValue}"
`;

      // Determine if this is for a final recommendation
      const promptType = isFinal
        ? "You're now providing FINAL recommendations based on all gathered requirements."
        : "You're now providing feedback on the user's latest answer and leading them to the next question.";

      // Create a better prompt with more context for different scenarios
      const enhancedPrompt = `
You are an expert cloud infrastructure architect specializing in Azure, AWS, and GCP services.
${promptType}

${contextInfo}

${answerSummary}

Please focus on these key areas in your response:
1. High availability (99.99%+ uptime) and disaster recovery strategies
2. Security best practices specific to the selected services
3. Cost optimization while maintaining reliability
4. Scalability recommendations based on the workload type
5. Integration patterns between the selected services

${isFinal 
  ? "Provide a comprehensive infrastructure recommendation with specific services that match their requirements. Include best practices for configuration, security, and high availability."
  : "Provide a brief (2-3 sentences) response acknowledging their answer to the current question, then ask a relevant follow-up question if needed."}

Keep your response concise and factual, focusing on specific recommended services and best practices.
`;

      // Call the AI API with the enhanced prompt
      const response = await axios.post('/api/ai/chat', {
        message: enhancedPrompt,
        user_id: userId,
        session_id: sessionId,
        context: isFinal ? answerSummary : contextInfo,
      });
      
      return response.data.response;
    } catch (error) {
      console.error('Error getting AI response:', error);
      return isFinal 
        ? "Based on your answers, I recommend starting with a basic cloud architecture that includes the services you've selected. For high availability, consider deploying across multiple regions and implementing proper backup strategies. Review the selected services and consult documentation for best practices on configuration."
        : "I've noted your response. Let's continue with the next question to further refine your infrastructure requirements.";
    }
  };
  
  // Handle custom input submission
  const handleCustomInputSubmit = async () => {
    if (!userInput.trim()) return;
    
    // Add user message
    const userMessage: Message = {
      id: `custom-${Date.now()}`,
      text: userInput,
      sender: 'user',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);
    
    try {
      // Call AI API with the custom question
      const response = await axios.post('/api/ai/chat', {
        message: userInput,
        user_id: userId,
        session_id: sessionId,
      });
      
      // Add AI response
      const aiMessage: Message = {
        id: `response-custom-${Date.now()}`,
        text: response.data.response,
        sender: 'ai',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error getting AI response for custom input:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: `error-custom-${Date.now()}`,
        text: "I'm sorry, I encountered an error processing your question. Could you please try asking something else?",
        sender: 'ai',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Render the question input form based on question type
  const renderQuestionInput = (question: WizardQuestion) => {
    switch (question.type) {
      case 'multiple-choice':
        return (
          <FormControl component="fieldset" fullWidth sx={{ mt: 2 }}>
            <FormLabel component="legend">{question.description || 'Select all that apply:'}</FormLabel>
            <FormGroup>
              {question.choices?.map((choice) => {
                const choiceId = typeof choice === 'string' ? choice : choice.id;
                const choiceText = typeof choice === 'string' ? choice : choice.text;
                const choiceDescription = typeof choice === 'string' ? '' : choice.description;
                
                // Use local state for tracking selections before submitting
                const selectedAnswers = answers[question.id] || [];
                
                return (
                  <Box key={choiceId} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          onChange={(e) => {
                            const currentSelections = [...(Array.isArray(selectedAnswers) ? selectedAnswers : [])];
                            
                            if (e.target.checked) {
                              // Add to selections
                              if (!currentSelections.includes(choiceId)) {
                                setAnswers({
                                  ...answers,
                                  [question.id]: [...currentSelections, choiceId]
                                });
                              }
                            } else {
                              // Remove from selections
                              setAnswers({
                                ...answers,
                                [question.id]: currentSelections.filter(id => id !== choiceId)
                              });
                            }
                            // Don't submit automatically - wait for the Submit button
                          }}
                          checked={Array.isArray(selectedAnswers) && selectedAnswers.includes(choiceId)}
                        />
                      }
                      label={choiceText}
                    />
                    {choiceDescription && (
                      <Tooltip title={choiceDescription} arrow>
                        <HelpIcon fontSize="small" color="action" sx={{ ml: 1 }} />
                      </Tooltip>
                    )}
                  </Box>
                );
              })}
            </FormGroup>
            
            <Button 
              variant="contained" 
              color="primary"
              sx={{ mt: 2 }}
              onClick={() => {
                if (answers[question.id]) {
                  // Now submit all selected options at once
                  handleAnswerSubmit(question.id, answers[question.id]);
                } else if (question.choices && question.choices.length > 0) {
                  // If no selection and there's a default, use it
                  const defaultValue = question.default 
                    ? question.default 
                    : [typeof question.choices[0] === 'string' 
                        ? question.choices[0] 
                        : question.choices[0].id];
                    
                  handleAnswerSubmit(question.id, defaultValue);
                }
              }}
              disabled={!answers[question.id] || 
                       (Array.isArray(answers[question.id]) && answers[question.id].length === 0)}
            >
              Submit
            </Button>
          </FormControl>
        );
        
      case 'select':
        return (
          <FormControl component="fieldset" fullWidth sx={{ mt: 2 }}>
            <FormLabel component="legend">{question.description || 'Select one option:'}</FormLabel>
            <RadioGroup
              aria-label={question.id}
              value={answers[question.id] || ''}
              onChange={(e) => {
                // Only update the local state, don't submit yet
                setAnswers({
                  ...answers,
                  [question.id]: e.target.value
                });
              }}
            >
              {question.choices?.map((choice) => {
                const choiceId = typeof choice === 'string' ? choice : choice.id;
                const choiceText = typeof choice === 'string' ? choice : choice.text;
                const choiceDescription = typeof choice === 'string' ? '' : choice.description;
                
                return (
                  <Box key={choiceId} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <FormControlLabel
                      value={choiceId}
                      control={<Radio />}
                      label={choiceText}
                    />
                    {choiceDescription && (
                      <Tooltip title={choiceDescription} arrow>
                        <HelpIcon fontSize="small" color="action" sx={{ ml: 1 }} />
                      </Tooltip>
                    )}
                  </Box>
                );
              })}
            </RadioGroup>
            
            <Button 
              variant="contained" 
              color="primary"
              sx={{ mt: 2 }}
              onClick={() => {
                if (answers[question.id]) {
                  // Submit the selected option
                  handleAnswerSubmit(question.id, answers[question.id]);
                } else if (question.default) {
                  // If no selection but there's a default, use it
                  handleAnswerSubmit(question.id, question.default);
                } else if (question.choices && question.choices.length > 0) {
                  // Otherwise use first option
                  const defaultValue = typeof question.choices[0] === 'string'
                    ? question.choices[0]
                    : question.choices[0].id;
                  handleAnswerSubmit(question.id, defaultValue);
                }
              }}
              disabled={!answers[question.id]}
            >
              Submit
            </Button>
          </FormControl>
        );
        
      case 'boolean':
        return (
          <FormControl component="fieldset" fullWidth sx={{ mt: 2 }}>
            <FormLabel component="legend">{question.description || 'Select your preference:'}</FormLabel>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <Typography variant="body1" sx={{ mr: 2 }}>No</Typography>
              <Switch
                checked={answers[question.id] === true}
                onChange={(e) => {
                  // Only update local state, don't submit yet
                  setAnswers({
                    ...answers,
                    [question.id]: e.target.checked
                  });
                }}
                color="primary"
              />
              <Typography variant="body1" sx={{ ml: 2 }}>Yes</Typography>
            </Box>
            
            <Button 
              variant="contained" 
              color="primary"
              sx={{ mt: 2 }}
              onClick={() => {
                if (answers[question.id] !== undefined) {
                  // Submit the selected boolean value
                  handleAnswerSubmit(question.id, answers[question.id]);
                } else if (question.default !== undefined) {
                  // If no selection but there's a default, use it
                  handleAnswerSubmit(question.id, question.default);
                } else {
                  // Otherwise default to false
                  handleAnswerSubmit(question.id, false);
                }
              }}
              disabled={answers[question.id] === undefined}
            >
              Submit
            </Button>
          </FormControl>
        );
        
      case 'text':
        return (
          <FormControl fullWidth sx={{ mt: 2 }}>
            <TextField
              label={question.description || 'Your answer:'}
              variant="outlined"
              value={answers[question.id] || ''}
              onChange={(e) => {
                // Only update local state
                setAnswers({ 
                  ...answers, 
                  [question.id]: e.target.value 
                });
              }}
              fullWidth
              multiline
              rows={2}
            />
            
            <Button 
              variant="contained" 
              color="primary"
              sx={{ mt: 2 }}
              onClick={() => {
                if (answers[question.id] && answers[question.id].trim()) {
                  // Submit the text input
                  handleAnswerSubmit(question.id, answers[question.id]);
                } else if (question.default) {
                  // If empty but there's a default, use it
                  handleAnswerSubmit(question.id, question.default);
                }
              }}
              disabled={!answers[question.id] || !answers[question.id].trim()}
            >
              Submit
            </Button>
          </FormControl>
        );
        
      default:
        return <Typography color="error">Unsupported question type: {question.type}</Typography>;
    }
  };
  
  // Render the component
  return (
    <Paper sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Assistant Header */}
      <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
          <BotIcon sx={{ mr: 1 }} />
          Infrastructure Design Assistant
        </Typography>
      </Box>
      
      {/* Message Area */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column' }}>
        {messages.map((message) => (
          <Box
            key={message.id}
            sx={{
              display: 'flex',
              flexDirection: message.sender === 'user' ? 'row-reverse' : 'row',
              mb: 2,
              alignItems: 'flex-start',
            }}
          >
            <Avatar
              sx={{
                bgcolor: message.sender === 'user' ? 'primary.main' : 'secondary.main',
                width: 32,
                height: 32,
                mx: 1,
              }}
            >
              {message.sender === 'user' ? <PersonIcon fontSize="small" /> : <BotIcon fontSize="small" />}
            </Avatar>
            
            <Paper
              sx={{
                p: 2,
                maxWidth: '75%',
                borderRadius: 2,
                bgcolor: message.sender === 'user' ? 'primary.light' : 'background.paper',
                color: message.sender === 'user' ? 'white' : 'text.primary',
                boxShadow: 1,
              }}
            >
              <Typography variant="body1" whiteSpace="pre-wrap">
                {message.text}
              </Typography>
              
              {/* If this is a question from AI, show the input form */}
              {message.sender === 'ai' && message.questionId && currentQuestion?.id === message.questionId && (
                renderQuestionInput(currentQuestion)
              )}
              
              <Typography 
                variant="caption" 
                color={message.sender === 'user' ? 'white' : 'text.secondary'}
                sx={{ mt: 1, display: 'block' }}
              >
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Typography>
            </Paper>
          </Box>
        ))}
        
        {/* Loading indicator */}
        {isLoading && (
          <Box sx={{ display: 'flex', alignItems: 'center', alignSelf: 'flex-start', mb: 2 }}>
            <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32, mr: 1 }}>
              <BotIcon fontSize="small" />
            </Avatar>
            <CircularProgress size={24} sx={{ ml: 1 }} />
          </Box>
        )}
        
        {/* Bottom anchor for auto-scroll */}
        <div ref={messagesEndRef} />
      </Box>
      
      {/* Input Area */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          Ask a question or provide additional information:
        </Typography>
        
        <Box sx={{ display: 'flex' }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Type your message..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleCustomInputSubmit();
              }
            }}
            size="small"
            disabled={isLoading}
          />
          
          <IconButton 
            color="primary" 
            sx={{ ml: 1 }}
            onClick={handleCustomInputSubmit}
            disabled={!userInput.trim() || isLoading}
          >
            <SendIcon />
          </IconButton>
        </Box>
        
        {/* Summary of Answers */}
        {Object.keys(answers).length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 1 }}>
              <Chip 
                label="Your Design Preferences" 
                size="small" 
                icon={<CheckCircleIcon fontSize="small" />} 
              />
            </Divider>
            
            <Box sx={{ maxHeight: '100px', overflow: 'auto' }}>
              {Object.entries(answers)
                .filter(([key]) => !key.startsWith('_'))
                .map(([questionId, answer]) => {
                  const question = wizardQuestions.find(q => q.id === questionId);
                  if (!question) return null;
                  
                  let answerDisplay: string;
                  if (Array.isArray(answer)) {
                    const choiceTexts = answer.map(a => {
                      const choice = question.choices?.find(c => 
                        typeof c === 'string' ? c === a : c.id === a
                      );
                      return typeof choice === 'string' ? choice : choice?.text || a;
                    });
                    answerDisplay = choiceTexts.join(', ');
                  } else if (typeof answer === 'boolean') {
                    answerDisplay = answer ? 'Yes' : 'No';
                  } else {
                    answerDisplay = String(answer);
                  }
                  
                  return (
                    <Typography key={questionId} variant="caption" display="block" color="text.secondary">
                      <strong>{question.text}</strong>: {answerDisplay}
                    </Typography>
                  );
                })}
            </Box>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default StructuredAIAssistant; 