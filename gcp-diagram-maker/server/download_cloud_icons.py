#!/usr/bin/env python3
import os
import sys
import logging
import requests
import zipfile
import tempfile
import shutil
import json
import time
from pathlib import Path

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("download_cloud_icons")

# Path to local cloudicons directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLOUDICONS_DIR = os.path.join(BASE_DIR, "public", "cloudicons")

# Icon sources
ICON_SOURCES = {
    "azure": {
        "url": "https://github.com/microsoft/azure-icons/archive/refs/heads/main.zip",
        "mapping": {
            "AI + Machine Learning": "AI",
            "Analytics": "Analytics",
            "Compute": "Compute",
            "Containers": "Containers",
            "Databases": "Databases",
            "DevOps": "DevOps",
            "General": "General",
            "Identity": "Identity",
            "Integration": "Integration",
            "IoT": "IoT",
            "Management + Governance": "Management",
            "Mixed Reality": "MixedReality",
            "Mobile": "Mobile",
            "Networking": "Networking",
            "Security": "Security",
            "Storage": "Storage",
            "Web": "Web"
        }
    },
    "aws": {
        "url": "https://d1.awsstatic.com/webteam/architecture-icons/q1-2024/Asset-Package_01312024.c893ec2a11b44ea8e7aefe88bb94d537da495b28.zip",
        "mapping": {
            "Analytics": "Analytics",
            "Application Integration": "Integration",
            "Blockchain": "Blockchain",
            "Business Applications": "Business",
            "Cloud Financial Management": "Finance",
            "Compute": "Compute",
            "Containers": "Containers",
            "Database": "Databases",
            "Developer Tools": "DevTools",
            "End User Computing": "EndUser",
            "Front-End Web Mobile": "Web",
            "Game Tech": "Gaming",
            "Internet of Things": "IoT",
            "Machine Learning": "ML",
            "Management Governance": "Management",
            "Media Services": "Media",
            "Migration Transfer": "Migration",
            "Networking Content Delivery": "Networking",
            "Quantum Technologies": "Quantum",
            "Robotics": "Robotics",
            "Satellite": "Satellite",
            "Security Identity Compliance": "Security",
            "Storage": "Storage",
            "VR AR": "VR"
        }
    },
    "gcp": {
        "url": "https://github.com/GoogleCloudPlatform/icons/archive/refs/heads/main.zip",
        "mapping": {
            "products": {
                "AI & Machine Learning": "AI",
                "API Management": "API",
                "Compute": "Compute",
                "Containers": "Containers",
                "Data Analytics": "Analytics",
                "Databases": "Databases",
                "Developer Tools": "DevTools",
                "Healthcare & Life Sciences": "Healthcare",
                "Hybrid & Multi-cloud": "Hybrid",
                "Identity & Security": "Security",
                "Internet of Things": "IoT",
                "Management Tools": "Management",
                "Media & Gaming": "Media",
                "Migration": "Migration",
                "Networking": "Networking",
                "Operations": "Operations",
                "Security": "Security",
                "Serverless Computing": "Serverless",
                "Storage": "Storage",
                "Web Hosting": "Web"
            }
        }
    }
}

def download_file(url, destination):
    """Download a file from URL to destination"""
    try:
        logger.info(f"Downloading {url} to {destination}")
        response = requests.get(url, stream=True)
        response.raise_for_status()
        
        with open(destination, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        logger.info(f"Download completed: {destination}")
        return True
    except Exception as e:
        logger.error(f"Error downloading {url}: {str(e)}")
        return False

def extract_azure_icons(zip_path):
    """Extract Azure icons and organize by category"""
    temp_dir = tempfile.mkdtemp()
    provider_dir = os.path.join(CLOUDICONS_DIR, "azure")
    
    try:
        # Extract zip file
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(temp_dir)
        
        # Navigate to the icons directory
        base_dir = os.path.join(temp_dir, "azure-icons-main", "icons")
        
        # Process each category
        for category_name, mapped_name in ICON_SOURCES["azure"]["mapping"].items():
            category_dir = os.path.join(base_dir, category_name)
            if os.path.exists(category_dir):
                # Create category directory in cloudicons
                output_dir = os.path.join(provider_dir, mapped_name)
                os.makedirs(output_dir, exist_ok=True)
                
                # Copy SVG files
                svg_files = [f for f in os.listdir(category_dir) if f.endswith(".svg")]
                for svg_file in svg_files:
                    src_path = os.path.join(category_dir, svg_file)
                    dst_path = os.path.join(output_dir, svg_file)
                    shutil.copy2(src_path, dst_path)
                
                logger.info(f"Copied {len(svg_files)} Azure icons for category {mapped_name}")
    
    except Exception as e:
        logger.error(f"Error extracting Azure icons: {str(e)}")
    
    finally:
        # Clean up
        shutil.rmtree(temp_dir)

def extract_aws_icons(zip_path):
    """Extract AWS icons and organize by category"""
    temp_dir = tempfile.mkdtemp()
    provider_dir = os.path.join(CLOUDICONS_DIR, "aws")
    
    try:
        # Extract zip file
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(temp_dir)
        
        # Process each category
        base_dirs = [d for d in os.listdir(temp_dir) if os.path.isdir(os.path.join(temp_dir, d))]
        
        svg_count = 0
        for category_name, mapped_name in ICON_SOURCES["aws"]["mapping"].items():
            # Create category directory in cloudicons
            output_dir = os.path.join(provider_dir, mapped_name)
            os.makedirs(output_dir, exist_ok=True)
            
            # Look for category in Architecture-Service folder
            for base_dir in base_dirs:
                arch_service_dir = os.path.join(temp_dir, base_dir, "Architecture-Service-Icons")
                
                if os.path.exists(arch_service_dir):
                    category_dir = os.path.join(arch_service_dir, category_name)
                    
                    if os.path.exists(category_dir):
                        # Look for 64 or 48 sized icons
                        for size in ["64", "48"]:
                            size_dir = os.path.join(category_dir, size)
                            if os.path.exists(size_dir):
                                svg_files = [f for f in os.listdir(size_dir) if f.endswith(".svg")]
                                for svg_file in svg_files:
                                    src_path = os.path.join(size_dir, svg_file)
                                    dst_path = os.path.join(output_dir, svg_file)
                                    # Only copy if not already exists
                                    if not os.path.exists(dst_path):
                                        shutil.copy2(src_path, dst_path)
                                        svg_count += 1
                                
                                if svg_files:
                                    logger.info(f"Copied AWS icons for category {mapped_name} (size {size})")
                                    break  # If we found icons in this size, no need to check other sizes
    
        logger.info(f"Copied a total of {svg_count} AWS icons")
    
    except Exception as e:
        logger.error(f"Error extracting AWS icons: {str(e)}")
    
    finally:
        # Clean up
        shutil.rmtree(temp_dir)

def extract_gcp_icons(zip_path):
    """Extract GCP icons and organize by category"""
    temp_dir = tempfile.mkdtemp()
    provider_dir = os.path.join(CLOUDICONS_DIR, "gcp")
    
    try:
        # Extract zip file
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(temp_dir)
        
        # Navigate to the icons directory
        base_dir = os.path.join(temp_dir, "icons-main", "svg")
        products_dir = os.path.join(base_dir, "products")
        
        # Process product categories
        if os.path.exists(products_dir):
            svg_count = 0
            for category_name, mapped_name in ICON_SOURCES["gcp"]["mapping"]["products"].items():
                category_dir = os.path.join(products_dir, category_name)
                if os.path.exists(category_dir):
                    # Create category directory in cloudicons
                    output_dir = os.path.join(provider_dir, mapped_name)
                    os.makedirs(output_dir, exist_ok=True)
                    
                    # Process each svg file and subdirectories
                    for root, dirs, files in os.walk(category_dir):
                        for file in files:
                            if file.endswith(".svg"):
                                src_path = os.path.join(root, file)
                                dst_path = os.path.join(output_dir, file)
                                
                                # Only copy if not already exists
                                if not os.path.exists(dst_path):
                                    shutil.copy2(src_path, dst_path)
                                    svg_count += 1
                    
                    logger.info(f"Copied GCP icons for category {mapped_name}")
            
            logger.info(f"Copied a total of {svg_count} GCP icons")
    
    except Exception as e:
        logger.error(f"Error extracting GCP icons: {str(e)}")
    
    finally:
        # Clean up
        shutil.rmtree(temp_dir)

def download_and_process_icons():
    """Download and process icons for all providers"""
    # Create base directory
    os.makedirs(CLOUDICONS_DIR, exist_ok=True)
    
    # Process each provider
    for provider, source in ICON_SOURCES.items():
        logger.info(f"Processing {provider} icons")
        
        # Create provider directory
        provider_dir = os.path.join(CLOUDICONS_DIR, provider)
        os.makedirs(provider_dir, exist_ok=True)
        
        # Download zip file
        temp_zip = os.path.join(tempfile.gettempdir(), f"{provider}_icons.zip")
        if download_file(source["url"], temp_zip):
            # Extract and process icons
            if provider == "azure":
                extract_azure_icons(temp_zip)
            elif provider == "aws":
                extract_aws_icons(temp_zip)
            elif provider == "gcp":
                extract_gcp_icons(temp_zip)
            
            # Clean up
            os.remove(temp_zip)
        
        logger.info(f"Completed processing {provider} icons")

def main():
    """Main function"""
    logger.info("Starting cloud icons download process")
    download_and_process_icons()
    logger.info("Cloud icons download process completed")

if __name__ == "__main__":
    main() 