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

def create_test_zip(provider):
    """Create a test ZIP file with SVG icons organized in categories for a specific provider"""
    # Find a sample SVG file to use
    sample_svg_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
                                 "client", "src", "assets", "favicon.svg")
    
    if not os.path.exists(sample_svg_path):
        logger.error(f"Sample SVG file not found at {sample_svg_path}")
        return None
    
    logger.info(f"Using sample SVG from: {sample_svg_path}")
    
    # Create categories based on provider
    categories = {
        "aws": ["Compute", "Storage", "Networking", "Databases", "Security"],
        "gcp": ["Compute", "Storage", "Networking", "Databases", "AI"]
    }
    
    if provider not in categories:
        logger.error(f"Unknown provider: {provider}")
        return None
    
    provider_categories = categories[provider]
    
    # Create a temporary directory
    with tempfile.TemporaryDirectory() as temp_dir:
        # Create category folders
        for category in provider_categories:
            category_path = os.path.join(temp_dir, category)
            os.makedirs(category_path, exist_ok=True)
            
            # Copy sample SVG to each category with provider-specific names
            for i in range(1, 4):  # 3 icons per category
                if provider == "aws":
                    if category == "Compute":
                        icon_names = [f"ec2-{i}.svg", f"lambda-{i}.svg", f"fargate-{i}.svg"]
                    elif category == "Storage":
                        icon_names = [f"s3-{i}.svg", f"ebs-{i}.svg", f"efs-{i}.svg"]
                    elif category == "Networking":
                        icon_names = [f"vpc-{i}.svg", f"route53-{i}.svg", f"elb-{i}.svg"]
                    elif category == "Databases":
                        icon_names = [f"rds-{i}.svg", f"dynamodb-{i}.svg", f"aurora-{i}.svg"]
                    else:
                        icon_names = [f"{category.lower()}-{i}.svg"]
                else:  # GCP
                    if category == "Compute":
                        icon_names = [f"compute-engine-{i}.svg", f"cloud-run-{i}.svg", f"gke-{i}.svg"]
                    elif category == "Storage":
                        icon_names = [f"cloud-storage-{i}.svg", f"persistent-disk-{i}.svg", f"filestore-{i}.svg"]
                    elif category == "Networking":
                        icon_names = [f"vpc-{i}.svg", f"load-balancer-{i}.svg", f"cloud-dns-{i}.svg"]
                    elif category == "Databases":
                        icon_names = [f"cloud-sql-{i}.svg", f"spanner-{i}.svg", f"firestore-{i}.svg"]
                    else:
                        icon_names = [f"{category.lower()}-{i}.svg"]
                
                for icon_name in icon_names:
                    icon_path = os.path.join(category_path, icon_name)
                    
                    # Copy the SVG file
                    with open(sample_svg_path, "rb") as src_file, open(icon_path, "wb") as dst_file:
                        dst_file.write(src_file.read())
                    
                    logger.info(f"Created test icon for {provider}: {icon_path}")
        
        # Create ZIP file
        zip_path = os.path.join(tempfile.gettempdir(), f"{provider}_test_icons.zip")
        with zipfile.ZipFile(zip_path, "w") as zipf:
            for root, _, files in os.walk(temp_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    # Get the relative path from the temp directory
                    rel_path = os.path.relpath(file_path, temp_dir)
                    zipf.write(file_path, rel_path)
        
        logger.info(f"Created test ZIP file for {provider} at: {zip_path}")
        return zip_path

def upload_icons(zip_path, provider):
    """Upload icons using the API"""
    url = f"{SERVER_URL}/api/upload/icons"
    
    with open(zip_path, "rb") as zip_file:
        files = {"iconsZip": (os.path.basename(zip_path), zip_file, "application/zip")}
        data = {"provider": provider}
        
        logger.info(f"Uploading {provider} icons to {url}")
        response = requests.post(url, files=files, data=data)
        
        if response.status_code == 200:
            logger.info(f"{provider} upload successful")
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

def check_icons_list(provider):
    """Get the list of icons from the API for a specific provider"""
    url = f"{SERVER_URL}/api/icons?provider={provider}"
    
    logger.info(f"Getting {provider} icons list from {url}")
    response = requests.get(url)
    
    if response.status_code == 200:
        result = response.json()
        logger.info(f"Found {result.get('count', 0)} {provider} icons")
        
        # Get category information
        categories = result.get('categories', {})
        if categories:
            logger.info(f"{provider} categories:")
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
        
        logger.info(f"{provider} icons with cloud URLs: {cloud_urls}")
        logger.info(f"{provider} icons with local URLs: {local_urls}")
        
        return True
    else:
        logger.error(f"Failed to get {provider} icons with status code {response.status_code}")
        logger.error(f"Response: {response.text}")
        return False

def main():
    """Test the upload API with test ZIP files for AWS and GCP"""
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
    
    # Process AWS
    aws_zip_path = create_test_zip("aws")
    if aws_zip_path:
        aws_upload_success = upload_icons(aws_zip_path, "aws")
        if aws_upload_success:
            check_icons_list("aws")
        
        # Clean up
        if aws_zip_path and os.path.exists(aws_zip_path):
            os.remove(aws_zip_path)
            logger.info(f"Removed temporary AWS ZIP file: {aws_zip_path}")
    
    # Process GCP
    gcp_zip_path = create_test_zip("gcp")
    if gcp_zip_path:
        gcp_upload_success = upload_icons(gcp_zip_path, "gcp")
        if gcp_upload_success:
            check_icons_list("gcp")
        
        # Clean up
        if gcp_zip_path and os.path.exists(gcp_zip_path):
            os.remove(gcp_zip_path)
            logger.info(f"Removed temporary GCP ZIP file: {gcp_zip_path}")

if __name__ == "__main__":
    main() 