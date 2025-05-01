import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

// Define configuration types
interface DiagramConfig {
  autoSave: boolean;
  autoSaveInterval: number; // in seconds
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
}

interface EditorConfig {
  fontSize: number;
  tabSize: number;
  lineWrapping: boolean;
  autoComplete: boolean;
  highlightActiveLine: boolean;
}

interface AppConfig {
  diagram: DiagramConfig;
  editor: EditorConfig;
  apiEndpoint: string;
  defaultProvider: 'azure' | 'aws' | 'gcp';
  enableMermaidPreview: boolean;
  enableTerraformPreview: boolean;
}

interface ConfigContextType {
  config: AppConfig;
  updateDiagramConfig: (updates: Partial<DiagramConfig>) => void;
  updateEditorConfig: (updates: Partial<EditorConfig>) => void;
  updateAppConfig: (updates: Partial<Omit<AppConfig, 'diagram' | 'editor'>>) => void;
  resetConfig: () => void;
}

// Default configuration values
const defaultConfig: AppConfig = {
  diagram: {
    autoSave: true,
    autoSaveInterval: 60,
    showGrid: true,
    snapToGrid: true,
    gridSize: 20,
  },
  editor: {
    fontSize: 14,
    tabSize: 2,
    lineWrapping: true,
    autoComplete: true,
    highlightActiveLine: true,
  },
  apiEndpoint: 'http://localhost:5000/api',
  defaultProvider: 'azure',
  enableMermaidPreview: true,
  enableTerraformPreview: true,
};

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

interface ConfigProviderProps {
  children: ReactNode;
}

export const ConfigProvider: React.FC<ConfigProviderProps> = ({ children }) => {
  const [config, setConfig] = useState<AppConfig>(() => {
    // Initialize from localStorage if available
    const savedConfig = localStorage.getItem('appConfig');
    if (savedConfig) {
      try {
        return JSON.parse(savedConfig);
      } catch (error) {
        console.error('Failed to parse saved config:', error);
        return defaultConfig;
      }
    }
    return defaultConfig;
  });

  // Save config changes to localStorage
  useEffect(() => {
    localStorage.setItem('appConfig', JSON.stringify(config));
  }, [config]);

  const updateDiagramConfig = (updates: Partial<DiagramConfig>) => {
    setConfig((prev) => ({
      ...prev,
      diagram: { ...prev.diagram, ...updates },
    }));
  };

  const updateEditorConfig = (updates: Partial<EditorConfig>) => {
    setConfig((prev) => ({
      ...prev,
      editor: { ...prev.editor, ...updates },
    }));
  };

  const updateAppConfig = (updates: Partial<Omit<AppConfig, 'diagram' | 'editor'>>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  const resetConfig = () => {
    setConfig(defaultConfig);
  };

  return (
    <ConfigContext.Provider
      value={{
        config,
        updateDiagramConfig,
        updateEditorConfig,
        updateAppConfig,
        resetConfig,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = (): ConfigContextType => {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}; 