import { useState } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  LinearProgress, 
  Alert, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Paper, 
  SelectChangeEvent
} from '@mui/material';
import { 
  CloudUpload as CloudUploadIcon,
  Folder as FolderIcon
} from '@mui/icons-material';
import { uploadService } from '../api/uploadService';

const IconUploader = () => {
  // State
  const [file, setFile] = useState<File | null>(null);
  const [provider, setProvider] = useState<'azure' | 'aws' | 'gcp'>('azure');
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  
  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;
    
    if (selectedFile) {
      // Validate file type (must be ZIP)
      if (!selectedFile.name.toLowerCase().endsWith('.zip')) {
        setError('Only ZIP files are supported. Please select a .zip file.');
        setFile(null);
        return;
      }
      
      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File is too large. Maximum size is 10MB.');
        setFile(null);
        return;
      }
      
      // Clear previous states
      setError(null);
      setSuccess(null);
      setUploadedFiles([]);
      setFile(selectedFile);
    }
  };
  
  // Handle provider change
  const handleProviderChange = (event: SelectChangeEvent<string>) => {
    setProvider(event.target.value as 'azure' | 'aws' | 'gcp');
  };
  
  // Handle upload
  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }
    
    try {
      setIsUploading(true);
      setProgress(0);
      setError(null);
      setSuccess(null);
      
      // Call the upload service
      const result = await uploadService.uploadIcons(
        file,
        provider,
        (progress) => setProgress(progress)
      );
      
      // Handle success
      setSuccess(`Successfully uploaded ${result.uploadedFiles.length} icons`);
      setUploadedFiles(result.uploadedFiles);
      
      // Check for errors in some files
      if (result.errors && result.errors.length > 0) {
        setError(`${result.errors.length} icons failed to upload. See console for details.`);
        console.error('Upload errors:', result.errors);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload icons. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
      setFile(null);
      // Reset the file input
      const fileInput = document.getElementById('icon-upload-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }
  };
  
  return (
    <Paper 
      elevation={0} 
      variant="outlined" 
      sx={{ 
        p: 3, 
        borderRadius: 2,
        maxWidth: 800,
        mx: 'auto'
      }}
    >
      <Typography variant="h5" gutterBottom>
        Upload Icons
      </Typography>
      
      <Typography variant="body2" color="text.secondary" paragraph>
        Upload ZIP files containing cloud provider icons. Icons will be stored in Google Cloud Storage with metadata in MongoDB Atlas.
      </Typography>
      
      {/* Provider Selection */}
      <FormControl fullWidth margin="normal">
        <InputLabel id="provider-label">Cloud Provider</InputLabel>
        <Select
          labelId="provider-label"
          id="provider-select"
          value={provider}
          label="Cloud Provider"
          onChange={handleProviderChange}
          disabled={isUploading}
        >
          <MenuItem value="azure">Microsoft Azure</MenuItem>
          <MenuItem value="aws">Amazon Web Services</MenuItem>
          <MenuItem value="gcp">Google Cloud Platform</MenuItem>
        </Select>
      </FormControl>
      
      {/* File Upload Input */}
      <Box sx={{ mt: 2, mb: 2 }}>
        <input
          id="icon-upload-input"
          type="file"
          accept=".zip"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          disabled={isUploading}
        />
        <label htmlFor="icon-upload-input">
          <Button
            component="span"
            variant="outlined"
            startIcon={<FolderIcon />}
            disabled={isUploading}
            fullWidth
            sx={{ 
              py: 2, 
              border: '1px dashed',
              borderColor: 'divider',
              borderRadius: 1,
              textTransform: 'none',
            }}
          >
            Select ZIP file
          </Button>
        </label>
      </Box>
      
      {/* Selected File Info */}
      {file && (
        <Box sx={{ mt: 1, mb: 2 }}>
          <Typography variant="body2">
            Selected file: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(2)} KB)
          </Typography>
        </Box>
      )}
      
      {/* Upload Button */}
      <Button
        variant="contained"
        color="primary"
        startIcon={<CloudUploadIcon />}
        onClick={handleUpload}
        disabled={!file || isUploading}
        sx={{ mt: 2, mb: 2 }}
      >
        {isUploading ? 'Uploading...' : 'Upload Icons'}
      </Button>
      
      {/* Progress Bar */}
      {isUploading && (
        <Box sx={{ mt: 1, mb: 2 }}>
          <LinearProgress variant="determinate" value={progress} />
          <Typography variant="body2" align="center" sx={{ mt: 1 }}>
            {progress}% Uploaded
          </Typography>
        </Box>
      )}
      
      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      
      {/* Success Message */}
      {success && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {success}
        </Alert>
      )}
      
      {/* Uploaded Files Summary */}
      {uploadedFiles.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Uploaded Files ({uploadedFiles.length})
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, maxHeight: 200, overflow: 'auto' }}>
            {uploadedFiles.slice(0, 10).map((file, index) => (
              <Typography key={index} variant="body2">
                {file.displayName || file.filename} - {file.category}
              </Typography>
            ))}
            {uploadedFiles.length > 10 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                And {uploadedFiles.length - 10} more...
              </Typography>
            )}
          </Paper>
        </Box>
      )}
    </Paper>
  );
};

export default IconUploader; 