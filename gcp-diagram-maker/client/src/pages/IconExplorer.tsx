import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Button,
  CircularProgress,
  Divider,
  Alert,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Category as CategoryIcon,
  Delete as DeleteIcon,
  CloudUpload as CloudUploadIcon,
  FilterList as FilterListIcon,
  BrokenImage as BrokenImageIcon,
} from '@mui/icons-material';
import { mongodbService } from '../api/mongodb';
import IconUploader from '../components/IconUploader';

// IconExplorer component
const IconExplorer = () => {
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [icons, setIcons] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [activeProvider, setActiveProvider] = useState<string>('azure');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showUploader, setShowUploader] = useState(false);
  const [mongodbAvailable, setMongodbAvailable] = useState(false);
  const [imageErrors, setImageErrors] = useState<{[key: string]: boolean}>({});
  
  // Function to check if a URL is absolute
  const isAbsoluteUrl = (url: string): boolean => {
    return /^(?:https?:)?\/\//.test(url);
  };
  
  // Handle image loading error
  const handleImageError = (iconId: string): void => {
    setImageErrors(prev => ({
      ...prev,
      [iconId]: true
    }));
    console.error(`Failed to load icon image: ${iconId}`);
  };
  
  // Load icons when component mounts or provider changes
  useEffect(() => {
    loadIcons();
    checkCapabilities();
  }, [activeProvider]);
  
  // Check server capabilities
  const checkCapabilities = async () => {
    try {
      const capabilities = await mongodbService.checkCapabilities();
      setMongodbAvailable(capabilities.mongodb);
    } catch (error) {
      console.error('Error checking capabilities:', error);
      setMongodbAvailable(false);
    }
  };
  
  // Load icons from the server
  const loadIcons = async () => {
    try {
      setLoading(true);
      setError(null);
      setImageErrors({});
      
      const data = await mongodbService.getIcons(activeProvider);
      console.log(`Loaded ${data.icons?.length || 0} icons for provider: ${activeProvider}`, data);
      
      setIcons(data.icons || []);
      setCategories(data.categories || []);
      
      // Default to 'all' or first category if available
      setActiveCategory('all');
    } catch (err: any) {
      setError(err.message || 'Failed to load icons');
      console.error('Error loading icons:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle provider change
  const handleProviderChange = (_event: React.SyntheticEvent, newValue: string) => {
    setActiveProvider(newValue);
  };
  
  // Handle category change
  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
  };
  
  // Handle search input change
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };
  
  // Filter icons by category and search term
  const filteredIcons = icons.filter(icon => {
    const matchesCategory = activeCategory === 'all' || icon.category === activeCategory;
    const matchesSearch = icon.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        icon.filename.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });
  
  // Render icon grid
  const renderIconGrid = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      );
    }
    
    if (error) {
      return (
        <Alert severity="error" sx={{ my: 2 }}>
          {error}
        </Alert>
      );
    }
    
    if (filteredIcons.length === 0) {
      return (
        <Alert severity="info" sx={{ my: 2 }}>
          {searchTerm 
            ? 'No icons match your search criteria.' 
            : activeCategory !== 'all' 
              ? `No icons found in the "${activeCategory}" category.` 
              : 'No icons found. Upload some icons to get started.'}
        </Alert>
      );
    }
    
    return (
      <Box sx={{ mt: 2 }}>
        <Grid container spacing={2}>
          {filteredIcons.map((icon) => {
            const iconId = icon._id || icon.filename;
            const hasError = imageErrors[iconId] || false;
            
            // Determine the correct icon URL based on storage type
            let iconUrl = icon.url;
            if (!iconUrl) {
              // Fallback to constructing URL from provider and filename
              iconUrl = isAbsoluteUrl(icon.filename) 
                ? icon.filename 
                : `/cloudicons/${icon.provider}/${icon.category || 'uncategorized'}/${icon.filename}`;
            }
            
            return (
              <Grid item key={iconId} xs={6} sm={4} md={3} lg={2}>
                <Paper elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 2 }}>
                    {hasError ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <BrokenImageIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
                        <Typography variant="caption" color="error">
                          Failed to load
                        </Typography>
                      </Box>
                    ) : (
                      <img 
                        src={iconUrl}
                        alt={icon.displayName || icon.filename}
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        onError={() => handleImageError(iconId)}
                      />
                    )}
                  </Box>
                  <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                    <Typography variant="body2" noWrap title={icon.displayName || icon.filename}>
                      {icon.displayName || icon.filename}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {icon.category || "Unknown"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" fontSize="0.6rem" display="block" noWrap>
                      {icon.storage || "local"}
                    </Typography>
                  </CardContent>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    );
  };
  
  // Render category chips
  const renderCategoryChips = () => {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 1, 
          mb: 2, 
          mt: 2,
          maxWidth: '100%',
          overflow: 'auto',
          pb: 1,
        }}
      >
        <Chip 
          label={`All (${icons.length})`} 
          variant={activeCategory === 'all' ? 'filled' : 'outlined'}
          color={activeCategory === 'all' ? 'primary' : 'default'}
          onClick={() => handleCategoryChange('all')}
          icon={<FilterListIcon />}
        />
        
        {categories.map((category) => (
          <Chip 
            key={category.name}
            label={`${category.name} (${category.count})`}
            variant={activeCategory === category.name ? 'filled' : 'outlined'}
            color={activeCategory === category.name ? 'primary' : 'default'}
            onClick={() => handleCategoryChange(category.name)}
          />
        ))}
      </Box>
    );
  };
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Icon Explorer
        </Typography>
        
        <Box>
          <Button 
            startIcon={<RefreshIcon />} 
            onClick={loadIcons}
            size="small"
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          
          <Button 
            variant="contained" 
            startIcon={<CloudUploadIcon />}
            onClick={() => setShowUploader(!showUploader)}
            size="small"
          >
            {showUploader ? 'Hide Uploader' : 'Upload Icons'}
          </Button>
        </Box>
      </Box>
      
      {!mongodbAvailable && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          MongoDB connection is not available. Icons will be loaded from local storage only.
        </Alert>
      )}
      
      {/* Icon Uploader */}
      {showUploader && (
        <Box sx={{ mb: 3 }}>
          <IconUploader />
        </Box>
      )}
      
      {/* Provider Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={activeProvider}
          onChange={handleProviderChange}
          aria-label="cloud provider tabs"
        >
          <Tab label="Azure" value="azure" />
          <Tab label="AWS" value="aws" />
          <Tab label="GCP" value="gcp" />
        </Tabs>
      </Paper>
      
      {/* Search and Filter */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <TextField
          placeholder="Search icons..."
          size="small"
          value={searchTerm}
          onChange={handleSearchChange}
          sx={{ flexGrow: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton 
                  size="small" 
                  onClick={() => setSearchTerm('')}
                  edge="end"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        
        <Tooltip title="View by category">
          <IconButton sx={{ ml: 1 }}>
            <CategoryIcon />
          </IconButton>
        </Tooltip>
      </Box>
      
      {/* Category Chips */}
      {categories.length > 0 && renderCategoryChips()}
      
      {/* Icons Grid */}
      {renderIconGrid()}
    </Box>
  );
};

export default IconExplorer; 