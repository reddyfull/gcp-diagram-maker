import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  InputAdornment,
  Divider,
  List, 
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Chip,
  IconButton,
  Collapse,
  CircularProgress,
  Tab,
  Tabs,
  Paper
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CategoryIcon from '@mui/icons-material/Category';
import StorageIcon from '@mui/icons-material/Storage';
import ComputerIcon from '@mui/icons-material/Computer';
import RouterIcon from '@mui/icons-material/Router';
import SecurityIcon from '@mui/icons-material/Security';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';

interface CloudResource {
  id: string;
  filename: string;
  provider: string;
  category: string;
  displayName: string;
  url?: string;
}

interface CategoryGroup {
  name: string;
  count: number;
  expanded: boolean;
  icon: React.ReactNode;
}

interface ResourcePanelProps {
  onResourceDragStart: (event: React.DragEvent, resource: CloudResource) => void;
}

const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case 'compute':
      return <ComputerIcon />;
    case 'storage':
      return <StorageIcon />;
    case 'networking':
    case 'network':
      return <RouterIcon />;
    case 'security':
      return <SecurityIcon />;
    default:
      return <CategoryIcon />;
  }
};

const ResourcePanel: React.FC<ResourcePanelProps> = ({ onResourceDragStart }) => {
  const [resources, setResources] = useState<CloudResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [categoryGroups, setCategoryGroups] = useState<Record<string, CategoryGroup>>({});
  
  useEffect(() => {
    const fetchResources = async () => {
      try {
        setLoading(true);
        // Fetch from your API
        const response = await fetch('/api/icons');
        if (!response.ok) {
          throw new Error('Failed to fetch resources');
        }
        
        const data = await response.json();
        setResources(data);
        
        // Initialize category groups
        const categories: Record<string, CategoryGroup> = {};
        data.forEach((resource: CloudResource) => {
          if (!categories[resource.category]) {
            categories[resource.category] = {
              name: resource.category,
              count: 1,
              expanded: true,
              icon: getCategoryIcon(resource.category)
            };
          } else {
            categories[resource.category].count += 1;
          }
        });
        
        setCategoryGroups(categories);
        setLoading(false);
      } catch (err) {
        setError((err as Error).message);
        setLoading(false);
      }
    };
    
    fetchResources();
  }, []);
  
  const handleToggleCategory = (category: string) => {
    setCategoryGroups(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        expanded: !prev[category].expanded
      }
    }));
  };
  
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const filteredResources = resources.filter(resource => {
    const matchesSearch = searchQuery === '' || 
      resource.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTab = tabValue === 0 || 
      (tabValue === 1 && resource.provider === 'azure') || 
      (tabValue === 2 && resource.provider === 'aws') || 
      (tabValue === 3 && resource.provider === 'gcp');
    
    return matchesSearch && matchesTab;
  });
  
  const groupedResources: Record<string, CloudResource[]> = {};
  filteredResources.forEach(resource => {
    if (!groupedResources[resource.category]) {
      groupedResources[resource.category] = [];
    }
    groupedResources[resource.category].push(resource);
  });
  
  return (
    <Box sx={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 2, pt: 2, pb: 1 }}>
        <Typography variant="h6" gutterBottom>
          Cloud Resources
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="Search resources..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />
        
        <Paper sx={{ borderRadius: 1 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="fullWidth"
            indicatorColor="primary"
            textColor="primary"
            aria-label="cloud provider tabs"
          >
            <Tab label="All" />
            <Tab label="Azure" />
            <Tab label="AWS" />
            <Tab label="GCP" />
          </Tabs>
        </Paper>
      </Box>
      
      <Divider />
      
      <Box sx={{ flexGrow: 1, overflow: 'auto', px: 1 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography color="error">{error}</Typography>
          </Box>
        ) : (
          <List sx={{ py: 0 }}>
            {Object.keys(groupedResources).map(category => (
              <React.Fragment key={category}>
                <ListItem 
                  disablePadding 
                  secondaryAction={
                    <IconButton edge="end" onClick={() => handleToggleCategory(category)}>
                      {categoryGroups[category]?.expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  }
                  sx={{ bgcolor: 'background.paper' }}
                >
                  <ListItemButton onClick={() => handleToggleCategory(category)}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {getCategoryIcon(category)}
                    </ListItemIcon>
                    <ListItemText 
                      primary={category} 
                      primaryTypographyProps={{ variant: 'subtitle2' }}
                    />
                    <Chip 
                      label={groupedResources[category].length} 
                      size="small" 
                      sx={{ ml: 1, height: 20 }}
                    />
                  </ListItemButton>
                </ListItem>
                
                <Collapse in={categoryGroups[category]?.expanded} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding dense>
                    {groupedResources[category].map(resource => (
                      <ListItem 
                        key={resource.id} 
                        disablePadding
                        sx={{ pl: 2 }}
                        draggable
                        onDragStart={(e) => onResourceDragStart(e, resource)}
                      >
                        <ListItemButton sx={{ py: 1 }}>
                          <ListItemIcon sx={{ minWidth: 40 }}>
                            <Box 
                              component="img" 
                              src={resource.url || `/cloudicons/${resource.provider}/${resource.category}/${resource.filename}`}
                              alt={resource.displayName}
                              sx={{ width: 24, height: 24, objectFit: 'contain' }}
                            />
                          </ListItemIcon>
                          <ListItemText 
                            primary={resource.displayName} 
                            primaryTypographyProps={{ 
                              variant: 'body2',
                              sx: { 
                                textOverflow: 'ellipsis', 
                                overflow: 'hidden', 
                                whiteSpace: 'nowrap' 
                              }
                            }}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              </React.Fragment>
            ))}
          </List>
        )}
      </Box>
      
      <Divider />
      
      <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          {filteredResources.length} resources
        </Typography>
        <IconButton size="small" title="More options">
          <MoreHorizIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
};

export default ResourcePanel; 