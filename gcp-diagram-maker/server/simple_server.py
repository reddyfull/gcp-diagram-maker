import os
import json
import logging
import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from pymongo import MongoClient, errors
from werkzeug.utils import secure_filename
from bson.objectid import ObjectId
import urllib.parse
import ssl
import re
from dotenv import load_dotenv

# Import the GCS module directly
from gcs import is_gcs_initialized, upload_file_to_gcs, get_gcs_url, upload_file, delete_file, GCS_ENABLED

# Import SQLite fallback database
import db_fallback

# Import AI blueprints
from api.ai.gemini import ai_bp
from api.ai.session import ai_session_blueprint
# Comment out the ai_diagram_blueprint import which is missing
# from api.ai.diagrams import ai_diagrams_blueprint  # This import is missing
from api.ai.diagram_blueprint import diagram_ai_blueprint  # Import our new diagram analysis blueprint
from api.upload import upload_bp

# Import the AI brain
try:
    from ai_brain import init_ai_brain
    ai_brain_imported = True
except ImportError:
    logger = logging.getLogger(__name__)
    logger.warning("Failed to import ai_brain module")
    ai_brain_imported = False

# Set GCS bucket name if not provided in environment
if 'GCS_BUCKET_NAME' not in os.environ:
    os.environ['GCS_BUCKET_NAME'] = 'aiicons'

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()

# Add configuration for upload folder
app = Flask(__name__, static_folder='../client/dist', static_url_path='/')
CORS(app)  # Enable CORS for all routes

# Configure upload folder
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload size

# Create uploads directory if it doesn't exist
os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'diagrams'), exist_ok=True)

# MongoDB connection
mongodb_initialized = False  # Force to False to skip MongoDB and use SQLite only
db = None
icons_collection = None
diagrams_collection = None
conversations_collection = None
mongo_client = None

# GCS initialization status
gcs_initialized = is_gcs_initialized()

# Import environment variables
MONGODB_URI = os.environ.get('MONGODB_URI') # Rely solely on environment variable
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')

# Try to initialize MongoDB connection
if MONGODB_URI:
    try:
        logger.info("Attempting to connect to MongoDB Atlas (simple_server)...")
        
        # Add connection options
        connection_options = {
            "tlsAllowInvalidCertificates": True, # For dev only
            "serverSelectionTimeoutMS": 5000,   
            "connectTimeoutMS": 5000,
            "socketTimeoutMS": 5000,
            "retryWrites": True,
            "w": "majority",
            "appName": "azureDiagramMakerSimpleServer" 
        }
        
        mongo_client = MongoClient(MONGODB_URI, **connection_options)
        
        # Ping the database to verify connection
        mongo_client.admin.command('ping')
        
        # Initialize database and collections
        db_name = urllib.parse.urlparse(MONGODB_URI).path
        db_name = db_name[1:] if db_name and db_name.startswith('/') else 'azure_diagram_maker'
        db = mongo_client[db_name]

        icons_collection = db['icons']
        diagrams_collection = db['diagrams']
        conversations_collection = db['conversations']
        
        mongodb_initialized = True
        logger.info(f"Successfully connected to MongoDB Atlas (simple_server) using DB '{db_name}'")

    except errors.ConfigurationError as e:
        logger.error(f"MongoDB Configuration Error (simple_server, check URI format): {e}")
        mongodb_initialized = False
    except errors.OperationFailure as e:
        logger.error(f"MongoDB Authentication Failed (simple_server, Code: {e.code}): {e.details.get('errmsg', 'N/A')}")
        logger.error("Verify credentials and IP whitelist in Atlas.")
        mongodb_initialized = False
    except errors.ConnectionFailure as e:
        logger.error(f"MongoDB Connection Failure (simple_server): {e}")
        mongodb_initialized = False
    except Exception as e:
        logger.error(f"MongoDB Error (simple_server): {e}")
        mongodb_initialized = False
else:
    logger.warning("MONGODB_URI environment variable not set for simple_server.")
    mongodb_initialized = False

# Skip MongoDB connection attempt for now if not initialized
if not mongodb_initialized:
    logger.info("MONGODB DISABLED - Using SQLite fallback database only")
    # Ensure SQLite database is initialized
    logger.info("Initializing SQLite fallback database")
    db_fallback.init_db()

# Base directories
CLOUDICONS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'public', 'cloudicons')
UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'public', 'uploads')

# Attach the database objects to the app for access in blueprints
# This helps avoid circular imports
app.mongodb_initialized = mongodb_initialized
app.db = db
app.icons_collection = icons_collection
app.gcs_initialized = gcs_initialized

# Register API routes
app.register_blueprint(ai_bp)
app.register_blueprint(ai_session_blueprint)
# Comment out the registration of the missing blueprint
# app.register_blueprint(ai_diagram_blueprint)
app.register_blueprint(diagram_ai_blueprint)  # Register our new diagram analysis blueprint
app.register_blueprint(upload_bp)

# Create the cloud icons directory if it doesn't exist
os.makedirs(CLOUDICONS_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)

# Route to serve static files from public/cloudicons
@app.route('/cloudicons/<path:filepath>')
def serve_cloudicons(filepath):
    return send_from_directory(os.path.dirname(CLOUDICONS_DIR), f'cloudicons/{filepath}')

# Route to serve static files from public/uploads
@app.route('/uploads/<path:filepath>')
def serve_uploads(filepath):
    return send_from_directory(os.path.dirname(UPLOADS_DIR), f'uploads/{filepath}')

# Root route
@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy", 
        "mongodb": mongodb_initialized,
        "gcs": is_gcs_initialized(),
        "sqlite": True  # SQLite fallback is always available
    })

# Server capabilities endpoint
@app.route('/api/capabilities', methods=['GET'])
def server_capabilities():
    # Get information about available APIs and services
    return jsonify({
        "version": "1.0.0",
        "mongodb": mongodb_initialized,
        "sqlite": True,  # SQLite fallback is always available
        "gcs": is_gcs_initialized(),
        "filesystem": os.path.exists(CLOUDICONS_DIR),
        "gemini": GEMINI_API_KEY is not None,
        "openai": OPENAI_API_KEY is not None
    })

# Get all icons
@app.route('/api/icons', methods=['GET'])
def get_icons():
    provider = request.args.get('provider', 'azure')
    
    # First try MongoDB if available
    if mongodb_initialized and icons_collection is not None:
        try:
            icons = list(icons_collection.find({"provider": provider}))
            for icon in icons:
                icon["_id"] = str(icon["_id"])
            
            # Group icons by category
            categories = {}
            for icon in icons:
                category = icon.get("category", "General")
                if category not in categories:
                    categories[category] = {"count": 0, "name": category}
                categories[category]["count"] += 1
            
            return jsonify({
                "success": True,
                "icons": icons,
                "categories": list(categories.values()),
                "storage_type": "mongodb"
            })
        except Exception as e:
            logger.error(f"MongoDB error: {e}")
            # Continue to fallback if MongoDB fails
    
    # Fallback to SQLite if MongoDB unavailable
    return db_fallback.get_icons(provider)

# Delete icon
@app.route('/api/icons/<provider>/<path:filename>', methods=['DELETE'])
def delete_icon(provider, filename):
    # Parse the remaining path to get category and actual filename
    path_parts = filename.split('/')
    if len(path_parts) > 1:
        category = path_parts[0]
        actual_filename = path_parts[-1]
    else:
        category = "General"
        actual_filename = filename
        
    logging.info(f"Deleting icon: provider={provider}, category={category}, filename={actual_filename}")
    
    # Try MongoDB first
    if mongodb_initialized and icons_collection is not None:
        try:
            # Delete from MongoDB
            delete_result = icons_collection.delete_one({"provider": provider, "filename": actual_filename, "category": category})
            mongodb_deleted = delete_result.deleted_count > 0
            logging.info(f"Deleted {delete_result.deleted_count} icon(s) from MongoDB")
        except Exception as e:
            mongodb_deleted = False
            logging.error(f"MongoDB error deleting icon: {e}")
    else:
        mongodb_deleted = False
    
    # Then try SQLite fallback
    try:
        sqlite_result = db_fallback.delete_icon(provider, category, actual_filename)
        sqlite_deleted = sqlite_result.get("success", False)
        logging.info(f"SQLite delete result: {sqlite_result}")
    except Exception as e:
        sqlite_deleted = False
        logging.error(f"SQLite error deleting icon: {e}")
    
    # Delete from storage (local and GCS)
    storage_result = delete_file(actual_filename, provider, category)
    
    return jsonify({
        "success": mongodb_deleted or sqlite_deleted or storage_result.get("success", False),
        "mongodb_deleted": mongodb_deleted,
        "sqlite_deleted": sqlite_deleted,
        "storage_deleted": storage_result.get("success", False),
        "message": f"Icon {actual_filename} deleted from available storage systems"
    })

@app.route('/api/icons/all', methods=['DELETE'])
def delete_all_icons():
    provider = request.args.get('provider')
    
    # Try MongoDB first
    mongodb_deleted = 0
    if mongodb_initialized and icons_collection is not None:
        try:
            query = {}
            if provider:
                query["provider"] = provider
            delete_result = icons_collection.delete_many(query)
            mongodb_deleted = delete_result.deleted_count
            logging.info(f"Deleted {mongodb_deleted} icon(s) from MongoDB")
        except Exception as e:
            logging.error(f"MongoDB error deleting all icons: {e}")
    
    # Then try SQLite fallback
    try:
        sqlite_result = db_fallback.delete_icons(provider)
        sqlite_deleted = sqlite_result.get("deleted_count", 0)
        logging.info(f"Deleted {sqlite_deleted} icon(s) from SQLite")
    except Exception as e:
        sqlite_deleted = 0
        logging.error(f"SQLite error deleting all icons: {e}")
    
    # Return combined results
    return jsonify({
        "success": True,
        "mongodb_deleted": mongodb_deleted,
        "sqlite_deleted": sqlite_deleted,
        "message": f"Deleted {mongodb_deleted + sqlite_deleted} icons from databases"
    })

@app.route('/api/icons/refresh-categories', methods=['POST'])
def refresh_icon_categories():
    provider = request.args.get('provider')
    
    if not provider:
        return jsonify({"success": False, "message": "Provider parameter is required"})
    
    # Update MongoDB categories if available
    mongodb_updated = 0
    if mongodb_initialized and icons_collection is not None:
        try:
            icons = list(icons_collection.find({"provider": provider}))
            
            for icon in icons:
                # Extract category from path or use existing
                icon_id = icon.get("_id")
                path = icon.get("path", "")
                category = "General"
                
                # Extract category from path pattern: /cloudicons/provider/category/filename
                path_match = re.match(r'/cloudicons/[^/]+/([^/]+)/[^/]+', path)
                if path_match:
                    category = path_match.group(1)
                
                # Update category field
                if icon.get("category") != category:
                    icons_collection.update_one(
                        {"_id": icon_id},
                        {"$set": {"category": category}}
                    )
                    mongodb_updated += 1
            
            logging.info(f"Updated {mongodb_updated} icon categories in MongoDB")
        except Exception as e:
            logging.error(f"MongoDB error refreshing categories: {e}")
    
    # Update SQLite categories
    try:
        sqlite_result = db_fallback.refresh_categories(provider)
        sqlite_updated = sqlite_result.get("updated_count", 0)
        logging.info(f"Updated {sqlite_updated} icon categories in SQLite")
    except Exception as e:
        sqlite_updated = 0
        logging.error(f"SQLite error refreshing categories: {e}")
    
    return jsonify({
        "success": True,
        "mongodb_updated": mongodb_updated,
        "sqlite_updated": sqlite_updated,
        "message": f"Updated {mongodb_updated + sqlite_updated} icon categories"
    })

# Save conversation to database (MongoDB or SQLite)
def save_conversation(session_id, message, response):
    """Save a conversation to database with fallback"""
    try:
        # Try MongoDB first
        if mongodb_initialized and conversations_collection is not None:
            conversation_doc = {
                "session_id": session_id,
                "message": message,
                "response": response,
                "timestamp": datetime.datetime.now().isoformat()
            }
            result = conversations_collection.insert_one(conversation_doc)
            logger.info(f"Saved conversation to MongoDB: {result.inserted_id}")
            return str(result.inserted_id)
        
        # Fall back to SQLite
        result = db_fallback.add_conversation(session_id, message, response)
        if result:
            logger.info(f"Saved conversation to SQLite: {result}")
            return result
        
        return None
    except Exception as e:
        logger.error(f"Error saving conversation: {str(e)}")
        return None

# Get conversation history from database (MongoDB or SQLite)
def get_conversation_history(session_id, limit=10):
    """Get conversation history with fallback to SQLite"""
    try:
        # Try MongoDB first
        if mongodb_initialized and conversations_collection is not None:
            try:
                conversations = list(conversations_collection.find(
                    {"session_id": session_id}
                ).sort("timestamp", -1).limit(limit))
                
                # Convert ObjectId to string
                for conv in conversations:
                    if '_id' in conv:
                        conv['_id'] = str(conv['_id'])
                
                if conversations:
                    logger.info(f"Retrieved {len(conversations)} conversations from MongoDB")
                    return conversations
            except Exception as mongo_err:
                logger.error(f"Error retrieving conversations from MongoDB: {str(mongo_err)}")
        
        # Fall back to SQLite
        conversations = db_fallback.get_conversations(session_id, limit)
        if conversations:
            logger.info(f"Retrieved {len(conversations)} conversations from SQLite")
            return conversations
        
        return []
    except Exception as e:
        logger.error(f"Error getting conversation history: {str(e)}")
        return []

# For all other routes, serve the React app
@app.route('/<path:path>')
def catch_all(path):
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/diagrams/upload', methods=['POST'])
def upload_diagram():
    """Handle diagram upload and return a diagram ID."""
    try:
        # Check if 'diagram' file is in the request
        if 'diagram' not in request.files:
            return jsonify({'success': False, 'error': 'No diagram file in request'}), 400
            
        diagram_file = request.files['diagram']
        
        # Check if filename is empty
        if diagram_file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'}), 400
        
        # Check if file is allowed
        allowed_extensions = {'png', 'jpg', 'jpeg', 'svg'}
        file_ext = diagram_file.filename.rsplit('.', 1)[1].lower() if '.' in diagram_file.filename else ''
        
        if file_ext not in allowed_extensions:
            return jsonify({'success': False, 'error': 'File type not allowed. Only PNG, JPEG, and SVG files are accepted.'}), 400
            
        # Generate a safe filename
        safe_filename = secure_filename(diagram_file.filename)
        timestamp = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
        unique_filename = f"{timestamp}_{safe_filename}"
        
        # Determine storage path - local first, then GCS if available
        storage_path = os.path.join(app.config['UPLOAD_FOLDER'], 'diagrams')
        os.makedirs(storage_path, exist_ok=True)
        
        local_path = os.path.join(storage_path, unique_filename)
        
        # Save file locally
        diagram_file.save(local_path)
        
        # Generate a diagram ID
        diagram_id = f"diag_{timestamp}"
        
        # If GCS is available, upload to cloud storage
        gcs_url = None
        if is_gcs_initialized():
            try:
                gcs_path = f"diagrams/uploads/{unique_filename}"
                gcs_url = upload_file(local_path, gcs_path)
                logger.info(f"Uploaded diagram to GCS: {gcs_url}")
            except Exception as e:
                logger.error(f"Failed to upload to GCS: {str(e)}")
                # Continue with local storage only
        
        # Store metadata in MongoDB if available
        if mongodb_initialized and db is not None:
            try:
                diagram_doc = {
                    'filename': safe_filename,
                    'original_name': diagram_file.filename,
                    'path': f"uploads/diagrams/{unique_filename}",
                    'gcs_url': gcs_url,
                    'upload_date': datetime.datetime.now(),
                    'size': os.path.getsize(local_path),
                    'analyzed': False
                }
                
                result = db.diagrams.insert_one(diagram_doc)
                diagram_id = str(result.inserted_id)
                logger.info(f"Stored diagram metadata in MongoDB with ID: {diagram_id}")
            except Exception as e:
                logger.error(f"Failed to store in MongoDB: {str(e)}")
                # Continue with local storage and generated ID
        
        return jsonify({
            'success': True,
            'diagram_id': diagram_id,
            'filename': safe_filename,
            'message': 'Diagram uploaded successfully'
        })
        
    except Exception as e:
        logger.error(f"Error in upload_diagram: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    # Try to connect to MongoDB on startup
    if mongodb_initialized:
        # Initialize MongoDB collections
        icons_collection = db['icons']
        
        # Initialize MongoDB for the AI session module - use the actual function from session.py
        from api.ai.session import init_mongodb
        init_mongodb(db)
        
        # Initialize the AI brain if available
        if ai_brain_imported:
            # init_ai_brain(db) # Commented out as ai_brain.py is empty
            logger.info("AI Brain initialized with MongoDB connection")
    
    # Log GCS status
    if gcs_initialized:
        logger.info("Google Cloud Storage initialized and ready")
    else:
        logger.warning("Google Cloud Storage not initialized - using local storage only")
    
    # Use the FLASK_PORT environment variable if set, otherwise default to 3001
    port = int(os.environ.get('FLASK_PORT', 3001))
    logger.info(f"Starting Flask server on port {port}")
    logger.info(f"Server capabilities: MongoDB: {mongodb_initialized}, GCS: {gcs_initialized}, SQLite: True")
    app.run(host='0.0.0.0', port=port, debug=True) 