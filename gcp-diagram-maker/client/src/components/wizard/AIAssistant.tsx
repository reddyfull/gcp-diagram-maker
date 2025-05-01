import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Divider,
  Avatar,
  IconButton,
  Chip,
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
  QuestionAnswer as SuggestIcon,
} from '@mui/icons-material';

// Define message type
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

// Define suggestion type
interface Suggestion {
  text: string;
  action?: string;
}

// Define component props
interface AIAssistantProps {
  sessionId: string;
  userId?: string;
  suggestions?: Suggestion[];
  onSuggestionSelected?: (suggestion: Suggestion) => void;
}

// Sample starter suggestions
const DEFAULT_SUGGESTIONS: Suggestion[] = [
  { text: "Help me choose the right Azure services for my web app" },
  { text: "What's the difference between Azure VM and Container Instances?" },
  { text: "Recommend storage options for my application" },
  { text: "How should I configure network security?" },
];

const AIAssistant: React.FC<AIAssistantProps> = ({ 
  sessionId, 
  userId = 'anonymous',
  suggestions = DEFAULT_SUGGESTIONS,
  onSuggestionSelected 
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Generate welcome message from AI
  useEffect(() => {
    const welcomeMessage: Message = {
      id: 'welcome',
      text: "Hello! I'm your Azure infrastructure assistant. How can I help you design your cloud architecture today?",
      sender: 'ai',
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  }, []);
  
  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Handle send message
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    // Add user message to chat
    const userMessage: Message = {
      id: Date.now().toString(),
      text: newMessage,
      sender: 'user',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsLoading(true);
    setError(null);
    
    try {
      // Send message to AI backend
      const response = await axios.post('/api/ai/chat', {
        message: newMessage,
        user_id: userId,
        session_id: sessionId,
      });
      
      // Add AI response to chat
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        text: response.data.response,
        sender: 'ai',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      console.error('Error sending message to AI:', err);
      setError('Failed to get response from AI. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle suggestion click
  const handleSuggestionClick = (suggestion: Suggestion) => {
    setNewMessage(suggestion.text);
    
    // If there's an action associated with this suggestion
    if (suggestion.action && onSuggestionSelected) {
      onSuggestionSelected(suggestion);
    }
  };
  
  // Handle key press (send on Enter)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  return (
    <Paper sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Chat Header */}
      <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
          <BotIcon sx={{ mr: 1 }} />
          AI Infrastructure Assistant
        </Typography>
      </Box>
      
      {/* Messages Area */}
      <Box sx={{ p: 2, flexGrow: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
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
                maxWidth: '70%',
                borderRadius: 2,
                bgcolor: message.sender === 'user' ? 'primary.light' : 'background.paper',
                color: message.sender === 'user' ? 'white' : 'text.primary',
                boxShadow: 1,
              }}
            >
              <Typography variant="body1" whiteSpace="pre-wrap">
                {message.text}
              </Typography>
              <Typography variant="caption" color={message.sender === 'user' ? 'white' : 'text.secondary'} sx={{ mt: 1, display: 'block' }}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Typography>
            </Paper>
          </Box>
        ))}
        
        {isLoading && (
          <Box sx={{ display: 'flex', alignItems: 'center', my: 2 }}>
            <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32, mx: 1 }}>
              <BotIcon fontSize="small" />
            </Avatar>
            <Paper sx={{ p: 2, borderRadius: 2, display: 'flex', alignItems: 'center' }}>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              <Typography variant="body2">Thinking...</Typography>
            </Paper>
          </Box>
        )}
        
        {error && (
          <Box sx={{ display: 'flex', my: 2 }}>
            <Paper sx={{ p: 2, borderRadius: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
              <Typography variant="body2">{error}</Typography>
              <Button 
                startIcon={<RefreshIcon />} 
                variant="contained" 
                color="error" 
                size="small" 
                sx={{ mt: 1 }}
                onClick={() => setError(null)}
              >
                Try Again
              </Button>
            </Paper>
          </Box>
        )}
        
        <div ref={messagesEndRef} />
      </Box>
      
      {/* Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <SuggestIcon fontSize="small" sx={{ mr: 0.5 }} />
            Suggestions
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {suggestions.map((suggestion, index) => (
              <Chip
                key={index}
                label={suggestion.text}
                onClick={() => handleSuggestionClick(suggestion)}
                variant="outlined"
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>
        </Box>
      )}
      
      {/* Input Area */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', alignItems: 'flex-end' }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder="Type your message here..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          variant="outlined"
          size="small"
        />
        <IconButton
          color="primary"
          onClick={handleSendMessage}
          disabled={!newMessage.trim() || isLoading}
          sx={{ ml: 1 }}
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Paper>
  );
};

export default AIAssistant; 