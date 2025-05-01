#!/usr/bin/env python3
import os
import sys
import logging
import time
from datetime import datetime
import json

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Import the GCS module functions
from gcs import (
    is_gcs_initialized, 
    upload_file_to_gcs, 
    delete_file_from_gcs, 
    test_gcs_connectivity,
    upload_file,
    delete_file,
    CREDENTIALS_PATH,
    BUCKET_NAME,
    LOCAL_STORAGE_PATH
)

def main():
    """Test GCS functionality"""
    logger.info("Running GCS Testing Script")
    logger.info(f"GCS Credentials Path: {CREDENTIALS_PATH}")
    logger.info(f"GCS Bucket Name: {BUCKET_NAME}")
    logger.info(f"Local Storage Path: {LOCAL_STORAGE_PATH}")
    logger.info(f"Is GCS Initialized: {is_gcs_initialized()}")
    
    # Test GCS connectivity
    logger.info("Testing GCS connectivity...")
    connectivity_result = test_gcs_connectivity()
    logger.info(f"Connectivity test result: {json.dumps(connectivity_result, indent=2)}")
    
    if not is_gcs_initialized():
        logger.error("GCS is not initialized. Cannot proceed with upload tests.")
        sys.exit(1)
    
    # Create a test file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    test_file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), f"test_file_{timestamp}.txt")
    test_content = f"This is a test file created at {timestamp}"
    
    with open(test_file_path, "w") as f:
        f.write(test_content)
    
    logger.info(f"Created test file at: {test_file_path}")
    
    # Test direct GCS upload
    logger.info("Testing direct upload to GCS...")
    direct_upload_result = upload_file_to_gcs(
        test_file_path, 
        f"test/test_file_{timestamp}.txt"
    )
    logger.info(f"Direct upload result: {json.dumps(direct_upload_result, indent=2)}")
    
    # Test hybrid upload (local + GCS)
    logger.info("Testing hybrid upload function...")
    hybrid_upload_result = upload_file(
        source_file=test_file_path,
        filename=f"test_file_{timestamp}.txt",
        provider="test",
        category="uploads"
    )
    logger.info(f"Hybrid upload result: {json.dumps(hybrid_upload_result, indent=2)}")
    
    # Wait a moment to ensure files are uploaded
    time.sleep(2)
    
    # Test delete functionality
    if direct_upload_result.get("success"):
        logger.info("Testing delete functionality for direct upload...")
        direct_delete_result = delete_file_from_gcs(f"test/test_file_{timestamp}.txt")
        logger.info(f"Direct delete result: {direct_delete_result}")
    
    if hybrid_upload_result.get("success"):
        logger.info("Testing delete functionality for hybrid upload...")
        hybrid_delete_result = delete_file(
            filename=f"test_file_{timestamp}.txt",
            provider="test",
            category="uploads"
        )
        logger.info(f"Hybrid delete result: {json.dumps(hybrid_delete_result, indent=2)}")
    
    # Clean up the test file
    if os.path.exists(test_file_path):
        os.remove(test_file_path)
        logger.info(f"Removed local test file: {test_file_path}")
    
    logger.info("GCS testing completed")

if __name__ == "__main__":
    main() 