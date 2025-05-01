import os
import logging
from google.cloud import storage
from google.oauth2 import service_account
import json
import shutil
import time
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Path to GCS credentials file (look for both potential locations)
CREDENTIALS_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
                              'keys', 'gcs-key.json')
if not os.path.exists(CREDENTIALS_PATH):
    # Try alternate location
    CREDENTIALS_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
                                'keys', 'gen-lang-client-0452237601-1874e15c59b0.json')

# GCS bucket name - check environment first, then use default
BUCKET_NAME = os.environ.get('GCS_BUCKET_NAME', 'aiicons')

# Local storage path for icons and uploads
LOCAL_STORAGE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'public')

# Initialize GCS client
gcs_client = None
gcs_initialized = False
GCS_ENABLED = os.environ.get('ENABLE_GCS', 'true').lower() == 'true'

def init_gcs():
    """Initialize GCS client and check bucket existence"""
    global gcs_client, gcs_initialized
    
    if not GCS_ENABLED:
        logger.info("GCS is disabled via ENABLE_GCS environment variable")
        return False
    
    try:
        if os.path.exists(CREDENTIALS_PATH):
            logger.info(f"Found GCS credentials file at {CREDENTIALS_PATH}")
            
            # Validate JSON format of credentials file
            try:
                with open(CREDENTIALS_PATH, 'r') as f:
                    credentials_json = json.load(f)
                    logger.info(f"Credentials file contains valid JSON with project_id: {credentials_json.get('project_id', 'Not found')}")
            except json.JSONDecodeError as je:
                logger.error(f"Credentials file contains invalid JSON: {str(je)}")
                return False
            
            # Create credentials object and client
            try:
                credentials = service_account.Credentials.from_service_account_file(CREDENTIALS_PATH)
                gcs_client = storage.Client(credentials=credentials, project=credentials_json.get('project_id'))
            except Exception as auth_error:
                logger.error(f"Authentication error with GCS credentials: {str(auth_error)}")
                return False
            
            # Verify bucket exists
            try:
                bucket = gcs_client.bucket(BUCKET_NAME)
                if bucket.exists():
                    logger.info(f"Successfully connected to GCS bucket: {BUCKET_NAME}")
                    gcs_initialized = True
                    logger.info("Successfully initialized GCS client with credentials")
                    return True
                else:
                    logger.warning(f"GCS bucket does not exist: {BUCKET_NAME}")
                    # Try to create the bucket
                    try:
                        bucket = gcs_client.create_bucket(BUCKET_NAME)
                        logger.info(f"Created new GCS bucket: {BUCKET_NAME}")
                        gcs_initialized = True
                        return True
                    except Exception as bucket_create_error:
                        logger.error(f"Failed to create GCS bucket: {str(bucket_create_error)}")
                        return False
            except Exception as bucket_error:
                logger.error(f"Error accessing GCS bucket: {str(bucket_error)}")
                return False
        else:
            logger.warning(f"GCS credentials file not found at {CREDENTIALS_PATH}")
            return False
    except Exception as e:
        logger.error(f"Failed to initialize GCS client: {str(e)}")
        return False

def is_gcs_initialized():
    """Check if GCS is properly initialized"""
    return gcs_initialized

def get_gcs_url(blob_name):
    """
    Get the public URL for a GCS blob
    
    Args:
        blob_name (str): The blob name in GCS
        
    Returns:
        str: The public URL of the blob, or None if not available
    """
    if not gcs_initialized:
        return None
    
    try:
        bucket = gcs_client.bucket(BUCKET_NAME)
        blob = bucket.blob(blob_name)
        return blob.public_url
    except Exception as e:
        logger.error(f"Error getting GCS URL for blob {blob_name}: {str(e)}")
        return None

def download_from_gcs(blob_name, destination_file_path):
    """
    Download a file from Google Cloud Storage
    
    Args:
        blob_name (str): The blob name in GCS to download
        destination_file_path (str): Local path where the file should be saved
        
    Returns:
        bool: True if download was successful, False otherwise
    """
    if not gcs_initialized:
        logger.error("Cannot download: GCS client not initialized")
        return False
    
    try:
        # Ensure blob name has no leading slash
        if blob_name.startswith('/'):
            blob_name = blob_name[1:]
        
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(destination_file_path), exist_ok=True)
        
        bucket = gcs_client.bucket(BUCKET_NAME)
        blob = bucket.blob(blob_name)
        
        # Check if blob exists
        if not blob.exists():
            logger.warning(f"Blob does not exist in GCS: {blob_name}")
            return False
        
        # Download the file with retry logic
        max_retries = 3
        retry_count = 0
        while retry_count < max_retries:
            try:
                blob.download_to_filename(destination_file_path)
                logger.info(f"Downloaded {blob_name} from GCS to {destination_file_path}")
                return True
            except Exception as download_error:
                retry_count += 1
                if retry_count >= max_retries:
                    logger.error(f"Failed to download after {max_retries} attempts: {str(download_error)}")
                    return False
                logger.warning(f"Download attempt {retry_count} failed, retrying in 1 second...")
                time.sleep(1)
        
        return False
    
    except Exception as e:
        logger.error(f"Error downloading file from GCS: {str(e)}")
        return False

def upload_file_to_gcs(file_path, destination_blob_name):
    """
    Upload a file to Google Cloud Storage
    
    Args:
        file_path (str): Path to the local file to upload
        destination_blob_name (str): The destination blob name in GCS
        
    Returns:
        dict: Dictionary containing success status, URL if successful, and error message if not
    """
    if not gcs_initialized:
        return {"success": False, "error": "GCS client not initialized"}
    
    try:
        # Check if file exists
        if not os.path.exists(file_path):
            return {"success": False, "error": f"File not found at {file_path}"}
        
        # Ensure destination blob name has no leading slash
        if destination_blob_name.startswith('/'):
            destination_blob_name = destination_blob_name[1:]
        
        bucket = gcs_client.bucket(BUCKET_NAME)
        blob = bucket.blob(destination_blob_name)
        
        # Upload the file with retry logic
        max_retries = 3
        retry_count = 0
        while retry_count < max_retries:
            try:
                # Upload the file
                blob.upload_from_filename(file_path)
                break
            except Exception as upload_error:
                retry_count += 1
                if retry_count >= max_retries:
                    raise upload_error
                logger.warning(f"Upload attempt {retry_count} failed, retrying in 1 second...")
                time.sleep(1)
        
        # Make the blob publicly viewable
        blob.make_public()
        
        # Get the public URL
        url = blob.public_url
        
        logger.info(f"Uploaded {file_path} to GCS: {destination_blob_name}")
        return {"success": True, "url": url}
    
    except Exception as e:
        error_msg = f"Error uploading file to GCS: {str(e)}"
        logger.error(error_msg)
        return {"success": False, "error": error_msg}

def delete_file_from_gcs(blob_name):
    """
    Delete a file from Google Cloud Storage
    
    Args:
        blob_name (str): The blob name to delete
        
    Returns:
        bool: True if deletion was successful, False otherwise
    """
    if not gcs_initialized:
        return False
    
    try:
        # Ensure blob name has no leading slash
        if blob_name.startswith('/'):
            blob_name = blob_name[1:]
        
        bucket = gcs_client.bucket(BUCKET_NAME)
        blob = bucket.blob(blob_name)
        
        # Check if blob exists before deleting
        if not blob.exists():
            logger.warning(f"Blob does not exist in GCS: {blob_name}")
            return False
        
        blob.delete()
        
        logger.info(f"Deleted blob from GCS: {blob_name}")
        return True
    
    except Exception as e:
        logger.error(f"Error deleting file from GCS: {str(e)}")
        return False

def ensure_local_storage(provider, category=None):
    """
    Ensure the local storage directory exists
    
    Args:
        provider (str): The provider name (e.g., 'azure', 'aws', 'gcp')
        category (str, optional): The category name
        
    Returns:
        str: The path to the local storage directory
    """
    if provider.lower() in ['azure', 'aws', 'gcp']:
        # This is a cloud icon
        base_path = os.path.join(LOCAL_STORAGE_PATH, 'cloudicons', provider)
    else:
        # This is a general upload
        base_path = os.path.join(LOCAL_STORAGE_PATH, provider)
    
    # Create category path if specified
    if category:
        full_path = os.path.join(base_path, category)
    else:
        full_path = base_path
    
    # Create directory if it doesn't exist
    os.makedirs(full_path, exist_ok=True)
    
    return full_path

def upload_file(source_file, filename, provider='azure', category='General'):
    """
    Upload a file to both local storage and GCS if available
    
    Args:
        source_file (str): Path to the local file to upload
        filename (str): Name to use for the uploaded file
        provider (str): Cloud provider ('azure', 'aws', 'gcp') or other category
        category (str): Category for organizing icons
        
    Returns:
        dict: Dictionary containing success status, local URL, cloud URL, and error message if any
    """
    try:
        # Ensure the local directory exists
        local_dir = ensure_local_storage(provider, category)
        
        # Create the destination path
        local_dest = os.path.join(local_dir, filename)
        
        # Copy the file to the local destination
        shutil.copy2(source_file, local_dest)
        
        # Generate local URL based on provider and category
        if provider.lower() in ['azure', 'aws', 'gcp']:
            # This is a cloud icon
            local_url = f'/cloudicons/{provider}/{category}/{filename}'
        else:
            # This is a general upload - use a simplified path for diagrams
            local_url = f'/{provider}/{category}/{filename}'
        
        # Initialize result dictionary
        result = {
            "success": True,
            "local_url": local_url,
            "cloud_url": None,
            "error": None
        }
        
        # Upload to GCS if initialized
        if is_gcs_initialized():
            try:
                # Set GCS path based on provider
                if provider.lower() in ['azure', 'aws', 'gcp']:
                    gcs_path = f"cloudicons/{provider}/{category}/{filename}"
                else:
                    # For diagrams and other uploads use a direct path without cloudicons prefix
                    gcs_path = f"{provider}/{category}/{filename}"
                
                # Upload to GCS
                gcs_result = upload_file_to_gcs(local_dest, gcs_path)
                
                if gcs_result["success"]:
                    result["cloud_url"] = gcs_result["url"]
                    logger.info(f"Uploaded {filename} to both local storage and GCS")
                else:
                    logger.warning(f"GCS upload failed for {filename}: {gcs_result.get('error')}")
                    result["error"] = f"Local upload succeeded, but GCS upload failed: {gcs_result.get('error')}"
            except Exception as gcs_error:
                logger.error(f"GCS upload failed with exception: {str(gcs_error)}")
                result["error"] = f"Local upload succeeded, but GCS upload failed: {str(gcs_error)}"
        else:
            logger.info(f"GCS not initialized, stored {filename} only in local storage")
        
        return result
    
    except Exception as e:
        error_msg = f"Error uploading file: {str(e)}"
        logger.error(error_msg)
        return {
            "success": False,
            "local_url": None,
            "cloud_url": None,
            "error": error_msg
        }

def delete_file(filename, provider='azure', category='General'):
    """
    Delete a file from both local storage and GCS
    
    Args:
        filename (str): Name of the file to delete
        provider (str): Cloud provider or general category
        category (str): Category for organizing icons
        
    Returns:
        dict: Dictionary containing success status and error message if any
    """
    try:
        result = {
            "success": True,
            "local_deleted": False,
            "gcs_deleted": False,
            "error": None
        }
        
        # Determine local file path
        if provider.lower() in ['azure', 'aws', 'gcp']:
            local_path = os.path.join(LOCAL_STORAGE_PATH, 'cloudicons', provider, category, filename)
            gcs_path = f"cloudicons/{provider}/{category}/{filename}"
        else:
            local_path = os.path.join(LOCAL_STORAGE_PATH, provider, category, filename)
            gcs_path = f"{provider}/{category}/{filename}"
        
        # Delete from local storage
        if os.path.exists(local_path):
            try:
                os.remove(local_path)
                result["local_deleted"] = True
                logger.info(f"Deleted {filename} from local storage")
            except Exception as local_error:
                error_msg = f"Error deleting file from local storage: {str(local_error)}"
                logger.error(error_msg)
                result["error"] = error_msg
                result["success"] = False
        else:
            logger.warning(f"File not found in local storage: {local_path}")
        
        # Delete from GCS if initialized
        if is_gcs_initialized():
            try:
                gcs_deleted = delete_file_from_gcs(gcs_path)
                result["gcs_deleted"] = gcs_deleted
                
                if gcs_deleted:
                    logger.info(f"Deleted {filename} from GCS")
                else:
                    logger.warning(f"File not found in GCS or delete failed: {gcs_path}")
            except Exception as gcs_error:
                error_msg = f"Error deleting file from GCS: {str(gcs_error)}"
                logger.error(error_msg)
                if not result["error"]:  # Only set if not already set
                    result["error"] = error_msg
                    result["success"] = result["local_deleted"]  # Success if at least local deletion worked
        
        return result
    
    except Exception as e:
        error_msg = f"Error in delete_file: {str(e)}"
        logger.error(error_msg)
        return {
            "success": False,
            "local_deleted": False,
            "gcs_deleted": False,
            "error": error_msg
        }

def list_gcs_files(prefix=None):
    """
    List files in GCS bucket with optional prefix
    
    Args:
        prefix (str, optional): Prefix to filter blobs
        
    Returns:
        list: List of blob names matching the prefix
    """
    if not is_gcs_initialized():
        return []
    
    try:
        bucket = gcs_client.bucket(BUCKET_NAME)
        blobs = bucket.list_blobs(prefix=prefix)
        return [blob.name for blob in blobs]
    except Exception as e:
        logger.error(f"Error listing GCS files: {str(e)}")
        return []

def test_gcs_connectivity():
    """
    Test connectivity to GCS
    
    Returns:
        dict: Dictionary containing success status and details
    """
    if not gcs_initialized:
        return {
            "success": False,
            "message": "GCS client not initialized",
            "details": {
                "credentials_found": os.path.exists(CREDENTIALS_PATH),
                "credentials_path": CREDENTIALS_PATH,
                "bucket_name": BUCKET_NAME
            }
        }
    
    try:
        bucket = gcs_client.bucket(BUCKET_NAME)
        exists = bucket.exists()
        
        return {
            "success": exists,
            "message": f"Bucket {BUCKET_NAME} {'exists' if exists else 'does not exist'}",
            "details": {
                "bucket_name": BUCKET_NAME,
                "project_id": gcs_client.project,
                "credentials_path": CREDENTIALS_PATH
            }
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Error testing GCS connectivity: {str(e)}",
            "details": {
                "error": str(e),
                "bucket_name": BUCKET_NAME,
                "credentials_path": CREDENTIALS_PATH
            }
        }

# Initialize GCS when this module is imported
gcs_initialized = init_gcs() 