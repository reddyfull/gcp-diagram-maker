#!/usr/bin/env python3
import os
import sys
import logging
import json
import time
import zipfile
import tempfile
from pathlib import Path
from pymongo import MongoClient
from datetime import datetime

# Add server directory to path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Import GCS functions
from gcs import (
    init_gcs, 
    upload_file_to_gcs, 
    is_gcs_initialized, 
    ensure_local_storage,
    BUCKET_NAME
)

# MongoDB functions - adapt from simple_server.py
mongodb_client = None
mongodb_db = None

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("upload_icons_gcs")

# Path to local cloudicons directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLOUDICONS_DIR = os.path.join(BASE_DIR, "public", "cloudicons")
MONGODB_URI = os.environ.get("MONGODB_URI", "mongodb+srv://sridraw:sri%40dip2024@sridraw.rpkmj.mongodb.net/?retryWrites=true&w=majority&appName=sridraw")
MONGODB_DB_NAME = os.environ.get("MONGODB_DB_NAME", "azure_diagram_maker")

def init_mongodb():
    """Initialize MongoDB connection"""
    global mongodb_client, mongodb_db
    
    try:
        logger.info("Connecting to MongoDB Atlas...")
        mongodb_client = MongoClient(MONGODB_URI)
        mongodb_db = mongodb_client[MONGODB_DB_NAME]
        
        # Test connection
        mongodb_client.admin.command('ping')
        logger.info("Successfully connected to MongoDB Atlas")
        return True
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {str(e)}")
        mongodb_client = None
        mongodb_db = None
        return False

def get_local_icons():
    """Get all local icon files structured by provider and category"""
    icons = {}
    
    if not os.path.exists(CLOUDICONS_DIR):
        logger.error(f"Cloudicons directory not found: {CLOUDICONS_DIR}")
        return icons
    
    # Iterate through provider directories
    for provider in os.listdir(CLOUDICONS_DIR):
        provider_path = os.path.join(CLOUDICONS_DIR, provider)
        
        if os.path.isdir(provider_path):
            icons[provider] = {}
            
            # Iterate through category directories
            for category in os.listdir(provider_path):
                category_path = os.path.join(provider_path, category)
                
                if os.path.isdir(category_path):
                    icons[provider][category] = []
                    
                    # Get all SVG files in the category
                    for filename in os.listdir(category_path):
                        if filename.endswith(".svg"):
                            file_path = os.path.join(category_path, filename)
                            relative_path = os.path.join("cloudicons", provider, category, filename)
                            
                            icons[provider][category].append({
                                "filename": filename,
                                "path": file_path,
                                "relative_path": relative_path,
                                "provider": provider,
                                "category": category,
                                "displayName": os.path.splitext(filename)[0].replace("-", " ").replace("_", " ").title()
                            })
    
    return icons

def update_mongodb_metadata(icon_data, gcs_url):
    """Update or create icon metadata in MongoDB"""
    if mongodb_db is None:
        logger.warning("MongoDB not initialized, skipping metadata update")
        return False
    
    try:
        # Check if icon already exists
        existing_icon = mongodb_db.icons.find_one({
            "filename": icon_data["filename"],
            "provider": icon_data["provider"],
            "category": icon_data["category"]
        })
        
        metadata = {
            "filename": icon_data["filename"],
            "provider": icon_data["provider"],
            "category": icon_data["category"],
            "displayName": icon_data["displayName"],
            "storageType": "cloud",
            "url": gcs_url,
            "updatedAt": datetime.now()
        }
        
        if existing_icon:
            # Update existing icon
            result = mongodb_db.icons.update_one(
                {"_id": existing_icon["_id"]},
                {"$set": metadata}
            )
            logger.debug(f"Updated icon metadata for {icon_data['filename']}")
            return True
        else:
            # Insert new icon
            metadata["createdAt"] = datetime.now()
            result = mongodb_db.icons.insert_one(metadata)
            logger.debug(f"Added icon metadata to MongoDB with ID: {result.inserted_id}")
            return True
            
    except Exception as e:
        logger.error(f"Error updating MongoDB metadata for {icon_data['filename']}: {str(e)}")
        return False

def upload_icons_to_gcs():
    """Upload all local icons to GCS and update their metadata in MongoDB"""
    if not is_gcs_initialized():
        logger.error("GCS not initialized. Cannot upload icons.")
        return False
    
    # Get all local icons
    icons = get_local_icons()
    
    if not icons:
        logger.warning("No local icons found to upload.")
        return False
    
    total_icons = 0
    uploaded_count = 0
    metadata_updated_count = 0
    
    # Process each provider
    for provider, categories in icons.items():
        logger.info(f"Processing {provider} icons...")
        
        # Process each category
        for category, icon_list in categories.items():
            logger.info(f"  Category: {category} - {len(icon_list)} icons")
            total_icons += len(icon_list)
            
            # Process each icon
            for icon in icon_list:
                try:
                    # Upload to GCS
                    gcs_path = f"cloudicons/{provider}/{category}/{icon['filename']}"
                    success, gcs_url = upload_file_to_gcs(icon["path"], gcs_path)
                    
                    if success:
                        uploaded_count += 1
                        logger.info(f"Uploaded to GCS: {gcs_path}")
                        
                        # Update MongoDB metadata
                        if update_mongodb_metadata(icon, gcs_url):
                            metadata_updated_count += 1
                    else:
                        logger.error(f"Failed to upload {icon['filename']} to GCS")
                
                except Exception as e:
                    logger.error(f"Error processing icon {icon['filename']}: {str(e)}")
    
    logger.info(f"Upload completed: {uploaded_count}/{total_icons} icons uploaded to GCS")
    logger.info(f"Metadata updated: {metadata_updated_count}/{total_icons} icons updated in MongoDB")
    
    return uploaded_count > 0

def upload_batch_with_zip(zip_path, provider):
    """Upload icons from a zip file to GCS"""
    if not is_gcs_initialized():
        logger.error("GCS not initialized. Cannot upload icons.")
        return False
    
    temp_dir = tempfile.mkdtemp()
    uploaded_count = 0
    metadata_updated_count = 0
    
    try:
        # Extract zip file
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(temp_dir)
        
        # Process extracted files
        for category in os.listdir(temp_dir):
            category_path = os.path.join(temp_dir, category)
            
            if os.path.isdir(category_path):
                logger.info(f"Processing category: {category}")
                
                # Ensure local storage exists
                local_dir = os.path.join(CLOUDICONS_DIR, provider, category)
                os.makedirs(local_dir, exist_ok=True)
                
                # Process each SVG file
                for filename in os.listdir(category_path):
                    if filename.endswith(".svg"):
                        file_path = os.path.join(category_path, filename)
                        
                        # Copy to local storage first
                        local_file_path = os.path.join(local_dir, filename)
                        with open(file_path, 'rb') as src_file:
                            file_content = src_file.read()
                            with open(local_file_path, 'wb') as dst_file:
                                dst_file.write(file_content)
                        
                        # Upload to GCS
                        gcs_path = f"cloudicons/{provider}/{category}/{filename}"
                        success, gcs_url = upload_file_to_gcs(file_path, gcs_path)
                        
                        if success:
                            uploaded_count += 1
                            logger.info(f"Uploaded to GCS: {gcs_path}")
                            
                            # Update MongoDB metadata
                            icon_data = {
                                "filename": filename,
                                "provider": provider,
                                "category": category,
                                "displayName": os.path.splitext(filename)[0].replace("-", " ").replace("_", " ").title(),
                                "path": local_file_path,
                                "relative_path": os.path.join("cloudicons", provider, category, filename)
                            }
                            
                            if update_mongodb_metadata(icon_data, gcs_url):
                                metadata_updated_count += 1
                        else:
                            logger.error(f"Failed to upload {filename} to GCS")
        
        logger.info(f"Batch upload completed: {uploaded_count} icons uploaded to GCS")
        logger.info(f"Metadata updated: {metadata_updated_count} icons updated in MongoDB")
        
        return uploaded_count > 0
    
    except Exception as e:
        logger.error(f"Error processing zip file: {str(e)}")
        return False
    
    finally:
        # Clean up
        import shutil
        shutil.rmtree(temp_dir)

def main():
    """Main function"""
    logger.info("Starting icon upload process to GCS")
    
    # Initialize GCS
    if not is_gcs_initialized():
        logger.error("GCS not initialized. Cannot proceed.")
        return
    
    # Initialize MongoDB
    mongodb_initialized = init_mongodb()
    if not mongodb_initialized:
        logger.warning("MongoDB not initialized. Will continue with local metadata only.")
    
    # Upload icons to GCS
    success = upload_icons_to_gcs()
    
    if success:
        logger.info("Icon upload to GCS completed successfully")
    else:
        logger.error("Icon upload to GCS failed or no icons were uploaded")
    
    logger.info("Icon upload process completed")

if __name__ == "__main__":
    main() 