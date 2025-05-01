#!/usr/bin/env python3
import sys
import os

# Add the current directory to the path
sys.path.append('.')

# Try to import our modules
try:
    print("Trying to import diagram_analyzer...")
    from api.ai.diagram_analyzer import (
        analyze_diagram,
        generate_analysis_questions,
        generate_infrastructure_code,
        generate_mermaid_diagram
    )
    print("Successfully imported diagram_analyzer")
except Exception as e:
    print(f"Error importing diagram_analyzer: {str(e)}")

try:
    print("\nTrying to import diagram_ai_blueprint...")
    from api.ai.diagram_blueprint import diagram_ai_blueprint
    print("Successfully imported diagram_ai_blueprint")
except Exception as e:
    print(f"Error importing diagram_ai_blueprint: {str(e)}")

print("\nPython path:")
for path in sys.path:
    print(f"  {path}")

print("\nAvailable files in api/ai/:")
try:
    files = os.listdir('api/ai')
    for file in files:
        print(f"  {file}")
except Exception as e:
    print(f"Error listing files: {str(e)}") 