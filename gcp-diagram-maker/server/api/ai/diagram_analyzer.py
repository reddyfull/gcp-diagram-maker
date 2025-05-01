import os
import logging
import json
import base64
from google.generativeai import GenerativeModel
from google.generativeai.types import HarmCategory, HarmBlockThreshold
import google.generativeai as genai

logger = logging.getLogger(__name__)

# Get the API key from environment variables
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    logger.warning("GEMINI_API_KEY not found in environment variables")

# Initialize the Gemini API
genai.configure(api_key=GEMINI_API_KEY)

# Define all exportable functions for proper imports
__all__ = [
    'analyze_diagram',
    'generate_analysis_questions',
    'generate_infrastructure_code',
    'generate_mermaid_diagram',
    'analyze_code_changes'
]

def init_gemini_vision_model():
    """Initialize the Gemini Vision model for image analysis."""
    try:
        # Configure safety settings for the model
        safety_settings = {
            HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
        }

        # Initialize the model
        model = GenerativeModel(
            model_name="gemini-1.5-flash",
            generation_config={
                "temperature": 0.2,
                "top_p": 0.95,
                "top_k": 40,
                "max_output_tokens": 2048,
            },
            safety_settings=safety_settings,
        )
        logger.info("Successfully initialized Gemini Vision model")
        return model
    except Exception as e:
        logger.error(f"Error initializing Gemini Vision model: {str(e)}")
        return None

def analyze_diagram(image_path):
    """
    Analyze a diagram image and extract components and relationships.
    
    Args:
        image_path: Path to the diagram image
        
    Returns:
        Dictionary with extracted components and relationships
    """
    try:
        # Check if we have API key
        if not GEMINI_API_KEY:
            logger.warning("No Gemini API key available, returning mock analysis data")
            # Return mock data for testing
            return {
                "success": True,
                "analysis": {
                    "components": [
                        {
                            "id": "vm1",
                            "name": "Virtual Machine",
                            "type": "compute",
                            "description": "Azure Virtual Machine instance",
                            "provider": "azure"
                        },
                        {
                            "id": "db1",
                            "name": "Database",
                            "type": "database",
                            "description": "Azure SQL Database",
                            "provider": "azure"
                        }
                    ],
                    "connections": [
                        {
                            "source": "vm1",
                            "target": "db1",
                            "type": "data_flow",
                            "description": "Database connection"
                        }
                    ],
                    "architecture": {
                        "pattern": "n-tier",
                        "provider": "azure",
                        "notes": "Simple two-tier architecture with compute and database"
                    },
                    "security": [
                        {
                            "type": "network_security_group",
                            "description": "Control traffic to VM",
                            "components": ["vm1"]
                        }
                    ]
                }
            }
            
        # Initialize Gemini model
        model = init_gemini_vision_model()
        if not model:
            return {"success": False, "error": "Failed to initialize Gemini model"}
        
        # Read the image file
        with open(image_path, "rb") as image_file:
            image_data = image_file.read()
            
        # Encode the image to base64
        image_base64 = base64.b64encode(image_data).decode("utf-8")
        
        # Prepare prompt with the image
        prompt = """
        Analyze this infrastructure diagram image and extract the following information:
        
        1. Identify all components (servers, databases, networks, load balancers, etc.)
        2. Identify the relationships and connections between components
        3. Detect any cloud provider-specific elements (AWS, Azure, GCP)
        4. Identify the overall architecture pattern (microservices, monolithic, serverless, etc.)
        5. Detect any security measures or compliance elements
        
        Format your response as a JSON object with the following structure:
        {
            "components": [
                {
                    "id": "unique_id",
                    "name": "component_name",
                    "type": "component_type",
                    "description": "brief_description",
                    "provider": "cloud_provider_if_applicable"
                }
            ],
            "connections": [
                {
                    "source": "source_component_id",
                    "target": "target_component_id",
                    "type": "connection_type",
                    "description": "brief_description"
                }
            ],
            "architecture": {
                "pattern": "architecture_pattern",
                "provider": "primary_cloud_provider",
                "notes": "additional_observations"
            },
            "security": [
                {
                    "type": "security_measure_type",
                    "description": "brief_description",
                    "components": ["component_ids_affected"]
                }
            ]
        }
        
        Ensure your response is ONLY the JSON object, no additional text.
        """
        
        # Generate response with the image
        response = model.generate_content([prompt, {"mime_type": "image/jpeg", "data": image_base64}])
        
        # Parse the response
        result_text = response.text
        
        # Try to extract JSON from the response
        try:
            # Check if the response is wrapped in code blocks
            if "```json" in result_text and "```" in result_text:
                result_text = result_text.split("```json")[1].split("```")[0].strip()
            elif "```" in result_text:
                result_text = result_text.split("```")[1].split("```")[0].strip()
                
            # Parse the JSON
            result_json = json.loads(result_text)
            return {
                "success": True,
                "analysis": result_json
            }
        except json.JSONDecodeError as json_err:
            logger.error(f"Failed to parse JSON from Gemini response: {str(json_err)}")
            return {
                "success": False,
                "error": "Failed to parse analysis results",
                "raw_response": result_text
            }
            
    except Exception as e:
        logger.error(f"Error analyzing diagram: {str(e)}")
        return {"success": False, "error": str(e)}

def generate_analysis_questions(analysis_result):
    """
    Generate questions based on the diagram analysis to clarify requirements.
    
    Args:
        analysis_result: Dictionary with the diagram analysis results
        
    Returns:
        Dictionary with questions organized by categories
    """
    try:
        if not analysis_result.get("success", False):
            return {"success": False, "error": "Invalid analysis result"}
            
        analysis = analysis_result.get("analysis", {})
        
        # Check if we have API key
        if not GEMINI_API_KEY:
            logger.warning("No Gemini API key available, returning mock question data")
            # Return mock data for testing
            return {
                "success": True,
                "questions": [
                    {
                        "id": "q1",
                        "category": "Component details",
                        "question": "What size do you want for the Virtual Machine?",
                        "options": ["Small (2 vCPU)", "Medium (4 vCPU)", "Large (8 vCPU)"],
                        "context": "VM size determines performance and cost",
                        "affects_components": ["vm1"]
                    },
                    {
                        "id": "q2",
                        "category": "Component details",
                        "question": "What tier of SQL Database do you require?",
                        "options": ["Basic", "Standard", "Premium"],
                        "context": "Database tier affects performance, cost, and availability",
                        "affects_components": ["db1"]
                    },
                    {
                        "id": "q3",
                        "category": "Cloud provider specifics",
                        "question": "Which Azure region do you want to deploy to?",
                        "options": ["East US", "West US", "North Europe", "Southeast Asia"],
                        "context": "Region choice affects latency and compliance",
                        "affects_components": ["vm1", "db1"]
                    },
                    {
                        "id": "q4",
                        "category": "Architecture decisions",
                        "question": "Do you need high availability for the VM?",
                        "options": ["Yes", "No"],
                        "context": "High availability requires additional resources",
                        "affects_components": ["vm1"]
                    },
                    {
                        "id": "q5",
                        "category": "Security and compliance",
                        "question": "What level of security do you need for the database?",
                        "options": ["Basic", "Advanced with data encryption", "Maximum with Always Encrypted"],
                        "context": "Security choices affect cost and performance",
                        "affects_components": ["db1"]
                    }
                ]
            }
            
        # Initialize Gemini model
        model = init_gemini_vision_model()
        if not model:
            return {"success": False, "error": "Failed to initialize Gemini model"}
        
        # Prepare prompt with the analysis
        prompt = f"""
        Based on the following infrastructure diagram analysis, generate a list of important questions to ask the user to clarify requirements:
        
        {json.dumps(analysis, indent=2)}
        
        Generate questions for the following categories:
        1. Component details (specifications, versions, configurations)
        2. Connection details (protocols, security, bandwidth)
        3. Cloud provider specifics (regions, zones, account setup)
        4. Architecture decisions (why certain patterns were chosen)
        5. Security and compliance requirements
        6. Scaling and performance requirements
        7. Backup and disaster recovery requirements
        8. Monitoring and logging requirements
        
        Format your response as a JSON object with the following structure:
        {{
            "questions": [
                {{
                    "id": "q1",
                    "category": "category_name",
                    "question": "question_text",
                    "options": ["option1", "option2"] (optional),
                    "context": "why_this_question_is_important",
                    "affects_components": ["component_ids_affected"]
                }}
            ]
        }}
        
        Ensure your response is ONLY the JSON object, no additional text.
        """
        
        # Generate response
        response = model.generate_content(prompt)
        
        # Parse the response
        result_text = response.text
        
        # Try to extract JSON from the response
        try:
            # Check if the response is wrapped in code blocks
            if "```json" in result_text and "```" in result_text:
                result_text = result_text.split("```json")[1].split("```")[0].strip()
            elif "```" in result_text:
                result_text = result_text.split("```")[1].split("```")[0].strip()
                
            # Parse the JSON
            result_json = json.loads(result_text)
            return {
                "success": True,
                "questions": result_json.get("questions", [])
            }
        except json.JSONDecodeError as json_err:
            logger.error(f"Failed to parse JSON from Gemini response: {str(json_err)}")
            return {
                "success": False,
                "error": "Failed to parse questions",
                "raw_response": result_text
            }
            
    except Exception as e:
        logger.error(f"Error generating questions: {str(e)}")
        return {"success": False, "error": str(e)}

def generate_infrastructure_code(analysis_result, answers, provider="azure", iac_tool="terraform"):
    """
    Generate infrastructure as code based on the diagram analysis and user answers.
    
    Args:
        analysis_result: Dictionary with the diagram analysis results
        answers: Dictionary with user answers to the questions
        provider: Cloud provider (azure, aws, gcp)
        iac_tool: Infrastructure as Code tool (terraform, cloudformation, arm)
        
    Returns:
        Dictionary with the generated code
    """
    try:
        if not analysis_result.get("success", False):
            return {"success": False, "error": "Invalid analysis result"}
            
        analysis = analysis_result.get("analysis", {})
        
        # Check if we have API key
        if not GEMINI_API_KEY:
            logger.warning("No Gemini API key available, returning mock infrastructure code")
            # Return mock data for testing
            vm_size = answers.get("q1", "Medium (4 vCPU)")
            sql_tier = answers.get("q2", "Standard")
            region = answers.get("q3", "East US")
            ha_enabled = answers.get("q4", "No") == "Yes"
            db_security = answers.get("q5", "Basic")
            
            # Generate different mock code based on provider and tool
            if iac_tool.lower() == 'terraform':
                if provider.lower() == 'azure':
                    mock_tf = f"""
provider "azurerm" {{
  features {{}}
}}

resource "azurerm_resource_group" "example" {{
  name     = "example-resources"
  location = "{region}"
}}

resource "azurerm_virtual_network" "example" {{
  name                = "example-network"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.example.location
  resource_group_name = azurerm_resource_group.example.name
}}

resource "azurerm_subnet" "example" {{
  name                 = "internal"
  resource_group_name  = azurerm_resource_group.example.name
  virtual_network_name = azurerm_virtual_network.example.name
  address_prefixes     = ["10.0.2.0/24"]
}}

resource "azurerm_network_interface" "example" {{
  name                = "example-nic"
  location            = azurerm_resource_group.example.location
  resource_group_name = azurerm_resource_group.example.name

  ip_configuration {{
    name                          = "internal"
    subnet_id                     = azurerm_subnet.example.id
    private_ip_address_allocation = "Dynamic"
  }}
}}

resource "azurerm_linux_virtual_machine" "example" {{
  name                = "example-machine"
  resource_group_name = azurerm_resource_group.example.name
  location            = azurerm_resource_group.example.location
  size                = "{vm_size.split(' ')[0].lower()}_{vm_size.split(' ')[1].replace('(', '').replace(')', '').lower()}"
  admin_username      = "adminuser"
  network_interface_ids = [
    azurerm_network_interface.example.id,
  ]

  admin_ssh_key {{
    username   = "adminuser"
    public_key = file("~/.ssh/id_rsa.pub")
  }}

  os_disk {{
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }}

  source_image_reference {{
    publisher = "Canonical"
    offer     = "UbuntuServer"
    sku       = "18.04-LTS"
    version   = "latest"
  }}
}}

resource "azurerm_mssql_server" "example" {{
  name                         = "example-sqlserver"
  resource_group_name          = azurerm_resource_group.example.name
  location                     = azurerm_resource_group.example.location
  version                      = "12.0"
  administrator_login          = "sqladmin"
  administrator_login_password = "YourStrongPassword123!"
}}

resource "azurerm_mssql_database" "example" {{
  name           = "example-db"
  server_id      = azurerm_mssql_server.example.id
  collation      = "SQL_Latin1_General_CP1_CI_AS"
  license_type   = "LicenseIncluded"
  sku_name       = "{sql_tier}"
  zone_redundant = {str(ha_enabled).lower()}
}}
"""
                    return {
                        "success": True,
                        "files": [
                            {
                                "filename": "main.tf",
                                "content": mock_tf.strip()
                            }
                        ],
                        "documentation": "This is a basic Azure infrastructure with a VM and SQL Database."
                    }
                elif provider.lower() == 'aws':
                    # Mock AWS Terraform code
                    return {
                        "success": True,
                        "files": [
                            {
                                "filename": "main.tf",
                                "content": "provider \"aws\" {\n  region = \"us-east-1\"\n}\n\n# AWS resources will be generated here"
                            }
                        ],
                        "documentation": "This is a basic AWS infrastructure setup."
                    }
                else:  # gcp
                    # Mock GCP Terraform code
                    return {
                        "success": True,
                        "files": [
                            {
                                "filename": "main.tf",
                                "content": "provider \"google\" {\n  project = \"my-project\"\n  region  = \"us-central1\"\n}\n\n# GCP resources will be generated here"
                            }
                        ],
                        "documentation": "This is a basic GCP infrastructure setup."
                    }
            elif iac_tool.lower() == 'arm':
                # Mock ARM template
                return {
                    "success": True,
                    "files": [
                        {
                            "filename": "azuredeploy.json",
                            "content": "{\n  \"$schema\": \"https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#\",\n  \"contentVersion\": \"1.0.0.0\",\n  \"parameters\": {},\n  \"resources\": []\n}"
                        }
                    ],
                    "documentation": "This is a basic ARM template for Azure deployment."
                }
            else:  # cloudformation
                # Mock CloudFormation template
                return {
                    "success": True,
                    "files": [
                        {
                            "filename": "template.yaml",
                            "content": "AWSTemplateFormatVersion: '2010-09-09'\nResources:\n  # Resources will be defined here"
                        }
                    ],
                    "documentation": "This is a basic CloudFormation template for AWS deployment."
                }
            
        # Continue with the existing implementation for when API key is available
        # Combine the analysis results with the user answers
        combined_answers = answers.copy()
        
        # Add cloud provider if not specified
        if 'cloud-provider' not in combined_answers and provider:
            combined_answers['cloud-provider'] = provider
            
        # Add resources detected from the diagram analysis
        if 'resources' in analysis:
            # Extract compute services
            compute_services = []
            for resource in analysis.get('resources', []):
                res_type = resource.get('type', '').lower()
                if res_type in ['vm', 'virtual machine', 'ec2', 'instance']:
                    if provider == 'azure':
                        compute_services.append('vm')
                    elif provider == 'aws':
                        compute_services.append('ec2')
                elif res_type in ['kubernetes', 'aks', 'eks']:
                    if provider == 'azure':
                        compute_services.append('aks')
                    elif provider == 'aws':
                        compute_services.append('eks')
            
            if provider == 'azure':
                combined_answers['azure-compute-services'] = compute_services
            elif provider == 'aws':
                combined_answers['aws-compute-services'] = compute_services
                
            # Extract database services
            db_types = []
            for resource in analysis.get('resources', []):
                res_type = resource.get('type', '').lower()
                if res_type in ['sql', 'database', 'rds', 'sqlserver']:
                    db_types.append('sql')
                elif res_type in ['nosql', 'cosmosdb', 'dynamodb', 'mongodb']:
                    db_types.append('nosql')
                    
            if db_types:
                combined_answers['database-requirements'] = db_types
        
        # Generate the appropriate infrastructure code based on the IaC tool
        if iac_tool.lower() == 'terraform':
            # Import the function here to avoid circular imports
            from ..generators.terraform_generator import generate_terraform_code
            result = generate_terraform_code(combined_answers)
            return {
                "success": True,
                "files": result['files'],
                "documentation": result['documentation']
            }
        else:
            # Use the Gemini model for other IaC tools
            # This is the existing implementation
            model = init_gemini_vision_model()
            if not model:
                return {"success": False, "error": "Failed to initialize Gemini model"}
            
            # Prepare prompt with the analysis and answers
            prompt = f"""
            Based on the following infrastructure diagram analysis and user answers, generate {iac_tool.upper()} code for {provider.upper()} cloud provider:
            
            DIAGRAM ANALYSIS:
            {json.dumps(analysis, indent=2)}
            
            USER ANSWERS:
            {json.dumps(combined_answers, indent=2)}
            
            Generate complete, production-ready {iac_tool} code that includes:
            1. All resources identified in the diagram
            2. Proper naming conventions and tagging
            3. Security configurations as specified in answers
            4. Network setup with proper connectivity
            5. Variables for configurable elements
            6. Outputs for important resource identifiers
            
            Format your response as a JSON object with the following structure:
            {{
                "files": [
                    {{
                        "filename": "file_name.tf",
                        "content": "file_content"
                    }}
                ],
                "documentation": "brief_explanation_of_implementation"
            }}
            
            Ensure your response is ONLY the JSON object, no additional text.
            """
            
            # Generate response
            response = model.generate_content(prompt)
            
            # Parse the response
            result_text = response.text
            
            # Try to extract JSON from the response
            try:
                # Check if the response is wrapped in code blocks
                if "```json" in result_text and "```" in result_text:
                    result_text = result_text.split("```json")[1].split("```")[0].strip()
                elif "```" in result_text:
                    result_text = result_text.split("```")[1].split("```")[0].strip()
                    
                # Parse the JSON
                result_json = json.loads(result_text)
                return {
                    "success": True,
                    "files": result_json.get("files", []),
                    "documentation": result_json.get("documentation", "")
                }
            except json.JSONDecodeError as json_err:
                logger.error(f"Failed to parse JSON from Gemini response: {str(json_err)}")
                return {
                    "success": False,
                    "error": "Failed to parse infrastructure code",
                    "raw_response": result_text
                }
            
    except Exception as e:
        logger.error(f"Error generating infrastructure code: {str(e)}")
        return {"success": False, "error": str(e)}

def generate_mermaid_diagram(analysis_result, answers=None):
    """
    Generate a Mermaid diagram based on the diagram analysis and user answers.
    
    Args:
        analysis_result: Dictionary with the diagram analysis results
        answers: Dictionary with user answers to the questions (optional)
        
    Returns:
        Dictionary with the generated Mermaid diagram code
    """
    try:
        if not analysis_result.get("success", False):
            return {"success": False, "error": "Invalid analysis result"}
            
        analysis = analysis_result.get("analysis", {})
        
        # Check if we have API key
        if not GEMINI_API_KEY:
            logger.warning("No Gemini API key available, returning mock Mermaid diagram")
            # Generate mock Mermaid diagram
            region = "East US"
            ha_enabled = False
            db_security = "Basic"
            
            if answers:
                region = answers.get("q3", "East US")
                ha_enabled = answers.get("q4", "No") == "Yes"
                db_security = answers.get("q5", "Basic")
            
            # Create a simple diagram based on the components in the analysis
            mock_mermaid = """
graph TD
    subgraph "Azure Cloud - {region}"
        VM[Virtual Machine] --> |connects to| DB[(SQL Database)]
        NSG[Network Security Group] --> VM
    end
    
    classDef azure fill:#0072C6,stroke:#0072C6,color:white;
    classDef security fill:#5bb75b,stroke:#5bb75b,color:white;
    
    class VM,DB azure;
    class NSG security;
"""
            mock_mermaid = mock_mermaid.replace("{region}", region)
            
            # Add high availability if selected
            if ha_enabled:
                mock_mermaid = mock_mermaid.replace("VM[Virtual Machine]", "VM1[Primary VM]")
                mock_mermaid = mock_mermaid.replace("VM -->", "VM1 -->")
                mock_mermaid = mock_mermaid.replace("NSG[Network Security Group] --> VM", 
                                                    "NSG[Network Security Group] --> VM1\n        VM2[Secondary VM] --> |connects to| DB\n        NSG --> VM2\n        LB[Load Balancer] --> VM1\n        LB --> VM2")
            
            return {
                "success": True,
                "mermaid_code": mock_mermaid.strip()
            }
            
        # Initialize Gemini model
        model = init_gemini_vision_model()
        if not model:
            return {"success": False, "error": "Failed to initialize Gemini model"}
        
        # Prepare the additional context from answers if provided
        answers_context = ""
        if answers:
            answers_context = f"""
            
            USER ANSWERS:
            {json.dumps(answers, indent=2)}
            
            Use the user's answers to enhance the diagram with additional details they provided.
            """
        
        # Prepare prompt with the analysis
        prompt = f"""
        Based on the following infrastructure diagram analysis, generate a Mermaid diagram code:
        
        {json.dumps(analysis, indent=2)}
        {answers_context}
        
        Create a detailed Mermaid diagram that shows:
        1. All components with appropriate icons/shapes
        2. All connections between components with proper direction
        3. Clear labels for components and connections
        4. Logical grouping of related components
        5. Color coding based on component types or environments
        
        Use the flowchart or graph syntax (most suitable for infrastructure diagrams).
        Make the diagram visually clear and professional.
        
        Format your response as a JSON object with the following structure:
        {{
            "mermaid_code": "the_complete_mermaid_code"
        }}
        
        Ensure your response is ONLY the JSON object, no additional text.
        """
        
        # Generate response
        response = model.generate_content(prompt)
        
        # Parse the response
        result_text = response.text
        
        # Try to extract JSON from the response
        try:
            # Check if the response is wrapped in code blocks
            if "```json" in result_text and "```" in result_text:
                result_text = result_text.split("```json")[1].split("```")[0].strip()
            elif "```" in result_text:
                result_text = result_text.split("```")[1].split("```")[0].strip()
                
            # Parse the JSON
            result_json = json.loads(result_text)
            return {
                "success": True,
                "mermaid_code": result_json.get("mermaid_code", "")
            }
        except json.JSONDecodeError as json_err:
            logger.error(f"Failed to parse JSON from Gemini response: {str(json_err)}")
            return {
                "success": False,
                "error": "Failed to parse Mermaid diagram code",
                "raw_response": result_text
            }
            
    except Exception as e:
        logger.error(f"Error generating Mermaid diagram: {str(e)}")
        return {"success": False, "error": str(e)}

def analyze_code_changes(code, filename, mermaid_diagram=None, existing_code=None, analysis=None, answers=None, provider="azure", iac_tool="terraform"):
    """
    Analyze code changes and provide suggestions for improvements or diagram updates.
    
    Args:
        code: The current code content
        filename: The filename of the code being edited
        mermaid_diagram: Optional Mermaid diagram code representing the current infrastructure
        existing_code: Optional list of existing code files (to compare changes against)
        analysis: Optional diagram analysis data
        answers: Optional user answers to questions
        provider: Cloud provider (azure, aws, gcp)
        iac_tool: Infrastructure as Code tool (terraform, cloudformation, arm)
        
    Returns:
        Dictionary with suggestions for code improvements or diagram updates
    """
    try:
        # Initialize Gemini model
        model = init_gemini_vision_model()
        if not model:
            return {"success": False, "error": "Failed to initialize Gemini model"}
        
        # Find the original code if it exists
        original_code = ""
        if existing_code:
            for file in existing_code:
                if file.get("filename") == filename:
                    original_code = file.get("content", "")
                    break
        
        # Prepare context for diagram if available
        diagram_context = ""
        if mermaid_diagram:
            diagram_context = f"""
            CURRENT MERMAID DIAGRAM:
            ```mermaid
            {mermaid_diagram}
            ```
            """
        
        # Prepare context from analysis if available
        analysis_context = ""
        if analysis:
            analysis_context = f"""
            DIAGRAM ANALYSIS:
            {json.dumps(analysis, indent=2)}
            """
        
        # Prepare context from answers if available
        answers_context = ""
        if answers:
            answers_context = f"""
            USER ANSWERS TO REQUIREMENTS QUESTIONS:
            {json.dumps(answers, indent=2)}
            """
        
        # Determine the file type and adjust prompting accordingly
        file_extension = filename.split('.')[-1].lower()
        
        # Tailor the prompt based on file type
        if file_extension == 'tf':
            prompt_type = "Terraform"
            file_specific_guidance = """
            Focus on:
            1. Best practices for Terraform resource definitions
            2. Proper use of variables, locals, and outputs
            3. Resource dependencies and relationships
            4. Security configurations
            5. High availability and resilience patterns
            """
        elif file_extension == 'json' and 'cloudformation' in filename.lower():
            prompt_type = "CloudFormation"
            file_specific_guidance = """
            Focus on:
            1. Correct CloudFormation resource properties
            2. Proper references between resources
            3. Parameter usage and constraints
            4. Resource dependencies
            5. Security configurations
            """
        elif file_extension in ('json', 'jsonc') and 'arm' in filename.lower():
            prompt_type = "ARM Template"
            file_specific_guidance = """
            Focus on:
            1. Correct ARM template resource properties
            2. Proper use of variables and parameters
            3. Resource dependencies and relationships
            4. Security configurations
            5. Resource group organization
            """
        else:
            prompt_type = "Infrastructure Code"
            file_specific_guidance = """
            Focus on:
            1. Best practices for the file type
            2. Security configurations
            3. Resource definitions and properties
            4. Dependencies between resources
            """
        
        # Prepare the prompt for the model
        prompt = f"""
        You are an expert cloud infrastructure architect specializing in {provider.upper()} and {prompt_type}.
        
        TASK: Analyze the following {prompt_type} code for a {provider.upper()} infrastructure deployment and provide suggestions 
        for improvements or optimizations. If applicable, suggest updates to the infrastructure diagram to maintain consistency.
        
        CURRENT CODE ({filename}):
        ```
        {code}
        ```
        
        {diagram_context}
        {analysis_context}
        {answers_context}
        
        {file_specific_guidance}
        
        Based on my analysis, provide:
        1. Improved code with your suggested changes
        2. A clear explanation of what you changed and why
        
        Format your response as a JSON object with the following structure:
        {{
            "suggestions": "your_improved_code",
            "explanation": "explanation_of_changes"
        }}
        
        Return ONLY the JSON object, no additional text.
        """
        
        # Generate response
        response = model.generate_content(prompt)
        
        # Parse the response
        result_text = response.text
        
        # Try to extract JSON from the response
        try:
            # Check if the response is wrapped in code blocks
            if "```json" in result_text and "```" in result_text:
                result_text = result_text.split("```json")[1].split("```")[0].strip()
            elif "```" in result_text:
                result_text = result_text.split("```")[1].split("```")[0].strip()
                
            # Parse the JSON
            result_json = json.loads(result_text)
            return {
                "success": True,
                "suggestions": result_json.get("suggestions", ""),
                "explanation": result_json.get("explanation", "")
            }
        except json.JSONDecodeError as json_err:
            logger.error(f"Failed to parse JSON from Gemini response: {str(json_err)}")
            return {
                "success": False,
                "error": "Failed to parse AI suggestions",
                "raw_response": result_text
            }
            
    except Exception as e:
        logger.error(f"Error analyzing code changes: {str(e)}")
        return {"success": False, "error": str(e)} 