import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Avatar,
  CircularProgress,
  Chip,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Send as SendIcon,
  AutoAwesome as AIIcon,
  Person as PersonIcon,
  Download as DownloadIcon,
  DeleteOutline as DeleteIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';

// Message type
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  quickReplies?: string[];
}

const AIChat = () => {
  // State
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I\'m your cloud infrastructure assistant. How can I help you design your architecture today?',
      sender: 'ai',
      timestamp: new Date(),
      quickReplies: [
        'Help me choose the right VM size',
        'Compare AWS and Azure services',
        'Recommend a network architecture',
        'Optimize my infrastructure costs',
      ],
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Auto scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Handle sending a message
  const handleSend = () => {
    if (!input.trim()) return;
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    
    // Focus input after sending
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    
    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: getAIResponse(input),
        sender: 'ai',
        timestamp: new Date(),
        quickReplies: getQuickReplies(input),
      };
      
      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
  };
  
  // Handle pressing Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  // Handle quick reply click
  const handleQuickReply = (reply: string) => {
    setInput(reply);
    
    // Focus and select input text
    inputRef.current?.focus();
    
    // Automatically send after a short delay
    setTimeout(() => {
      handleSend();
    }, 500);
  };
  
  // Clear chat history
  const handleClearChat = () => {
    setMessages([
      {
        id: Date.now().toString(),
        text: 'Chat history cleared. How can I help you now?',
        sender: 'ai',
        timestamp: new Date(),
        quickReplies: [
          'Help me design a cloud architecture',
          'Compare cloud providers',
          'Recommend services for my workload',
        ],
      },
    ]);
  };
  
  // Mock AI response generator
  const getAIResponse = (query: string): string => {
    const lowercaseQuery = query.toLowerCase();
    
    if (lowercaseQuery.includes('vm size') || lowercaseQuery.includes('instance type')) {
      return `For your workload, I recommend considering these options:\n\n1. **General Purpose**: Azure D4s_v3 or AWS t3.xlarge - good balance of CPU and memory\n2. **Compute Optimized**: Azure F8s_v2 or AWS c5.2xlarge - for CPU-intensive tasks\n3. **Memory Optimized**: Azure E8s_v3 or AWS r5.2xlarge - when you need more RAM\n\nThe best choice depends on your specific application requirements. Would you like more detailed specifications of any of these options?`;
    }
    
    if (lowercaseQuery.includes('aws') && lowercaseQuery.includes('azure')) {
      return `Here's a comparison between AWS and Azure services:\n\n- **Compute**: AWS EC2 vs Azure Virtual Machines - similar capabilities, pricing varies by region\n- **Storage**: AWS S3 vs Azure Blob Storage - S3 has more tiers, Azure integrates better with Microsoft ecosystem\n- **Networking**: AWS VPC vs Azure VNET - Azure offers more built-in security features\n- **Databases**: AWS RDS vs Azure SQL - Both excellent, choice often depends on existing infrastructure\n\nAre you looking to compare any specific services in more detail?`;
    }
    
    if (lowercaseQuery.includes('network') || lowercaseQuery.includes('architecture')) {
      return `For a robust cloud network architecture, I recommend:\n\n1. Use a hub-and-spoke topology with a central VNet/VPC connected to multiple workload VNets/VPCs\n2. Implement network security groups and ACLs at multiple levels\n3. Use load balancers for highly available services\n4. Consider using a CDN for global content delivery\n5. Implement VPN or dedicated connections for hybrid scenarios\n\nWould you like me to diagram this architecture for you?`;
    }
    
    if (lowercaseQuery.includes('cost') || lowercaseQuery.includes('optimize')) {
      return `Here are strategies to optimize your cloud costs:\n\n1. Right-size your resources - many VMs are over-provisioned\n2. Use auto-scaling for variable workloads\n3. Leverage spot/preemptible instances for non-critical workloads\n4. Use reserved instances for predictable workloads (1-3 year commitments)\n5. Implement tagging for cost allocation\n6. Set up budgets and alerts\n\nI can help analyze your specific architecture for cost optimization opportunities.`;
    }
    
    // Default response
    return `I understand you're asking about "${query}". To provide the most helpful response, could you share more details about your specific requirements or use case? For example, what type of application are you building, what's your expected traffic or processing needs, and any specific compliance requirements you might have?`;
  };
  
  // Mock quick replies generator
  const getQuickReplies = (query: string): string[] => {
    const lowercaseQuery = query.toLowerCase();
    
    if (lowercaseQuery.includes('vm size') || lowercaseQuery.includes('instance type')) {
      return [
        'Tell me more about compute optimized options',
        'What\'s the pricing comparison?',
        'Which is best for a web application?',
      ];
    }
    
    if (lowercaseQuery.includes('aws') && lowercaseQuery.includes('azure')) {
      return [
        'Compare database services',
        'Which is more cost-effective?',
        'What about GCP alternatives?',
      ];
    }
    
    if (lowercaseQuery.includes('network') || lowercaseQuery.includes('architecture')) {
      return [
        'Yes, please diagram the architecture',
        'How do I secure this network?',
        'What about disaster recovery?',
      ];
    }
    
    // Default quick replies
    return [
      'Tell me about storage options',
      'How do I optimize for cost?',
      'What security best practices should I follow?',
    ];
  };
  
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">AI Assistant</Typography>
        
        <Box>
          <Tooltip title="Download chat history">
            <IconButton color="primary" sx={{ mr: 1 }}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Clear chat">
            <IconButton color="error" onClick={handleClearChat}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      <Paper
        sx={{
          flexGrow: 1,
          mb: 2,
          p: 2,
          height: 'calc(100vh - 240px)',
          overflow: 'auto',
          bgcolor: 'background.default',
        }}
      >
        <List>
          {messages.map((message) => (
            <ListItem
              key={message.id}
              sx={{
                flexDirection: 'column',
                alignItems: message.sender === 'user' ? 'flex-end' : 'flex-start',
                mb: 2,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  maxWidth: '80%',
                }}
              >
                {message.sender === 'ai' && (
                  <Avatar 
                    sx={{ 
                      mr: 1, 
                      bgcolor: 'primary.main',
                      width: 32,
                      height: 32,
                    }}
                  >
                    <AIIcon fontSize="small" />
                  </Avatar>
                )}
                
                <Paper
                  elevation={1}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: message.sender === 'user' ? 'primary.light' : 'background.paper',
                    color: message.sender === 'user' ? 'primary.contrastText' : 'text.primary',
                    maxWidth: '100%',
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {message.text}
                  </Typography>
                  
                  {message.sender === 'ai' && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                      <Tooltip title="Copy to clipboard">
                        <IconButton size="small" onClick={() => navigator.clipboard.writeText(message.text)}>
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                </Paper>
                
                {message.sender === 'user' && (
                  <Avatar 
                    sx={{ 
                      ml: 1, 
                      bgcolor: 'secondary.main',
                      width: 32,
                      height: 32,
                    }}
                  >
                    <PersonIcon fontSize="small" />
                  </Avatar>
                )}
              </Box>
              
              {message.quickReplies && message.quickReplies.length > 0 && (
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 1,
                    mt: 1,
                    maxWidth: '80%',
                  }}
                >
                  {message.quickReplies.map((reply, index) => (
                    <Chip
                      key={index}
                      label={reply}
                      variant="outlined"
                      color="primary"
                      size="small"
                      onClick={() => handleQuickReply(reply)}
                      sx={{ mb: 1 }}
                    />
                  ))}
                </Box>
              )}
              
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  alignSelf: message.sender === 'user' ? 'flex-end' : 'flex-start',
                  mt: 0.5,
                }}
              >
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Typography>
            </ListItem>
          ))}
          
          {isTyping && (
            <ListItem>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar 
                  sx={{ 
                    mr: 1, 
                    bgcolor: 'primary.main',
                    width: 32,
                    height: 32,
                  }}
                >
                  <AIIcon fontSize="small" />
                </Avatar>
                <Typography variant="body2" color="text.secondary">
                  AI is typing
                  <CircularProgress size={12} sx={{ ml: 1 }} />
                </Typography>
              </Box>
            </ListItem>
          )}
          
          <div ref={messagesEndRef} />
        </List>
      </Paper>
      
      <Paper
        component="form"
        sx={{
          p: '2px 4px',
          display: 'flex',
          alignItems: 'center',
          width: '100%',
        }}
        elevation={3}
      >
        <TextField
          fullWidth
          placeholder="Ask me about cloud architecture, services, best practices..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          inputRef={inputRef}
          multiline
          maxRows={4}
          sx={{ px: 1 }}
          InputProps={{
            disableUnderline: true,
            sx: { border: 'none' },
          }}
          variant="standard"
        />
        <Divider sx={{ height: 28, m: 0.5 }} orientation="vertical" />
        <IconButton
          color="primary"
          onClick={handleSend}
          disabled={!input.trim() || isTyping}
        >
          <SendIcon />
        </IconButton>
      </Paper>
    </Box>
  );
};

export default AIChat; 