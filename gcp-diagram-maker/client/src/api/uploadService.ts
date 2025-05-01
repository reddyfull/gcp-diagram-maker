import axios from 'axios';

// API base URL - adjust for production environments
const API_BASE_URL = '/api';

export const uploadService = {
  /**
   * Upload icons in a ZIP file to the server
   * The server will extract the icons, categorize them, 
   * save to GCS, and record metadata in MongoDB
   */
  async uploadIcons(
    iconsZip: File,
    provider: 'azure' | 'aws' | 'gcp',
    onProgress?: (progress: number) => void
  ) {
    try {
      // Create form data
      const formData = new FormData();
      formData.append('iconsZip', iconsZip);
      formData.append('provider', provider);
      
      // Setup request with progress tracking
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent: any) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(progress);
          }
        },
      };
      
      // Make the request
      const response = await axios.post(
        `${API_BASE_URL}/upload/icons`,
        formData,
        config
      );
      
      return response.data;
    } catch (error) {
      console.error('Error uploading icons:', error);
      throw error;
    }
  },
  
  /**
   * Upload a diagram image for analysis
   * The server will store the image in GCS and process it with computer vision
   */
  async uploadDiagramForAnalysis(
    diagramImage: File,
    onProgress?: (progress: number) => void
  ) {
    try {
      // Create form data
      const formData = new FormData();
      formData.append('diagram', diagramImage);
      
      // Setup request with progress tracking
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent: any) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(progress);
          }
        },
      };
      
      // Make the request
      const response = await axios.post(
        `${API_BASE_URL}/upload/diagram`,
        formData,
        config
      );
      
      return response.data;
    } catch (error) {
      console.error('Error uploading diagram for analysis:', error);
      throw error;
    }
  },
  
  /**
   * Refresh icon categories in MongoDB
   */
  async refreshIconCategories() {
    try {
      const response = await axios.post(`${API_BASE_URL}/icons/refresh-categories`);
      return response.data;
    } catch (error) {
      console.error('Error refreshing icon categories:', error);
      throw error;
    }
  },
  
  /**
   * Delete a specific icon
   */
  async deleteIcon(provider: string, filename: string) {
    try {
      const response = await axios.delete(`${API_BASE_URL}/icons/${provider}/${filename}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting icon ${filename}:`, error);
      throw error;
    }
  },
  
  /**
   * Delete all icons
   * Warning: This will remove all icons from both GCS and MongoDB
   */
  async deleteAllIcons() {
    try {
      const response = await axios.delete(`${API_BASE_URL}/icons/all`);
      return response.data;
    } catch (error) {
      console.error('Error deleting all icons:', error);
      throw error;
    }
  }
};

export default uploadService; 