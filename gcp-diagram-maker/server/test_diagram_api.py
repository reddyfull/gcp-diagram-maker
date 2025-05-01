#!/usr/bin/env python
import os
import json
import logging
import sys
from flask import Flask, jsonify, request
from flask_cors import CORS

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# Set environment variables if needed
os.environ["OPENAI_API_KEY"] = os.environ.get("OPENAI_API_KEY", "dummy-key-for-testing")
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.environ.get(
    "GOOGLE_APPLICATION_CREDENTIALS", 
    "/Users/sritadip/Documents/Kalidraw/azure-diagram-maker/keys/gen-lang-client-0452237601-1874e15c59b0.json"
)

# Create Flask app
app = Flask(__name__)
CORS(app)

# Try to import the diagram_ai_blueprint
try:
    from api.ai.diagram_analyzer import diagram_ai_blueprint
    app.register_blueprint(diagram_ai_blueprint)
    logger.info("Successfully imported and registered diagram_ai_blueprint")
except ImportError as e:
    logger.error(f"Error importing diagram_ai_blueprint: {e}")
    logger.info("Continuing with test server without the actual blueprint")

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "ok",
        "message": "Test diagram API server is running",
        "version": "0.1.0"
    })

# Test diagram upload endpoint
@app.route('/api/test/upload', methods=['POST'])
def test_upload():
    logger.info("Received test upload request")
    return jsonify({
        "success": True,
        "diagram_id": "test-diagram-123",
        "message": "Test diagram upload successful",
        "next_steps": [
            "Call /api/ai/diagrams/test-diagram-123/questions to get analysis questions",
            "Call /api/ai/diagrams/test-diagram-123/analyze to get full analysis"
        ]
    })

# Test analysis result endpoint
@app.route('/api/test/analyze', methods=['GET'])
def test_analyze():
    logger.info("Received test analyze request")
    return jsonify({
        "success": True,
        "diagram_id": "test-diagram-123",
        "analysis": {
            "components": [
                {"id": "vm1", "type": "VirtualMachine", "name": "Web Server"},
                {"id": "db1", "type": "Database", "name": "SQL Database"},
                {"id": "lb1", "type": "LoadBalancer", "name": "Load Balancer"}
            ],
            "connections": [
                {"source": "lb1", "target": "vm1", "type": "network"},
                {"source": "vm1", "target": "db1", "type": "data"}
            ],
            "recommendations": [
                "Consider adding a backup solution for the database",
                "Add a second VM for high availability"
            ]
        }
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 6001))
    logger.info(f"Starting test diagram API server on port {port}")
    app.run(debug=True, host='0.0.0.0', port=port) 