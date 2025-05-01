#!/usr/bin/env python3
import os
import json
import logging
import sqlite3
import datetime
from pathlib import Path
from flask import jsonify

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("sqlite_fallback")

# SQLite database path
DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
DB_PATH = os.path.join(DB_DIR, "fallback.db")

# Ensure data directory exists
if not os.path.exists(DB_DIR):
    os.makedirs(DB_DIR)
    logger.info(f"Created data directory at {DB_DIR}")

def init_db(conn=None):
    """Initialize the SQLite database with the necessary tables."""
    close_conn = False
    try:
        if conn is None:
            conn = sqlite3.connect(DB_PATH)
            close_conn = True
            
        cursor = conn.cursor()
        
        # Create icons table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS icons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            provider TEXT NOT NULL,
            category TEXT NOT NULL DEFAULT 'General',
            display_name TEXT,
            storage_type TEXT NOT NULL,
            url TEXT NOT NULL,
            cloud_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(filename, provider, category)
        )
        ''')
        
        # Create diagrams table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS diagrams (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            diagram_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        # Create conversations table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            messages TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        conn.commit()
        logging.info("SQLite database initialized successfully")
        return True
    except sqlite3.Error as e:
        logging.error(f"Error initializing SQLite database: {e}")
        return False
    finally:
        if close_conn and conn:
            conn.close()

def add_icon(icon_data):
    """
    Add an icon to the SQLite database.
    
    Args:
        icon_data (dict): Dictionary containing icon metadata
        
    Returns:
        dict: Result of the operation
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Check if icon already exists
        cursor.execute(
            "SELECT id FROM icons WHERE filename = ? AND provider = ? AND category = ?", 
            (icon_data.get('filename'), icon_data.get('provider'), icon_data.get('category', 'General'))
        )
        existing_icon = cursor.fetchone()
        
        if existing_icon:
            # Update existing icon
            icon_id = existing_icon[0]
            cursor.execute('''
            UPDATE icons 
            SET displayName = ?, storageType = ?, url = ?, localPath = ?, cloudPath = ?, uploadDate = ?
            WHERE id = ?
            ''', (
                icon_data.get('displayName'),
                icon_data.get('storageType'),
                icon_data.get('url'),
                icon_data.get('localPath'),
                icon_data.get('cloudPath'),
                datetime.datetime.now().isoformat(),
                icon_id
            ))
            logger.info(f"Updated icon in SQLite: {icon_data.get('filename')}")
        else:
            # Insert new icon
            cursor.execute('''
            INSERT INTO icons (
                filename, provider, category, displayName, storageType, 
                url, localPath, cloudPath, uploadDate
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                icon_data.get('filename'),
                icon_data.get('provider'),
                icon_data.get('category', 'General'),
                icon_data.get('displayName'),
                icon_data.get('storageType'),
                icon_data.get('url'),
                icon_data.get('localPath'),
                icon_data.get('cloudPath'),
                datetime.datetime.now().isoformat()
            ))
            logger.info(f"Added icon to SQLite: {icon_data.get('filename')}")
        
        conn.commit()
        return {
            "success": True, 
            "message": "Icon added to SQLite database",
            "id": cursor.lastrowid
        }
    except sqlite3.Error as e:
        logger.error(f"SQLite error adding icon: {e}")
        return {"success": False, "message": f"SQLite error: {str(e)}"}
    finally:
        if conn:
            conn.close()

def get_icons(provider=None):
    """Get all icons from the database, optionally filtered by provider"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        # Get icons
        icons = []
        if provider:
            cursor.execute("""
                SELECT * FROM icons WHERE provider = ?
                ORDER BY category, filename
            """, (provider,))
        else:
            cursor.execute("""
                SELECT * FROM icons
                ORDER BY provider, category, filename
            """)
        
        for row in cursor.fetchall():
            icon = dict(row)
            icons.append(icon)
            
        # Count categories
        categories = []
        cursor.execute("""
            SELECT category, COUNT(*) as count
            FROM icons
            WHERE provider = ?
            GROUP BY category
            ORDER BY category
        """, (provider,))
        
        for row in cursor.fetchall():
            categories.append({
                "name": row["category"],
                "count": row["count"]
            })
            
        # If no categories were found, provide a default empty structure
        if not categories:
            categories = []
            
        logging.info(f"Retrieved {len(icons)} icons from SQLite")
        
        return jsonify({
            "success": True,
            "icons": icons,
            "categories": categories,
            "storage_type": "sqlite",
            "message": f"Retrieved {len(icons)} icons from SQLite"
        })
    except Exception as e:
        logging.error(f"Error getting icons from SQLite: {str(e)}")
        return jsonify({
            "success": False,
            "icons": [],
            "categories": [],
            "error": str(e)
        })
    finally:
        conn.close()

def delete_icon(provider, category, filename):
    """Delete an icon from the SQLite database"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        query = "DELETE FROM icons WHERE provider = ? AND category = ? AND filename = ?"
        cursor.execute(query, (provider, category, filename))
        conn.commit()
        
        deleted_count = cursor.rowcount
        
        logging.info(f"Deleted {deleted_count} icon(s) from SQLite database")
        return {"success": deleted_count > 0, "deleted_count": deleted_count}
    except Exception as e:
        logging.error(f"Error deleting icon from SQLite: {e}")
        return {"success": False, "error": str(e)}
    finally:
        if conn:
            conn.close()

def delete_icons(provider=None):
    """Delete multiple icons from the SQLite database with optional provider filter"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        if provider:
            query = "DELETE FROM icons WHERE provider = ?"
            cursor.execute(query, (provider,))
        else:
            query = "DELETE FROM icons"
            cursor.execute(query)
            
        conn.commit()
        
        deleted_count = cursor.rowcount
        
        logging.info(f"Deleted {deleted_count} icon(s) from SQLite database")
        return {"success": True, "deleted_count": deleted_count}
    except Exception as e:
        logging.error(f"Error deleting icons from SQLite: {e}")
        return {"success": False, "error": str(e), "deleted_count": 0}
    finally:
        if conn:
            conn.close()

def refresh_categories(provider):
    """Refresh icon categories based on path patterns"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Get all icons for the provider
        query = "SELECT id, path, category FROM icons WHERE provider = ?"
        cursor.execute(query, (provider,))
        icons = cursor.fetchall()
        
        updated_count = 0
        for icon_id, path, current_category in icons:
            # Default category if we can't extract from path
            new_category = "General"
            
            # Try to extract category from path pattern: /cloudicons/provider/category/filename
            import re
            path_match = re.match(r'/cloudicons/[^/]+/([^/]+)/[^/]+', path)
            if path_match:
                new_category = path_match.group(1)
            
            # Update if category changed
            if new_category != current_category:
                update_query = "UPDATE icons SET category = ? WHERE id = ?"
                cursor.execute(update_query, (new_category, icon_id))
                updated_count += 1
        
        conn.commit()
        
        logging.info(f"Updated {updated_count} icon categories in SQLite")
        return {"success": True, "updated_count": updated_count}
    except Exception as e:
        logging.error(f"Error refreshing categories in SQLite: {e}")
        return {"success": False, "error": str(e), "updated_count": 0}
    finally:
        if conn:
            conn.close()

def add_diagram(diagram_data):
    """
    Add a diagram to the SQLite database.
    
    Args:
        diagram_data (dict): Dictionary containing diagram data
        
    Returns:
        dict: Result of the operation
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Check if diagram already exists
        cursor.execute(
            "SELECT id FROM diagrams WHERE diagram_id = ?", 
            (diagram_data.get('diagram_id'),)
        )
        existing_diagram = cursor.fetchone()
        
        now = datetime.datetime.now().isoformat()
        
        if existing_diagram:
            # Update existing diagram
            diagram_id = existing_diagram[0]
            cursor.execute('''
            UPDATE diagrams 
            SET name = ?, description = ?, data = ?, updated_at = ?
            WHERE id = ?
            ''', (
                diagram_data.get('name'),
                diagram_data.get('description', ''),
                json.dumps(diagram_data.get('data')),
                now,
                diagram_id
            ))
            logger.info(f"Updated diagram in SQLite: {diagram_data.get('diagram_id')}")
        else:
            # Insert new diagram
            cursor.execute('''
            INSERT INTO diagrams (
                diagram_id, name, description, data, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                diagram_data.get('diagram_id'),
                diagram_data.get('name'),
                diagram_data.get('description', ''),
                json.dumps(diagram_data.get('data')),
                now,
                now
            ))
            logger.info(f"Added diagram to SQLite: {diagram_data.get('diagram_id')}")
        
        conn.commit()
        return {
            "success": True, 
            "message": "Diagram saved to SQLite database",
            "id": diagram_data.get('diagram_id')
        }
    except sqlite3.Error as e:
        logger.error(f"SQLite error adding diagram: {e}")
        return {"success": False, "message": f"SQLite error: {str(e)}"}
    finally:
        if conn:
            conn.close()

def get_diagram(diagram_id):
    """
    Get a diagram from SQLite database.
    
    Args:
        diagram_id (str): The ID of the diagram to retrieve
        
    Returns:
        dict: Dictionary with diagram data or error message
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM diagrams WHERE diagram_id = ?", (diagram_id,))
        row = cursor.fetchone()
        
        if row:
            diagram = dict(row)
            diagram['data'] = json.loads(diagram['data'])
            return {
                "success": True,
                "message": "Diagram retrieved from SQLite",
                "diagram": diagram,
                "storage_type": "sqlite"
            }
        else:
            return {
                "success": False,
                "message": f"Diagram not found in SQLite: {diagram_id}",
                "diagram": None
            }
    except sqlite3.Error as e:
        logger.error(f"SQLite error getting diagram: {e}")
        return {"success": False, "message": f"SQLite error: {str(e)}", "diagram": None}
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error for diagram {diagram_id}: {e}")
        return {"success": False, "message": f"JSON error: {str(e)}", "diagram": None}
    finally:
        if conn:
            conn.close()

def add_conversation(session_id, message, role, model=None):
    """
    Add a conversation message to the SQLite database.
    
    Args:
        session_id (str): Session identifier
        message (str): Message content
        role (str): Message role (user, assistant, system)
        model (str, optional): AI model used
        
    Returns:
        dict: Result of the operation
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        now = datetime.datetime.now().isoformat()
        
        cursor.execute('''
        INSERT INTO conversations (
            session_id, message, role, timestamp, model
        ) VALUES (?, ?, ?, ?, ?)
        ''', (
            session_id,
            message,
            role,
            now,
            model
        ))
        
        conn.commit()
        logger.info(f"Added conversation message to SQLite for session: {session_id}")
        
        return {
            "success": True, 
            "message": "Conversation message saved to SQLite database",
            "id": cursor.lastrowid
        }
    except sqlite3.Error as e:
        logger.error(f"SQLite error adding conversation: {e}")
        return {"success": False, "message": f"SQLite error: {str(e)}"}
    finally:
        if conn:
            conn.close()

def get_conversations(session_id):
    """Get all conversations for a given session ID."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM conversations WHERE session_id = ? ORDER BY timestamp DESC", (session_id,))
        rows = cursor.fetchall()
        
        # Convert rows to dictionaries
        columns = ['id', 'session_id', 'timestamp', 'user_message', 'assistant_message']
        conversations = []
        
        for row in rows:
            conversation = {}
            for i, column in enumerate(columns):
                conversation[column] = row[i]
            conversations.append(conversation)
        
        logging.info(f"Retrieved {len(conversations)} conversation(s) for session {session_id} from SQLite")
        return conversations
    except Exception as e:
        logging.error(f"Error retrieving conversations from SQLite: {e}")
        return []
    finally:
        if 'conn' in locals():
            conn.close()

def get_tables():
    """Get all tables in the SQLite database."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        
        logging.info(f"Retrieved {len(tables)} table(s) from SQLite database")
        return tables
    except Exception as e:
        logging.error(f"Error retrieving tables from SQLite: {e}")
        return []
    finally:
        if 'conn' in locals():
            conn.close()

# Initialize the database when this module is imported
conn = sqlite3.connect(DB_PATH)
init_db(conn)
conn.close() 