#!/usr/bin/env python3
import os
import gcs
import logging
import json

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("test_gcs_upload")

def test_upload():
    """Test the enhanced upload_file function"""
    
    # Print GCS module configuration
    print("\n=== GCS Configuration ===")
    print(f"Bucket Name: {gcs.BUCKET_NAME}")
    print(f"Credentials Path: {gcs.CREDENTIALS_PATH}")
    print(f"Local Storage Path: {gcs.LOCAL_STORAGE_PATH}")
    print(f"GCS Initialized: {gcs.is_gcs_initialized()}")
    print(f"GCS Enabled: {gcs.GCS_ENABLED}")
    
    # Create a test file
    test_file = os.path.join(os.path.dirname(__file__), 'test_upload.txt')
    with open(test_file, 'w') as f:
        f.write('Test content for upload')
    
    print(f"\nCreated test file: {test_file}")
    
    # Test upload_file function (combined local+GCS)
    print("\n=== Testing Enhanced Upload Function ===")
    result = gcs.upload_file(
        test_file,
        "test_upload.txt",
        provider="test",
        category="uploads"
    )
    
    print(json.dumps(result, indent=2))
    
    # Also test the direct GCS upload for comparison
    print("\n=== Testing Direct GCS Upload ===")
    gcs_result = gcs.upload_file_to_gcs(test_file, "test/test_upload.txt")
    print(json.dumps(gcs_result, indent=2))
    
    # Test deletion
    print("\n=== Testing File Deletion ===")
    delete_result = gcs.delete_file(
        "test_upload.txt",
        provider="test",
        category="uploads"
    )
    
    print(json.dumps(delete_result, indent=2))
    
    # Clean up test file
    print("\n=== Clean Up ===")
    if os.path.exists(test_file):
        os.remove(test_file)
        print(f"Removed test file: {test_file}")
    
    # Summary
    print("\n=== Test Summary ===")
    print(f"Enhanced Upload: {'SUCCESS' if result.get('success') else 'FAILED'}")
    print(f"Direct GCS Upload: {'SUCCESS' if gcs_result.get('success') else 'FAILED'}")
    print(f"File Deletion: {'SUCCESS' if delete_result.get('success') else 'FAILED'}")
    
    if gcs.is_gcs_initialized():
        print("\nGCS is properly configured")
        if result.get('cloud_url'):
            print(f"Cloud URL: {result.get('cloud_url')}")
    else:
        print("\nGCS is not initialized. Using local storage only.")
        print(f"Local URL: {result.get('local_url')}")

if __name__ == "__main__":
    test_upload() 