import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Grid, Paper, Typography, Button, CircularProgress, Snackbar, Alert, Tabs, Tab } from '@mui/material';

// Import the CodeEditor component with a try-catch fallback
let CodeEditor: any;
try {
  CodeEditor = require('@uiw/react-textarea-code-editor').default;
} catch (e) {
  // Fallback to a textarea if the CodeEditor package is not available
  CodeEditor = ({ value, onChange, style }: any) => (
    <textarea 
      value={value} 
      onChange={(e) => onChange({ target: { value: e.target.value } })}
      style={{ 
        width: '100%', 
        minHeight: '300px', 
        fontFamily: 'monospace',
        ...style 
      }}
    />
  );
}

import DiagramEditor from './DiagramEditor';

// Import Mermaid with a try-catch fallback
let Mermaid: any;
try {
  Mermaid = require('react-mermaid2').default;
} catch (e) {
  // Fallback component if Mermaid is not available
  Mermaid = ({ chart }: any) => (
    <div style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}>
      <pre>{chart}</pre>
    </div>
  );
}

import axios from 'axios';
import debounce from 'lodash.debounce';

// Define API base URL
const API_BASE_URL = 'http://localhost:3001/api';

// Types
import { Edge } from 'reactflow';
import { DiagramNode } from './DiagramEditor';

interface SyncedDiagramCodeProps {
  sessionId: string;
  initialDiagram?: string;
  initialCode?: {
    filename: string;
    content: string;
  }[];
}

interface FileTab {
  filename: string;
  content: string;
  language: string;
}

const SyncedDiagramCode: React.FC<SyncedDiagramCodeProps> = ({ 
  sessionId, 
  initialDiagram, 
  initialCode = [] 
}) => {
  // State for diagram
  const [mermaidCode, setMermaidCode] = useState<string>(initialDiagram || '');
  const [diagramNodes, setDiagramNodes] = useState<DiagramNode[]>([]);
  const [diagramEdges, setDiagramEdges] = useState<Edge[]>([]);
  
  // State for code files
  const [files, setFiles] = useState<FileTab[]>(
    initialCode.map(file => ({
      filename: file.filename,
      content: file.content,
      language: getLanguageFromFilename(file.filename)
    }))
  );
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [aiListening, setAiListening] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  
  // Refs for tracking changes
  const lastDiagramUpdate = useRef<Date | null>(null);
  const lastCodeUpdate = useRef<Date | null>(null);
  const syncInProgress = useRef(false);
  
  // Helper function to determine the language for syntax highlighting
  function getLanguageFromFilename(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'tf':
      case 'tfvars':
        return 'terraform';
      case 'json':
        return 'json';
      case 'yaml':
      case 'yml':
        return 'yaml';
      case 'sh':
        return 'bash';
      default:
        return 'plaintext';
    }
  }
  
  // Debounced function to update code based on diagram changes
  const updateCodeFromDiagram = useCallback(debounce(async (diagram: string) => {
    if (syncInProgress.current) return;
    
    try {
      syncInProgress.current = true;
      setLoading(true);
      
      const response = await axios.post(`${API_BASE_URL}/ai/diagram/sessions/${sessionId}/update-diagram`, {
        mermaid_code: diagram
      });
      
      if (response.data.needs_code_update) {
        // Fetch updated code
        await fetchCode();
      }
      
      setSuccess('Diagram updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating code from diagram:', err);
      setError('Failed to update code from diagram');
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
      syncInProgress.current = false;
    }
  }, 1000), [sessionId]);
  
  // Debounced function to update diagram based on code changes
  const updateDiagramFromCode = useCallback(debounce(async (updatedFiles: FileTab[]) => {
    if (syncInProgress.current) return;
    
    try {
      syncInProgress.current = true;
      setLoading(true);
      
      const response = await axios.post(`${API_BASE_URL}/ai/diagram/sessions/${sessionId}/update-code`, {
        files: updatedFiles.map(file => ({
          filename: file.filename,
          content: file.content
        }))
      });
      
      if (response.data.needs_diagram_update) {
        // Fetch updated diagram
        await fetchDiagram();
      }
      
      setSuccess('Code updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating diagram from code:', err);
      setError('Failed to update diagram from code');
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
      syncInProgress.current = false;
    }
  }, 1000), [sessionId]);
  
  // AI listening for code changes
  const aiAnalyzeChanges = useCallback(debounce(async (code: string, filename: string) => {
    if (!aiListening) return;
    
    try {
      const response = await axios.post(`${API_BASE_URL}/ai/diagram/sessions/${sessionId}/ai-suggest`, {
        code,
        filename
      });
      
      if (response.data.suggestions) {
        setAiSuggestion(response.data.suggestions);
      }
    } catch (err) {
      console.error('Error getting AI suggestions:', err);
    }
  }, 1500), [sessionId, aiListening]);
  
  // Fetch updated diagram from server
  const fetchDiagram = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/ai/diagram/sessions/${sessionId}`);
      if (response.data.mermaid_diagram) {
        setMermaidCode(response.data.mermaid_diagram);
      }
    } catch (err) {
      console.error('Error fetching diagram:', err);
    }
  };
  
  // Fetch updated code from server
  const fetchCode = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/ai/diagram/sessions/${sessionId}`);
      if (response.data.infrastructure_code && response.data.infrastructure_code.length > 0) {
        setFiles(response.data.infrastructure_code.map((file: any) => ({
          filename: file.filename,
          content: file.content,
          language: getLanguageFromFilename(file.filename)
        })));
      }
    } catch (err) {
      console.error('Error fetching code:', err);
    }
  };
  
  // Handle code changes
  const handleCodeChange = (value: string, index: number) => {
    lastCodeUpdate.current = new Date();
    
    // Update the file content
    const updatedFiles = [...files];
    updatedFiles[index] = {
      ...updatedFiles[index],
      content: value
    };
    setFiles(updatedFiles);
    
    // Trigger diagram update
    updateDiagramFromCode(updatedFiles);
    
    // Trigger AI analysis
    aiAnalyzeChanges(value, updatedFiles[index].filename);
  };
  
  // Handle diagram changes
  const handleDiagramChange = (diagram: string) => {
    lastDiagramUpdate.current = new Date();
    setMermaidCode(diagram);
    
    // Trigger code update
    updateCodeFromDiagram(diagram);
  };
  
  // Handle AI suggestion application
  const applyAiSuggestion = () => {
    if (!aiSuggestion || activeFileIndex === -1) return;
    
    const updatedFiles = [...files];
    updatedFiles[activeFileIndex] = {
      ...updatedFiles[activeFileIndex],
      content: aiSuggestion
    };
    setFiles(updatedFiles);
    setAiSuggestion(null);
    
    // Trigger diagram update
    updateDiagramFromCode(updatedFiles);
  };
  
  // Toggle AI listening
  const toggleAiListening = () => {
    setAiListening(!aiListening);
    if (!aiListening) {
      setSuccess('AI assistant is now listening for changes');
    } else {
      setSuccess('AI assistant paused');
    }
    setTimeout(() => setSuccess(null), 3000);
  };
  
  return (
    <Box sx={{ width: '100%', height: 'calc(100vh - 100px)' }}>
      <Grid container spacing={2} sx={{ height: '100%' }}>
        {/* Diagram Panel */}
        <Grid item xs={12} md={6} sx={{ height: '100%' }}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 2, 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <Typography variant="h6" gutterBottom>
              Infrastructure Diagram
              {loading && (
                <CircularProgress size={20} sx={{ ml: 2 }} />
              )}
            </Typography>
            
            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
              <Mermaid
                chart={mermaidCode}
                config={{
                  theme: 'default',
                  securityLevel: 'loose'
                }}
              />
            </Box>
          </Paper>
        </Grid>
        
        {/* Code Panel */}
        <Grid item xs={12} md={6} sx={{ height: '100%' }}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 2, 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs 
                value={activeFileIndex} 
                onChange={(_, newValue) => setActiveFileIndex(newValue)}
                variant="scrollable"
                scrollButtons="auto"
              >
                {files.map((file, index) => (
                  <Tab key={index} label={file.filename} />
                ))}
              </Tabs>
            </Box>
            
            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
              {files.length > 0 && activeFileIndex >= 0 && activeFileIndex < files.length && (
                <CodeEditor
                  value={files[activeFileIndex].content}
                  language={files[activeFileIndex].language}
                  onChange={(e) => handleCodeChange(e.target.value, activeFileIndex)}
                  padding={15}
                  style={{
                    fontSize: 14,
                    backgroundColor: "#f5f5f5",
                    fontFamily: 'ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace',
                    minHeight: '100%'
                  }}
                />
              )}
            </Box>
            
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
              <Button 
                variant={aiListening ? "contained" : "outlined"} 
                color={aiListening ? "success" : "primary"}
                onClick={toggleAiListening}
              >
                {aiListening ? "AI Listening (On)" : "AI Listening (Off)"}
              </Button>
              
              {aiSuggestion && (
                <Button 
                  variant="contained" 
                  color="secondary"
                  onClick={applyAiSuggestion}
                >
                  Apply AI Suggestion
                </Button>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Notifications */}
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
      >
        <Alert severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
      
      <Snackbar 
        open={!!success} 
        autoHideDuration={3000} 
        onClose={() => setSuccess(null)}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SyncedDiagramCode; 