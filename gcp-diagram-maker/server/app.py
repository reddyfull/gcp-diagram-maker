"""
GCP Diagram Maker Server

This Flask application serves as the backend for the GCP Diagram Maker tool,
providing APIs for diagram generation, GCP service configuration, and AI assistance.
"""

import os
import logging
import json
from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Import utility modules
from api.upload import upload_bp
from api.icons import icons_bp
from api.ai.ai_blueprint import ai_diagram_blueprint
from api.ai.gemini import gemini_bp
from api.ai.session import session_bp

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize GCS
try:
    from api.gcs import gcs_initialized, gcs_bucket
    logger.info("Google Cloud Storage initialized and ready")
except Exception as e:
    logger.warning(f"Failed to initialize GCS: {str(e)}")
    gcs_initialized = False
    gcs_bucket = None

# Initialize MongoDB
mongodb_initialized = False
try:
    if not os.environ.get('MONGODB_URI'):
        logger.warning("MONGODB_URI environment variable not set.")
    else:
        from pymongo import MongoClient
        from pymongo.server_api import ServerApi
        
        client = MongoClient(os.environ['MONGODB_URI'], server_api=ServerApi('1'))
        client.admin.command('ping')
        db = client.gcp_diagram_maker
        mongodb_initialized = True
        logger.info("Successfully connected to MongoDB Atlas")
except Exception as e:
    logger.warning(f"MONGODB CONNECTION FAILED or URI not set - Using local/fallback storage only. Error: {str(e)}")
    db = None

# Initialize Gemini API
gemini_key_set = False
try:
    if not os.environ.get('GEMINI_API_KEY'):
        logger.warning("GEMINI_API_KEY environment variable not found. AI features needing it will fail.")
    else:
        import google.generativeai as genai
        genai.configure(api_key=os.environ['GEMINI_API_KEY'])
        gemini_key_set = True
except Exception as e:
    logger.warning(f"Failed to initialize Gemini API: {str(e)}")

# Create Flask app
app = Flask(__name__, static_folder='../client/dist', static_url_path='')
CORS(app)

# Register blueprints
app.register_blueprint(upload_bp)
app.register_blueprint(icons_bp)
app.register_blueprint(ai_diagram_blueprint)
app.register_blueprint(gemini_bp)
app.register_blueprint(session_bp)

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    """Serve the frontend application"""
    if path and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/health')
def health_check():
    """Simple health check endpoint"""
    return jsonify({"status": "ok"})

@app.route('/api/capabilities')
def capabilities():
    """Return server capabilities"""
    capabilities = {
        "mongodb": mongodb_initialized,
        "gcs": gcs_initialized,
        "gemini_key_set": gemini_key_set
    }
    logger.info(f"Final Server Capabilities: MongoDB: {mongodb_initialized}, GCS: {gcs_initialized}, Gemini Key Set: {gemini_key_set}")
    return jsonify(capabilities)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3001))
    app.run(host='0.0.0.0', port=port) 