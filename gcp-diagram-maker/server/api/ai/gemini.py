import os
import json
import logging
import datetime
from flask import Blueprint, request, jsonify
from flask_cors import CORS

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Create Blueprint
ai_bp = Blueprint('ai', __name__, url_prefix='/api/ai')
CORS(ai_bp)  # Enable CORS for all AI endpoints

try:
    # Import Google's Generative AI library
    import google.generativeai as genai
    gemini_available = True
    logger.info("Google Generative AI module imported successfully")
except ImportError:
    gemini_available = False
    logger.warning("Google Generative AI module not available. AI features will be limited.")

# Initialize Gemini with API key if available
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
if gemini_available and GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    logger.info("Gemini AI configured with API key")
    
    # List available models for debugging
    try:
        models = genai.list_models()
        logger.info("Available Gemini models:")
        for model in models:
            logger.info(f" - {model.name}")
    except Exception as e:
        logger.error(f"Failed to list Gemini models: {str(e)}")
else:
    logger.warning("Gemini API key not found. Set GEMINI_API_KEY environment variable.")

# System prompt for cloud infrastructure focus
SYSTEM_PROMPT = """You are an expert cloud infrastructure architect specializing in designing resilient, highly available systems.
Your expertise includes:
1. Multi-region architectures for disaster recovery
2. High availability design patterns
3. Redundancy and failover mechanisms
4. Cloud-native resilience approaches
5. AWS, Azure, and GCP best practices for resilient systems

Focus on providing detailed, technical recommendations that prioritize:
- Eliminating single points of failure
- Geographic redundancy where appropriate
- Automatic recovery from component failures
- Data durability and consistency
- Optimal cost-to-resilience ratio

Remember all previous interactions in this conversation to provide consistent, contextual advice.
"""

# Resilience-focused prompts for specific scenarios
RESILIENCE_PROMPTS = {
    "high-availability": """
For high availability design, consider these critical factors:
- Multi-AZ/multi-zone deployments for all components
- Auto-scaling groups with health checks
- Load balancers with proper health monitoring
- Database replication with automatic failover
- Stateless application design where possible
    """,
    
    "disaster-recovery": """
For effective disaster recovery, consider:
- Multi-region replication of data
- Regular testing of recovery procedures
- Recovery Time Objective (RTO) and Recovery Point Objective (RPO) definitions
- Automated failover vs. manual processes
- Backup strategies and consistency requirements
    """,
    
    "storage-resilience": """
For resilient storage design, prioritize:
- Appropriate redundancy levels (LRS, ZRS, GRS, RA-GRS for Azure; Standard, IA, Glacier for AWS)
- Cross-region replication for critical data
- Versioning to protect against accidental deletion or corruption
- Regular backup and integrity checks
- Access controls and encryption
    """,
    
    "compute-resilience": """
For resilient compute resources, implement:
- Auto-scaling groups with health checks
- Distribution across availability zones/regions
- Instance self-healing capabilities
- Immutable infrastructure deployment
- Redundant capacity planning
    """,
    
    "database-resilience": """
For resilient database design, consider:
- Multi-AZ deployments for automatic failover
- Read replicas for performance and minimal failover options
- Regular automated backups
- Point-in-time recovery capabilities
- Multi-region replication for critical workloads
    """,
    
    "network-resilience": """
For resilient networking, implement:
- Redundant load balancers
- Multiple network paths
- Cross-region connectivity
- CDN for static content
- DDoS protection
    """
}

# Function to save conversation to MongoDB
def save_conversation_to_db(user_id, message, response, session_id=None, db=None):
    if db is None:
        logger.warning("Database not available, conversation not saved")
        return False
    
    try:
        conversation_collection = db.conversations
        conversation_entry = {
            'user_id': user_id,
            'message': message,
            'response': response,
            'timestamp': datetime.datetime.now()
        }
        
        if session_id:
            conversation_entry['session_id'] = session_id
            
        result = conversation_collection.insert_one(conversation_entry)
        logger.info(f"Saved conversation to MongoDB with ID: {result.inserted_id}")
        return True
    except Exception as e:
        logger.error(f"Error saving conversation to MongoDB: {str(e)}")
        return False

# Function to get context-aware system prompt based on topics in user message
def get_context_aware_prompt(message, answers=None):
    base_prompt = SYSTEM_PROMPT
    
    # Add specialized prompts based on detected keywords
    if answers and len(answers) > 0:
        # If the user has high availability enabled, add that context
        if answers.get('high-availability') == True:
            base_prompt += RESILIENCE_PROMPTS["high-availability"]
        
        # If the user selected disaster recovery strategy, add that context
        if "disaster-recovery-strategy" in answers:
            base_prompt += RESILIENCE_PROMPTS["disaster-recovery"]
            
        # Add compute resilience context if compute-related answers exist
        if any(key for key in answers.keys() if 'compute' in key or 'vm' in key or 'ec2' in key):
            base_prompt += RESILIENCE_PROMPTS["compute-resilience"]
            
        # Add storage resilience context if storage-related answers exist
        if any(key for key in answers.keys() if 'storage' in key or 'blob' in key or 's3' in key):
            base_prompt += RESILIENCE_PROMPTS["storage-resilience"]
            
        # Add database resilience context if database-related answers exist
        if any(key for key in answers.keys() if 'database' in key or 'sql' in key):
            base_prompt += RESILIENCE_PROMPTS["database-resilience"]
            
        # Add network resilience context if network-related answers exist
        if any(key for key in answers.keys() if 'network' in key or 'load-balancer' in key):
            base_prompt += RESILIENCE_PROMPTS["network-resilience"]
    else:
        # Keyword-based addition when no answers are available
        keywords = {
            "high-availability": ["high availability", "ha", "uptime", "sla", "availability"],
            "disaster-recovery": ["disaster", "recovery", "dr", "backup", "rto", "rpo"],
            "storage-resilience": ["storage", "blob", "s3", "redundancy", "replication", "backup"],
            "compute-resilience": ["compute", "vm", "ec2", "instance", "kubernetes", "container"],
            "database-resilience": ["database", "sql", "nosql", "dynamo", "cosmos", "rds"],
            "network-resilience": ["network", "load balancer", "cdn", "firewall", "traffic"]
        }
        
        # Check each keyword category against the message
        message_lower = message.lower()
        for category, terms in keywords.items():
            if any(term in message_lower for term in terms):
                base_prompt += RESILIENCE_PROMPTS[category]
    
    return base_prompt

# Chat endpoint
@ai_bp.route('/chat', methods=['POST'])
def chat():
    """
    Endpoint for chat with Gemini AI
    """
    # Import MongoDB variables from the main app
    from simple_server import mongo_client, mongodb_initialized
    
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        message = data.get('message')
        session_id = data.get('session_id')
        user_id = data.get('user_id', 'anonymous')
        context = data.get('context', '')
        
        if not message:
            return jsonify({"error": "No message provided"}), 400
        if not session_id:
            return jsonify({"error": "No session_id provided"}), 400
        
        # Check if we have a conversation history for this session
        history = []
        
        # Enhanced MongoDB integration - fetch previous conversation history
        if mongodb_initialized and mongo_client is not None:
            try:
                # Get the database
                db = mongo_client.get_database('azure_diagram_maker')
                conversations_collection = db.get_collection('conversations')
                
                # Fetch conversation history
                conversation_docs = conversations_collection.find(
                    {"session_id": session_id}
                ).sort("timestamp", 1)
                
                for doc in conversation_docs:
                    if doc.get('role') and doc.get('text'):
                        history.append({
                            "role": doc.get('role'),
                            "parts": [doc.get('text')]
                        })
                
                logger.info(f"Retrieved {len(history)} messages from MongoDB for session {session_id}")
            except Exception as e:
                logger.error(f"Error retrieving conversation history from MongoDB: {str(e)}")
                # Continue even if we can't get history - fallback to new conversation
        
        # Create a more detailed system prompt with the context
        system_prompt = """You are an expert cloud architect specializing in Azure, AWS, and GCP. 
Your goal is to help users design efficient, secure, and cost-effective cloud infrastructure.
Focus on providing specific service recommendations, architecture patterns, and best practices
that match the user's requirements. Always provide concrete examples and reasons for your recommendations.

Key priorities to address in your responses:
1. High availability and disaster recovery strategies
2. Security compliance and best practices
3. Cost optimization techniques
4. Scalability considerations
5. Operational efficiency

If the user's requirements are unclear, ask targeted questions to gather necessary information.
"""

        # Add context if available
        if context:
            system_prompt += f"\n\nUser's current infrastructure requirements:\n{context}"
        
        try:
            # Initialize Gemini model with conversation history
            model = genai.GenerativeModel('gemini-1.5-flash')
            
            # Start a new chat
            chat = model.start_chat(history=history)
            
            # Add system prompt if history is empty
            if not history:
                chat.send_message(system_prompt)
            
            # Send user message
            response = chat.send_message(message)
            response_text = response.text
        except Exception as e:
            logger.error(f"Error using Gemini API: {str(e)}")
            # Fallback response if API fails
            response_text = "I'm sorry, I encountered an error while processing your request. Please try again later."
        
        # Save conversation to MongoDB if available
        timestamp = datetime.datetime.utcnow()
        
        if mongodb_initialized and mongo_client is not None:
            try:
                # Get the database
                db = mongo_client.get_database('azure_diagram_maker')
                conversations_collection = db.get_collection('conversations')
                
                # Save user message
                user_message = {
                    "session_id": session_id,
                    "user_id": user_id,
                    "role": "user",
                    "text": message,
                    "timestamp": timestamp
                }
                conversations_collection.insert_one(user_message)
                
                # Save AI response
                ai_response = {
                    "session_id": session_id,
                    "user_id": user_id,
                    "role": "model",
                    "text": response_text,
                    "timestamp": timestamp + datetime.timedelta(milliseconds=100)
                }
                conversations_collection.insert_one(ai_response)
                
                logger.info(f"Saved conversation to MongoDB for session {session_id}")
            except Exception as e:
                logger.error(f"Error saving conversation to MongoDB: {str(e)}")
                # Continue even if we can't save - graceful degradation
        
        return jsonify({
            "response": response_text,
            "session_id": session_id,
            "timestamp": timestamp.isoformat()
        })
    
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Get conversation history
@ai_bp.route('/history', methods=['GET'])
def get_history():
    # Import MongoDB variables from the main app
    from simple_server import mongodb_initialized, mongo_client
    
    if not mongodb_initialized:
        return jsonify({'error': 'MongoDB not available'}), 503
    
    user_id = request.args.get('user_id', 'anonymous')
    session_id = request.args.get('session_id')
    
    if not session_id:
        return jsonify({'error': 'Session ID is required'}), 400
    
    try:
        db = mongo_client.get_database('azure_diagram_maker')
        conversation_collection = db.conversations
        query = {'session_id': session_id}
        if user_id != 'anonymous':
            query['user_id'] = user_id
            
        conversations = list(conversation_collection.find(query).sort('timestamp', 1))
        
        # Format for JSON response
        formatted_conversations = []
        for conv in conversations:
            formatted_conversations.append({
                'message': conv.get('text', ''),
                'role': conv.get('role', 'unknown'),
                'timestamp': conv['timestamp'].isoformat() if 'timestamp' in conv else ''
            })
        
        return jsonify({
            'history': formatted_conversations,
            'count': len(formatted_conversations)
        })
        
    except Exception as e:
        logger.error(f"Error retrieving conversation history: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Specialized endpoint for resilience recommendations
@ai_bp.route('/resilience', methods=['POST'])
def get_resilience_recommendations():
    # Import MongoDB variables from the main app
    from simple_server import mongodb_initialized, mongo_client
    
    if not request.is_json:
        return jsonify({'error': 'Request must be JSON'}), 400
    
    data = request.json
    user_id = data.get('user_id', 'anonymous')
    session_id = data.get('session_id')
    answers = data.get('answers', {})
    
    if not session_id:
        return jsonify({'error': 'Session ID is required'}), 400
    
    # Process with Gemini if available
    if gemini_available and GEMINI_API_KEY:
        try:
            # Set up the model
            generation_config = {
                "temperature": 0.7,
                "top_p": 0.95,
                "top_k": 40,
                "max_output_tokens": 2048,
            }
            
            model = genai.GenerativeModel(
                model_name="gemini-1.5-flash",
                generation_config=generation_config
            )
            
            # Format the answers for the prompt
            formatted_answers = []
            for question_id, answer in answers.items():
                formatted_answers.append(f"{question_id}: {answer}")
            
            answers_text = "\n".join(formatted_answers)
            
            # Create a specialized prompt
            prompt = f"""Based on the following infrastructure configuration choices, provide detailed recommendations for improving resilience and high availability:

{answers_text}

Please structure your response as follows:
1. Overall Resilience Assessment: A brief overview of the current design's resilience
2. Critical Vulnerabilities: Any single points of failure or major resilience gaps
3. Recommendations by Category:
   - Compute Recommendations
   - Storage Recommendations
   - Database Recommendations
   - Networking Recommendations
4. Multi-Region Strategy: Specific advice for geographic redundancy
5. Cost-Effective Improvements: Prioritized list of changes that would provide the best resilience improvement for the cost

Focus on eliminating single points of failure, ensuring geographic redundancy, and implementing automatic recovery mechanisms.
"""
            
            # Generate the response
            response = model.generate_content(prompt)
            
            # Extract the response text
            response_text = response.text
            
            # Save to MongoDB if available
            if mongodb_initialized and mongo_client is not None:
                try:
                    db = mongo_client.get_database('azure_diagram_maker')
                    conversations_collection = db.get_collection('conversations')
                    
                    # Save the user's configuration
                    timestamp = datetime.datetime.utcnow()
                    config_entry = {
                        "session_id": session_id,
                        "user_id": user_id,
                        "role": "user",
                        "text": prompt,
                        "timestamp": timestamp
                    }
                    conversations_collection.insert_one(config_entry)
                    
                    # Save the AI response
                    response_entry = {
                        "session_id": session_id,
                        "user_id": user_id,
                        "role": "model",
                        "text": response_text,
                        "timestamp": timestamp + datetime.timedelta(milliseconds=100)
                    }
                    conversations_collection.insert_one(response_entry)
                    
                    logger.info(f"Saved resilience recommendations to MongoDB for session {session_id}")
                except Exception as e:
                    logger.error(f"Error saving to MongoDB: {str(e)}")
            
            return jsonify({
                'response': response_text,
                'model': 'gemini-1.5-flash',
                'timestamp': datetime.datetime.now().isoformat()
            })
            
        except Exception as e:
            logger.error(f"Error processing with Gemini: {str(e)}")
            return jsonify({
                'error': f"AI processing error: {str(e)}",
                'fallback_response': "I'm sorry, I encountered an error generating resilience recommendations."
            }), 500
    
    # Fallback response if Gemini is not available
    fallback_response = (
        "I'm sorry, but the AI service is currently unavailable for resilience recommendations. "
        "Please try again later or contact support."
    )
    
    return jsonify({
        'response': fallback_response,
        'model': 'fallback',
        'timestamp': datetime.datetime.now().isoformat()
    }) 