import React, { useState, useRef, useCallback } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
  Connection,
  Edge,
  Node,
  NodeTypes,
  ReactFlowInstance,
  NodeChange,
  EdgeChange,
  ConnectionLineType,
  OnSelectionChangeParams,
  useReactFlow,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Box, Button, Tooltip, IconButton, Paper, Typography, useTheme } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import AzureResourceNode from './AzureResourceNode';
import CloudResourcePanel, { CloudIcon } from './CloudResourcePanel';

// Define custom node types
const nodeTypes: NodeTypes = {
  azureResource: AzureResourceNode,
};

// Node properties for type safety
export interface DiagramNode extends Node {
  data: {
    label: string;
    filename: string;
    provider: string;
    category: string;
    displayName: string;
    url?: string;
  };
}

interface DiagramEditorProps {
  initialDiagram?: {
    nodes: DiagramNode[];
    edges: Edge[];
  };
  onSave?: (nodes: DiagramNode[], edges: Edge[]) => void;
}

const DiagramEditor: React.FC<DiagramEditorProps> = ({ initialDiagram, onSave }) => {
  const theme = useTheme();
  
  // Initialize nodes and edges
  const [nodes, setNodes, onNodesChange] = useNodesState(initialDiagram?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialDiagram?.edges || []);
  
  // History for undo/redo
  const [history, setHistory] = useState<{nodes: DiagramNode[], edges: Edge[]}[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // ReactFlow instance reference
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  
  // Track selected elements
  const [selectedElements, setSelectedElements] = useState<OnSelectionChangeParams | null>(null);
  
  // Handle connection between nodes
  const onConnect = useCallback((connection: Connection) => {
    // Save current state to history before making changes
    saveToHistory();
    setEdges((eds) => addEdge({ 
      ...connection, 
      type: 'smoothstep',
      animated: true,
      style: { 
        stroke: theme.palette.primary.main,
        strokeWidth: 2
      }
    }, eds));
  }, [setEdges, theme.palette.primary.main]);
  
  // Save current state to history
  const saveToHistory = useCallback(() => {
    // Limit history to 50 steps
    const newHistory = [...history.slice(0, historyIndex + 1), { nodes, edges }].slice(-50);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex, nodes, edges]);
  
  // Handle node changes (adds history)
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    // If there's a remove change, save to history
    if (changes.some(change => change.type === 'remove')) {
      saveToHistory();
    }
    onNodesChange(changes);
  }, [onNodesChange, saveToHistory]);
  
  // Handle edge changes (adds history)
  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    // If there's a remove change, save to history
    if (changes.some(change => change.type === 'remove')) {
      saveToHistory();
    }
    onEdgesChange(changes);
  }, [onEdgesChange, saveToHistory]);
  
  // Handle drag and drop from resource panel
  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);
  
  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      
      if (!reactFlowInstance || !reactFlowWrapper.current) return;
      
      // Get data from drag event
      const rawData = event.dataTransfer.getData('application/json');
      if (!rawData) return;
      
      // Parse the cloud icon data
      const icon: CloudIcon = JSON.parse(rawData);
      
      // Get the position from the drop event
      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });
      
      // Create a new node
      const newNode: DiagramNode = {
        id: `${icon.provider}-${icon.category}-${icon.filename}-${Date.now()}`,
        position,
        type: 'azureResource',
        data: {
          label: icon.displayName,
          filename: icon.filename,
          provider: icon.provider,
          category: icon.category,
          displayName: icon.displayName,
          url: icon.url
        },
      };
      
      // Save current state to history before making changes
      saveToHistory();
      
      // Add the new node
      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes, saveToHistory]
  );
  
  // Handle selection changes
  const onSelectionChange = useCallback((params: OnSelectionChangeParams) => {
    setSelectedElements(params);
  }, []);
  
  // Handle icon drag start
  const handleIconDragStart = (event: React.DragEvent<HTMLDivElement>, icon: CloudIcon) => {
    // Set the drag data
    event.dataTransfer.setData('application/json', JSON.stringify(icon));
    event.dataTransfer.effectAllowed = 'move';
  };
  
  // Delete selected elements
  const deleteSelected = useCallback(() => {
    if (!selectedElements) return;
    
    // Save current state to history before making changes
    saveToHistory();
    
    if (selectedElements.nodes.length > 0) {
      setNodes((nds) => nds.filter((node) => !selectedElements.nodes.some((n) => n.id === node.id)));
    }
    
    if (selectedElements.edges.length > 0) {
      setEdges((eds) => eds.filter((edge) => !selectedElements.edges.some((e) => e.id === edge.id)));
    }
  }, [selectedElements, setNodes, setEdges, saveToHistory]);
  
  // Copy selected nodes
  const copySelected = useCallback(() => {
    if (!selectedElements || selectedElements.nodes.length === 0) return;
    
    // Save current state to history before making changes
    saveToHistory();
    
    // Create copies of selected nodes with new positions
    const nodesCopy = selectedElements.nodes.map((node) => {
      const newNode = { ...node };
      // Offset position slightly
      newNode.position = {
        x: node.position.x + 20,
        y: node.position.y + 20,
      };
      // Create new ID
      newNode.id = `${node.id}-copy-${Date.now()}`;
      return newNode;
    });
    
    setNodes((nds) => [...nds, ...nodesCopy]);
  }, [selectedElements, setNodes, saveToHistory]);
  
  // Fit view to content
  const fitView = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView({ padding: 0.2 });
    }
  }, [reactFlowInstance]);
  
  // Undo last action
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setNodes(prevState.nodes);
      setEdges(prevState.edges);
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex, setNodes, setEdges]);
  
  // Redo last undone action
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex, setNodes, setEdges]);
  
  // Save the diagram
  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(nodes as DiagramNode[], edges);
    }
  }, [nodes, edges, onSave]);
  
  // Export as JSON
  const exportDiagram = useCallback(() => {
    const diagramData = {
      nodes,
      edges,
    };
    
    const dataStr = JSON.stringify(diagramData, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    const exportFileDefaultName = `azure-diagram-${new Date().toISOString()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [nodes, edges]);
  
  // Initialize ReactFlow
  const onInit = (instance: ReactFlowInstance) => {
    setReactFlowInstance(instance);
    setTimeout(() => {
      instance.fitView({ padding: 0.2 });
    }, 100);
  };
  
  return (
    <Box sx={{ 
      display: 'flex', 
      height: '100%',
      width: '100%',
      position: 'relative',
      bgcolor: theme.palette.background.default,
    }}>
      {/* Resource Panel */}
      <CloudResourcePanel onDragStart={handleIconDragStart} />
      
      {/* Flow Diagram Area */}
      <Box
        ref={reactFlowWrapper}
        sx={{
          flexGrow: 1,
          height: '100%',
          '& .react-flow__node-azureResource': {
            // Remove default node styling
            background: 'transparent',
            border: 'none',
            width: 'auto',
            height: 'auto',
          },
        }}
      >
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            onInit={onInit}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onSelectionChange={onSelectionChange}
            nodeTypes={nodeTypes}
            connectionLineType={ConnectionLineType.SmoothStep}
            connectionLineStyle={{ stroke: theme.palette.primary.light, strokeWidth: 2 }}
            deleteKeyCode={['Backspace', 'Delete']}
            multiSelectionKeyCode={['Control', 'Meta']}
            snapToGrid={true}
            snapGrid={[10, 10]}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            fitView
          >
            <Background 
              variant={BackgroundVariant.Dots} 
              color={theme.palette.mode === 'dark' ? '#444' : '#f0f0f0'} 
              gap={16} 
              size={1} 
            />
            <Controls position="bottom-right" />
            <MiniMap 
              nodeColor={(node) => theme.palette.primary.main} 
              maskColor={theme.palette.mode === 'dark' ? 'rgba(40,40,40,0.7)' : 'rgba(240,240,240,0.7)'} 
              position="bottom-left" 
            />
            
            {/* Toolbar */}
            <Panel position="top-right">
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <Tooltip title="Save diagram">
                  <IconButton onClick={handleSave} size="small" sx={{ bgcolor: 'background.paper' }}>
                    <SaveIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Export as JSON">
                  <IconButton onClick={exportDiagram} size="small" sx={{ bgcolor: 'background.paper' }}>
                    <FileDownloadIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Undo">
                  <span>
                    <IconButton 
                      onClick={undo} 
                      size="small" 
                      disabled={historyIndex <= 0}
                      sx={{ bgcolor: 'background.paper' }}
                    >
                      <UndoIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Redo">
                  <span>
                    <IconButton 
                      onClick={redo} 
                      size="small" 
                      disabled={historyIndex >= history.length - 1}
                      sx={{ bgcolor: 'background.paper' }}
                    >
                      <RedoIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title="Fit view">
                  <IconButton onClick={fitView} size="small" sx={{ bgcolor: 'background.paper' }}>
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete selected">
                  <span>
                    <IconButton 
                      onClick={deleteSelected} 
                      size="small" 
                      disabled={!selectedElements || (
                        (!selectedElements.nodes || selectedElements.nodes.length === 0) && 
                        (!selectedElements.edges || selectedElements.edges.length === 0)
                      )}
                      sx={{ bgcolor: 'background.paper' }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Copy selected">
                  <span>
                    <IconButton 
                      onClick={copySelected} 
                      size="small" 
                      disabled={!selectedElements || !selectedElements.nodes || selectedElements.nodes.length === 0}
                      sx={{ bgcolor: 'background.paper' }}
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </Panel>
          </ReactFlow>
        </ReactFlowProvider>
      </Box>
    </Box>
  );
};

export default DiagramEditor; 