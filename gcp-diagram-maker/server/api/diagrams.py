import os
import logging
from flask import Blueprint, request, jsonify
from bson.objectid import ObjectId
import datetime

logger = logging.getLogger(__name__)

# Create Blueprint
diagrams_bp = Blueprint('diagrams', __name__, url_prefix='/api/diagrams')

# Get all diagrams
@diagrams_bp.route('', methods=['GET'])
def get_diagrams():
    from app import mongodb_initialized, db
    
    if mongodb_initialized:
        try:
            diagrams_collection = db.diagrams
            diagrams = list(diagrams_collection.find().sort('updatedAt', -1))
            
            # Convert ObjectId to string for JSON serialization
            for diagram in diagrams:
                if '_id' in diagram:
                    diagram['_id'] = str(diagram['_id'])
            
            return jsonify({
                'diagrams': diagrams,
                'count': len(diagrams)
            })
        except Exception as e:
            logger.error(f"Error fetching diagrams from MongoDB: {str(e)}")
    
    # If MongoDB is not available or an error occurred, return empty list
    return jsonify({
        'diagrams': [],
        'count': 0
    })

# Get a diagram by ID
@diagrams_bp.route('/<diagram_id>', methods=['GET'])
def get_diagram(diagram_id):
    from app import mongodb_initialized, db
    
    if mongodb_initialized:
        try:
            diagrams_collection = db.diagrams
            diagram = diagrams_collection.find_one({'_id': ObjectId(diagram_id)})
            
            if diagram:
                # Convert ObjectId to string for JSON serialization
                diagram['_id'] = str(diagram['_id'])
                return jsonify(diagram)
            
            return jsonify({'error': 'Diagram not found'}), 404
        except Exception as e:
            logger.error(f"Error fetching diagram {diagram_id} from MongoDB: {str(e)}")
            return jsonify({'error': str(e)}), 500
    
    return jsonify({'error': 'MongoDB not available'}), 503

# Create a new diagram
@diagrams_bp.route('', methods=['POST'])
def create_diagram():
    from app import mongodb_initialized, db
    
    if not mongodb_initialized:
        return jsonify({'error': 'MongoDB not available'}), 503
    
    try:
        # Get diagram data from request
        diagram_data = request.json
        
        # Validate required fields
        if not diagram_data or 'name' not in diagram_data or 'elements' not in diagram_data:
            return jsonify({'error': 'Missing required fields: name, elements'}), 400
        
        # Add timestamps
        now = datetime.datetime.now()
        diagram_data['createdAt'] = now
        diagram_data['updatedAt'] = now
        
        # Insert into MongoDB
        diagrams_collection = db.diagrams
        result = diagrams_collection.insert_one(diagram_data)
        
        # Return the created diagram with ID
        diagram_data['_id'] = str(result.inserted_id)
        
        return jsonify({
            'success': True,
            'diagram': diagram_data,
            'message': 'Diagram created successfully'
        }), 201
    except Exception as e:
        logger.error(f"Error creating diagram: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Update a diagram
@diagrams_bp.route('/<diagram_id>', methods=['PUT'])
def update_diagram(diagram_id):
    from app import mongodb_initialized, db
    
    if not mongodb_initialized:
        return jsonify({'error': 'MongoDB not available'}), 503
    
    try:
        # Get update data from request
        update_data = request.json
        
        if not update_data:
            return jsonify({'error': 'No update data provided'}), 400
        
        # Add updated timestamp
        update_data['updatedAt'] = datetime.datetime.now()
        
        # Update in MongoDB
        diagrams_collection = db.diagrams
        result = diagrams_collection.update_one(
            {'_id': ObjectId(diagram_id)},
            {'$set': update_data}
        )
        
        if result.matched_count == 0:
            return jsonify({'error': 'Diagram not found'}), 404
        
        # Get the updated diagram
        updated_diagram = diagrams_collection.find_one({'_id': ObjectId(diagram_id)})
        updated_diagram['_id'] = str(updated_diagram['_id'])
        
        return jsonify({
            'success': True,
            'diagram': updated_diagram,
            'message': 'Diagram updated successfully'
        })
    except Exception as e:
        logger.error(f"Error updating diagram {diagram_id}: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Delete a diagram
@diagrams_bp.route('/<diagram_id>', methods=['DELETE'])
def delete_diagram(diagram_id):
    from app import mongodb_initialized, db
    
    if not mongodb_initialized:
        return jsonify({'error': 'MongoDB not available'}), 503
    
    try:
        # Delete from MongoDB
        diagrams_collection = db.diagrams
        result = diagrams_collection.delete_one({'_id': ObjectId(diagram_id)})
        
        if result.deleted_count == 0:
            return jsonify({'error': 'Diagram not found'}), 404
        
        return jsonify({
            'success': True,
            'message': f'Diagram {diagram_id} deleted successfully'
        })
    except Exception as e:
        logger.error(f"Error deleting diagram {diagram_id}: {str(e)}")
        return jsonify({'error': str(e)}), 500 