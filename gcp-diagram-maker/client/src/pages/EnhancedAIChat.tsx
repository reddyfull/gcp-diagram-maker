import { useState, useRef, useEffect, useCallback } from 'react';
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
  Grid,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Send as SendIcon,
  AutoAwesome as AIIcon,
  Person as PersonIcon,
  Download as DownloadIcon,
  DeleteOutline as DeleteIcon,
  ContentCopy as CopyIcon,
  Save as SaveIcon,
  Code as CodeIcon,
  Architecture as DiagramIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { Edge, Node } from 'reactflow';
import DiagramEditor from '../components/diagram/DiagramEditor';
import { diagramService } from '../api/diagramService';

// Message type
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  quickReplies?: string[];
  relatedToDiagram?: boolean;
  diagramAction?: 'generate' | 'update' | 'none';
}

// Initial diagram elements
const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

const EnhancedAIChat = () => {
  // State
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I\'m your cloud infrastructure assistant. I can help you design architecture visually. Try asking me to create a diagram for your infrastructure needs.',
      sender: 'ai',
      timestamp: new Date(),
      quickReplies: [
        'Create a basic web application architecture',
        'Design a high availability infrastructure',
        'Show me a microservices architecture',
        'Design a secure data storage solution',
      ],
      relatedToDiagram: true,
      diagramAction: 'none',
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [diagramLoading, setDiagramLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{open: boolean, message: string, severity: 'success' | 'error' | 'info'}>({
    open: false,
    message: '',
    severity: 'info'
  });
  
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
  
  // Handle diagram change from editor
  const handleDiagramChange = useCallback((updatedNodes: Node[], updatedEdges: Edge[]) => {
    setNodes(updatedNodes);
    setEdges(updatedEdges);
  }, []);
  
  // Generate a diagram from the AI message
  const generateDiagramFromMessage = async (messageText: string) => {
    try {
      setDiagramLoading(true);
      const result = await diagramService.generateFromAIMessage(messageText);
      
      if (result.error) {
        setSnackbar({
          open: true,
          message: `Failed to generate diagram: ${result.error}`,
          severity: 'error'
        });
        return;
      }
      
      // Update the diagram
      setNodes(result.nodes);
      setEdges(result.edges);
      
      setSnackbar({
        open: true,
        message: 'Diagram generated successfully!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error generating diagram:', error);
      setSnackbar({
        open: true,
        message: 'Failed to generate diagram',
        severity: 'error'
      });
    } finally {
      setDiagramLoading(false);
    }
  };
  
  // Update diagram based on AI suggestions
  const updateDiagramFromMessage = async (messageText: string) => {
    try {
      setDiagramLoading(true);
      const currentDiagram = { nodes, edges };
      const result = await diagramService.updateFromAISuggestion(currentDiagram, messageText);
      
      if (result.error) {
        setSnackbar({
          open: true,
          message: `Failed to update diagram: ${result.error}`,
          severity: 'error'
        });
        return;
      }
      
      // Update the diagram
      setNodes(result.nodes);
      setEdges(result.edges);
      
      setSnackbar({
        open: true,
        message: 'Diagram updated successfully!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error updating diagram:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update diagram',
        severity: 'error'
      });
    } finally {
      setDiagramLoading(false);
    }
  };
  
  // Generate Terraform code from the current diagram
  const generateTerraformCode = async () => {
    try {
      const currentDiagram = { nodes, edges };
      if (nodes.length === 0) {
        setSnackbar({
          open: true,
          message: 'Cannot generate code from an empty diagram',
          severity: 'error'
        });
        return;
      }
      
      setIsTyping(true);
      const result = await diagramService.generateTerraform(currentDiagram);
      
      // Add the code as a new AI message
      const aiMessage: Message = {
        id: Date.now().toString(),
        text: `Here's the Terraform code for your diagram:\n\n\`\`\`terraform\n${result.code}\n\`\`\``,
        sender: 'ai',
        timestamp: new Date(),
        relatedToDiagram: true,
        diagramAction: 'none',
      };
      
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
      
    } catch (error) {
      console.error('Error generating Terraform:', error);
      setSnackbar({
        open: true,
        message: 'Failed to generate Terraform code',
        severity: 'error'
      });
      setIsTyping(false);
    }
  };
  
  // Generate ARM template from the current diagram
  const generateARMTemplate = async () => {
    try {
      const currentDiagram = { nodes, edges };
      if (nodes.length === 0) {
        setSnackbar({
          open: true,
          message: 'Cannot generate code from an empty diagram',
          severity: 'error'
        });
        return;
      }
      
      setIsTyping(true);
      const result = await diagramService.generateARM(currentDiagram);
      
      // Add the code as a new AI message
      const aiMessage: Message = {
        id: Date.now().toString(),
        text: `Here's the ARM template for your diagram:\n\n\`\`\`json\n${result.code}\n\`\`\``,
        sender: 'ai',
        timestamp: new Date(),
        relatedToDiagram: true,
        diagramAction: 'none',
      };
      
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
      
    } catch (error) {
      console.error('Error generating ARM template:', error);
      setSnackbar({
        open: true,
        message: 'Failed to generate ARM template',
        severity: 'error'
      });
      setIsTyping(false);
    }
  };
  
  // Save the current diagram
  const saveDiagram = async () => {
    try {
      const currentDiagram = { nodes, edges };
      if (nodes.length === 0) {
        setSnackbar({
          open: true,
          message: 'Cannot save an empty diagram',
          severity: 'error'
        });
        return;
      }
      
      const result = await diagramService.saveDiagram(currentDiagram, 'AI Generated Diagram');
      
      setSnackbar({
        open: true,
        message: `Diagram saved successfully with ID: ${result.id}`,
        severity: 'success'
      });
      
    } catch (error) {
      console.error('Error saving diagram:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save diagram',
        severity: 'error'
      });
    }
  };
  
  // Get a description of the current diagram
  const describeDiagram = async () => {
    try {
      const currentDiagram = { nodes, edges };
      if (nodes.length === 0) {
        setSnackbar({
          open: true,
          message: 'Cannot describe an empty diagram',
          severity: 'error'
        });
        return;
      }
      
      setIsTyping(true);
      const result = await diagramService.generateDescription(currentDiagram);
      
      // Add the description as a new AI message
      const aiMessage: Message = {
        id: Date.now().toString(),
        text: `**Description of your infrastructure diagram:**\n\n${result.description}`,
        sender: 'ai',
        timestamp: new Date(),
        relatedToDiagram: true,
        diagramAction: 'none',
      };
      
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
      
    } catch (error) {
      console.error('Error describing diagram:', error);
      setSnackbar({
        open: true,
        message: 'Failed to generate diagram description',
        severity: 'error'
      });
      setIsTyping(false);
    }
  };
  
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
    
    // Process the message to determine if it's diagram-related
    const lowercaseInput = input.toLowerCase();
    const isDiagramRelated = 
      lowercaseInput.includes('diagram') || 
      lowercaseInput.includes('architecture') ||
      lowercaseInput.includes('infrastructure') ||
      lowercaseInput.includes('design') ||
      lowercaseInput.includes('create') ||
      lowercaseInput.includes('build') ||
      lowercaseInput.includes('show me');
    
    const isUpdateRequest =
      lowercaseInput.includes('update') ||
      lowercaseInput.includes('modify') ||
      lowercaseInput.includes('change') ||
      lowercaseInput.includes('add') ||
      lowercaseInput.includes('remove');
    
    // Simulate AI response
    setTimeout(() => {
      // Create AI response
      const response = getAIResponse(input);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.text,
        sender: 'ai',
        timestamp: new Date(),
        quickReplies: response.quickReplies,
        relatedToDiagram: isDiagramRelated,
        diagramAction: response.diagramAction,
      };
      
      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
      
      // Generate or update diagram if needed
      if (isDiagramRelated) {
        if (nodes.length === 0 || response.diagramAction === 'generate') {
          // Generate new diagram
          generateDiagramFromMessage(response.text);
        } else if (isUpdateRequest || response.diagramAction === 'update') {
          // Update existing diagram
          updateDiagramFromMessage(response.text);
        }
      }
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
          'Create a basic web application architecture',
          'Design a high availability infrastructure',
          'Show me a microservices architecture',
        ],
        relatedToDiagram: true,
        diagramAction: 'none',
      },
    ]);
  };
  
  // Reset diagram
  const handleResetDiagram = () => {
    setNodes([]);
    setEdges([]);
    
    setSnackbar({
      open: true,
      message: 'Diagram has been reset',
      severity: 'info'
    });
  };
  
  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };
  
  // Mock AI response generator
  const getAIResponse = (query: string): { text: string, quickReplies: string[], diagramAction: 'generate' | 'update' | 'none' } => {
    const lowercaseQuery = query.toLowerCase();
    
    // Web application architecture request
    if (
      (lowercaseQuery.includes('web') && lowercaseQuery.includes('application')) || 
      (lowercaseQuery.includes('basic') && lowercaseQuery.includes('architecture'))
    ) {
      return {
        text: `I'll create a basic web application architecture diagram for you. This architecture includes:\n\n1. **Frontend**: Web servers in an auto-scaling group behind a load balancer\n2. **Application Tier**: Application servers that handle business logic\n3. **Database Tier**: A primary database with a replica for redundancy\n4. **Storage**: Object storage for static assets\n\nThis is a three-tier architecture pattern that separates concerns and allows each layer to scale independently.`,
        quickReplies: [
          'Add a CDN to this architecture',
          'Make this architecture highly available',
          'Generate Terraform code for this',
          'How much would this cost to run?'
        ],
        diagramAction: 'generate'
      };
    }
    
    // High availability request
    if (lowercaseQuery.includes('high availability') || lowercaseQuery.includes('ha') || lowercaseQuery.includes('fault tolerant')) {
      return {
        text: `Here's a high availability infrastructure design that spans multiple availability zones:\n\n1. **Load Balancers**: Distribute traffic across multiple zones\n2. **Web/App Tier**: Auto-scaling groups in multiple AZs\n3. **Database**: Primary-secondary setup with automatic failover\n4. **Storage**: Replicated across zones\n5. **Network**: Redundant connections and security groups\n\nThis design eliminates single points of failure and can handle zone outages without service disruption.`,
        quickReplies: [
          'Add disaster recovery to another region',
          'Optimize this for cost efficiency',
          'Generate Terraform code for this',
          'What monitoring would you recommend?'
        ],
        diagramAction: 'generate'
      };
    }
    
    // Microservices request
    if (lowercaseQuery.includes('microservices')) {
      return {
        text: `I've designed a microservices architecture with the following components:\n\n1. **API Gateway**: Entry point for all client requests\n2. **Service Mesh**: For service-to-service communication\n3. **Microservices**: Individual containerized services\n4. **Data Stores**: Separate databases for each service\n5. **Event Bus**: For asynchronous communication\n6. **CI/CD Pipeline**: For continuous deployment\n\nThis architecture enables independent scaling and deployment of services, improving resilience and development velocity.`,
        quickReplies: [
          'How would you implement service discovery?',
          'What about monitoring microservices?',
          'Generate Kubernetes manifests for this',
          'How to handle data consistency?'
        ],
        diagramAction: 'generate'
      };
    }
    
    // Secure data storage request
    if (
      (lowercaseQuery.includes('secure') && lowercaseQuery.includes('storage')) || 
      (lowercaseQuery.includes('data') && lowercaseQuery.includes('security'))
    ) {
      return {
        text: `I've created a secure data storage architecture with these security layers:\n\n1. **Network Security**: VPC with private subnets and security groups\n2. **Access Control**: IAM roles and policies with least privilege\n3. **Encryption**: Data encrypted at rest and in transit\n4. **Monitoring**: Audit logging and anomaly detection\n5. **Backup**: Encrypted backups with point-in-time recovery\n\nThis design follows defense-in-depth principles to protect sensitive data at multiple levels.`,
        quickReplies: [
          'How would you handle key management?',
          'Add compliance controls for GDPR',
          'What about data loss prevention?',
          'Generate security policy documents'
        ],
        diagramAction: 'generate'
      };
    }
    
    // Add CDN request
    if (lowercaseQuery.includes('add') && lowercaseQuery.includes('cdn')) {
      return {
        text: `I've updated the architecture to include a CDN:\n\n1. Added a **Content Delivery Network** in front of the web tier\n2. Connected it to the storage for static assets\n3. Updated the load balancer configuration\n4. Added cache invalidation flow\n\nThe CDN will cache static content close to users, improving load times and reducing the load on your origin servers. This is especially beneficial for global audiences.`,
        quickReplies: [
          "What is the cost impact of adding a CDN?",
          'How to configure CDN caching rules?',
          'Add WAF protection to the CDN',
          'Generate updated Terraform code'
        ],
        diagramAction: 'update'
      };
    }
    
    // Terraform code request
    if (lowercaseQuery.includes('terraform') || lowercaseQuery.includes('iac') || lowercaseQuery.includes('code')) {
      return {
        text: `I can generate Terraform code based on the current infrastructure diagram. The code will include:\n\n1. Provider configuration\n2. Networking resources (VPC, subnets, etc.)\n3. Compute resources (VMs, containers, etc.)\n4. Storage and database resources\n5. Security groups and IAM policies\n\nWould you like me to generate the Terraform code now?`,
        quickReplies: [
          'Yes, generate Terraform code',
          'No, modify the diagram first',
          'Generate ARM template instead',
          'Add more details to the diagram'
        ],
        diagramAction: 'none'
      };
    }
    
    // Default response
    return {
      text: `I understand you're interested in creating a cloud infrastructure design. I can help visualize your requirements as a diagram.\n\nTo get started, could you tell me more about:\n\n1. What type of application you're hosting?\n2. Any specific requirements (high availability, security, etc.)?\n3. Your preferred cloud provider (AWS, Azure, GCP)?\n\nOr I can create a sample architecture if you prefer.`,
      quickReplies: [
        'Create a basic web application architecture',
        'Design a high availability infrastructure',
        'Show me a microservices architecture',
        'Design a secure data storage solution'
      ],
      diagramAction: 'none'
    };
  };
  
  return (
    <Box sx={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">AI Cloud Architect</Typography>
        
        <Box>
          <Tooltip title="Save Diagram">
            <IconButton color="primary" sx={{ mr: 1 }} onClick={saveDiagram}>
              <SaveIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Generate Terraform">
            <IconButton color="primary" sx={{ mr: 1 }} onClick={generateTerraformCode}>
              <CodeIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Reset Diagram">
            <IconButton color="secondary" sx={{ mr: 1 }} onClick={handleResetDiagram}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Clear Chat">
            <IconButton color="error" onClick={handleClearChat}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      <Grid container spacing={2} sx={{ flexGrow: 1 }}>
        {/* Chat Panel */}
        <Grid item xs={12} md={6} sx={{ height: '100%' }}>
          <Paper
            sx={{
              height: 'calc(100vh - 170px)',
              display: 'flex',
              flexDirection: 'column',
              bgcolor: 'background.default',
            }}
          >
            <Box
              sx={{
                flexGrow: 1,
                overflow: 'auto',
                p: 2,
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
                        maxWidth: '85%',
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
                            <Tooltip title="Apply to diagram">
                              <span>
                                <IconButton 
                                  size="small" 
                                  onClick={() => message.relatedToDiagram && generateDiagramFromMessage(message.text)}
                                  disabled={!message.relatedToDiagram}
                                >
                                  <DiagramIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
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
                          maxWidth: '85%',
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
            </Box>
            
            <Paper
              component="form"
              sx={{
                p: '2px 4px',
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                mt: 'auto',
              }}
              elevation={3}
            >
              <TextField
                fullWidth
                placeholder="Describe your infrastructure needs or ask about the diagram..."
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
          </Paper>
        </Grid>
        
        {/* Diagram Panel */}
        <Grid item xs={12} md={6} sx={{ height: '100%' }}>
          <Paper
            sx={{
              height: 'calc(100vh - 170px)',
              position: 'relative',
              bgcolor: 'background.default',
            }}
          >
            {diagramLoading && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'rgba(255, 255, 255, 0.7)',
                  zIndex: 10,
                }}
              >
                <CircularProgress />
                <Typography variant="body1" sx={{ ml: 2 }}>
                  Updating diagram...
                </Typography>
              </Box>
            )}
            
            <DiagramEditor
              initialDiagram={{ nodes, edges }}
              onDiagramChange={handleDiagramChange}
            />
          </Paper>
        </Grid>
      </Grid>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EnhancedAIChat; 