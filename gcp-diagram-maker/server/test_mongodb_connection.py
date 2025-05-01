#!/usr/bin/env python3
import os
import sys
import logging
import time
import json
from pymongo import MongoClient
import certifi

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_connection(connection_options):
    """Test MongoDB connection with specific options"""
    try:
        # Get MongoDB URI from environment variable or use a default
        mongodb_uri = os.environ.get('MONGODB_URI', 
                                  'mongodb+srv://sritadip:sr1t%40d1p@sridraw.rpkmj.mongodb.net/?retryWrites=true&w=majority&appName=sridraw')
        
        logger.info(f"Connecting to MongoDB with options: {json.dumps(connection_options, indent=2)}")
        mongo_client = MongoClient(mongodb_uri, **connection_options)
        
        # Check connection with timeout
        result = mongo_client.admin.command('ping', serverSelectionTimeoutMS=5000)
        logger.info(f"Connection successful: {result}")
        
        # Get server info
        server_info = mongo_client.server_info()
        logger.info(f"MongoDB version: {server_info.get('version')}")
        
        # List databases (will fail if permissions are insufficient)
        try:
            databases = mongo_client.list_database_names()
            logger.info(f"Available databases: {databases}")
        except Exception as e:
            logger.warning(f"Could not list databases: {e}")
        
        return True
    except Exception as e:
        logger.error(f"Connection failed: {str(e)}")
        return False

def main():
    """Test MongoDB connection with different configurations"""
    logger.info("=== MongoDB Connection Tester ===")
    
    # Certifi version
    certifi_path = certifi.where()
    logger.info(f"Using certifi version: {certifi.__version__}")
    logger.info(f"Certifi CA path: {certifi_path}")
    
    # Test 1: Default connection
    logger.info("\n=== Test 1: Default connection ===")
    connection_options = {
        "serverSelectionTimeoutMS": 10000,
        "connectTimeoutMS": 10000,
        "socketTimeoutMS": 10000,
        "tlsCAFile": certifi_path
    }
    test_connection(connection_options)
    
    # Test 2: With SSL validation disabled
    logger.info("\n=== Test 2: With SSL validation disabled ===")
    connection_options = {
        "serverSelectionTimeoutMS": 10000,
        "connectTimeoutMS": 10000,
        "socketTimeoutMS": 10000,
        "tlsAllowInvalidCertificates": True
    }
    test_connection(connection_options)
    
    # Test 3: With SRV protocol settings
    logger.info("\n=== Test 3: With SRV protocol settings ===")
    connection_options = {
        "serverSelectionTimeoutMS": 10000,
        "connectTimeoutMS": 10000,
        "socketTimeoutMS": 10000,
        "tlsCAFile": certifi_path,
        "retryWrites": True,
        "authSource": "admin"
    }
    test_connection(connection_options)
    
    # Test 4: With minimum settings
    logger.info("\n=== Test 4: With minimum settings ===")
    connection_options = {
        "tlsAllowInvalidCertificates": True
    }
    test_connection(connection_options)
    
    logger.info("\n=== Tests completed ===")

if __name__ == "__main__":
    main() 