import logging
import json
from typing import Dict, Any, List, Optional

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class MermaidDiagramGenerator:
    """
    Generates Mermaid diagram syntax based on infrastructure configuration answers
    from the wizard questions.
    """
    
    def __init__(self):
        self.diagram_type = "flowchart"
        self.direction = "TB"  # Top to Bottom
        
    def generate_diagram(self, answers: Dict[str, Any]) -> str:
        """
        Generate a Mermaid diagram based on the wizard answers.
        
        Args:
            answers: Dictionary of wizard question answers
            
        Returns:
            str: Mermaid diagram syntax
        """
        logger.info("Generating Mermaid diagram from wizard answers")
        
        # Start diagram
        diagram = f"```mermaid\n{self.diagram_type} {self.direction}\n"
        
        # Extract the cloud provider(s)
        cloud_providers = answers.get('cloud-provider', ['azure'])
        if not isinstance(cloud_providers, list):
            cloud_providers = [cloud_providers]
            
        # Configuration for multi-region deployment
        multi_region = answers.get('multi-region-deployment', False)
        region_strategy = answers.get('region-strategy', 'active-passive')
        
        # Extract regions for each provider
        azure_regions = answers.get('azure-region', []) if 'azure' in cloud_providers else []
        aws_regions = answers.get('aws-region', []) if 'aws' in cloud_providers else []
        
        if not isinstance(azure_regions, list):
            azure_regions = [azure_regions]
        if not isinstance(aws_regions, list):
            aws_regions = [aws_regions]
            
        # Network configuration
        vnet_config = answers.get('vnet-configuration', 'single-vnet')
        subnet_strategy = answers.get('subnet-strategy', 'tier-based')
        
        # Compute services
        azure_compute = answers.get('azure-compute-services', []) if 'azure' in cloud_providers else []
        aws_compute = answers.get('aws-compute-services', []) if 'aws' in cloud_providers else []
        
        if not isinstance(azure_compute, list):
            azure_compute = [azure_compute]
        if not isinstance(aws_compute, list):
            aws_compute = [aws_compute]
            
        # Database requirements
        db_types = answers.get('database-requirements', [])
        if not isinstance(db_types, list):
            db_types = [db_types]
        
        db_resilience = answers.get('database-resilience', 'single-instance')
        
        # Add diagram elements based on the answers
        diagram += self._generate_provider_sections(cloud_providers, azure_regions, aws_regions, multi_region)
        diagram += self._generate_network_section(vnet_config, subnet_strategy, cloud_providers, azure_regions, aws_regions)
        diagram += self._generate_compute_section(azure_compute, aws_compute, cloud_providers, azure_regions, aws_regions)
        diagram += self._generate_database_section(db_types, db_resilience, cloud_providers, azure_regions, aws_regions)
        
        # Add connections between components
        diagram += self._generate_connections(
            cloud_providers, 
            vnet_config, 
            subnet_strategy, 
            azure_compute, 
            aws_compute, 
            db_types, 
            multi_region,
            region_strategy,
            azure_regions,
            aws_regions,
            db_resilience
        )
        
        # Add legend/comments for clarity
        diagram += "    %% Diagram Legend\n"
        diagram += "    classDef azure fill:#0072C6,color:white,stroke:white,stroke-width:2px;\n"
        diagram += "    classDef aws fill:#FF9900,color:black,stroke:black,stroke-width:2px;\n"
        diagram += "    classDef gcp fill:#4285F4,color:white,stroke:white,stroke-width:2px;\n"
        diagram += "    classDef network fill:#00BCF2,color:white,stroke:white,stroke-width:2px;\n"
        diagram += "    classDef database fill:#3999C6,color:white,stroke:white,stroke-width:2px;\n"
        diagram += "    classDef security fill:#BE0000,color:white,stroke:white,stroke-width:2px;\n"
        
        # Close diagram
        diagram += "```\n"
        
        return diagram
        
    def _generate_provider_sections(self, cloud_providers: List[str], azure_regions: List[str], aws_regions: List[str], multi_region: bool) -> str:
        """Generate the cloud provider regions sections"""
        diagram = ""
        
        # Create subgraphs for each cloud provider and their regions
        for provider in cloud_providers:
            if provider == 'azure':
                diagram += "    %% Azure Cloud\n"
                diagram += "    subgraph Azure[\"Azure Cloud\"]\n"
                
                if not azure_regions:
                    azure_regions = ['eastus']
                    
                for i, region in enumerate(azure_regions):
                    region_id = f"azure_region_{i}"
                    diagram += f"        subgraph {region_id}[\"{region}\"]\n"
                    diagram += f"        end\n"
                    diagram += f"        class {region_id} azure;\n"
                
                diagram += "    end\n"
                
            elif provider == 'aws':
                diagram += "    %% AWS Cloud\n"
                diagram += "    subgraph AWS[\"AWS Cloud\"]\n"
                
                if not aws_regions:
                    aws_regions = ['us-east-1']
                    
                for i, region in enumerate(aws_regions):
                    region_id = f"aws_region_{i}"
                    diagram += f"        subgraph {region_id}[\"{region}\"]\n"
                    diagram += f"        end\n"
                    diagram += f"        class {region_id} aws;\n"
                
                diagram += "    end\n"
                
            elif provider == 'gcp':
                diagram += "    %% GCP Cloud\n"
                diagram += "    subgraph GCP[\"Google Cloud\"]\n"
                diagram += f"        subgraph gcp_region_0[\"us-central1\"]\n"
                diagram += f"        end\n"
                diagram += f"        class gcp_region_0 gcp;\n"
                diagram += "    end\n"
        
        return diagram
    
    def _generate_network_section(self, vnet_config: str, subnet_strategy: str, cloud_providers: List[str], azure_regions: List[str], aws_regions: List[str]) -> str:
        """Generate the network section with VNets and subnets"""
        diagram = ""
        
        # Azure networking
        if 'azure' in cloud_providers:
            for i, region in enumerate(azure_regions or ['eastus']):
                region_id = f"azure_region_{i}"
                
                if vnet_config == 'hub-spoke':
                    # Hub VNet
                    diagram += f"        {region_id}_hub_vnet[\"Hub VNet\n10.0.0.0/16\"]\n"
                    diagram += f"        class {region_id}_hub_vnet network;\n"
                    
                    # Spoke VNets
                    diagram += f"        {region_id}_spoke1_vnet[\"Spoke VNet 1\n10.1.0.0/16\"]\n"
                    diagram += f"        {region_id}_spoke2_vnet[\"Spoke VNet 2\n10.2.0.0/16\"]\n"
                    diagram += f"        class {region_id}_spoke1_vnet network;\n"
                    diagram += f"        class {region_id}_spoke2_vnet network;\n"
                    
                    # Subnets for each VNet
                    if subnet_strategy == 'tier-based':
                        diagram += f"        {region_id}_hub_subnet1[\"Hub Gateway Subnet\n10.0.0.0/24\"]\n"
                        diagram += f"        {region_id}_hub_subnet2[\"Hub Shared Services Subnet\n10.0.1.0/24\"]\n"
                        diagram += f"        {region_id}_spoke1_web[\"Web Tier Subnet\n10.1.0.0/24\"]\n"
                        diagram += f"        {region_id}_spoke1_app[\"App Tier Subnet\n10.1.1.0/24\"]\n"
                        diagram += f"        {region_id}_spoke1_data[\"Data Tier Subnet\n10.1.2.0/24\"]\n"
                    elif subnet_strategy == 'service-based':
                        diagram += f"        {region_id}_hub_subnet1[\"Hub Gateway Subnet\n10.0.0.0/24\"]\n"
                        diagram += f"        {region_id}_hub_subnet2[\"Hub Shared Services Subnet\n10.0.1.0/24\"]\n"
                        diagram += f"        {region_id}_spoke1_vm[\"VM Services Subnet\n10.1.0.0/24\"]\n"
                        diagram += f"        {region_id}_spoke1_storage[\"Storage Services Subnet\n10.1.1.0/24\"]\n"
                        diagram += f"        {region_id}_spoke2_db[\"Database Services Subnet\n10.2.0.0/24\"]\n"
                    
                elif vnet_config == 'single-vnet':
                    # Single VNet
                    diagram += f"        {region_id}_vnet[\"Virtual Network\n10.0.0.0/16\"]\n"
                    diagram += f"        class {region_id}_vnet network;\n"
                    
                    # Subnets
                    if subnet_strategy == 'tier-based':
                        diagram += f"        {region_id}_web_subnet[\"Web Tier Subnet\n10.0.0.0/24\"]\n"
                        diagram += f"        {region_id}_app_subnet[\"App Tier Subnet\n10.0.1.0/24\"]\n"
                        diagram += f"        {region_id}_data_subnet[\"Data Tier Subnet\n10.0.2.0/24\"]\n"
                    elif subnet_strategy == 'service-based':
                        diagram += f"        {region_id}_compute_subnet[\"Compute Subnet\n10.0.0.0/24\"]\n"
                        diagram += f"        {region_id}_storage_subnet[\"Storage Subnet\n10.0.1.0/24\"]\n"
                        diagram += f"        {region_id}_db_subnet[\"Database Subnet\n10.0.2.0/24\"]\n"
                    elif subnet_strategy == 'simple':
                        diagram += f"        {region_id}_subnet[\"Default Subnet\n10.0.0.0/24\"]\n"
        
        # AWS networking
        if 'aws' in cloud_providers:
            for i, region in enumerate(aws_regions or ['us-east-1']):
                region_id = f"aws_region_{i}"
                
                # VPC
                diagram += f"        {region_id}_vpc[\"VPC\n10.0.0.0/16\"]\n"
                diagram += f"        class {region_id}_vpc network;\n"
                
                # Subnets
                if subnet_strategy == 'tier-based':
                    diagram += f"        {region_id}_public_subnet[\"Public Subnet\n10.0.0.0/24\"]\n"
                    diagram += f"        {region_id}_private_app_subnet[\"Private App Subnet\n10.0.1.0/24\"]\n"
                    diagram += f"        {region_id}_private_db_subnet[\"Private DB Subnet\n10.0.2.0/24\"]\n"
                elif subnet_strategy == 'service-based':
                    diagram += f"        {region_id}_ec2_subnet[\"EC2 Subnet\n10.0.0.0/24\"]\n"
                    diagram += f"        {region_id}_elb_subnet[\"ELB Subnet\n10.0.1.0/24\"]\n"
                    diagram += f"        {region_id}_rds_subnet[\"RDS Subnet\n10.0.2.0/24\"]\n"
                elif subnet_strategy == 'simple':
                    diagram += f"        {region_id}_subnet[\"Default Subnet\n10.0.0.0/24\"]\n"
        
        return diagram
    
    def _generate_compute_section(self, azure_compute: List[str], aws_compute: List[str], cloud_providers: List[str], azure_regions: List[str], aws_regions: List[str]) -> str:
        """Generate the compute resources section"""
        diagram = ""
        
        # Azure compute resources
        if 'azure' in cloud_providers:
            for i, region in enumerate(azure_regions or ['eastus']):
                region_id = f"azure_region_{i}"
                
                # Add VMs if selected
                if 'vm' in azure_compute:
                    diagram += f"        {region_id}_vm1[\"Virtual Machine 1\"]\n"
                    diagram += f"        {region_id}_vm2[\"Virtual Machine 2\"]\n"
                    diagram += f"        {region_id}_avset[\"Availability Set\"]\n"
                    diagram += f"        class {region_id}_vm1 azure;\n"
                    diagram += f"        class {region_id}_vm2 azure;\n"
                    diagram += f"        class {region_id}_avset azure;\n"
                
                # Add AKS if selected
                if 'aks' in azure_compute:
                    diagram += f"        {region_id}_aks[\"AKS Cluster\"]\n"
                    diagram += f"        class {region_id}_aks azure;\n"
                
                # Add App Service if selected
                if 'app-service' in azure_compute:
                    diagram += f"        {region_id}_app_service[\"App Service\"]\n"
                    diagram += f"        class {region_id}_app_service azure;\n"
                
                # Add Functions if selected
                if 'functions' in azure_compute:
                    diagram += f"        {region_id}_functions[\"Azure Functions\"]\n"
                    diagram += f"        class {region_id}_functions azure;\n"
                
                # Add load balancer
                diagram += f"        {region_id}_lb[\"Load Balancer\"]\n"
                diagram += f"        class {region_id}_lb azure;\n"
        
        # AWS compute resources
        if 'aws' in cloud_providers:
            for i, region in enumerate(aws_regions or ['us-east-1']):
                region_id = f"aws_region_{i}"
                
                # Add EC2 if selected
                if 'ec2' in aws_compute:
                    diagram += f"        {region_id}_ec2_1[\"EC2 Instance 1\"]\n"
                    diagram += f"        {region_id}_ec2_2[\"EC2 Instance 2\"]\n"
                    diagram += f"        {region_id}_asg[\"Auto Scaling Group\"]\n"
                    diagram += f"        class {region_id}_ec2_1 aws;\n"
                    diagram += f"        class {region_id}_ec2_2 aws;\n"
                    diagram += f"        class {region_id}_asg aws;\n"
                
                # Add EKS if selected
                if 'eks' in aws_compute:
                    diagram += f"        {region_id}_eks[\"EKS Cluster\"]\n"
                    diagram += f"        class {region_id}_eks aws;\n"
                
                # Add Lambda if selected
                if 'lambda' in aws_compute:
                    diagram += f"        {region_id}_lambda[\"Lambda Functions\"]\n"
                    diagram += f"        class {region_id}_lambda aws;\n"
                
                # Add load balancer
                diagram += f"        {region_id}_elb[\"Elastic Load Balancer\"]\n"
                diagram += f"        class {region_id}_elb aws;\n"
                
        return diagram
    
    def _generate_database_section(self, db_types: List[str], db_resilience: str, cloud_providers: List[str], azure_regions: List[str], aws_regions: List[str]) -> str:
        """Generate the database resources section"""
        diagram = ""
        
        # Azure database resources
        if 'azure' in cloud_providers:
            for i, region in enumerate(azure_regions or ['eastus']):
                region_id = f"azure_region_{i}"
                
                if 'sql' in db_types:
                    if db_resilience == 'multi-region':
                        diagram += f"        {region_id}_sql_primary[\"SQL Database (Primary)\"]\n"
                        diagram += f"        class {region_id}_sql_primary database;\n"
                    elif db_resilience == 'multi-az':
                        diagram += f"        {region_id}_sql[\"SQL Database (Zone Redundant)\"]\n"
                        diagram += f"        class {region_id}_sql database;\n"
                    elif db_resilience == 'read-replicas':
                        diagram += f"        {region_id}_sql_primary[\"SQL Database (Primary)\"]\n"
                        diagram += f"        {region_id}_sql_replica[\"SQL Database (Replica)\"]\n"
                        diagram += f"        class {region_id}_sql_primary database;\n"
                        diagram += f"        class {region_id}_sql_replica database;\n"
                    else:
                        diagram += f"        {region_id}_sql[\"SQL Database\"]\n"
                        diagram += f"        class {region_id}_sql database;\n"
                
                if 'nosql' in db_types:
                    if db_resilience == 'multi-region':
                        diagram += f"        {region_id}_cosmos[\"Cosmos DB (Multi-region)\"]\n"
                        diagram += f"        class {region_id}_cosmos database;\n"
                    else:
                        diagram += f"        {region_id}_cosmos[\"Cosmos DB\"]\n"
                        diagram += f"        class {region_id}_cosmos database;\n"
        
        # AWS database resources
        if 'aws' in cloud_providers:
            for i, region in enumerate(aws_regions or ['us-east-1']):
                region_id = f"aws_region_{i}"
                
                if 'sql' in db_types:
                    if db_resilience == 'multi-region':
                        diagram += f"        {region_id}_rds_primary[\"RDS Database (Primary)\"]\n"
                        diagram += f"        class {region_id}_rds_primary database;\n"
                    elif db_resilience == 'multi-az':
                        diagram += f"        {region_id}_rds[\"RDS Database (Multi-AZ)\"]\n"
                        diagram += f"        class {region_id}_rds database;\n"
                    elif db_resilience == 'read-replicas':
                        diagram += f"        {region_id}_rds_primary[\"RDS Database (Primary)\"]\n"
                        diagram += f"        {region_id}_rds_replica[\"RDS Database (Read Replica)\"]\n"
                        diagram += f"        class {region_id}_rds_primary database;\n"
                        diagram += f"        class {region_id}_rds_replica database;\n"
                    else:
                        diagram += f"        {region_id}_rds[\"RDS Database\"]\n"
                        diagram += f"        class {region_id}_rds database;\n"
                
                if 'nosql' in db_types:
                    diagram += f"        {region_id}_dynamodb[\"DynamoDB\"]\n"
                    diagram += f"        class {region_id}_dynamodb database;\n"
                    
        return diagram
    
    def _generate_connections(
        self, 
        cloud_providers: List[str], 
        vnet_config: str,
        subnet_strategy: str,
        azure_compute: List[str],
        aws_compute: List[str],
        db_types: List[str],
        multi_region: bool,
        region_strategy: str,
        azure_regions: List[str],
        aws_regions: List[str],
        db_resilience: str
    ) -> str:
        """Generate the connections between resources"""
        diagram = ""
        
        # Connection between regions if multi-region is enabled
        if multi_region and len(cloud_providers) > 0:
            if 'azure' in cloud_providers and len(azure_regions) > 1:
                diagram += f"    azure_region_0 --- azure_region_1\n"
            
            if 'aws' in cloud_providers and len(aws_regions) > 1:
                diagram += f"    aws_region_0 --- aws_region_1\n"
            
            # Cross-provider connection if multiple providers
            if 'azure' in cloud_providers and 'aws' in cloud_providers:
                diagram += f"    azure_region_0 --- aws_region_0\n"
        
        # Azure connections
        if 'azure' in cloud_providers:
            for i, region in enumerate(azure_regions or ['eastus']):
                region_id = f"azure_region_{i}"
                
                # VNet connections
                if vnet_config == 'hub-spoke':
                    diagram += f"    {region_id}_hub_vnet --- {region_id}_spoke1_vnet\n"
                    diagram += f"    {region_id}_hub_vnet --- {region_id}_spoke2_vnet\n"
                    
                    # Subnet connections
                    if subnet_strategy == 'tier-based':
                        diagram += f"    {region_id}_hub_vnet --- {region_id}_hub_subnet1\n"
                        diagram += f"    {region_id}_hub_vnet --- {region_id}_hub_subnet2\n"
                        diagram += f"    {region_id}_spoke1_vnet --- {region_id}_spoke1_web\n"
                        diagram += f"    {region_id}_spoke1_vnet --- {region_id}_spoke1_app\n"
                        diagram += f"    {region_id}_spoke1_vnet --- {region_id}_spoke1_data\n"
                        
                        # VM connections
                        if 'vm' in azure_compute:
                            diagram += f"    {region_id}_spoke1_web --- {region_id}_lb\n"
                            diagram += f"    {region_id}_lb --- {region_id}_vm1\n"
                            diagram += f"    {region_id}_lb --- {region_id}_vm2\n"
                            diagram += f"    {region_id}_vm1 --- {region_id}_avset\n"
                            diagram += f"    {region_id}_vm2 --- {region_id}_avset\n"
                            diagram += f"    {region_id}_vm1 --- {region_id}_spoke1_app\n"
                            diagram += f"    {region_id}_vm2 --- {region_id}_spoke1_app\n"
                        
                        # Database connections
                        if 'sql' in db_types:
                            if db_resilience == 'read-replicas':
                                diagram += f"    {region_id}_spoke1_data --- {region_id}_sql_primary\n"
                                diagram += f"    {region_id}_sql_primary --- {region_id}_sql_replica\n"
                            else:
                                diagram += f"    {region_id}_spoke1_data --- {region_id}_sql\n"
                        
                elif vnet_config == 'single-vnet':
                    # Single VNet subnet connections
                    if subnet_strategy == 'tier-based':
                        diagram += f"    {region_id}_vnet --- {region_id}_web_subnet\n"
                        diagram += f"    {region_id}_vnet --- {region_id}_app_subnet\n"
                        diagram += f"    {region_id}_vnet --- {region_id}_data_subnet\n"
                        
                        # VM connections
                        if 'vm' in azure_compute:
                            diagram += f"    {region_id}_web_subnet --- {region_id}_lb\n"
                            diagram += f"    {region_id}_lb --- {region_id}_vm1\n"
                            diagram += f"    {region_id}_lb --- {region_id}_vm2\n"
                            diagram += f"    {region_id}_vm1 --- {region_id}_avset\n"
                            diagram += f"    {region_id}_vm2 --- {region_id}_avset\n"
                            diagram += f"    {region_id}_vm1 --- {region_id}_app_subnet\n"
                            diagram += f"    {region_id}_vm2 --- {region_id}_app_subnet\n"
                        
                        # Database connections
                        if 'sql' in db_types:
                            if db_resilience == 'read-replicas':
                                diagram += f"    {region_id}_data_subnet --- {region_id}_sql_primary\n"
                                diagram += f"    {region_id}_sql_primary --- {region_id}_sql_replica\n"
                            else:
                                diagram += f"    {region_id}_data_subnet --- {region_id}_sql\n"
        
        # AWS connections
        if 'aws' in cloud_providers:
            for i, region in enumerate(aws_regions or ['us-east-1']):
                region_id = f"aws_region_{i}"
                
                # VPC subnet connections
                if subnet_strategy == 'tier-based':
                    diagram += f"    {region_id}_vpc --- {region_id}_public_subnet\n"
                    diagram += f"    {region_id}_vpc --- {region_id}_private_app_subnet\n"
                    diagram += f"    {region_id}_vpc --- {region_id}_private_db_subnet\n"
                    
                    # EC2 connections
                    if 'ec2' in aws_compute:
                        diagram += f"    {region_id}_public_subnet --- {region_id}_elb\n"
                        diagram += f"    {region_id}_elb --- {region_id}_ec2_1\n"
                        diagram += f"    {region_id}_elb --- {region_id}_ec2_2\n"
                        diagram += f"    {region_id}_ec2_1 --- {region_id}_asg\n"
                        diagram += f"    {region_id}_ec2_2 --- {region_id}_asg\n"
                        diagram += f"    {region_id}_ec2_1 --- {region_id}_private_app_subnet\n"
                        diagram += f"    {region_id}_ec2_2 --- {region_id}_private_app_subnet\n"
                    
                    # Database connections
                    if 'sql' in db_types:
                        if db_resilience == 'read-replicas':
                            diagram += f"    {region_id}_private_db_subnet --- {region_id}_rds_primary\n"
                            diagram += f"    {region_id}_rds_primary --- {region_id}_rds_replica\n"
                        else:
                            diagram += f"    {region_id}_private_db_subnet --- {region_id}_rds\n"
                    
                    if 'nosql' in db_types:
                        diagram += f"    {region_id}_private_app_subnet --- {region_id}_dynamodb\n"
        
        return diagram

def generate_mermaid_diagram(answers: Dict[str, Any]) -> str:
    """
    Generate a Mermaid diagram from wizard answers
    
    Args:
        answers: Dictionary of wizard question answers
        
    Returns:
        str: Mermaid diagram syntax
    """
    generator = MermaidDiagramGenerator()
    return generator.generate_diagram(answers) 