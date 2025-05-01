import React, { useState, useEffect } from 'react';
import { 
  Paper, 
  Typography, 
  Box, 
  Tabs, 
  Tab, 
  TextField, 
  InputAdornment,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  Divider,
  IconButton
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import FilterListIcon from '@mui/icons-material/FilterList';
import axios from 'axios';

// Define icon structure
export interface CloudIcon {
  id: string;
  filename: string;
  provider: string;
  category: string;
  displayName: string;
  url?: string;
}

// Group icons by category
interface GroupedIcons {
  [category: string]: CloudIcon[];
}

interface CloudResourcePanelProps {
  onDragStart: (event: React.DragEvent<HTMLDivElement>, icon: CloudIcon) => void;
}

const CloudResourcePanel: React.FC<CloudResourcePanelProps> = ({ onDragStart }) => {
  const [icons, setIcons] = useState<CloudIcon[]>([]);
  const [groupedIcons, setGroupedIcons] = useState<GroupedIcons>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeProvider, setActiveProvider] = useState('azure');
  const [expandedCategories, setExpandedCategories] = useState<{[key: string]: boolean}>({});

  // Fetch icons from the server
  useEffect(() => {
    const fetchIcons = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/icons?provider=${activeProvider}`);
        setIcons(response.data);
        
        // Group icons by category
        const grouped = response.data.reduce((acc: GroupedIcons, icon: CloudIcon) => {
          const category = icon.category || 'Uncategorized';
          if (!acc[category]) {
            acc[category] = [];
          }
          acc[category].push(icon);
          return acc;
        }, {});
        
        setGroupedIcons(grouped);
        
        // Initialize all categories as expanded
        const initialExpanded = Object.keys(grouped).reduce((acc, category) => {
          acc[category] = true;
          return acc;
        }, {} as {[key: string]: boolean});
        
        setExpandedCategories(initialExpanded);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch icons:', err);
        setError('Failed to load resources. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchIcons();
  }, [activeProvider]);

  // Handle search filter
  const filteredIcons = Object.keys(groupedIcons).reduce((acc: GroupedIcons, category) => {
    const filteredCategoryIcons = groupedIcons[category].filter(icon => 
      icon.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      icon.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (filteredCategoryIcons.length > 0) {
      acc[category] = filteredCategoryIcons;
    }
    
    return acc;
  }, {});

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Handle tab change
  const handleProviderChange = (_: React.SyntheticEvent, newValue: string) => {
    setActiveProvider(newValue);
  };

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        height: '100%', 
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        width: 280,
        borderRadius: 1
      }}
    >
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={activeProvider}
          onChange={handleProviderChange}
          aria-label="cloud provider tabs"
          variant="fullWidth"
        >
          <Tab label="Azure" value="azure" />
          <Tab label="AWS" value="aws" />
          <Tab label="GCP" value="gcp" />
        </Tabs>
      </Box>
      
      <Box sx={{ p: 1 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search resources..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: searchTerm ? (
              <InputAdornment position="end">
                <IconButton 
                  size="small" 
                  onClick={() => setSearchTerm('')}
                  edge="end"
                >
                  <FilterListIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null
          }}
          sx={{ mb: 1 }}
        />
      </Box>
      
      <Box sx={{ flexGrow: 1, overflow: 'auto', px: 1 }}>
        {loading ? (
          <Typography variant="body2" sx={{ p: 2, textAlign: 'center' }}>
            Loading resources...
          </Typography>
        ) : error ? (
          <Typography variant="body2" color="error" sx={{ p: 2, textAlign: 'center' }}>
            {error}
          </Typography>
        ) : Object.keys(filteredIcons).length === 0 ? (
          <Typography variant="body2" sx={{ p: 2, textAlign: 'center' }}>
            No resources found. Try a different search or provider.
          </Typography>
        ) : (
          Object.keys(filteredIcons).map((category) => (
            <Box key={category} sx={{ mb: 1 }}>
              <Box 
                onClick={() => toggleCategory(category)}
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  cursor: 'pointer',
                  py: 0.5,
                  pl: 1,
                  borderRadius: 1,
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
              >
                {expandedCategories[category] ? 
                  <ExpandLessIcon fontSize="small" /> : 
                  <ExpandMoreIcon fontSize="small" />
                }
                <Typography 
                  variant="subtitle2" 
                  sx={{ ml: 1, flexGrow: 1 }}
                >
                  {category}
                </Typography>
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ mr: 1 }}
                >
                  {filteredIcons[category].length}
                </Typography>
              </Box>
              
              <Collapse in={expandedCategories[category]} timeout="auto" unmountOnExit>
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 0.5,
                  p: 0.5
                }}>
                  {filteredIcons[category].map((icon) => (
                    <Box
                      key={icon.id || icon.filename}
                      draggable
                      onDragStart={(e) => onDragStart(e, icon)}
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        p: 0.5,
                        borderRadius: 1,
                        cursor: 'grab',
                        transition: 'all 0.2s',
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                      }}
                    >
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <img
                          src={icon.url || `/cloudicons/${icon.provider}/${icon.category}/${icon.filename}`}
                          alt={icon.displayName}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          onError={(e) => {
                            const imgElement = e.target as HTMLImageElement;
                            imgElement.src = '/assets/default-resource.svg';
                          }}
                        />
                      </Box>
                      <Typography
                        variant="caption"
                        align="center"
                        sx={{
                          fontSize: '9px',
                          lineHeight: '10px',
                          mt: 0.5,
                          maxWidth: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {icon.displayName}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Collapse>
              <Divider sx={{ my: 0.5 }} />
            </Box>
          ))
        )}
      </Box>
    </Paper>
  );
};

export default CloudResourcePanel; 