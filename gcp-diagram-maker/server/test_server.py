#!/usr/bin/env python3
import os
import sys
import logging
from flask import Flask, jsonify, request

# Add proper exception handling for imports
try:
    from flask_cors import CORS
except ImportError:
    print("Error: flask_cors not installed. Run 'pip install flask-cors'")
    sys.exit(1)

# Import the GCS module with error handling
try:
    from gcs import is_gcs_initialized, test_gcs_connectivity
except ImportError as e:
    print(f"Error importing gcs module: {e}")
    sys.exit(1)

# Import API blueprints with error handling
try:
    from api.upload import upload_bp
except ImportError as e:
    print(f"Error importing upload_bp: {e}")
    print("Detailed error:", str(e))
    sys.exit(1)

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Register API blueprints
app.register_blueprint(upload_bp)

# Make app variable available to upload_bp
import api.upload
api.upload.app = app

# Base directory for cloud icons
CLOUDICONS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'public', 'cloudicons')
os.makedirs(CLOUDICONS_DIR, exist_ok=True)

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy", 
        "mongodb": False,
        "gcs": is_gcs_initialized()
    })

# Simple upload test endpoint
@app.route('/api/upload-test', methods=['POST'])
def upload_test():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    return jsonify({'success': True, 'filename': file.filename})

# Server capabilities endpoint
@app.route('/api/capabilities', methods=['GET'])
def server_capabilities():
    # Get information about available APIs and services
    return jsonify({
        "mongodb": False,
        "googleVision": False,  # Not implemented yet
        "googleStorage": is_gcs_initialized(),  # Report actual GCS status
        "huggingFace": False,   # Not implemented yet
        "gemini": False,        # Gemini AI is available
        "terraform": False,     # Terraform generation is available
        "diagrams": False       # Mermaid diagram generation is available
    })

# Test GCS connectivity endpoint
@app.route('/api/test-gcs', methods=['GET'])
def test_gcs():
    return jsonify(test_gcs_connectivity())

if __name__ == '__main__':
    # Initialize GCS on startup (already happens when importing the module)
    if is_gcs_initialized():
        logger.info("Google Cloud Storage initialized and ready")
    else:
        logger.warning("Google Cloud Storage not initialized - using local storage only")
    
    # Use the FLASK_PORT environment variable if set, otherwise default to 3002
    port = int(os.environ.get('FLASK_PORT', 3002))
    logger.info(f"Starting test Flask server on port {port}")
    logger.info(f"Server capabilities: GCS: {is_gcs_initialized()}")
    
    # Print available routes for debugging
    logger.info("Available routes:")
    for rule in app.url_map.iter_rules():
        logger.info(f"{rule.endpoint}: {rule}")
    
    try:
        app.run(host='0.0.0.0', port=port, debug=True)
    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        print(f"Error starting server: {e}") 