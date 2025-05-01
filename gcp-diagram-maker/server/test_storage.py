#!/usr/bin/env python3
"""
Storage System Test Script for Azure Diagram Maker
--------------------------------------------------
This script tests the connectivity and functionality of all storage systems
used by the Azure Diagram Maker application:
- MongoDB Atlas
- SQLite
- Google Cloud Storage
- Local Filesystem

Usage:
  python test_storage.py [--verbose]
"""

import os
import sys
import time
import json
import logging
import argparse
import tempfile
import sqlite3
from pathlib import Path
from datetime import datetime

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("storage_test")

# Add current directory to path to allow imports
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Import project modules
try:
    # Import MongoDB module
    from pymongo import MongoClient
    from pymongo.errors import ConnectionFailure, OperationFailure
    has_pymongo = True
except ImportError:
    logger.warning("PyMongo not installed. MongoDB tests will be skipped.")
    has_pymongo = False

try:
    # Import GCS module
    from gcs import (
        init_gcs, upload_file_to_gcs, delete_file_from_gcs,
        is_gcs_initialized, test_gcs_connectivity, BUCKET_NAME
    )
    has_gcs = True
except ImportError:
    logger.warning("GCS module not found. GCS tests will be skipped.")
    has_gcs = False

try:
    # Import SQLite fallback
    import db_fallback
    has_sqlite = True
except ImportError:
    logger.warning("db_fallback module not found. SQLite tests will be skipped.")
    has_sqlite = False

# Base paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_DIR = os.path.join(BASE_DIR, "public")
DATA_DIR = os.path.join(BASE_DIR, "data")
CLOUDICONS_DIR = os.path.join(PUBLIC_DIR, "cloudicons")
UPLOADS_DIR = os.path.join(PUBLIC_DIR, "uploads")
DB_PATH = os.path.join(DATA_DIR, "fallback.db")

# MongoDB connection
MONGODB_URI = os.environ.get('MONGODB_URI', '')

def test_mongodb():
    """Test MongoDB connectivity and operations."""
    if not has_pymongo:
        return {
            "system": "MongoDB Atlas",
            "available": False,
            "reason": "PyMongo not installed",
            "details": None
        }
    
    if not MONGODB_URI:
        return {
            "system": "MongoDB Atlas",
            "available": False,
            "reason": "MONGODB_URI not set in environment",
            "details": None
        }
    
    # Test connection
    start_time = time.time()
    try:
        mongodb_uri = MONGODB_URI
        # Ensure special characters in password are URL encoded
        if '@' in mongodb_uri and '%40' not in mongodb_uri:
            password_start = mongodb_uri.find(':', mongodb_uri.find('://') + 3) + 1
            password_end = mongodb_uri.find('@')
            password = mongodb_uri[password_start:password_end]
            import urllib.parse
            encoded_password = urllib.parse.quote_plus(password)
            mongodb_uri = mongodb_uri.replace(password, encoded_password)
        
        client = MongoClient(mongodb_uri, serverSelectionTimeoutMS=5000)
        
        # Test ping
        client.admin.command('ping')
        
        # Test access to the database
        db = client['azure_diagram_maker']
        
        # Test listing collections
        collections = db.list_collection_names()
        
        # Test a simple write/read/delete operation
        test_collection = db['test_storage_script']
        
        # Insert a test document
        test_id = str(datetime.now().timestamp())
        result = test_collection.insert_one({
            "test_id": test_id,
            "timestamp": datetime.now().isoformat(),
            "message": "Storage test"
        })
        
        # Read the document back
        doc = test_collection.find_one({"test_id": test_id})
        
        # Delete the document
        test_collection.delete_one({"test_id": test_id})
        
        # Test complete
        elapsed_time = time.time() - start_time
        return {
            "system": "MongoDB Atlas",
            "available": True,
            "collections": collections,
            "operations": {
                "write": True,
                "read": doc is not None,
                "delete": True
            },
            "response_time": f"{elapsed_time:.2f}s",
            "details": {
                "server_info": client.server_info(),
                "database": "azure_diagram_maker"
            }
        }
    except ConnectionFailure as e:
        return {
            "system": "MongoDB Atlas",
            "available": False,
            "reason": "Connection failure",
            "details": str(e)
        }
    except OperationFailure as e:
        return {
            "system": "MongoDB Atlas",
            "available": False,
            "reason": f"Operation failure (code {e.code})",
            "details": str(e)
        }
    except Exception as e:
        return {
            "system": "MongoDB Atlas",
            "available": False,
            "reason": "Unexpected error",
            "details": str(e)
        }

def test_sqlite():
    """Test SQLite functionality."""
    if not has_sqlite:
        return {
            "system": "SQLite",
            "available": False,
            "reason": "db_fallback module not found",
            "details": None
        }
    
    start_time = time.time()
    try:
        # Check if database file exists
        db_exists = os.path.exists(DB_PATH)
        
        # Test SQLite connection
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Check tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [table[0] for table in cursor.fetchall()]
        
        # Test writing to database
        test_id = str(datetime.now().timestamp())
        session_id = f"test_session_{test_id}"
        
        # Use db_fallback for consistency
        conversation_result = db_fallback.add_conversation(
            session_id=session_id,
            message="Test message",
            role="user"
        )
        
        # Test reading from database
        conversations = db_fallback.get_conversations(session_id)
        
        elapsed_time = time.time() - start_time
        return {
            "system": "SQLite",
            "available": True,
            "db_path": DB_PATH,
            "db_size": f"{os.path.getsize(DB_PATH) / 1024:.2f} KB" if db_exists else "Not created yet",
            "tables": tables,
            "operations": {
                "write": conversation_result.get("success", False),
                "read": len(conversations) > 0
            },
            "response_time": f"{elapsed_time:.2f}s"
        }
    except Exception as e:
        return {
            "system": "SQLite",
            "available": False,
            "reason": "Database error",
            "details": str(e)
        }

def test_gcs():
    """Test Google Cloud Storage connectivity and operations."""
    if not has_gcs:
        return {
            "system": "Google Cloud Storage",
            "available": False,
            "reason": "GCS module not found",
            "details": None
        }
    
    start_time = time.time()
    try:
        # First check if GCS is initialized directly
        gcs_initialized = is_gcs_initialized()
        if not gcs_initialized:
            return {
                "system": "Google Cloud Storage",
                "available": False,
                "reason": "GCS client not initialized",
                "details": {
                    "credentials_path": os.path.join(BASE_DIR, "keys", "gcs-key.json"),
                    "bucket_name": BUCKET_NAME
                }
            }
        
        # Test GCS connectivity
        try:
            gcs_connectivity = test_gcs_connectivity()
            if not isinstance(gcs_connectivity, dict):
                # Handle case where test_gcs_connectivity might return non-dict
                gcs_connectivity = {
                    "success": bool(gcs_connectivity),
                    "message": "Connection test completed",
                    "details": {}
                }
                
            if not gcs_connectivity.get("success", False):
                return {
                    "system": "Google Cloud Storage",
                    "available": False,
                    "reason": gcs_connectivity.get("message", "Connection failed"),
                    "details": gcs_connectivity
                }
        except Exception as conn_error:
            return {
                "system": "Google Cloud Storage",
                "available": False,
                "reason": f"Connection test error: {str(conn_error)}",
                "details": str(conn_error)
            }
        
        # Create a temporary test file
        with tempfile.NamedTemporaryFile(suffix='.txt') as temp_file:
            temp_file.write(f"GCS Test File - {datetime.now().isoformat()}".encode('utf-8'))
            temp_file.flush()
            
            # Test uploading to GCS
            test_path = f"test/storage_test_{datetime.now().timestamp()}.txt"
            upload_result = upload_file_to_gcs(temp_file.name, test_path)
            
            # Test deletion from GCS
            delete_result = False
            if upload_result.get("success", False):
                delete_result = delete_file_from_gcs(test_path)
        
        elapsed_time = time.time() - start_time
        return {
            "system": "Google Cloud Storage",
            "available": True,
            "bucket": BUCKET_NAME,
            "operations": {
                "upload": upload_result.get("success", False),
                "delete": delete_result if isinstance(delete_result, bool) else False
            },
            "response_time": f"{elapsed_time:.2f}s",
            "details": gcs_connectivity.get("details", {}) if isinstance(gcs_connectivity, dict) else {}
        }
    except Exception as e:
        return {
            "system": "Google Cloud Storage",
            "available": False,
            "reason": f"Unexpected error: {str(e)}",
            "details": str(e)
        }

def test_filesystem():
    """Test local filesystem access and operations."""
    start_time = time.time()
    results = {
        "system": "Local Filesystem",
        "available": True,
        "directories": {},
        "operations": {
            "write": False,
            "read": False,
            "delete": False
        }
    }
    
    try:
        # Check if required directories exist
        dirs_to_check = {
            "public": PUBLIC_DIR,
            "data": DATA_DIR,
            "cloudicons": CLOUDICONS_DIR,
            "uploads": UPLOADS_DIR
        }
        
        for name, path in dirs_to_check.items():
            dir_info = {
                "exists": os.path.exists(path),
                "writable": os.access(path, os.W_OK) if os.path.exists(path) else False,
                "path": path
            }
            
            if dir_info["exists"]:
                # Count files
                file_count = sum(1 for _ in Path(path).rglob('*') if _.is_file())
                dir_info["files"] = file_count
                
                # Calculate size
                dir_size = sum(f.stat().st_size for f in Path(path).glob('**/*') if f.is_file())
                dir_info["size"] = f"{dir_size / (1024 * 1024):.2f} MB"
            
            results["directories"][name] = dir_info
        
        # Test write/read/delete operations
        test_filename = f"storage_test_{datetime.now().timestamp()}.txt"
        test_path = os.path.join(PUBLIC_DIR, test_filename)
        
        # Write test
        with open(test_path, 'w') as f:
            f.write(f"Filesystem test - {datetime.now().isoformat()}")
        results["operations"]["write"] = os.path.exists(test_path)
        
        # Read test
        if os.path.exists(test_path):
            with open(test_path, 'r') as f:
                content = f.read()
            results["operations"]["read"] = len(content) > 0
        
        # Delete test
        if os.path.exists(test_path):
            os.remove(test_path)
            results["operations"]["delete"] = not os.path.exists(test_path)
        
        elapsed_time = time.time() - start_time
        results["response_time"] = f"{elapsed_time:.2f}s"
        return results
    except Exception as e:
        return {
            "system": "Local Filesystem",
            "available": False,
            "reason": "Filesystem error",
            "details": str(e)
        }

def run_all_tests(verbose=False):
    """Run all storage tests and return results."""
    logger.info("Starting storage system tests...")
    
    results = {
        "timestamp": datetime.now().isoformat(),
        "environment": {
            "python_version": sys.version,
            "platform": sys.platform,
            "cwd": os.getcwd(),
            "base_dir": BASE_DIR
        },
        "results": {}
    }
    
    # Test MongoDB
    logger.info("Testing MongoDB Atlas...")
    mongodb_result = test_mongodb()
    results["results"]["mongodb"] = mongodb_result
    if verbose:
        logger.info(f"MongoDB: {'✅ Available' if mongodb_result['available'] else '❌ Unavailable'}")
        if not mongodb_result['available']:
            logger.info(f"  Reason: {mongodb_result.get('reason', 'Unknown')}")
    
    # Test SQLite
    logger.info("Testing SQLite...")
    sqlite_result = test_sqlite()
    results["results"]["sqlite"] = sqlite_result
    if verbose:
        logger.info(f"SQLite: {'✅ Available' if sqlite_result['available'] else '❌ Unavailable'}")
        if not sqlite_result['available']:
            logger.info(f"  Reason: {sqlite_result.get('reason', 'Unknown')}")
    
    # Test GCS
    logger.info("Testing Google Cloud Storage...")
    gcs_result = test_gcs()
    results["results"]["gcs"] = gcs_result
    if verbose:
        logger.info(f"GCS: {'✅ Available' if gcs_result['available'] else '❌ Unavailable'}")
        if not gcs_result['available']:
            logger.info(f"  Reason: {gcs_result.get('reason', 'Unknown')}")
    
    # Test Filesystem
    logger.info("Testing local filesystem...")
    filesystem_result = test_filesystem()
    results["results"]["filesystem"] = filesystem_result
    if verbose:
        logger.info(f"Filesystem: {'✅ Available' if filesystem_result['available'] else '❌ Unavailable'}")
        if not filesystem_result['available']:
            logger.info(f"  Reason: {filesystem_result.get('reason', 'Unknown')}")
    
    # Overall system status
    results["status"] = {
        "mongodb": mongodb_result["available"],
        "sqlite": sqlite_result["available"],
        "gcs": gcs_result["available"],
        "filesystem": filesystem_result["available"],
        "overall": all([
            sqlite_result["available"],
            filesystem_result["available"],
            # Don't require MongoDB and GCS for overall success
        ])
    }
    
    logger.info("All storage tests completed.")
    return results

def print_summary(results):
    """Print a human-readable summary of test results."""
    print("\n" + "="*80)
    print(f"AZURE DIAGRAM MAKER - STORAGE SYSTEM TEST SUMMARY")
    print("="*80)
    print(f"Timestamp: {results['timestamp']}")
    print(f"Python Version: {results['environment']['python_version']}")
    print(f"Platform: {results['environment']['platform']}")
    print("-"*80)
    
    mongodb = results["results"]["mongodb"]
    sqlite = results["results"]["sqlite"]
    gcs = results["results"]["gcs"]
    filesystem = results["results"]["filesystem"]
    
    # MongoDB summary
    print(f"MONGODB ATLAS: {'✅ AVAILABLE' if mongodb['available'] else '❌ UNAVAILABLE'}")
    if mongodb["available"]:
        print(f"  - Response Time: {mongodb.get('response_time', 'N/A')}")
        print(f"  - Collections: {', '.join(mongodb.get('collections', []))}")
        ops = mongodb.get('operations', {})
        print(f"  - Operations: Write: {'✓' if ops.get('write', False) else '✗'}, "
              f"Read: {'✓' if ops.get('read', False) else '✗'}, "
              f"Delete: {'✓' if ops.get('delete', False) else '✗'}")
    else:
        print(f"  - Reason: {mongodb.get('reason', 'Unknown')}")
        if mongodb.get('details'):
            print(f"  - Details: {mongodb['details']}")
    print()
    
    # SQLite summary
    print(f"SQLITE: {'✅ AVAILABLE' if sqlite['available'] else '❌ UNAVAILABLE'}")
    if sqlite["available"]:
        print(f"  - Database Path: {sqlite.get('db_path', 'N/A')}")
        print(f"  - Database Size: {sqlite.get('db_size', 'N/A')}")
        print(f"  - Tables: {', '.join(sqlite.get('tables', []))}")
        print(f"  - Response Time: {sqlite.get('response_time', 'N/A')}")
        ops = sqlite.get('operations', {})
        print(f"  - Operations: Write: {'✓' if ops.get('write', False) else '✗'}, "
              f"Read: {'✓' if ops.get('read', False) else '✗'}")
    else:
        print(f"  - Reason: {sqlite.get('reason', 'Unknown')}")
        if sqlite.get('details'):
            print(f"  - Details: {sqlite['details']}")
    print()
    
    # GCS summary
    print(f"GOOGLE CLOUD STORAGE: {'✅ AVAILABLE' if gcs['available'] else '❌ UNAVAILABLE'}")
    if gcs["available"]:
        print(f"  - Bucket: {gcs.get('bucket', 'N/A')}")
        print(f"  - Response Time: {gcs.get('response_time', 'N/A')}")
        ops = gcs.get('operations', {})
        print(f"  - Operations: Upload: {'✓' if ops.get('upload', False) else '✗'}, "
              f"Delete: {'✓' if ops.get('delete', False) else '✗'}")
    else:
        print(f"  - Reason: {gcs.get('reason', 'Unknown')}")
        if isinstance(gcs.get('details'), dict):
            print(f"  - Details: {gcs['details'].get('message', '')}")
        elif gcs.get('details'):
            print(f"  - Details: {gcs['details']}")
    print()
    
    # Filesystem summary
    print(f"LOCAL FILESYSTEM: {'✅ AVAILABLE' if filesystem['available'] else '❌ UNAVAILABLE'}")
    if filesystem["available"]:
        print(f"  - Response Time: {filesystem.get('response_time', 'N/A')}")
        dirs = filesystem.get('directories', {})
        for name, info in dirs.items():
            exists = "✓" if info.get("exists", False) else "✗"
            writable = "✓" if info.get("writable", False) else "✗"
            size = info.get("size", "N/A")
            files = info.get("files", "N/A")
            print(f"  - {name.capitalize()}: Exists: {exists}, Writable: {writable}, "
                  f"Size: {size}, Files: {files}")
        ops = filesystem.get('operations', {})
        print(f"  - Operations: Write: {'✓' if ops.get('write', False) else '✗'}, "
              f"Read: {'✓' if ops.get('read', False) else '✗'}, "
              f"Delete: {'✓' if ops.get('delete', False) else '✗'}")
    else:
        print(f"  - Reason: {filesystem.get('reason', 'Unknown')}")
        if filesystem.get('details'):
            print(f"  - Details: {filesystem['details']}")
    print()
    
    # Overall status
    status = results["status"]
    overall = "✅ OPERATIONAL" if status["overall"] else "❌ ISSUES DETECTED"
    print("="*80)
    print(f"OVERALL SYSTEM STATUS: {overall}")
    print(f"Required Systems: SQLite {'✓' if status['sqlite'] else '✗'}, "
          f"Filesystem {'✓' if status['filesystem'] else '✗'}")
    print(f"Optional Systems: MongoDB {'✓' if status['mongodb'] else '✗'}, "
          f"GCS {'✓' if status['gcs'] else '✗'}")
    
    if status["overall"]:
        if not status["mongodb"] and not status["gcs"]:
            print("\nNOTE: The system is operational but using only local storage.")
            print("Consider setting up MongoDB Atlas and/or Google Cloud Storage for production use.")
        elif not status["mongodb"]:
            print("\nNOTE: The system is operational but using SQLite instead of MongoDB.")
            print("For improved performance, consider setting up MongoDB Atlas.")
        elif not status["gcs"]:
            print("\nNOTE: The system is operational but using local file storage only.")
            print("For improved durability, consider setting up Google Cloud Storage.")
    else:
        print("\nACTION REQUIRED: Issues were detected with required storage systems.")
        print("Please check the details above and fix the issues before continuing.")
    
    print("="*80 + "\n")

def main():
    """Main function to run the storage tests."""
    parser = argparse.ArgumentParser(description="Test storage systems for Azure Diagram Maker")
    parser.add_argument("--verbose", "-v", action="store_true", help="Enable verbose output")
    parser.add_argument("--json", "-j", action="store_true", help="Output results as JSON")
    parser.add_argument("--output", "-o", help="Write results to file")
    args = parser.parse_args()
    
    # Run all tests
    results = run_all_tests(verbose=args.verbose)
    
    # Output results
    if args.json:
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(results, f, indent=2)
        else:
            print(json.dumps(results, indent=2))
    else:
        print_summary(results)
        if args.output:
            with open(args.output, 'w') as f:
                f.write("AZURE DIAGRAM MAKER - STORAGE SYSTEM TEST RESULTS\n\n")
                f.write(f"Timestamp: {results['timestamp']}\n")
                f.write(f"Overall Status: {'OPERATIONAL' if results['status']['overall'] else 'ISSUES DETECTED'}\n\n")
                f.write(f"MongoDB: {'Available' if results['status']['mongodb'] else 'Unavailable'}\n")
                f.write(f"SQLite: {'Available' if results['status']['sqlite'] else 'Unavailable'}\n")
                f.write(f"GCS: {'Available' if results['status']['gcs'] else 'Unavailable'}\n")
                f.write(f"Filesystem: {'Available' if results['status']['filesystem'] else 'Unavailable'}\n")
    
    # Return exit code
    return 0 if results["status"]["overall"] else 1

if __name__ == "__main__":
    sys.exit(main()) 