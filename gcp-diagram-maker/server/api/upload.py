import os
import tempfile
import zipfile
import logging
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
import shutil
import datetime
import sys

# Import the GCS module
from gcs import upload_file, delete_file, is_gcs_initialized, get_gcs_url, upload_file_to_gcs

logger = logging.getLogger(__name__)

# Create Blueprint
upload_bp = Blueprint('upload', __name__, url_prefix='/api/upload')

# Set the upload folder for temporary files
TEMP_UPLOAD_FOLDER = tempfile.gettempdir()

# Base directory for cloud icons
CLOUDICONS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'public', 'cloudicons')

# Allowed extensions for different file types
ALLOWED_ICON_EXTENSIONS = {'zip'}
ALLOWED_DIAGRAM_EXTENSIONS = {'png', 'jpg', 'jpeg', 'svg'}

def allowed_file(filename, allowed_extensions):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in allowed_extensions

# Get MongoDB-related objects without circular imports
def get_mongo_objects():
    # Try to get from current_app first (we should be in application context)
    # This is the preferred approach when the route is being called
    if current_app and hasattr(current_app, 'mongodb_initialized'):
        mongodb_initialized = current_app.mongodb_initialized
        db = getattr(current_app, 'db', None)
        icons_collection = getattr(current_app, 'icons_collection', None)
        return mongodb_initialized, db, icons_collection
    
    # If not in app context or not set, try to import (but only once)
    try:
        # Avoid circular import by doing it only when needed
        from simple_server import mongodb_initialized, db, icons_collection
        return mongodb_initialized, db, icons_collection
    except ImportError:
        try:
            # Try app.py as fallback
            from app import mongodb_initialized, db, icons_collection
            return mongodb_initialized, db, icons_collection
        except ImportError:
            # Default values if all fails
            return False, None, None

# Upload icons (from ZIP file)
@upload_bp.route('/icons', methods=['POST'])
def upload_icons():
    # Get MongoDB objects without circular imports
    mongodb_initialized, _, icons_collection = get_mongo_objects()
    
    # Check if the post request has the file part
    if 'iconsZip' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['iconsZip']
    
    # If the user does not select a file, the browser submits an
    # empty file without a filename.
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename, ALLOWED_ICON_EXTENSIONS):
        return jsonify({'error': 'Only ZIP files are allowed'}), 400
    
    provider = request.form.get('provider', 'azure')
    if provider not in ['azure', 'aws', 'gcp']:
        return jsonify({'error': 'Invalid provider'}), 400
    
    try:
        # Save the ZIP file to a temporary location
        temp_zip_path = os.path.join(TEMP_UPLOAD_FOLDER, secure_filename(file.filename))
        file.save(temp_zip_path)
        
        # Create a temporary directory for extraction
        temp_extract_dir = os.path.join(TEMP_UPLOAD_FOLDER, f"extract_{provider}_{os.path.basename(temp_zip_path).split('.')[0]}")
        os.makedirs(temp_extract_dir, exist_ok=True)
        
        # Extract the ZIP file
        with zipfile.ZipFile(temp_zip_path, 'r') as zip_ref:
            zip_ref.extractall(temp_extract_dir)
        
        # Ensure the provider directory exists
        provider_dir = os.path.join(CLOUDICONS_DIR, provider)
        os.makedirs(provider_dir, exist_ok=True)
        
        uploaded_files = []
        errors = []
        
        # Process extracted files
        for root, dirs, files in os.walk(temp_extract_dir):
            # Skip the root directory itself
            if root == temp_extract_dir:
                continue
            
            # Determine category from the directory structure
            # The first level directory below the extract dir is the category
            rel_path = os.path.relpath(root, temp_extract_dir)
            category_parts = rel_path.split(os.sep)
            category = category_parts[0] if len(category_parts) > 0 else 'General'
            
            # Ensure category directory exists
            category_dir = os.path.join(provider_dir, category)
            os.makedirs(category_dir, exist_ok=True)
            
            # Process SVG files in the current directory
            for filename in files:
                if filename.lower().endswith('.svg'):
                    source_file = os.path.join(root, filename)
                    dest_file = os.path.join(category_dir, filename)
                    
                    try:
                        # Use our upload_file function that handles both local and GCS storage
                        upload_result = upload_file(
                            source_file, 
                            filename, 
                            provider=provider, 
                            category=category
                        )
                        
                        if not upload_result or not upload_result.get('success'):
                            logger.error(f"Failed to upload {filename}")
                            errors.append({
                                'file': filename,
                                'error': 'Upload failed'
                            })
                            continue
                        
                        # Get the URLs from the upload_result
                        local_url = upload_result.get('local_url')
                        gcs_url = upload_result.get('cloud_url')
                        
                        # Determine storage type
                        storage_type = 'local'
                        if gcs_url:
                            storage_type = 'gcs+local'
                        
                        # Create icon metadata
                        display_name = filename.replace('.svg', '').replace('-', ' ')
                        icon_data = {
                            'filename': filename,
                            'provider': provider,
                            'category': category,
                            'displayName': display_name,
                            'path': local_url,
                            'storage': storage_type,
                            'url': gcs_url if gcs_url else local_url,
                            'gcsPath': f"cloudicons/{provider}/{category}/{filename}" if gcs_url else None,
                            'uploadedAt': datetime.datetime.now()
                        }
                        
                        # Add to MongoDB if available
                        if mongodb_initialized and icons_collection is not None:
                            try:
                                # Check if icon already exists
                                existing_icon = icons_collection.find_one({
                                    'provider': provider,
                                    'filename': filename,
                                    'category': category
                                })
                                
                                if existing_icon:
                                    # Update existing icon
                                    icons_collection.update_one(
                                        {'_id': existing_icon['_id']},
                                        {'$set': icon_data}
                                    )
                                    icon_data['_id'] = str(existing_icon['_id'])
                                else:
                                    # Insert new icon
                                    result = icons_collection.insert_one(icon_data)
                                    icon_data['_id'] = str(result.inserted_id)
                                
                                logger.info(f"Added icon metadata to MongoDB: {filename}")
                                if gcs_url:
                                    storage_type = 'gcs+local+mongodb'
                                else:
                                    storage_type = 'local+mongodb'
                            except Exception as e:
                                logger.error(f"Error adding icon to MongoDB: {str(e)}")
                                errors.append({
                                    'file': filename,
                                    'error': f"MongoDB error: {str(e)}"
                                })
                                
                                # Try SQLite fallback
                                try:
                                    import db_fallback
                                    if hasattr(db_fallback, 'add_icon'):
                                        fallback_result = db_fallback.add_icon({
                                            'filename': filename,
                                            'provider': provider,
                                            'category': category,
                                            'displayName': display_name,
                                            'path': local_url,
                                            'url': gcs_url if gcs_url else local_url,
                                            'storage': storage_type,
                                            'uploadedAt': datetime.datetime.now().isoformat()
                                        })
                                        if fallback_result and fallback_result.get('success'):
                                            icon_id = fallback_result.get('id')
                                            icon_data['_id'] = icon_id
                                            icon_data['storage'] = f"{storage_type}+sqlite"
                                            logger.info(f"Added icon metadata to SQLite fallback with ID: {icon_id}")
                                            # Remove the error since we recovered with SQLite
                                            errors.pop()
                                except Exception as fallback_e:
                                    logger.error(f"Error adding icon to SQLite fallback: {str(fallback_e)}")
                        else:
                            # If MongoDB not available, try SQLite fallback
                            try:
                                import db_fallback
                                if hasattr(db_fallback, 'add_icon'):
                                    fallback_result = db_fallback.add_icon({
                                        'filename': filename,
                                        'provider': provider,
                                        'category': category,
                                        'displayName': display_name,
                                        'path': local_url,
                                        'url': gcs_url if gcs_url else local_url,
                                        'storage': storage_type,
                                        'uploadedAt': datetime.datetime.now().isoformat()
                                    })
                                    if fallback_result and fallback_result.get('success'):
                                        icon_id = fallback_result.get('id')
                                        icon_data['_id'] = icon_id
                                        icon_data['storage'] = f"{storage_type}+sqlite"
                                        logger.info(f"Added icon metadata to SQLite fallback with ID: {icon_id}")
                            except Exception as fallback_e:
                                logger.error(f"Error adding icon to SQLite fallback: {str(fallback_e)}")
                        
                        # Update storage type in the response data
                        icon_data['storage'] = storage_type
                        
                        # Add to uploaded files list
                        uploaded_files.append(icon_data)
                        logger.info(f"Processed {filename} with storage type {storage_type}")
                        
                    except Exception as e:
                        logger.error(f"Error processing {filename}: {str(e)}")
                        errors.append({
                            'file': filename,
                            'error': str(e)
                        })
        
        # Clean up
        if os.path.exists(temp_zip_path):
            os.remove(temp_zip_path)
        if os.path.exists(temp_extract_dir):
            shutil.rmtree(temp_extract_dir)
        
        # Build response
        storage_mode = 'local'
        if is_gcs_initialized():
            storage_mode = 'hybrid'
        if mongodb_initialized and icons_collection is not None:
            if is_gcs_initialized():
                storage_mode = 'hybrid+mongodb'
            else:
                storage_mode = 'local+mongodb'
        
        return jsonify({
            'success': True,
            'uploadedFiles': uploaded_files,
            'errors': errors,
            'storageMode': storage_mode,
            'message': f'Successfully uploaded {len(uploaded_files)} icons'
        })
    
    except Exception as e:
        logger.error(f"Error in upload_icons: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Upload diagram for analysis
@upload_bp.route('/diagram', methods=['POST'])
def upload_diagram():
    # Get MongoDB objects without circular imports
    mongodb_initialized, db, _ = get_mongo_objects()
    diagram_id = None
    db_saved_successfully = False
    
    # Check if the post request has the file part
    if 'diagram' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['diagram']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename, ALLOWED_DIAGRAM_EXTENSIONS):
        return jsonify({'error': 'Only image files (PNG, JPEG, SVG) are allowed'}), 400
    
    try:
        # Create uploads directory if it doesn't exist
        uploads_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'public', 'uploads', 'diagrams')
        os.makedirs(uploads_dir, exist_ok=True)
        
        filename = secure_filename(file.filename)
        timestamp = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
        unique_filename = f"{timestamp}_{filename}"
        file_path = os.path.join(uploads_dir, unique_filename)
        
        file.save(file_path)
        
        upload_result = upload_file(
            file_path,
            unique_filename,
            provider="diagrams",
            category="uploads"
        )
        
        if not upload_result or not upload_result.get('success'):
            logger.error(f"Failed to process uploaded diagram file storage")
            # Clean up local file if storage failed
            if os.path.exists(file_path):
                os.remove(file_path)
            return jsonify({'error': 'Failed to save diagram file'}), 500
        
        local_url = upload_result.get('local_url', f'/uploads/diagrams/{unique_filename}')
        gcs_url = upload_result.get('cloud_url')
        storage_type = 'gcs+local' if gcs_url else 'local'

        # Create diagram metadata (ensuring datetime is handled correctly later)
        diagram_data = {
            'originalName': filename,
            'filename': unique_filename,
            'path': local_url,
            'url': gcs_url if gcs_url else local_url,
            'gcsPath': f"diagrams/uploads/{unique_filename}" if gcs_url else None,
            'mimeType': file.content_type,
            'size': os.path.getsize(file_path),
            'uploadedAt': datetime.datetime.now(), # Keep as datetime for MongoDB
            'storage': storage_type, # Initial storage type
            'analyzed': False,
            'status': 'uploaded'
        }
        
        # Try MongoDB first
        if mongodb_initialized and db is not None:
            try:
                # Create a copy for MongoDB insertion, keeping datetime object
                mongo_data = diagram_data.copy()
                diagrams_collection = db.diagrams
                result = diagrams_collection.insert_one(mongo_data)
                diagram_id = str(result.inserted_id)
                diagram_data['_id'] = diagram_id # Add ID back to original dict for response
                
                # Update storage type to include mongodb
                if gcs_url:
                    diagram_data['storage'] = 'gcs+local+mongodb'
                else:
                    diagram_data['storage'] = 'local+mongodb'
                    
                logger.info(f"Added diagram metadata to MongoDB with ID: {diagram_id}")
                db_saved_successfully = True # Mark as saved
            except Exception as e:
                logger.error(f"Error adding diagram to MongoDB (will attempt SQLite fallback): {str(e)}")
                # Don't set db_saved_successfully = False here, proceed to fallback
        
        # If MongoDB failed or wasn't initialized, try SQLite fallback
        if not db_saved_successfully:
            logger.warning("Attempting to save diagram metadata to SQLite fallback.")
            try:
                import db_fallback
                if hasattr(db_fallback, 'add_diagram'):
                    # Prepare data for SQLite, converting datetime to ISO string
                    sqlite_data = diagram_data.copy()
                    # IMPORTANT: Convert datetime to ISO string HERE
                    if isinstance(sqlite_data.get('uploadedAt'), datetime.datetime):
                        sqlite_data['uploadedAt'] = sqlite_data['uploadedAt'].isoformat()
                    else:
                         # If it's somehow already a string or None, handle it
                         sqlite_data['uploadedAt'] = str(sqlite_data.get('uploadedAt')) if sqlite_data.get('uploadedAt') else None
                    
                    # Ensure a unique ID for SQLite if MongoDB didn't provide one
                    sqlite_diagram_id = diagram_id if diagram_id else f"diag_{datetime.datetime.now().strftime('%Y%m%d%H%M%S%f')}"
                    
                    fallback_result = db_fallback.add_diagram({
                        'diagram_id': sqlite_diagram_id,
                        'name': sqlite_data.get('originalName', 'Diagram'),
                        'description': f"Uploaded diagram {sqlite_data.get('originalName')}",
                        # Pass the *entire* sqlite_data dict (with ISO date) to be JSON serialized by db_fallback
                        'data': sqlite_data
                    })
                    
                    if fallback_result and fallback_result.get('success'):
                        # Use the ID returned or generated by the fallback
                        diagram_id = fallback_result.get('id', sqlite_diagram_id)
                        diagram_data['_id'] = diagram_id
                        # Update storage type to reflect SQLite
                        if gcs_url:
                            diagram_data['storage'] = 'sqlite+gcs+local'
                        else:
                            diagram_data['storage'] = 'sqlite+local'
                        logger.info(f"Added diagram metadata to SQLite fallback with ID: {diagram_id}")
                        db_saved_successfully = True # Mark as saved via fallback
                    else:
                        # Log the specific failure from db_fallback
                        logger.error(f"SQLite fallback add_diagram failed: {fallback_result.get('message', 'Unknown error')}")
                        # db_saved_successfully remains False
                else:
                    logger.error("SQLite fallback module or add_diagram function not found.")
                    # db_saved_successfully remains False
            except Exception as fallback_e:
                logger.error(f"Exception during SQLite fallback attempt: {str(fallback_e)}")
                # db_saved_successfully remains False
        # --- End Database Saving Logic ---

        # Check if metadata was saved anywhere successfully
        if not db_saved_successfully:
            logger.error("Failed to save diagram metadata to both MongoDB and SQLite fallback.")
            # Clean up the uploaded file if metadata saving failed
            if os.path.exists(file_path):
                os.remove(file_path)
            # Consider deleting from GCS as well if needed
            # if gcs_url and diagram_data.get('gcsPath'): delete_file(...)
            return jsonify({'error': 'Failed to save diagram metadata after upload'}), 500 # Return 500 error

        # If no ID was generated by DBs (shouldn't happen if db_saved_successfully is True, but as safety)
        if not diagram_id:
            diagram_id = f"fallback_{timestamp}"
            diagram_data['_id'] = diagram_id
            logger.warning(f"Generated fallback ID as no DB ID was obtained: {diagram_id}")

        # Return success response ONLY if metadata was saved
        return jsonify({
            'success': True,
            'diagram': diagram_data, # Return the data with potentially updated storage type and ID
            'diagramId': diagram_id,
            'storage': diagram_data['storage'], # Use the potentially updated storage type
            'message': 'Diagram uploaded and metadata saved successfully',
            'next_steps': {
                'analyze': {
                    'url': f'/api/ai/diagram/analyze',
                    'method': 'POST',
                    'body': {'diagram_id': diagram_id}
                }
            }
        }), 200 # Return 200 OK only on full success

    except Exception as e:
        logger.error(f"Unhandled exception in upload_diagram: {str(e)}", exc_info=True) # Log traceback
        return jsonify({'error': f'An unexpected server error occurred: {str(e)}'}), 500 