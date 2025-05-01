import axios from 'axios';

// API base URL - adjust for production environments
const API_BASE_URL = '/api';

// MongoDB Atlas integration through backend API
export const mongodbService = {
  // Check server capabilities
  async checkCapabilities() {
    try {
      const response = await axios.get(`${API_BASE_URL}/capabilities`);
      return response.data;
    } catch (error) {
      console.error('Error checking MongoDB capabilities:', error);
      return { mongodb: false };
    }
  },

  // Get icons with optional provider filter
  async getIcons(provider?: string) {
    try {
      const url = provider 
        ? `${API_BASE_URL}/icons?provider=${provider}` 
        : `${API_BASE_URL}/icons`;
      
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching icons:', error);
      return { icons: [], categories: [], count: 0 };
    }
  },
  
  // Save a diagram
  async saveDiagram(diagram: {
    name: string;
    description?: string;
    elements: any[];
    provider: string;
    createdAt?: Date;
    updatedAt?: Date;
    userId?: string;
  }) {
    try {
      const response = await axios.post(`${API_BASE_URL}/diagrams`, diagram);
      return response.data;
    } catch (error) {
      console.error('Error saving diagram:', error);
      throw error;
    }
  },
  
  // Get all diagrams
  async getDiagrams() {
    try {
      const response = await axios.get(`${API_BASE_URL}/diagrams`);
      return response.data;
    } catch (error) {
      console.error('Error fetching diagrams:', error);
      return { diagrams: [] };
    }
  },
  
  // Get a specific diagram by ID
  async getDiagramById(id: string) {
    try {
      const response = await axios.get(`${API_BASE_URL}/diagrams/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching diagram ${id}:`, error);
      throw error;
    }
  },
  
  // Update a diagram
  async updateDiagram(id: string, updates: any) {
    try {
      const response = await axios.put(`${API_BASE_URL}/diagrams/${id}`, updates);
      return response.data;
    } catch (error) {
      console.error(`Error updating diagram ${id}:`, error);
      throw error;
    }
  },
  
  // Delete a diagram
  async deleteDiagram(id: string) {
    try {
      const response = await axios.delete(`${API_BASE_URL}/diagrams/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting diagram ${id}:`, error);
      throw error;
    }
  },
  
  // Health check
  async healthCheck() {
    try {
      const response = await axios.get(`${API_BASE_URL}/health`);
      return response.data;
    } catch (error) {
      console.error('Server health check failed:', error);
      return { status: 'error' };
    }
  }
};

export default mongodbService; 