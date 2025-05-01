import React, { useState, useCallback } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  CircularProgress, 
  Alert, 
  Container, 
  Card,
  CardContent,
  IconButton,
  Divider
} from '@mui/material';
import { useDropzone } from 'react-dropzone';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Set the base URL for API requests
const API_BASE_URL = 'http://localhost:3001/api';

const DiagramUpload: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedDiagramId, setUploadedDiagramId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const navigate = useNavigate();
  
  // Handle file drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Only accept PNG, JPEG, and SVG files
    const validFiles = acceptedFiles.filter(file => 
      file.type === 'image/png' || 
      file.type === 'image/jpeg' || 
      file.type === 'image/svg+xml'
    );
    
    if (validFiles.length < acceptedFiles.length) {
      setError('Some files were rejected. Only PNG, JPEG, and SVG files are supported.');
    } else if (validFiles.length > 0) {
      setError(null);
    }
    
    setFiles(validFiles);
  }, []);
  
  // File dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'image/png': ['.png'], 
      'image/jpeg': ['.jpg', '.jpeg'], 
      'image/svg+xml': ['.svg']
    },
    maxFiles: 1
  });
  
  // Handle upload
  const handleUpload = async () => {
    if (files.length === 0) return;
    
    try {
      setUploading(true);
      setUploadProgress(0);
      
      const formData = new FormData();
      formData.append('diagram', files[0]);
      
      const response = await axios.post(`${API_BASE_URL}/upload/diagram`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: progressEvent => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        },
      });
      
      if (response.data.success) {
        setUploadedDiagramId(response.data.diagramId);
        setError(null);
      } else {
        setError(response.data.error || 'Failed to upload diagram');
      }
    } catch (err: any) {
      console.error('Error uploading diagram:', err);
      setError(`Failed to upload diagram: ${err.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };
  
  // Start analysis
  const handleAnalyze = async () => {
    if (!uploadedDiagramId) return;
    
    setAnalyzing(true);
    setAnalysisError(null);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/ai/diagram/analyze`, {
        diagram_id: uploadedDiagramId
      });
      
      if (response.data.success) {
        setSessionId(response.data.session_id);
        setError(null);
        navigate(`/diagram/session/${response.data.session_id}`);
      } else {
        setError(response.data.error || 'Failed to analyze diagram');
      }
    } catch (error: any) {
      console.error('Error analyzing diagram:', error);
      setAnalysisError(error.response?.data?.error || error.message || 'Network error');
    } finally {
      setAnalyzing(false);
    }
  };
  
  // Clear the current files
  const handleClear = () => {
    setFiles([]);
    setUploadedDiagramId(null);
    setSessionId(null);
    setError(null);
    setAnalysisError(null);
  };
  
  // Navigate to session
  const handleContinue = () => {
    if (sessionId) {
      navigate(`/diagram/session/${sessionId}`);
    }
  };
  
  return (
    <>
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Upload Infrastructure Diagram
        </Typography>
        
        <Typography variant="body1" paragraph>
          Upload your infrastructure diagram (PNG, JPEG, or SVG) for AI analysis. 
          Our system will identify components and generate infrastructure code.
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {!uploadedDiagramId ? (
          <Paper
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: isDragActive ? 'action.hover' : 'background.paper',
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'divider',
              mb: 3
            }}
            {...getRootProps()}
          >
            <input {...getInputProps()} />
            
            <Box sx={{ textAlign: 'center' }}>
              <CloudUploadIcon color="primary" sx={{ fontSize: 72, mb: 2 }} />
              
              <Typography variant="h6" gutterBottom>
                {isDragActive
                  ? 'Drop your diagram here...'
                  : 'Drag & drop your diagram here, or click to select'}
              </Typography>
              
              <Typography variant="body2" color="text.secondary">
                Supported formats: PNG, JPEG, SVG
              </Typography>
            </Box>
          </Paper>
        ) : (
          <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CloudDoneIcon color="success" sx={{ fontSize: 48, mr: 2 }} />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6">
                  Diagram uploaded successfully
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ID: {uploadedDiagramId}
                </Typography>
              </Box>
              <IconButton onClick={handleClear} color="error">
                <DeleteIcon />
              </IconButton>
            </Box>
          </Paper>
        )}
        
        {files.length > 0 && !uploadedDiagramId && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Box sx={{ flexGrow: 1 }}>
                {files.map(file => (
                  <Typography key={file.name}>
                    {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </Typography>
                ))}
              </Box>
              <IconButton onClick={handleClear} color="error">
                <DeleteIcon />
              </IconButton>
            </Box>
            
            <Button
              variant="contained"
              color="primary"
              startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
              onClick={handleUpload}
              disabled={uploading}
              fullWidth
            >
              {uploading ? `Uploading (${uploadProgress}%)` : 'Upload Diagram'}
            </Button>
          </Box>
        )}
        
        {uploadedDiagramId && !sessionId && (
          <Button
            variant="contained"
            color="secondary"
            startIcon={analyzing ? <CircularProgress size={20} color="inherit" /> : <AnalyticsIcon />}
            onClick={handleAnalyze}
            disabled={analyzing}
            fullWidth
            sx={{ mb: 3 }}
          >
            {analyzing ? 'Analyzing Diagram...' : 'Analyze Diagram with AI'}
          </Button>
        )}
        
        {sessionId && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Analysis Complete
              </Typography>
              
              <Typography variant="body2" paragraph>
                Your diagram has been analyzed successfully. Continue to the next steps to refine and explore the results.
              </Typography>
              
              <Button
                variant="contained"
                color="primary"
                onClick={handleContinue}
                fullWidth
              >
                Continue to Results
              </Button>
            </CardContent>
          </Card>
        )}
        
        <Divider sx={{ mb: 3 }} />
        
        <Typography variant="h5" gutterBottom>
          How it works
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                1. Upload
              </Typography>
              <Typography variant="body2">
                Upload your infrastructure diagram in PNG, JPEG, or SVG format.
              </Typography>
            </CardContent>
          </Card>
          
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="h6" color="secondary" gutterBottom>
                2. Analyze
              </Typography>
              <Typography variant="body2">
                Our AI analyzes the diagram to identify components and relationships.
              </Typography>
            </CardContent>
          </Card>
          
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="h6" color="success.main" gutterBottom>
                3. Generate
              </Typography>
              <Typography variant="body2">
                Generate infrastructure code (Terraform, ARM, CloudFormation) and interactive diagrams.
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Container>
    </>
  );
};

export default DiagramUpload; 