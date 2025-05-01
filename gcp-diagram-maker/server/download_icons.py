#!/usr/bin/env python3
import os
import sys
import requests
import zipfile
import tempfile
import shutil
import logging
from tqdm import tqdm
import json
import time

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("download_icons")

# Base URLs and icon sources
ICON_SOURCES = {
    "azure": {
        "url": "https://learn.microsoft.com/en-us/azure/architecture/icons/",
        "download_url": "https://download.microsoft.com/download/1/0/9/1094C591-9B6F-42E0-B511-48C179995121/Azure_Public_Service_Icons_2023.zip",
        "categories": {
            "Compute": [
                "Virtual Machines", "App Service", "Container Instances", "Kubernetes Service",
                "Functions", "Batch", "Service Fabric"
            ],
            "Storage": [
                "Storage Accounts", "Data Lake Storage", "Blob Storage", "Queue Storage",
                "Table Storage", "Disk Storage"
            ],
            "Networking": [
                "Virtual Networks", "Load Balancer", "Application Gateway", "VPN Gateway",
                "DNS", "Traffic Manager", "CDN", "Express Route"
            ],
            "Databases": [
                "SQL Database", "Cosmos DB", "Cache for Redis", "MySQL", "PostgreSQL"
            ]
        }
    },
    "aws": {
        "url": "https://aws.amazon.com/architecture/icons/",
        "download_url": "https://d1.awsstatic.com/asset-repository/products/aws-icons/AWS-Architecture-Assets-10-2023.1bf3fd73fd86c182fc5f36f3ee2bb18c97a48fb9.zip",
        "categories": {
            "Compute": [
                "EC2", "Lambda", "Fargate", "Elastic Beanstalk", "Lightsail"
            ],
            "Storage": [
                "S3", "EBS", "EFS", "FSx", "S3 Glacier"
            ],
            "Networking": [
                "VPC", "Route 53", "CloudFront", "API Gateway", "Direct Connect"
            ],
            "Databases": [
                "RDS", "DynamoDB", "Aurora", "ElastiCache", "Neptune"
            ]
        }
    },
    "gcp": {
        "url": "https://cloud.google.com/icons",
        "download_url": "https://cloud.google.com/icons/files/google-cloud-icons.zip",
        "categories": {
            "Compute": [
                "Compute Engine", "Cloud Run", "Cloud Functions", "Kubernetes Engine", "App Engine"
            ],
            "Storage": [
                "Cloud Storage", "Persistent Disk", "Filestore"
            ],
            "Networking": [
                "Virtual Private Cloud", "Cloud Load Balancing", "Cloud CDN", "Cloud DNS"
            ],
            "Databases": [
                "Cloud SQL", "Cloud Spanner", "Firestore", "Bigtable", "Memorystore"
            ]
        }
    }
}

# Directory to store downloaded zip files and extracted icons
TEMP_DIR = tempfile.mkdtemp()
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "cloudicons")

def download_file(url, output_path):
    """Download file from URL with progress bar"""
    try:
        logger.info(f"Downloading {url}")
        response = requests.get(url, stream=True)
        response.raise_for_status()

        total_size = int(response.headers.get('content-length', 0))
        block_size = 1024 # 1 Kibibyte
        progress_bar = tqdm(total=total_size, unit='iB', unit_scale=True)

        with open(output_path, 'wb') as f:
            for data in response.iter_content(block_size):
                progress_bar.update(len(data))
                f.write(data)
        progress_bar.close()
        
        if total_size != 0 and progress_bar.n != total_size:
            logger.warning("Downloaded size doesn't match expected size")
            
        return True
    except Exception as e:
        logger.error(f"Error downloading file: {str(e)}")
        return False

def process_azure_icons(extracted_dir):
    """Process Azure icons into categories"""
    source_dir = os.path.join(extracted_dir, "Azure_Public_Service_Icons")
    target_dir = os.path.join(OUTPUT_DIR, "azure")
    
    # Create category directories
    for category in ICON_SOURCES["azure"]["categories"]:
        os.makedirs(os.path.join(target_dir, category), exist_ok=True)
    
    # Map of category patterns to target categories
    category_mapping = {
        "Compute": ["Virtual Machines", "App Service", "Container", "Kubernetes", "Function", "Batch", "Service Fabric"],
        "Storage": ["Storage", "Data Lake", "Blob", "Queue", "Table", "Disk"],
        "Networking": ["Virtual Network", "Load Balancer", "Application Gateway", "VPN Gateway", "DNS", "Traffic Manager", "CDN", "Express Route"],
        "Databases": ["SQL", "Cosmos DB", "Redis", "MySQL", "PostgreSQL"]
    }
    
    # Process all SVG files
    count = 0
    for root, _, files in os.walk(source_dir):
        for file in files:
            if file.endswith(".svg"):
                # Determine category
                target_category = "Other"
                for category, patterns in category_mapping.items():
                    for pattern in patterns:
                        if pattern.lower() in file.lower() or pattern.lower() in root.lower():
                            target_category = category
                            break
                    if target_category != "Other":
                        break
                
                # Copy file to appropriate category
                source_path = os.path.join(root, file)
                target_path = os.path.join(target_dir, target_category, file)
                try:
                    shutil.copy2(source_path, target_path)
                    count += 1
                except Exception as e:
                    logger.error(f"Error copying {file} to {target_category}: {str(e)}")
    
    logger.info(f"Processed {count} Azure icons")
    return count

def process_aws_icons(extracted_dir):
    """Process AWS icons into categories"""
    source_dir = os.path.join(extracted_dir, "Architecture-Service-Icons")
    target_dir = os.path.join(OUTPUT_DIR, "aws")
    
    # Create category directories
    for category in ICON_SOURCES["aws"]["categories"]:
        os.makedirs(os.path.join(target_dir, category), exist_ok=True)
    
    # Map of icon names to target categories
    category_mapping = {
        "Compute": ["ec2", "lambda", "fargate", "elastic-beanstalk", "lightsail", "batch"],
        "Storage": ["s3", "ebs", "efs", "fsx", "glacier", "storage"],
        "Networking": ["vpc", "route-53", "cloudfront", "api-gateway", "direct-connect"],
        "Databases": ["rds", "dynamodb", "aurora", "elasticache", "neptune", "database"]
    }
    
    # Process all SVG files
    count = 0
    for root, _, files in os.walk(source_dir):
        for file in files:
            if file.endswith(".svg") and "64" in file:  # Use 64px icons
                # Determine category
                target_category = "Other"
                for category, patterns in category_mapping.items():
                    for pattern in patterns:
                        if pattern.lower() in file.lower():
                            target_category = category
                            break
                    if target_category != "Other":
                        break
                
                # Extract service name and clean filename
                service_name = file.split("-")[0] if "-" in file else file.replace(".svg", "")
                clean_filename = f"{service_name.lower()}.svg"
                
                # Copy file to appropriate category
                source_path = os.path.join(root, file)
                target_path = os.path.join(target_dir, target_category, clean_filename)
                try:
                    # Don't overwrite existing files with same name
                    if not os.path.exists(target_path):
                        shutil.copy2(source_path, target_path)
                        count += 1
                except Exception as e:
                    logger.error(f"Error copying {file} to {target_category}: {str(e)}")
    
    logger.info(f"Processed {count} AWS icons")
    return count

def process_gcp_icons(extracted_dir):
    """Process GCP icons into categories"""
    source_dir = extracted_dir
    target_dir = os.path.join(OUTPUT_DIR, "gcp")
    
    # Create category directories
    for category in ICON_SOURCES["gcp"]["categories"]:
        os.makedirs(os.path.join(target_dir, category), exist_ok=True)
    
    # Map of icon names to target categories
    category_mapping = {
        "Compute": ["compute-engine", "cloud-run", "functions", "kubernetes-engine", "app-engine"],
        "Storage": ["cloud-storage", "persistent-disk", "filestore"],
        "Networking": ["virtual-private-cloud", "load-balancing", "cloud-cdn", "cloud-dns"],
        "Databases": ["cloud-sql", "spanner", "firestore", "bigtable", "memorystore"]
    }
    
    # Process all SVG files
    count = 0
    for root, _, files in os.walk(source_dir):
        for file in files:
            if file.endswith(".svg"):
                # Determine category
                target_category = "Other"
                for category, patterns in category_mapping.items():
                    for pattern in patterns:
                        if pattern.lower() in file.lower() or pattern.lower() in root.lower():
                            target_category = category
                            break
                    if target_category != "Other":
                        break
                
                # Copy file to appropriate category
                source_path = os.path.join(root, file)
                target_path = os.path.join(target_dir, target_category, file)
                try:
                    shutil.copy2(source_path, target_path)
                    count += 1
                except Exception as e:
                    logger.error(f"Error copying {file} to {target_category}: {str(e)}")
    
    logger.info(f"Processed {count} GCP icons")
    return count

def download_and_process_provider(provider):
    """Download and process icons for a specific provider"""
    if provider not in ICON_SOURCES:
        logger.error(f"Unknown provider: {provider}")
        return 0
    
    source = ICON_SOURCES[provider]
    
    # Create temp directory for this provider
    provider_temp_dir = os.path.join(TEMP_DIR, provider)
    os.makedirs(provider_temp_dir, exist_ok=True)
    
    # Download zip file
    zip_path = os.path.join(provider_temp_dir, f"{provider}_icons.zip")
    if not download_file(source["download_url"], zip_path):
        return 0
    
    # Extract zip file
    extract_dir = os.path.join(provider_temp_dir, "extracted")
    os.makedirs(extract_dir, exist_ok=True)
    
    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(extract_dir)
    except Exception as e:
        logger.error(f"Error extracting zip file: {str(e)}")
        return 0
    
    # Process icons based on provider
    if provider == "azure":
        return process_azure_icons(extract_dir)
    elif provider == "aws":
        return process_aws_icons(extract_dir)
    elif provider == "gcp":
        return process_gcp_icons(extract_dir)
    
    return 0

def create_zip_for_upload(provider, category):
    """Create a zip file for uploading icons of a specific provider and category"""
    source_dir = os.path.join(OUTPUT_DIR, provider, category)
    if not os.path.exists(source_dir):
        logger.warning(f"Source directory {source_dir} does not exist")
        return None
    
    zip_path = os.path.join(TEMP_DIR, f"{provider}_{category}_icons.zip")
    
    try:
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, _, files in os.walk(source_dir):
                for file in files:
                    if file.endswith(".svg"):
                        file_path = os.path.join(root, file)
                        # Get the path relative to the source_dir
                        rel_path = os.path.relpath(file_path, os.path.dirname(source_dir))
                        # Add to zip with category as subdirectory
                        zipf.write(file_path, rel_path)
        
        logger.info(f"Created zip file for {provider}/{category} at {zip_path}")
        return zip_path
    except Exception as e:
        logger.error(f"Error creating zip file for {provider}/{category}: {str(e)}")
        return None

def main():
    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    try:
        total_icons = 0
        for provider in ICON_SOURCES.keys():
            logger.info(f"Processing {provider} icons")
            count = download_and_process_provider(provider)
            total_icons += count
            
            # Create zip files for upload
            for category in ICON_SOURCES[provider]["categories"]:
                zip_path = create_zip_for_upload(provider, category)
                if zip_path:
                    logger.info(f"Created zip file for {provider}/{category}")
        
        logger.info(f"Downloaded and processed {total_icons} icons in total")
        logger.info(f"Icons are available in: {OUTPUT_DIR}")
        logger.info(f"Created zip files in: {TEMP_DIR}")
        
    finally:
        # Clean up
        # Uncomment to remove temp files when testing is done
        # shutil.rmtree(TEMP_DIR)
        pass

if __name__ == "__main__":
    main() 