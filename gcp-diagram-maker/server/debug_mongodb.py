#!/usr/bin/env python3
import os
import sys
import logging
from pymongo import MongoClient
from dotenv import load_dotenv
import ssl
import urllib.parse

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

def try_connection():
    """Try different connection methods to MongoDB Atlas"""
    # Get MongoDB URI from environment variable
    uri = os.environ.get('MONGODB_URI')
    
    if not uri:
        logger.error("MONGODB_URI not found in environment variables")
        return False
    
    logger.info(f"Attempting to connect to MongoDB with URI: {uri}")
    
    # Method 1: Direct connection with TLS disabled
    try:
        logger.info("Method 1: Direct connection with TLS disabled")
        client = MongoClient(uri, tlsAllowInvalidCertificates=True)
        info = client.server_info()
        logger.info(f"✅ Connection successful! MongoDB version: {info.get('version')}")
        return True
    except Exception as e:
        logger.error(f"❌ Method 1 failed: {str(e)}")
    
    # Method 2: New format URI without TLS parameters
    try:
        # Create a new URI without TLS parameters
        if '@' in uri and '%40' not in uri:
            uri_parts = uri.split('@')
            username_password = uri_parts[0].split('://')[-1]
            username, password = username_password.split(':')
            encoded_password = urllib.parse.quote_plus(password)
            new_uri = f"{uri_parts[0].split(':')[0]}://{username}:{encoded_password}@{uri_parts[1]}"
        else:
            new_uri = uri
            
        logger.info(f"Method 2: New format URI: {new_uri}")
        client = MongoClient(new_uri, tlsAllowInvalidCertificates=True)
        info = client.server_info()
        logger.info(f"✅ Connection successful! MongoDB version: {info.get('version')}")
        return True
    except Exception as e:
        logger.error(f"❌ Method 2 failed: {str(e)}")
    
    # Method 3: Try with explicit TLS version
    try:
        logger.info("Method 3: With explicit TLS version")
        client = MongoClient(uri, tlsAllowInvalidCertificates=True, tlsInsecure=True)
        info = client.server_info()
        logger.info(f"✅ Connection successful! MongoDB version: {info.get('version')}")
        return True
    except Exception as e:
        logger.error(f"❌ Method 3 failed: {str(e)}")
    
    # Method 4: With retryWrites=false
    try:
        # Modify URI to disable retryWrites
        if "retryWrites=true" in uri:
            modified_uri = uri.replace("retryWrites=true", "retryWrites=false")
        else:
            modified_uri = uri + "&retryWrites=false"
        
        logger.info("Method 4: With retryWrites=false")
        client = MongoClient(modified_uri, tlsAllowInvalidCertificates=True)
        info = client.server_info()
        logger.info(f"✅ Connection successful! MongoDB version: {info.get('version')}")
        
        # If this works, update the .env file
        logger.info("Updating .env file with successful connection string")
        with open('.env', 'r') as f:
            env_content = f.read()
        
        with open('.env', 'w') as f:
            env_content = env_content.replace(uri, modified_uri)
            f.write(env_content)
        
        return True
    except Exception as e:
        logger.error(f"❌ Method 4 failed: {str(e)}")
    
    # Method 5: Try a completely different connection approach
    try:
        # Build a connection string for mongo 6.0+
        logger.info("Method 5: Connection for newer MongoDB driver")
        if '@' in uri:
            # Extract parts from existing URI
            parts = uri.split('@')
            auth_part = parts[0].split('://')[1]
            username, password = auth_part.split(':')
            host_part = parts[1]
            
            # Build a clean connection string
            new_uri = f"mongodb+srv://{username}:{urllib.parse.quote_plus(password)}@{host_part}"
            if '?' in new_uri:
                base_uri, params = new_uri.split('?', 1)
                params = params.split('&')
                filtered_params = [p for p in params if not p.startswith('ssl') and not p.startswith('tls')]
                new_uri = f"{base_uri}?{'&'.join(filtered_params)}"
        else:
            new_uri = uri
        
        logger.info(f"Trying with URI: {new_uri}")
        client = MongoClient(new_uri)
        info = client.server_info()
        logger.info(f"✅ Connection successful! MongoDB version: {info.get('version')}")
        
        # Update .env file with successful URI
        with open('.env', 'r') as f:
            env_content = f.read()
        
        with open('.env', 'w') as f:
            env_content = env_content.replace(uri, new_uri)
            f.write(env_content)
        
        return True
    except Exception as e:
        logger.error(f"❌ Method 5 failed: {str(e)}")
    
    logger.error("All connection methods failed")
    return False

if __name__ == "__main__":
    logger.info("MongoDB Connection Debugger")
    success = try_connection()
    
    if success:
        logger.info("Successfully connected to MongoDB!")
        sys.exit(0)
    else:
        logger.error("Failed to connect to MongoDB")
        sys.exit(1) 