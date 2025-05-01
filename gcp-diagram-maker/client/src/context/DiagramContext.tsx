import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useConfig } from './ConfigContext';
import { v4 as uuidv4 } from 'uuid';

// Define types for diagram elements and connections
export interface DiagramNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, any>;
  style?: Record<string, any>;
}

export interface DiagramConnection {
  id: string;
  source: string;
  target: string;
  type?: string;
  data?: Record<string, any>;
  style?: Record<string, any>;
}

export interface Diagram {
  id: string;
  name: string;
  description?: string;
  nodes: DiagramNode[];
  connections: DiagramConnection[];
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, any>;
  cloudProviders: string[];
}

interface DiagramContextType {
  currentDiagram: Diagram | null;
  savedDiagrams: Diagram[];
  isLoading: boolean;
  error: string | null;
  setCurrentDiagram: (diagram: Diagram) => void;
  createNewDiagram: (name: string, description?: string) => void;
  saveDiagram: () => Promise<boolean>;
  loadDiagram: (id: string) => Promise<boolean>;
  deleteDiagram: (id: string) => Promise<boolean>;
  exportDiagram: (format: 'json' | 'png' | 'svg' | 'mermaid' | 'terraform') => Promise<string | Blob>;
  addNode: (node: Omit<DiagramNode, 'id'>) => string;
  updateNode: (id: string, updates: Partial<Omit<DiagramNode, 'id'>>) => boolean;
  removeNode: (id: string) => boolean;
  addConnection: (connection: Omit<DiagramConnection, 'id'>) => string;
  updateConnection: (id: string, updates: Partial<Omit<DiagramConnection, 'id'>>) => boolean;
  removeConnection: (id: string) => boolean;
  clearDiagram: () => void;
}

// Helper function to create an empty diagram
const createEmptyDiagram = (name: string, description?: string): Diagram => {
  return {
    id: uuidv4(),
    name: name || 'Untitled Diagram',
    description: description || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes: [],
    connections: [],
    cloudProviders: [],
    metadata: {}
  };
};

// Create context
const DiagramContext = createContext<DiagramContextType | undefined>(undefined);

interface DiagramProviderProps {
  children: ReactNode;
}

export const DiagramProvider: React.FC<DiagramProviderProps> = ({ children }) => {
  const { config } = useConfig();
  const [currentDiagram, setCurrentDiagram] = useState<Diagram | null>(null);
  const [savedDiagrams, setSavedDiagrams] = useState<Diagram[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSaveTimer, setAutoSaveTimer] = useState<ReturnType<typeof setInterval> | null>(null);

  // Load saved diagrams from localStorage on init
  useEffect(() => {
    try {
      const savedData = localStorage.getItem('savedDiagrams');
      if (savedData) {
        setSavedDiagrams(JSON.parse(savedData));
      }
    } catch (error) {
      console.error('Failed to load saved diagrams:', error);
      setError('Failed to load saved diagrams');
    }
  }, []);

  // Update localStorage when savedDiagrams changes
  useEffect(() => {
    if (savedDiagrams.length > 0) {
      localStorage.setItem('savedDiagrams', JSON.stringify(savedDiagrams));
    }
  }, [savedDiagrams]);

  // Set up auto-save if enabled
  useEffect(() => {
    if (config.diagram.autoSave && currentDiagram && autoSaveTimer === null) {
      const timer = setInterval(() => {
        saveDiagram();
      }, config.diagram.autoSaveInterval * 1000);
      
      setAutoSaveTimer(timer);
    }
    
    return () => {
      if (autoSaveTimer) {
        clearInterval(autoSaveTimer);
        setAutoSaveTimer(null);
      }
    };
  }, [config.diagram.autoSave, config.diagram.autoSaveInterval, currentDiagram]);

  // Create a new diagram
  const createNewDiagram = (name: string, description?: string) => {
    setCurrentDiagram(createEmptyDiagram(name, description));
  };

  // Save the current diagram
  const saveDiagram = async (): Promise<boolean> => {
    if (!currentDiagram) return false;
    
    try {
      setIsLoading(true);
      const updatedDiagram = {
        ...currentDiagram,
        updatedAt: new Date().toISOString()
      };

      // Update in state
      const existingIndex = savedDiagrams.findIndex(d => d.id === updatedDiagram.id);
      if (existingIndex >= 0) {
        const newSavedDiagrams = [...savedDiagrams];
        newSavedDiagrams[existingIndex] = updatedDiagram;
        setSavedDiagrams(newSavedDiagrams);
      } else {
        setSavedDiagrams([...savedDiagrams, updatedDiagram]);
      }

      setCurrentDiagram(updatedDiagram);
      
      // In a real application, you would call an API here
      // Simulating API call with timeout
      await new Promise(resolve => setTimeout(resolve, 300));
      
      return true;
    } catch (error) {
      console.error('Failed to save diagram:', error);
      setError('Failed to save diagram');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Load a diagram by ID
  const loadDiagram = async (id: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Find the diagram in the saved diagrams
      const diagram = savedDiagrams.find(d => d.id === id);
      
      if (!diagram) {
        setError(`Diagram with ID ${id} not found`);
        return false;
      }
      
      // In a real application, you would call an API here
      // Simulating API call with timeout
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setCurrentDiagram(diagram);
      return true;
    } catch (error) {
      console.error('Failed to load diagram:', error);
      setError('Failed to load diagram');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a diagram by ID
  const deleteDiagram = async (id: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // In a real application, you would call an API here
      // Simulating API call with timeout
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Remove from state
      setSavedDiagrams(savedDiagrams.filter(d => d.id !== id));
      
      // If the current diagram is being deleted, clear it
      if (currentDiagram && currentDiagram.id === id) {
        setCurrentDiagram(null);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to delete diagram:', error);
      setError('Failed to delete diagram');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Export the diagram in various formats
  const exportDiagram = async (format: 'json' | 'png' | 'svg' | 'mermaid' | 'terraform'): Promise<string | Blob> => {
    if (!currentDiagram) {
      throw new Error('No diagram to export');
    }
    
    try {
      setIsLoading(true);
      
      // In a real application, you would call an API for certain formats
      // For now, we'll just return the diagram as JSON
      switch (format) {
        case 'json':
          return JSON.stringify(currentDiagram, null, 2);
        case 'mermaid':
          // Simple example of converting to mermaid syntax
          let mermaidText = 'graph TD;\n';
          currentDiagram.nodes.forEach(node => {
            const label = node.data?.label || node.id;
            mermaidText += `  ${node.id}[${label}];\n`;
          });
          currentDiagram.connections.forEach(conn => {
            const label = conn.data?.label || '';
            mermaidText += `  ${conn.source} --> ${conn.target}${label ? `|${label}|` : ''};\n`;
          });
          return mermaidText;
        default:
          throw new Error(`Export format ${format} not implemented yet`);
      }
    } catch (error) {
      console.error(`Failed to export diagram as ${format}:`, error);
      setError(`Failed to export diagram as ${format}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Node management functions
  const addNode = (nodeData: Omit<DiagramNode, 'id'>): string => {
    if (!currentDiagram) return '';
    
    const id = `node_${Date.now()}`;
    const newNode: DiagramNode = {
      id,
      ...nodeData
    };
    
    setCurrentDiagram({
      ...currentDiagram,
      updatedAt: new Date().toISOString(),
      nodes: [...currentDiagram.nodes, newNode]
    });
    
    return id;
  };

  const updateNode = (id: string, updates: Partial<Omit<DiagramNode, 'id'>>): boolean => {
    if (!currentDiagram) return false;
    
    const nodeIndex = currentDiagram.nodes.findIndex(node => node.id === id);
    if (nodeIndex === -1) return false;
    
    const updatedNodes = [...currentDiagram.nodes];
    updatedNodes[nodeIndex] = {
      ...updatedNodes[nodeIndex],
      ...updates
    };
    
    setCurrentDiagram({
      ...currentDiagram,
      updatedAt: new Date().toISOString(),
      nodes: updatedNodes
    });
    
    return true;
  };

  const removeNode = (id: string): boolean => {
    if (!currentDiagram) return false;
    
    const nodeExists = currentDiagram.nodes.some(node => node.id === id);
    if (!nodeExists) return false;
    
    // Remove the node
    const updatedNodes = currentDiagram.nodes.filter(node => node.id !== id);
    
    // Also remove any connections involving this node
    const updatedConnections = currentDiagram.connections.filter(
      conn => conn.source !== id && conn.target !== id
    );
    
    setCurrentDiagram({
      ...currentDiagram,
      updatedAt: new Date().toISOString(),
      nodes: updatedNodes,
      connections: updatedConnections
    });
    
    return true;
  };

  // Connection management functions
  const addConnection = (connectionData: Omit<DiagramConnection, 'id'>): string => {
    if (!currentDiagram) return '';
    
    const id = `conn_${Date.now()}`;
    const newConnection: DiagramConnection = {
      id,
      ...connectionData
    };
    
    setCurrentDiagram({
      ...currentDiagram,
      updatedAt: new Date().toISOString(),
      connections: [...currentDiagram.connections, newConnection]
    });
    
    return id;
  };

  const updateConnection = (id: string, updates: Partial<Omit<DiagramConnection, 'id'>>): boolean => {
    if (!currentDiagram) return false;
    
    const connectionIndex = currentDiagram.connections.findIndex(conn => conn.id === id);
    if (connectionIndex === -1) return false;
    
    const updatedConnections = [...currentDiagram.connections];
    updatedConnections[connectionIndex] = {
      ...updatedConnections[connectionIndex],
      ...updates
    };
    
    setCurrentDiagram({
      ...currentDiagram,
      updatedAt: new Date().toISOString(),
      connections: updatedConnections
    });
    
    return true;
  };

  const removeConnection = (id: string): boolean => {
    if (!currentDiagram) return false;
    
    const connectionExists = currentDiagram.connections.some(conn => conn.id === id);
    if (!connectionExists) return false;
    
    const updatedConnections = currentDiagram.connections.filter(conn => conn.id !== id);
    
    setCurrentDiagram({
      ...currentDiagram,
      updatedAt: new Date().toISOString(),
      connections: updatedConnections
    });
    
    return true;
  };

  // Clear the current diagram
  const clearDiagram = () => {
    setCurrentDiagram(null);
  };

  const contextValue: DiagramContextType = {
    currentDiagram,
    savedDiagrams,
    isLoading,
    error,
    setCurrentDiagram,
    createNewDiagram,
    saveDiagram,
    loadDiagram,
    deleteDiagram,
    exportDiagram,
    addNode,
    updateNode,
    removeNode,
    addConnection,
    updateConnection,
    removeConnection,
    clearDiagram
  };

  return (
    <DiagramContext.Provider value={contextValue}>
      {children}
    </DiagramContext.Provider>
  );
};

// Custom hook to use the DiagramContext
export const useDiagram = (): DiagramContextType => {
  const context = useContext(DiagramContext);
  if (context === undefined) {
    throw new Error('useDiagram must be used within a DiagramProvider');
  }
  return context;
}; 