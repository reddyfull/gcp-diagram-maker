import axios from 'axios';
import { Node, Edge } from 'reactflow';

interface DiagramData {
  nodes: Node[];
  edges: Edge[];
}

interface DiagramGenerationResponse {
  nodes: Node[];
  edges: Edge[];
  mermaidCode?: string;
  error?: string;
}

interface WizardAnswers {
  [key: string]: any;
}

export const diagramService = {
  /**
   * Generate a diagram from an AI message text
   * @param messageText The AI message containing architecture description
   * @returns Promise with the generated diagram nodes and edges
   */
  generateFromAIMessage: async (messageText: string): Promise<DiagramGenerationResponse> => {
    try {
      const response = await axios.post('/api/ai/diagrams/generate-from-text', {
        text: messageText
      });
      
      return response.data;
    } catch (error: any) {
      console.error('Error generating diagram from AI message:', error);
      return {
        nodes: [],
        edges: [],
        error: error.response?.data?.error || 'Failed to generate diagram'
      };
    }
  },
  
  /**
   * Generate a diagram from wizard answers
   * @param answers The answers collected from the wizard steps
   * @returns Promise with the generated diagram including Mermaid code
   */
  generateFromWizardAnswers: async (answers: WizardAnswers): Promise<DiagramGenerationResponse> => {
    try {
      const response = await axios.post('/api/ai/diagrams/generate', {
        answers
      });
      
      return response.data;
    } catch (error: any) {
      console.error('Error generating diagram from wizard answers:', error);
      return {
        nodes: [],
        edges: [],
        error: error.response?.data?.error || 'Failed to generate diagram from wizard answers'
      };
    }
  },
  
  /**
   * Update an existing diagram based on an AI suggestion
   * @param currentDiagram Current diagram data
   * @param messageText The AI message with update suggestions
   * @returns Promise with the updated diagram
   */
  updateFromAISuggestion: async (
    currentDiagram: DiagramData, 
    messageText: string
  ): Promise<DiagramGenerationResponse> => {
    try {
      const response = await axios.post('/api/ai/diagrams/update-from-text', {
        currentDiagram,
        text: messageText
      });
      
      return response.data;
    } catch (error: any) {
      console.error('Error updating diagram from AI suggestion:', error);
      return {
        nodes: currentDiagram.nodes,
        edges: currentDiagram.edges,
        error: error.response?.data?.error || 'Failed to update diagram'
      };
    }
  },
  
  /**
   * Generate Terraform code from a diagram
   * @param diagram The diagram data to generate code from
   * @returns Promise with the generated Terraform code
   */
  generateTerraform: async (diagram: DiagramData): Promise<{ code: string }> => {
    try {
      const response = await axios.post('/api/ai/diagrams/terraform', {
        diagram
      });
      
      return { code: response.data.code };
    } catch (error: any) {
      console.error('Error generating Terraform:', error);
      throw new Error(error.response?.data?.error || 'Failed to generate Terraform code');
    }
  },
  
  /**
   * Generate ARM template from a diagram
   * @param diagram The diagram data to generate code from
   * @returns Promise with the generated ARM template
   */
  generateARM: async (diagram: DiagramData): Promise<{ code: string }> => {
    try {
      const response = await axios.post('/api/ai/diagrams/arm', {
        diagram
      });
      
      return { code: response.data.code };
    } catch (error: any) {
      console.error('Error generating ARM template:', error);
      throw new Error(error.response?.data?.error || 'Failed to generate ARM template');
    }
  },
  
  /**
   * Save a diagram to the backend
   * @param diagram The diagram data to save
   * @param name Optional diagram name
   * @returns Promise with the saved diagram ID
   */
  saveDiagram: async (diagram: DiagramData, name: string = 'Untitled Diagram'): Promise<{ id: string }> => {
    try {
      const response = await axios.post('/api/diagrams', {
        name,
        data: diagram
      });
      
      return { id: response.data.id };
    } catch (error: any) {
      console.error('Error saving diagram:', error);
      throw new Error(error.response?.data?.error || 'Failed to save diagram');
    }
  },
  
  /**
   * Load a diagram from the backend
   * @param id The diagram ID to load
   * @returns Promise with the loaded diagram
   */
  loadDiagram: async (id: string): Promise<DiagramData & { name: string }> => {
    try {
      const response = await axios.get(`/api/diagrams/${id}`);
      
      return {
        name: response.data.name,
        nodes: response.data.data.nodes,
        edges: response.data.data.edges
      };
    } catch (error: any) {
      console.error('Error loading diagram:', error);
      throw new Error(error.response?.data?.error || 'Failed to load diagram');
    }
  },
  
  /**
   * Generate a description of a diagram
   * @param diagram The diagram to describe
   * @returns Promise with the diagram description
   */
  generateDescription: async (diagram: DiagramData): Promise<{ description: string }> => {
    try {
      const response = await axios.post('/api/ai/diagrams/describe', {
        diagram
      });
      
      return { description: response.data.description };
    } catch (error: any) {
      console.error('Error generating diagram description:', error);
      throw new Error(error.response?.data?.error || 'Failed to generate description');
    }
  },
  
  /**
   * Parse Mermaid diagram code into ReactFlow nodes and edges
   * @param mermaidCode The mermaid diagram code
   * @returns Promise with ReactFlow nodes and edges
   */
  parseMermaidToFlow: async (mermaidCode: string): Promise<DiagramData> => {
    try {
      const response = await axios.post('/api/ai/diagrams/mermaid-to-flow', {
        mermaidCode
      });
      
      return {
        nodes: response.data.nodes,
        edges: response.data.edges
      };
    } catch (error: any) {
      console.error('Error parsing Mermaid to ReactFlow:', error);
      throw new Error(error.response?.data?.error || 'Failed to parse Mermaid diagram');
    }
  },
  
  /**
   * Convert ReactFlow diagram to Mermaid code
   * @param diagram The diagram to convert
   * @returns Promise with the generated Mermaid code
   */
  convertToMermaid: async (diagram: DiagramData): Promise<{ mermaidCode: string }> => {
    try {
      const response = await axios.post('/api/ai/diagrams/flow-to-mermaid', {
        diagram
      });
      
      return { mermaidCode: response.data.mermaidCode };
    } catch (error: any) {
      console.error('Error converting to Mermaid:', error);
      throw new Error(error.response?.data?.error || 'Failed to convert to Mermaid code');
    }
  }
}; 