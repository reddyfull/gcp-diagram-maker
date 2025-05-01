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
  isContinuePrompt?: boolean;
}

// Define the component props
interface EnhancedAIAssistantProps {
  sessionId: string;
  userId?: string;
  onAnswerSubmitted?: (questionId: string, answer: any) => void;
}

const EnhancedAIAssistant: React.FC<EnhancedAIAssistantProps> = ({
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
  const [nextQuestionToShow, setNextQuestionToShow] = useState<string | null>(null);
  
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
  
  // Handle showing the next question
  const handleShowNextQuestion = () => {
    if (!nextQuestionToShow) return;
    
    // Find the next question
    const nextQuestion = wizardQuestions.find(q => q.id === nextQuestionToShow);
    if (!nextQuestion) return;
    
    // Add next question as a message
    const questionMessage: Message = {
      id: `question-${nextQuestion.id}`,
      text: nextQuestion.text,
      sender: 'ai',
      timestamp: new Date(),
      questionId: nextQuestion.id,
    };
    
    setMessages(prev => [...prev, questionMessage]);
    
    // Reset next question state
    setNextQuestionToShow(null);
  };
  
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
          
          // Add a continue prompt instead of immediately showing the next question
          setTimeout(() => {
            const continuePrompt: Message = {
              id: `continue-${Date.now()}`,
              text: "Ready to continue? Click 'Next Question' when you're ready to proceed.",
              sender: 'ai',
              timestamp: new Date(),
              isContinuePrompt: true,
            };
            
            setMessages(prev => [...prev, continuePrompt]);
            setNextQuestionToShow(nextQuestion.id);
          }, 1000);
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
      let enhancedPrompt = `
You are an expert cloud infrastructure architect specializing in Azure, AWS, and GCP services.
${promptType}

${contextInfo}

${answerSummary}
`;

      // Add customized context for API-specific questions
      if (questionText.includes("API") && 
         (answerValue.toLowerCase().includes("rest") || 
          answerValue.toLowerCase().includes("graphql") || 
          answerValue.toLowerCase().includes("grpc"))) {
        
        enhancedPrompt += `
The user has provided API details that require specific infrastructure considerations:

For a ${answerValue} API:
1. Consider the appropriate API Gateway and service mesh options in cloud providers
2. Think about caching strategies specific to this API type
3. Consider authentication and authorization requirements
4. Evaluate performance characteristics and scaling patterns
5. Assess service discovery and networking requirements

Your follow-up response should acknowledge their API choice and ask about a critical aspect that is 
SPECIFIC to ${answerValue.split(',')[0].trim()} APIs (don't ask generic questions).

For example:
- If REST API with high traffic: ask about API rate limiting, caching strategies
- If GraphQL: ask about schema complexity, resolver performance
- If gRPC: ask about service mesh requirements, binary payload considerations
- For traffic patterns: recommend specific autoscaling approaches

Tailor your question to gather information most relevant to optimizing their specific API architecture.
`;
      } else {
        enhancedPrompt += `
Please focus on these key areas in your response:
1. High availability (99.99%+ uptime) and disaster recovery strategies
2. Security best practices specific to the selected services
3. Cost optimization while maintaining reliability
4. Scalability recommendations based on the workload type
5. Integration patterns between the selected services
`;
      }

      enhancedPrompt += `
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
  
  // Render the question input form based on question type
  const renderQuestionInput = (question: WizardQuestion) => {
    // This function is the same as in the original component
    return <div>Question input controls here</div>;
  };
  
  // Render the component
  return (
    <Paper sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
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
              
              {/* Display the Next Question button for continue messages */}
              {message.isContinuePrompt && nextQuestionToShow && (
                <Button
                  variant="contained"
                  color="primary"
                  endIcon={<ArrowForwardIcon />}
                  onClick={handleShowNextQuestion}
                  sx={{ mt: 2 }}
                >
                  Next Question
                </Button>
              )}
            </Paper>
          </Box>
        ))}
        
        {/* Loading indicator */}
        {isLoading && (
          <Box sx={{ display: 'flex', alignItems: 'center', alignSelf: 'flex-start', mb: 2 }}>
            <CircularProgress size={24} sx={{ ml: 1 }} />
          </Box>
        )}
        
        {/* Bottom anchor for auto-scroll */}
        <div ref={messagesEndRef} />
      </Box>
    </Paper>
  );
};

export default EnhancedAIAssistant; 