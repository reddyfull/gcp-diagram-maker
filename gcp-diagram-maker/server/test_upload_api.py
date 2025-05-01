#!/usr/bin/env python3
import os
import sys
import requests
import zipfile
import tempfile
import logging
import json
from pathlib import Path

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Server URL
SERVER_URL = "http://localhost:3001"

def create_test_zip():
    """Create a test ZIP file with SVG icons organized in categories"""
    # Find a sample SVG file to use
    sample_svg_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
                                 "client", "src", "assets", "favicon.svg")
    
    if not os.path.exists(sample_svg_path):
        logger.error(f"Sample SVG file not found at {sample_svg_path}")
        return None
    
    logger.info(f"Using sample SVG from: {sample_svg_path}")
    
    # Create a temporary directory
    with tempfile.TemporaryDirectory() as temp_dir:
        # Create category folders
        categories = ["Compute", "Storage", "Networking", "Databases"]
        for category in categories:
            category_path = os.path.join(temp_dir, category)
            os.makedirs(category_path, exist_ok=True)
            
            # Copy sample SVG to each category with different names
            for i in range(1, 3):  # 2 icons per category
                icon_name = f"{category.lower()}-test-{i}.svg"
                icon_path = os.path.join(category_path, icon_name)
                
                # Copy the SVG file
                with open(sample_svg_path, "rb") as src_file, open(icon_path, "wb") as dst_file:
                    dst_file.write(src_file.read())
                
                logger.info(f"Created test icon: {icon_path}")
        
        # Create ZIP file
        zip_path = os.path.join(tempfile.gettempdir(), "test_icons.zip")
        with zipfile.ZipFile(zip_path, "w") as zipf:
            for root, _, files in os.walk(temp_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    # Get the relative path from the temp directory
                    rel_path = os.path.relpath(file_path, temp_dir)
                    zipf.write(file_path, rel_path)
        
        logger.info(f"Created test ZIP file at: {zip_path}")
        return zip_path

def upload_icons(zip_path, provider="azure"):
    """Upload icons using the API"""
    url = f"{SERVER_URL}/api/upload/icons"
    
    with open(zip_path, "rb") as zip_file:
        files = {"iconsZip": (os.path.basename(zip_path), zip_file, "application/zip")}
        data = {"provider": provider}
        
        logger.info(f"Uploading icons to {url}")
        response = requests.post(url, files=files, data=data)
        
        if response.status_code == 200:
            logger.info("Upload successful")
            result = response.json()
            logger.info(f"Storage mode: {result.get('storageMode', 'unknown')}")
            logger.info(f"Uploaded {len(result.get('uploadedFiles', []))} icons")
            
            # Print details of first uploaded icon
            if result.get('uploadedFiles'):
                first_icon = result['uploadedFiles'][0]
                logger.info(f"Sample icon details: {json.dumps(first_icon, indent=2)}")
            
            return True
        else:
            logger.error(f"Upload failed with status code {response.status_code}")
            logger.error(f"Response: {response.text}")
            return False

def check_icons_list():
    """Get the list of icons from the API"""
    url = f"{SERVER_URL}/api/icons"
    
    logger.info(f"Getting icons list from {url}")
    response = requests.get(url)
    
    if response.status_code == 200:
        result = response.json()
        logger.info(f"Found {result.get('count', 0)} icons")
        
        # Get category information
        categories = result.get('categories', {})
        if categories:
            logger.info("Categories:")
            for category, count in categories.items():
                logger.info(f"  - {category}: {count} icons")
        
        # Check for cloud URLs
        cloud_urls = 0
        local_urls = 0
        for icon in result.get('icons', []):
            if 'url' in icon and 'storage.googleapis.com' in icon['url']:
                cloud_urls += 1
            else:
                local_urls += 1
        
        logger.info(f"Icons with cloud URLs: {cloud_urls}")
        logger.info(f"Icons with local URLs: {local_urls}")
        
        return True
    else:
        logger.error(f"Failed to get icons with status code {response.status_code}")
        logger.error(f"Response: {response.text}")
        return False

def main():
    """Test the upload API with a test ZIP file"""
    # Check server health
    health_url = f"{SERVER_URL}/api/health"
    logger.info(f"Checking server health at {health_url}")
    
    try:
        health_response = requests.get(health_url)
        if health_response.status_code != 200:
            logger.error(f"Server is not healthy. Status code: {health_response.status_code}")
            return
        
        health_data = health_response.json()
        logger.info(f"Server health: {health_data}")
        
        if not health_data.get('gcs', False):
            logger.warning("GCS is not initialized on the server!")
    except Exception as e:
        logger.error(f"Failed to connect to server: {str(e)}")
        return
    
    # Create test ZIP
    zip_path = create_test_zip()
    if not zip_path:
        logger.error("Failed to create test ZIP file")
        return
    
    # Upload icons
    upload_success = upload_icons(zip_path)
    
    # Check icons list
    if upload_success:
        check_icons_list()
    
    # Clean up
    if zip_path and os.path.exists(zip_path):
        os.remove(zip_path)
        logger.info(f"Removed temporary ZIP file: {zip_path}")

if __name__ == "__main__":
    main() 