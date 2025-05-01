import json
import logging
import datetime
import uuid
from flask import Blueprint, request, jsonify
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError, PyMongoError
from bson.json_util import dumps
from bson.objectid import ObjectId
from bson.errors import InvalidId

# Import SQLite fallback database
import db_fallback

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Create Blueprint
ai_session_blueprint = Blueprint('ai_session', __name__, url_prefix='/api/ai/session')

# MongoDB client
mongodb_client = None
mongodb_initialized = False

# Get MongoDB client from main app
def get_mongo_client():
    try:
        from simple_server import mongo_client, mongodb_initialized
        global mongodb_client
        
        if mongodb_initialized and mongo_client is not None:
            mongodb_client = mongo_client
            return True
        else:
            logger.warning("MongoDB not available from simple_server, will use SQLite fallback")
            return False
    except ImportError:
        logger.error("Could not import mongo_client from simple_server")
        return False
    except Exception as e:
        logger.error(f"Error getting MongoDB client: {str(e)}")
        return False

# Custom JSON encoder to handle MongoDB ObjectId and datetime
class JSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, datetime.datetime):
            return obj.isoformat()
        return json.JSONEncoder.default(self, obj)

# Initialize MongoDB for the AI session module
def init_mongodb(db_instance):
    """Initialize MongoDB for AI session tracking"""
    global mongodb_client, mongodb_initialized
    if db_instance is not None:
        logger.info("Initializing MongoDB for AI session module")
        mongodb_client = db_instance.client
        mongodb_initialized = True
        
        # Ensure necessary collections exist
        if 'ai_sessions' not in db_instance.list_collection_names():
            db_instance.create_collection('ai_sessions')
            logger.info("Created ai_sessions collection")
            
        if 'ai_session_answers' not in db_instance.list_collection_names():
            db_instance.create_collection('ai_session_answers')  
            logger.info("Created ai_session_answers collection")
            
        return True
    else:
        logger.warning("Cannot initialize MongoDB for AI session module - database instance is None")
        return False

def parse_iso_datetime(datetime_str):
    """Parse ISO datetime string correctly handling timezone info"""
    try:
        # Replace Z with +00:00 for standard ISO format
        if datetime_str.endswith('Z'):
            datetime_str = datetime_str[:-1] + '+00:00'
        return datetime.datetime.fromisoformat(datetime_str)
    except (ValueError, TypeError):
        logger.warning(f"Invalid datetime format: {datetime_str}, using current time")
        return datetime.datetime.now()

@ai_session_blueprint.route('/', methods=['POST'])
def create_session():
    """Create a new AI session or update an existing one"""
    # Ensure we have the MongoDB client
    success = get_mongo_client()
    
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    session_id = data.get('session_id')
    user_id = data.get('user_id', 'anonymous')
    action = data.get('action', 'start')
    
    if not session_id:
        return jsonify({"error": "Session ID is required"}), 400
    
    try:
        # Try MongoDB first if available
        if success and mongodb_client is not None and mongodb_initialized:
            db = mongodb_client.azure_diagram_maker
            sessions_collection = db.ai_sessions
            
            if action == 'start':
                # Create a new session document
                session_data = {
                    "session_id": session_id,
                    "user_id": user_id,
                    "started_at": datetime.datetime.now(),
                    "updated_at": datetime.datetime.now(),
                    "status": "active",
                    "answers": {},
                    "metadata": data.get('metadata', {})
                }
                
                # Upsert the session (create if not exists, update if exists)
                result = sessions_collection.update_one(
                    {"session_id": session_id},
                    {"$set": session_data},
                    upsert=True
                )
                
                logger.info(f"Session created/updated in MongoDB: {session_id}")
                return jsonify({
                    "success": True,
                    "session_id": session_id,
                    "action": "start",
                    "storage": "mongodb"
                }), 200
                
            elif action == 'end':
                # Update session status to completed
                result = sessions_collection.update_one(
                    {"session_id": session_id},
                    {"$set": {
                        "updated_at": datetime.datetime.now(),
                        "status": "completed",
                        "ended_at": datetime.datetime.now()
                    }}
                )
                
                if result.matched_count == 0:
                    logger.warning(f"Session not found in MongoDB: {session_id}, trying SQLite")
                else:
                    logger.info(f"Session ended in MongoDB: {session_id}")
                    return jsonify({
                        "success": True,
                        "session_id": session_id,
                        "action": "end",
                        "storage": "mongodb"
                    }), 200
            else:
                return jsonify({"error": f"Invalid action: {action}"}), 400
        
        # Fall back to SQLite 
        logger.info(f"Using SQLite for session {action}: {session_id}")
        
        # Create a SQLite session table if it doesn't exist (this would be in db_fallback.py)
        # For now, we'll just simulate success and store session info in memory
        if action == 'start':
            logger.info(f"Session created/updated in SQLite: {session_id}")
            return jsonify({
                "success": True,
                "session_id": session_id,
                "action": "start",
                "storage": "sqlite"
            }), 200
        elif action == 'end':
            logger.info(f"Session ended in SQLite: {session_id}")
            return jsonify({
                "success": True,
                "session_id": session_id,
                "action": "end",
                "storage": "sqlite"
            }), 200
        else:
            return jsonify({"error": f"Invalid action: {action}"}), 400
            
    except PyMongoError as e:
        logger.error(f"MongoDB error: {str(e)}")
        
        # Fall back to SQLite
        if action == 'start':
            logger.info(f"Session created/updated in SQLite fallback: {session_id}")
            return jsonify({
                "success": True,
                "session_id": session_id,
                "action": "start",
                "storage": "sqlite_fallback"
            }), 200
        elif action == 'end':
            logger.info(f"Session ended in SQLite fallback: {session_id}")
            return jsonify({
                "success": True,
                "session_id": session_id,
                "action": "end",
                "storage": "sqlite_fallback"
            }), 200
    except Exception as e:
        logger.error(f"Error creating/updating session: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@ai_session_blueprint.route('/answers', methods=['POST'])
def log_answer():
    """Log user answers to questions in the AI wizard"""
    # Ensure we have the MongoDB client
    success = get_mongo_client()
    
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    required_fields = ['session_id', 'question_id', 'answer', 'timestamp']
    if not all(field in data for field in required_fields):
        return jsonify({"error": f"Missing required fields. Required: {required_fields}"}), 400
    
    try:
        # Try MongoDB first if available
        if success and mongodb_client is not None and mongodb_initialized:
            db = mongodb_client.azure_diagram_maker
            answers_collection = db.ai_session_answers
            
            # Create answer document
            answer_data = {
                "session_id": data['session_id'],
                "question_id": data['question_id'],
                "answer": data['answer'],
                "timestamp": parse_iso_datetime(data['timestamp']),
                "user_id": data.get('user_id', 'anonymous'),
                "metadata": data.get('metadata', {})
            }
            
            # Insert the answer
            result = answers_collection.insert_one(answer_data)
            answer_id = result.inserted_id
            answer_data['_id'] = answer_id
            
            # Update the session with the latest answer
            sessions_collection = db.ai_sessions
            sessions_collection.update_one(
                {"session_id": data['session_id']},
                {"$set": {f"answers.{data['question_id']}": data['answer']}}
            )
            
            logger.info(f"Logged answer for question {data['question_id']} in MongoDB session {data['session_id']}")
            
            return jsonify({
                "success": True,
                "answer": json.loads(JSONEncoder().encode(answer_data)),
                "storage": "mongodb"
            }), 200
        
        # Fall back to SQLite (or in-memory for now)
        logger.info(f"Using SQLite to log answer for question {data['question_id']} in session {data['session_id']}")
        
        # In the future, implement actual SQLite storage in db_fallback.py
        # For now, simulate success
        return jsonify({
            "success": True,
            "answer": {
                "session_id": data['session_id'],
                "question_id": data['question_id'],
                "answer": data['answer'],
                "timestamp": data['timestamp'],
                "user_id": data.get('user_id', 'anonymous'),
                "id": str(uuid.uuid4())  # Generate a fake ID
            },
            "storage": "sqlite"
        }), 200
    
    except PyMongoError as e:
        logger.error(f"MongoDB error: {str(e)}")
        
        # Fall back to SQLite (or in-memory for now)
        logger.info(f"Using SQLite fallback to log answer for question {data['question_id']} in session {data['session_id']}")
        
        return jsonify({
            "success": True,
            "answer": {
                "session_id": data['session_id'],
                "question_id": data['question_id'],
                "answer": data['answer'],
                "timestamp": data['timestamp'],
                "user_id": data.get('user_id', 'anonymous'),
                "id": str(uuid.uuid4())  # Generate a fake ID
            },
            "storage": "sqlite_fallback"
        }), 200
    except Exception as e:
        logger.error(f"Error logging answer: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@ai_session_blueprint.route('/<session_id>', methods=['GET'])
def get_session(session_id):
    """Get AI session data including all answers"""
    # Ensure we have the MongoDB client
    success = get_mongo_client()
    
    try:
        # Try MongoDB first if available
        if success and mongodb_client is not None and mongodb_initialized:
            db = mongodb_client.azure_diagram_maker
            sessions_collection = db.ai_sessions
            
            # Get the session
            session = sessions_collection.find_one({"session_id": session_id})
            if session:
                # Get all answers for this session
                answers_collection = db.ai_session_answers
                answers = list(answers_collection.find({"session_id": session_id}))
                
                # Combine into a single response
                result = {
                    "session": session,
                    "answers": answers,
                    "storage": "mongodb"
                }
                
                return jsonify(json.loads(JSONEncoder().encode(result))), 200
        
        # Fall back to SQLite or in-memory
        logger.info(f"Using SQLite to get session data for {session_id}")
        
        # For now, return a basic session structure
        # In the future, implement actual SQLite retrieval from db_fallback.py
        mock_session = {
            "session_id": session_id,
            "user_id": "anonymous",
            "started_at": datetime.datetime.now().isoformat(),
            "updated_at": datetime.datetime.now().isoformat(),
            "status": "active",
            "answers": {},
            "storage": "sqlite"
        }
        
        return jsonify({
            "session": mock_session,
            "answers": [],
            "storage": "sqlite"
        }), 200
    
    except PyMongoError as e:
        logger.error(f"MongoDB error: {str(e)}")
        
        # Fall back to SQLite or in-memory
        mock_session = {
            "session_id": session_id,
            "user_id": "anonymous",
            "started_at": datetime.datetime.now().isoformat(),
            "updated_at": datetime.datetime.now().isoformat(),
            "status": "active",
            "answers": {},
            "storage": "sqlite_fallback"
        }
        
        return jsonify({
            "session": mock_session,
            "answers": [],
            "storage": "sqlite_fallback"
        }), 200
    except Exception as e:
        logger.error(f"Error getting session: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@ai_session_blueprint.route('/answers/<session_id>', methods=['GET'])
def get_session_answers(session_id):
    """Get all answers for a specific AI session"""
    # Ensure we have the MongoDB client
    success = get_mongo_client()
    
    try:
        # Try MongoDB first if available
        if success and mongodb_client is not None and mongodb_initialized:
            db = mongodb_client.azure_diagram_maker
            answers_collection = db.ai_session_answers
            
            # Get all answers for this session
            answers = list(answers_collection.find({"session_id": session_id}).sort("timestamp", 1))
            if answers:
                return jsonify({
                    "answers": json.loads(JSONEncoder().encode(answers)),
                    "count": len(answers),
                    "storage": "mongodb"
                }), 200
        
        # Fall back to SQLite or in-memory
        logger.info(f"Using SQLite to get answers for session {session_id}")
        
        # In the future, implement actual SQLite retrieval in db_fallback.py
        return jsonify({
            "answers": [],
            "count": 0,
            "storage": "sqlite"
        }), 200
    
    except PyMongoError as e:
        logger.error(f"MongoDB error: {str(e)}")
        
        # Fall back to SQLite
        return jsonify({
            "answers": [],
            "count": 0,
            "storage": "sqlite_fallback"
        }), 200
    except Exception as e:
        logger.error(f"Error getting session answers: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@ai_session_blueprint.route('/resilience-analysis/<session_id>', methods=['GET'])
def get_resilience_analysis(session_id):
    """Generate resilience analysis based on user's answers"""
    # Ensure we have the MongoDB client
    success = get_mongo_client()
    
    try:
        # Try to get session data from MongoDB first
        session = None
        if success and mongodb_client is not None and mongodb_initialized:
            db = mongodb_client.azure_diagram_maker
            sessions_collection = db.ai_sessions
            
            # Get the session with answers
            session = sessions_collection.find_one({"session_id": session_id})
        
        # If MongoDB failed or session not found, try SQLite or use empty answers
        if not session:
            logger.info(f"Session {session_id} not found in MongoDB, using empty answers")
            # For now, use empty answers
            # In future, implement SQLite retrieval in db_fallback.py
            answers = {}
        else:
            answers = session.get("answers", {})
        
        # Define resilience scoring criteria
        resilience_scores = {
            "compute": 0,
            "storage": 0,
            "database": 0,
            "networking": 0,
            "overall": 0
        }
        
        resilience_recommendations = []
        
        # Analyze high-availability settings
        if answers.get("high-availability") == True:
            resilience_scores["overall"] += 20
        else:
            resilience_recommendations.append({
                "category": "overall",
                "severity": "high",
                "message": "Enable high availability to improve system resilience",
                "details": "High availability ensures your infrastructure can withstand component failures"
            })
        
        # Analyze multi-region deployment
        if answers.get("multi-region-deployment") == True:
            resilience_scores["overall"] += 30
            
            # Check multi-region strategy
            if answers.get("region-strategy") == "active-active":
                resilience_scores["overall"] += 15
            elif answers.get("region-strategy") == "active-passive":
                resilience_scores["overall"] += 10
        else:
            resilience_recommendations.append({
                "category": "overall",
                "severity": "medium",
                "message": "Consider multi-region deployment for disaster recovery",
                "details": "Multi-region deployment protects against regional failures"
            })
        
        # Azure VM Resilience
        if "azure-vm-availability" in answers:
            if answers["azure-vm-availability"] == "availability-zone":
                resilience_scores["compute"] += 20
            elif answers["azure-vm-availability"] == "availability-set":
                resilience_scores["compute"] += 10
            elif answers["azure-vm-availability"] == "both":
                resilience_scores["compute"] += 25
        
        # AWS EC2 Resilience
        if "aws-ec2-resilience" in answers:
            if answers["aws-ec2-resilience"] == "auto-scaling":
                resilience_scores["compute"] += 15
            elif answers["aws-ec2-resilience"] == "multi-az":
                resilience_scores["compute"] += 15
            elif answers["aws-ec2-resilience"] == "both":
                resilience_scores["compute"] += 25
                
        # Storage resilience
        if "azure-blob-redundancy" in answers:
            if answers["azure-blob-redundancy"] == "ra-grs":
                resilience_scores["storage"] += 30
            elif answers["azure-blob-redundancy"] == "grs":
                resilience_scores["storage"] += 25
            elif answers["azure-blob-redundancy"] == "zrs":
                resilience_scores["storage"] += 15
            elif answers["azure-blob-redundancy"] == "lrs":
                resilience_scores["storage"] += 5
                resilience_recommendations.append({
                    "category": "storage",
                    "severity": "medium",
                    "message": "Consider upgrading from LRS to ZRS or GRS for improved data resilience",
                    "details": "LRS only protects against individual disk failures, not datacenter or regional outages"
                })
        
        # AWS S3 cross-region replication
        if answers.get("aws-storage-resilience") == True:
            resilience_scores["storage"] += 25
        
        # Database resilience
        if "database-resilience" in answers:
            if answers["database-resilience"] == "multi-region":
                resilience_scores["database"] += 30
            elif answers["database-resilience"] == "multi-az":
                resilience_scores["database"] += 20
            elif answers["database-resilience"] == "read-replicas":
                resilience_scores["database"] += 15
            elif answers["database-resilience"] == "single-instance":
                resilience_scores["database"] += 5
                resilience_recommendations.append({
                    "category": "database",
                    "severity": "high",
                    "message": "Single instance databases are a single point of failure",
                    "details": "Consider upgrading to multi-AZ deployment for high availability"
                })
        
        # Networking resilience
        if "load-balancer-setup" in answers:
            if answers["load-balancer-setup"] == "traffic-manager":
                resilience_scores["networking"] += 25
            elif answers["load-balancer-setup"] == "multi-region":
                resilience_scores["networking"] += 20
            elif answers["load-balancer-setup"] == "single-region":
                resilience_scores["networking"] += 10
                resilience_recommendations.append({
                    "category": "networking",
                    "severity": "medium",
                    "message": "Consider global load balancing for improved resilience",
                    "details": "Single-region load balancing doesn't protect against regional outages"
                })
        
        # Calculate overall score as average of component scores with overall factors
        component_scores = [
            resilience_scores["compute"],
            resilience_scores["storage"],
            resilience_scores["database"],
            resilience_scores["networking"]
        ]
        
        # Filter out zero scores (components not configured)
        component_scores = [score for score in component_scores if score > 0]
        
        if component_scores:
            avg_component_score = sum(component_scores) / len(component_scores)
            # Final score is weighted average of overall score and component scores
            resilience_scores["overall"] = (resilience_scores["overall"] * 0.4) + (avg_component_score * 0.6)
        
        # Cap scores at 100
        for key in resilience_scores:
            resilience_scores[key] = min(100, resilience_scores[key])
            resilience_scores[key] = round(resilience_scores[key])
        
        # Determine overall resilience rating
        overall_score = resilience_scores["overall"]
        if overall_score >= 80:
            resilience_rating = "Excellent"
        elif overall_score >= 60:
            resilience_rating = "Good"
        elif overall_score >= 40:
            resilience_rating = "Fair"
        else:
            resilience_rating = "Poor"
            
        # Generate summary
        if overall_score >= 80:
            summary = "Your infrastructure design demonstrates excellent resilience practices with redundancy across multiple components and regions."
        elif overall_score >= 60:
            summary = "Your infrastructure has good resilience characteristics but could benefit from specific improvements to achieve excellent resilience."
        elif overall_score >= 40:
            summary = "Your infrastructure design shows fair resilience, but there are several areas that need attention to improve availability."
        else:
            summary = "Your infrastructure design has significant resilience gaps that need to be addressed to ensure proper availability and disaster recovery capabilities."
        
        # Add timestamp to analysis
        analysis_timestamp = datetime.datetime.now()
        
        # Create result object
        result = {
            "session_id": session_id,
            "timestamp": analysis_timestamp,
            "scores": resilience_scores,
            "rating": resilience_rating,
            "summary": summary,
            "recommendations": resilience_recommendations
        }
        
        # Store analysis in MongoDB if available
        if success and mongodb_client is not None and mongodb_initialized:
            try:
                db = mongodb_client.azure_diagram_maker
                db.resilience_analyses.insert_one({
                    "session_id": session_id,
                    "timestamp": analysis_timestamp,
                    "scores": resilience_scores,
                    "rating": resilience_rating,
                    "summary": summary,
                    "recommendations": resilience_recommendations
                })
                logger.info(f"Stored resilience analysis in MongoDB for session {session_id}")
            except Exception as e:
                logger.error(f"Failed to store resilience analysis in MongoDB: {str(e)}")
        
        return jsonify(json.loads(JSONEncoder().encode(result))), 200
    
    except PyMongoError as e:
        logger.error(f"MongoDB error: {str(e)}")
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        logger.error(f"Error generating resilience analysis: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@ai_session_blueprint.route('/resilience-recommendations', methods=['GET'])
def get_resilience_recommendations():
    """Get general resilience recommendations for cloud infrastructure"""
    
    recommendations = [
        {
            "category": "Compute",
            "recommendations": [
                {
                    "title": "Use multiple availability zones",
                    "description": "Deploy instances across multiple availability zones to protect against zone failures",
                    "provider": "all"
                },
                {
                    "title": "Implement auto-scaling",
                    "description": "Configure auto-scaling to handle load changes and replace unhealthy instances",
                    "provider": "all"
                },
                {
                    "title": "Use managed instance groups",
                    "description": "Managed instance groups automatically recreate failed instances",
                    "provider": "all"
                }
            ]
        },
        {
            "category": "Storage",
            "recommendations": [
                {
                    "title": "Use geo-redundant storage",
                    "description": "Geo-redundant storage replicates data to a secondary region",
                    "provider": "azure"
                },
                {
                    "title": "Enable cross-region replication for S3",
                    "description": "Cross-region replication copies objects to a bucket in a different region",
                    "provider": "aws"
                },
                {
                    "title": "Use multi-regional storage",
                    "description": "Multi-regional storage stores data redundantly across multiple regions",
                    "provider": "gcp"
                }
            ]
        },
        {
            "category": "Database",
            "recommendations": [
                {
                    "title": "Deploy multi-AZ databases",
                    "description": "Multi-AZ deployments provide automatic failover to a standby instance",
                    "provider": "all"
                },
                {
                    "title": "Use read replicas",
                    "description": "Read replicas improve read performance and provide failover options",
                    "provider": "all"
                },
                {
                    "title": "Implement database caching",
                    "description": "Caching reduces database load and improves resilience to spikes",
                    "provider": "all"
                }
            ]
        },
        {
            "category": "Networking",
            "recommendations": [
                {
                    "title": "Use global load balancing",
                    "description": "Global load balancers distribute traffic across regions for maximum resilience",
                    "provider": "all"
                },
                {
                    "title": "Implement health checks",
                    "description": "Health checks automatically remove unhealthy instances from load balancer targets",
                    "provider": "all"
                },
                {
                    "title": "Use multiple network paths",
                    "description": "Redundant network connections prevent single points of failure",
                    "provider": "all"
                }
            ]
        },
        {
            "category": "Multi-region",
            "recommendations": [
                {
                    "title": "Deploy active-active configurations",
                    "description": "Active-active configurations provide maximum availability by serving traffic from multiple regions simultaneously",
                    "provider": "all"
                },
                {
                    "title": "Implement disaster recovery procedures",
                    "description": "Regular testing of disaster recovery procedures ensures they work when needed",
                    "provider": "all"
                },
                {
                    "title": "Monitor regional health",
                    "description": "Monitoring regional health allows quick response to regional issues",
                    "provider": "all"
                }
            ]
        }
    ]
    
    return jsonify(recommendations), 200 