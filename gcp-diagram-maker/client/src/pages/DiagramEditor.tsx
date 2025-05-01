import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  Controls,
  Background,
  MiniMap,
  addEdge,
  Node,
  Edge,
  Connection,
  useReactFlow,
  Panel,
  NodeTypes,
  ConnectionLineType,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  OnConnect,
  XYPosition,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Box, Typography, Paper, Button, IconButton, Drawer, Tabs, Tab, Divider, TextField, AppBar, Toolbar, Menu, MenuItem, ListItemIcon } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CloudIcon from '@mui/icons-material/Cloud';
import { styled } from '@mui/material/styles';
import AzureResourceNode from '../components/diagram/AzureResourceNode';
import CloudResourcePanel from '../components/CloudResourcePanel';
import { v4 as uuidv4 } from 'uuid';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme, useMediaQuery } from '@mui/material';
import FitScreenIcon from '@mui/icons-material/FitScreen';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SettingsIcon from '@mui/icons-material/Settings';
import CodeIcon from '@mui/icons-material/Code';
import ShareIcon from '@mui/icons-material/Share';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

// Custom node types
const nodeTypes: NodeTypes = {
  azureResource: AzureResourceNode,
};

const StyledPanel = styled(Panel)(({ theme }) => ({
  background: theme.palette.background.paper,
  padding: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[2],
}));

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
      style={{ height: '100%', overflowY: 'auto' }}
    >
      {value === index && (
        <Box sx={{ p: 2, height: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

interface CloudResource {
  id: string;
  filename: string;
  provider: string;
  category: string;
  displayName: string;
  url?: string;
}

interface DiagramData {
  id: string;
  name: string;
  description?: string;
  nodes: Node[];
  edges: Edge[];
  lastModified: Date;
}

const DiagramEditor: React.FC = () => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  const { diagramId } = useParams<{ diagramId: string }>();
  const navigate = useNavigate();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();
  
  // State for diagram components
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // UI state
  const [resourcePanelOpen, setResourcePanelOpen] = useState(!isSmallScreen);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [diagramName, setDiagramName] = useState('Untitled Diagram');
  const [diagramDescription, setDiagramDescription] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  
  // Track history for undo/redo
  const [history, setHistory] = useState<{nodes: Node[]; edges: Edge[]}[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  
  // Refs to track if we're currently handling a history operation
  const isHandlingHistory = useRef(false);
  
  // Load diagram data if editing an existing diagram
  useEffect(() => {
    if (diagramId) {
      const loadDiagram = async () => {
        try {
          const response = await fetch(`/api/diagrams/${diagramId}`);
          if (!response.ok) {
            throw new Error('Failed to load diagram');
          }
          
          const data: DiagramData = await response.json();
          setDiagramName(data.name);
          setDiagramDescription(data.description || '');
          setNodes(data.nodes);
          setEdges(data.edges);
          
          // Initialize history with the loaded state
          setHistory([{ nodes: data.nodes, edges: data.edges }]);
          setCurrentHistoryIndex(0);
          
          showSnackbar('Diagram loaded successfully', 'success');
        } catch (error) {
          console.error('Error loading diagram:', error);
          showSnackbar('Error loading diagram', 'error');
        }
      };
      
      loadDiagram();
    } else {
      // Initialize history with empty state for new diagrams
      setHistory([{ nodes: [], edges: [] }]);
      setCurrentHistoryIndex(0);
    }
  }, [diagramId]);
  
  // Record history when nodes or edges change (except during undo/redo operations)
  useEffect(() => {
    if (isHandlingHistory.current) {
      isHandlingHistory.current = false;
      return;
    }
    
    if (nodes.length === 0 && edges.length === 0 && history.length === 0) {
      return;
    }
    
    // If we're in the middle of the history stack, truncate the future history
    if (currentHistoryIndex >= 0 && currentHistoryIndex < history.length - 1) {
      setHistory(prev => prev.slice(0, currentHistoryIndex + 1));
    }
    
    // Add current state to history
    setHistory(prev => [...prev, { nodes, edges }]);
    setCurrentHistoryIndex(prev => prev + 1);
  }, [nodes, edges]);
  
  // Handle connection between nodes
  const onConnect: OnConnect = useCallback((connection: Connection) => {
    const newEdge = {
      ...connection,
      id: `e-${uuidv4()}`,
      type: 'smoothstep',
      animated: false,
      style: { stroke: '#555', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: '#555',
      },
    };
    setEdges(prevEdges => addEdge(newEdge, prevEdges));
  }, [setEdges]);
  
  // Handle resource drag & drop
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);
  
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      
      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const resourceData = event.dataTransfer.getData('application/reactflow');
      
      if (!resourceData || !reactFlowBounds || !reactFlowInstance) {
        return;
      }
      
      const resource: CloudResource = JSON.parse(resourceData);
      
      // Get the position where we drop the node
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });
      
      const newNode: Node = {
        id: `node-${uuidv4()}`,
        type: 'azureResource',
        position,
        data: {
          label: resource.displayName,
          filename: resource.filename,
          provider: resource.provider,
          category: resource.category,
          displayName: resource.displayName,
          url: resource.url,
        },
      };
      
      setNodes(prev => [...prev, newNode]);
    },
    [reactFlowInstance, setNodes]
  );
  
  // Handle resource drag start
  const onResourceDragStart = (event: React.DragEvent, resource: CloudResource) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(resource));
    event.dataTransfer.effectAllowed = 'move';
  };
  
  // Handle diagram saving
  const handleSaveDiagram = async () => {
    try {
      const diagramData: Omit<DiagramData, 'id' | 'lastModified'> = {
        name: diagramName,
        description: diagramDescription,
        nodes,
        edges,
      };
      
      const url = diagramId 
        ? `/api/diagrams/${diagramId}` 
        : '/api/diagrams';
        
      const method = diagramId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(diagramData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save diagram');
      }
      
      const savedData = await response.json();
      
      // If this was a new diagram, update the URL
      if (!diagramId && savedData.id) {
        navigate(`/diagram/${savedData.id}`, { replace: true });
      }
      
      setSaveDialogOpen(false);
      showSnackbar('Diagram saved successfully', 'success');
    } catch (error) {
      console.error('Error saving diagram:', error);
      showSnackbar('Error saving diagram', 'error');
    }
  };
  
  // Undo/Redo functionality
  const handleUndo = useCallback(() => {
    if (currentHistoryIndex > 0) {
      isHandlingHistory.current = true;
      const prevState = history[currentHistoryIndex - 1];
      setNodes(prevState.nodes);
      setEdges(prevState.edges);
      setCurrentHistoryIndex(prev => prev - 1);
    }
  }, [currentHistoryIndex, history, setNodes, setEdges]);
  
  const handleRedo = useCallback(() => {
    if (currentHistoryIndex < history.length - 1) {
      isHandlingHistory.current = true;
      const nextState = history[currentHistoryIndex + 1];
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      setCurrentHistoryIndex(prev => prev + 1);
    }
  }, [currentHistoryIndex, history, setNodes, setEdges]);
  
  // Delete selected elements
  const handleDeleteSelected = useCallback(() => {
    setNodes(nodes => nodes.filter(node => !node.selected));
    setEdges(edges => edges.filter(edge => !edge.selected));
  }, [setNodes, setEdges]);
  
  // Handle other UI actions
  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };
  
  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
  };
  
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };
  
  const handleExportToTerraform = () => {
    // Implementation for exporting to Terraform
    showSnackbar('Export to Terraform feature coming soon', 'info');
    handleCloseMenu();
  };
  
  const handleShareDiagram = () => {
    // Implementation for sharing diagram
    showSnackbar('Share diagram feature coming soon', 'info');
    handleCloseMenu();
  };
  
  // Zoom controls
  const handleZoomIn = () => {
    reactFlowInstance.zoomIn();
  };
  
  const handleZoomOut = () => {
    reactFlowInstance.zoomOut();
  };
  
  const handleFitView = () => {
    reactFlowInstance.fitView({ padding: 0.2 });
  };
  
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* App Bar */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar variant="dense">
          <IconButton
            edge="start"
            color="inherit"
            aria-label="toggle resource panel"
            onClick={() => setResourcePanelOpen(!resourcePanelOpen)}
            sx={{ mr: 2 }}
          >
            {resourcePanelOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
          
          <Typography variant="subtitle1" noWrap component="div" sx={{ flexGrow: 1 }}>
            {diagramName}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              startIcon={<SaveIcon />}
              variant="outlined"
              size="small"
              onClick={() => setSaveDialogOpen(true)}
            >
              Save
            </Button>
            
            <Tooltip title="Undo">
              <IconButton 
                color="inherit" 
                onClick={handleUndo}
                disabled={currentHistoryIndex <= 0}
              >
                <UndoIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Redo">
              <IconButton 
                color="inherit" 
                onClick={handleRedo}
                disabled={currentHistoryIndex >= history.length - 1}
              >
                <RedoIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Delete selected">
              <IconButton color="inherit" onClick={handleDeleteSelected}>
                <DeleteIcon />
              </IconButton>
            </Tooltip>
            
            <Divider orientation="vertical" flexItem />
            
            <Tooltip title="Export to Terraform">
              <IconButton color="inherit" onClick={handleExportToTerraform}>
                <CodeIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Share">
              <IconButton color="inherit" onClick={handleShareDiagram}>
                <ShareIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Settings">
              <IconButton color="inherit">
                <SettingsIcon />
              </IconButton>
            </Tooltip>
            
            <IconButton color="inherit" onClick={handleOpenMenu}>
              <MoreVertIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      
      {/* Main Content Area */}
      <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Resource Panel Drawer */}
        <Drawer
          variant={isSmallScreen ? 'temporary' : 'persistent'}
          anchor="left"
          open={resourcePanelOpen}
          onClose={() => setResourcePanelOpen(false)}
          sx={{
            width: 280,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: 280,
              boxSizing: 'border-box',
              position: isSmallScreen ? 'fixed' : 'relative',
            },
          }}
        >
          <ResourcePanel onResourceDragStart={onResourceDragStart} />
        </Drawer>
        
        {/* Flow Canvas */}
        <Box 
          ref={reactFlowWrapper} 
          sx={{ 
            flexGrow: 1, 
            height: '100%', 
            '& .react-flow__node-azureResource': {
              padding: 0,
              borderRadius: 1,
              width: 'auto',
              fontSize: '12px',
            },
          }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[15, 15]}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            attributionPosition="bottom-right"
            minZoom={0.1}
            maxZoom={4}
            deleteKeyCode={'Delete'}
          >
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
            
            <Controls showInteractive={false} />
            
            <Panel position="top-right">
              <Paper elevation={2} sx={{ borderRadius: 1, display: 'flex', flexDirection: 'column', p: 0.5 }}>
                <Tooltip title="Zoom In">
                  <IconButton size="small" onClick={handleZoomIn}>
                    <ZoomInIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Zoom Out">
                  <IconButton size="small" onClick={handleZoomOut}>
                    <ZoomOutIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Fit View">
                  <IconButton size="small" onClick={handleFitView}>
                    <FitScreenIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Paper>
            </Panel>
            
            <Panel position="bottom-left">
              <Paper sx={{ p: 1, borderRadius: 1, opacity: 0.8 }}>
                <Typography variant="caption" color="text.secondary">
                  Drag resources from the panel to create your diagram. Connect nodes by dragging between handles.
                </Typography>
              </Paper>
            </Panel>
          </ReactFlow>
        </Box>
      </Box>
      
      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
        <DialogTitle>Save Diagram</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Diagram Name"
            type="text"
            fullWidth
            variant="outlined"
            value={diagramName}
            onChange={(e) => setDiagramName(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Description (optional)"
            type="text"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={diagramDescription}
            onChange={(e) => setDiagramDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveDiagram} 
            variant="contained" 
            disabled={!diagramName.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={handleExportToTerraform}>
          <ListItemIcon>
            <CodeIcon fontSize="small" />
          </ListItemIcon>
          Export to Terraform
        </MenuItem>
        <MenuItem onClick={handleShareDiagram}>
          <ListItemIcon>
            <ShareIcon fontSize="small" />
          </ListItemIcon>
          Share Diagram
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleCloseMenu}>
          <ListItemIcon>
            <HelpOutlineIcon fontSize="small" />
          </ListItemIcon>
          Help
        </MenuItem>
      </Menu>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity} 
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// Wrap component with ReactFlowProvider to access reactFlowInstance
const DiagramEditorWrapper: React.FC = () => {
  return (
    <ReactFlowProvider>
      <DiagramEditor />
    </ReactFlowProvider>
  );
};

export default DiagramEditorWrapper; 