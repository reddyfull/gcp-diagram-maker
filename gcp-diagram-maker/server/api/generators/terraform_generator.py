import logging
import json
from typing import Dict, Any, List, Optional
import os

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class TerraformGenerator:
    """
    Generates Terraform code based on infrastructure configuration answers
    from the wizard questions.
    """
    
    def __init__(self):
        self.output_dir = "terraform_output"
    
    def generate_terraform(self, answers: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate Terraform code based on wizard answers.
        
        Args:
            answers: Dictionary of wizard question answers
            
        Returns:
            Dict containing generated code files
        """
        logger.info("Generating Terraform code from wizard answers")
        
        # Extract the cloud provider(s)
        cloud_providers = answers.get('cloud-provider', ['azure'])
        if not isinstance(cloud_providers, list):
            cloud_providers = [cloud_providers]
            
        # Network configuration
        vnet_config = answers.get('vnet-configuration', 'single-vnet')
        subnet_strategy = answers.get('subnet-strategy', 'tier-based')
        
        # Generate necessary files
        files = []
        
        # Main file
        main_tf = self._generate_main_file(cloud_providers)
        files.append({
            "filename": "main.tf",
            "content": main_tf
        })
        
        # Provider files
        for provider in cloud_providers:
            if provider == 'azure':
                azure_files = self._generate_azure_files(answers)
                files.extend(azure_files)
            elif provider == 'aws':
                aws_files = self._generate_aws_files(answers)
                files.extend(aws_files)
        
        # Variables file
        variables_tf = self._generate_variables_file(answers)
        files.append({
            "filename": "variables.tf",
            "content": variables_tf
        })
        
        # Outputs file
        outputs_tf = self._generate_outputs_file(answers)
        files.append({
            "filename": "outputs.tf",
            "content": outputs_tf
        })
        
        return {
            "files": files,
            "documentation": self._generate_documentation(answers)
        }
        
    def _generate_main_file(self, cloud_providers: List[str]) -> str:
        """Generate the main Terraform file with provider configurations"""
        content = """# Main Terraform configuration

terraform {
  required_providers {
"""
        
        if 'azure' in cloud_providers:
            content += """    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
"""
        
        if 'aws' in cloud_providers:
            content += """    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
"""
        
        content += """  }
  
  required_version = ">= 1.1.0"
}

"""
        
        if 'azure' in cloud_providers:
            content += """provider "azurerm" {
  features {}
}

module "azure_networking" {
  source = "./modules/azure/networking"
  
  resource_group_name     = var.azure_resource_group_name
  location                = var.azure_location
  vnet_address_space      = var.azure_vnet_address_space
  subnet_definitions      = var.azure_subnet_definitions
}

"""
        
        if 'aws' in cloud_providers:
            content += """provider "aws" {
  region = var.aws_region
}

module "aws_networking" {
  source = "./modules/aws/networking"
  
  vpc_cidr_block        = var.aws_vpc_cidr_block
  subnet_definitions    = var.aws_subnet_definitions
}

"""
        
        return content
        
    def _generate_azure_files(self, answers: Dict[str, Any]) -> List[Dict[str, str]]:
        """Generate Azure-specific Terraform files"""
        files = []
        
        # Azure Networking Module
        networking_module = self._generate_azure_networking_module(answers)
        files.append({
            "filename": "modules/azure/networking/main.tf",
            "content": networking_module
        })
        
        # Azure Compute Module
        compute_module = self._generate_azure_compute_module(answers)
        files.append({
            "filename": "modules/azure/compute/main.tf",
            "content": compute_module
        })
        
        # Azure Database Module if needed
        if 'database-requirements' in answers:
            db_module = self._generate_azure_database_module(answers)
            files.append({
                "filename": "modules/azure/database/main.tf",
                "content": db_module
            })
        
        return files
        
    def _generate_aws_files(self, answers: Dict[str, Any]) -> List[Dict[str, str]]:
        """Generate AWS-specific Terraform files"""
        files = []
        
        # AWS Networking Module
        networking_module = self._generate_aws_networking_module(answers)
        files.append({
            "filename": "modules/aws/networking/main.tf",
            "content": networking_module
        })
        
        # AWS Compute Module
        compute_module = self._generate_aws_compute_module(answers)
        files.append({
            "filename": "modules/aws/compute/main.tf",
            "content": compute_module
        })
        
        # AWS Database Module if needed
        if 'database-requirements' in answers:
            db_module = self._generate_aws_database_module(answers)
            files.append({
                "filename": "modules/aws/database/main.tf",
                "content": db_module
            })
        
        return files
    
    def _generate_azure_networking_module(self, answers: Dict[str, Any]) -> str:
        """Generate Azure networking module based on configuration"""
        vnet_config = answers.get('vnet-configuration', 'single-vnet')
        subnet_strategy = answers.get('subnet-strategy', 'tier-based')
        
        content = """# Azure Networking Module

variable "resource_group_name" {
  description = "Name of the Azure resource group"
  type        = string
}

variable "location" {
  description = "Azure region where resources will be created"
  type        = string
}

variable "vnet_address_space" {
  description = "Address space for the virtual network"
  type        = list(string)
  default     = ["10.0.0.0/16"]
}

variable "subnet_definitions" {
  description = "Map of subnet definitions"
  type        = map(object({
    address_prefixes = list(string)
    service_endpoints = optional(list(string))
    delegation = optional(map(object({
      name    = string
      actions = list(string)
    })))
  }))
}

resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location
}

resource "azurerm_virtual_network" "main" {
  name                = "${var.resource_group_name}-vnet"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  address_space       = var.vnet_address_space
}

resource "azurerm_subnet" "subnets" {
  for_each = var.subnet_definitions
  
  name                 = each.key
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = each.value.address_prefixes
  service_endpoints    = each.value.service_endpoints
  
  dynamic "delegation" {
    for_each = each.value.delegation != null ? each.value.delegation : {}
    
    content {
      name = delegation.key
      
      service_delegation {
        name    = delegation.value.name
        actions = delegation.value.actions
      }
    }
  }
}

output "vnet_id" {
  description = "ID of the created virtual network"
  value       = azurerm_virtual_network.main.id
}

output "subnet_ids" {
  description = "IDs of created subnets"
  value       = { for k, v in azurerm_subnet.subnets : k => v.id }
}
"""
        
        return content
    
    def _generate_azure_compute_module(self, answers: Dict[str, Any]) -> str:
        """Generate Azure compute module based on configuration"""
        # Extract compute services
        azure_compute = answers.get('azure-compute-services', [])
        if not isinstance(azure_compute, list):
            azure_compute = [azure_compute]
        
        content = """# Azure Compute Module

variable "resource_group_name" {
  description = "Name of the Azure resource group"
  type        = string
}

variable "location" {
  description = "Azure region where resources will be created"
  type        = string
}

variable "subnet_ids" {
  description = "Map of subnet IDs"
  type        = map(string)
}

variable "vm_size" {
  description = "The size of the virtual machines"
  type        = string
  default     = "Standard_D2s_v3"
}

variable "vm_count" {
  description = "Number of virtual machines to create"
  type        = number
  default     = 2
}

variable "admin_username" {
  description = "Admin username for the VMs"
  type        = string
  default     = "adminuser"
}

variable "admin_ssh_key" {
  description = "SSH public key for admin user"
  type        = string
}

resource "azurerm_network_security_group" "vm_nsg" {
  name                = "${var.resource_group_name}-vm-nsg"
  location            = var.location
  resource_group_name = var.resource_group_name
  
  security_rule {
    name                       = "SSH"
    priority                   = 1001
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

"""
        
        if 'vm' in azure_compute:
            content += """resource "azurerm_public_ip" "vm_public_ip" {
  count               = var.vm_count
  name                = "${var.resource_group_name}-vm-${count.index}-pip"
  location            = var.location
  resource_group_name = var.resource_group_name
  allocation_method   = "Dynamic"
}

resource "azurerm_network_interface" "vm_nic" {
  count               = var.vm_count
  name                = "${var.resource_group_name}-vm-${count.index}-nic"
  location            = var.location
  resource_group_name = var.resource_group_name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = lookup(var.subnet_ids, "app", values(var.subnet_ids)[0])
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.vm_public_ip[count.index].id
  }
}

resource "azurerm_linux_virtual_machine" "vm" {
  count                 = var.vm_count
  name                  = "${var.resource_group_name}-vm-${count.index}"
  location              = var.location
  resource_group_name   = var.resource_group_name
  size                  = var.vm_size
  admin_username        = var.admin_username
  network_interface_ids = [azurerm_network_interface.vm_nic[count.index].id]

  admin_ssh_key {
    username   = var.admin_username
    public_key = var.admin_ssh_key
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "UbuntuServer"
    sku       = "18.04-LTS"
    version   = "latest"
  }
}
"""
        
        if 'aks' in azure_compute:
            content += """
resource "azurerm_kubernetes_cluster" "aks" {
  name                = "${var.resource_group_name}-aks"
  location            = var.location
  resource_group_name = var.resource_group_name
  dns_prefix          = "${var.resource_group_name}-aks"

  default_node_pool {
    name       = "default"
    node_count = 1
    vm_size    = "Standard_D2s_v3"
    vnet_subnet_id = lookup(var.subnet_ids, "app", values(var.subnet_ids)[0])
  }

  identity {
    type = "SystemAssigned"
  }
}
"""
        
        content += """
output "vm_ids" {
  description = "IDs of the created VMs"
  value       = try(azurerm_linux_virtual_machine.vm[*].id, [])
}

output "aks_id" {
  description = "ID of the created AKS cluster"
  value       = try(azurerm_kubernetes_cluster.aks.id, "")
}
"""
        
        return content
    
    def _generate_azure_database_module(self, answers: Dict[str, Any]) -> str:
        """Generate Azure database module based on configuration"""
        db_types = answers.get('database-requirements', [])
        if not isinstance(db_types, list):
            db_types = [db_types]
        
        db_resilience = answers.get('database-resilience', 'single-instance')
        
        content = """# Azure Database Module

variable "resource_group_name" {
  description = "Name of the Azure resource group"
  type        = string
}

variable "location" {
  description = "Azure region where resources will be created"
  type        = string
}

variable "subnet_ids" {
  description = "Map of subnet IDs"
  type        = map(string)
}

"""
        
        if 'sql' in db_types:
            content += """
variable "sql_admin_login" {
  description = "Admin username for SQL Server"
  type        = string
  default     = "sqladmin"
}

variable "sql_admin_password" {
  description = "Admin password for SQL Server"
  type        = string
  sensitive   = true
}

resource "azurerm_mssql_server" "sql_server" {
  name                         = "${var.resource_group_name}-sqlserver"
  resource_group_name          = var.resource_group_name
  location                     = var.location
  version                      = "12.0"
  administrator_login          = var.sql_admin_login
  administrator_login_password = var.sql_admin_password
}

resource "azurerm_mssql_database" "sql_db" {
  name                = "${var.resource_group_name}-sqldb"
  server_id           = azurerm_mssql_server.sql_server.id
  sku_name            = "S0"
  max_size_gb         = 4
"""
            
            if db_resilience == 'multi-az':
                content += """  
  zone_redundant     = true
"""
            
            if db_resilience == 'read-replicas':
                content += """
  read_replica_count = 1
"""
            
            content += "}\n"
        
        if 'nosql' in db_types:
            content += """
resource "azurerm_cosmosdb_account" "cosmos" {
  name                = "${var.resource_group_name}-cosmos"
  location            = var.location
  resource_group_name = var.resource_group_name
  offer_type          = "Standard"
  kind                = "GlobalDocumentDB"

  geo_location {
    location          = var.location
    failover_priority = 0
  }
"""
            
            if db_resilience == 'multi-region':
                content += """
  geo_location {
    location          = var.secondary_location
    failover_priority = 1
  }
"""
            
            content += """
  consistency_policy {
    consistency_level       = "Session"
    max_interval_in_seconds = 5
    max_staleness_prefix    = 100
  }
}
"""
        
        content += """
output "sql_server_id" {
  description = "ID of the created SQL Server"
  value       = try(azurerm_mssql_server.sql_server.id, "")
}

output "sql_database_id" {
  description = "ID of the created SQL Database"
  value       = try(azurerm_mssql_database.sql_db.id, "")
}

output "cosmos_id" {
  description = "ID of the created Cosmos DB account"
  value       = try(azurerm_cosmosdb_account.cosmos.id, "")
}
"""
        
        return content
    
    def _generate_aws_networking_module(self, answers: Dict[str, Any]) -> str:
        """Generate AWS networking module based on configuration"""
        subnet_strategy = answers.get('subnet-strategy', 'tier-based')
        
        content = """# AWS Networking Module

variable "vpc_cidr_block" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "subnet_definitions" {
  description = "Map of subnet definitions"
  type        = map(object({
    cidr_block        = string
    availability_zone = string
    public            = bool
  }))
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr_block
  enable_dns_support   = true
  enable_dns_hostnames = true
  
  tags = {
    Name = "main-vpc"
  }
}

resource "aws_subnet" "subnets" {
  for_each = var.subnet_definitions
  
  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value.cidr_block
  availability_zone = each.value.availability_zone
  
  tags = {
    Name = each.key
  }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
  
  tags = {
    Name = "main-igw"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
  
  tags = {
    Name = "public-route-table"
  }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
  
  tags = {
    Name = "private-route-table"
  }
}

resource "aws_route_table_association" "subnet_associations" {
  for_each = var.subnet_definitions
  
  subnet_id      = aws_subnet.subnets[each.key].id
  route_table_id = each.value.public ? aws_route_table.public.id : aws_route_table.private.id
}

output "vpc_id" {
  description = "ID of the created VPC"
  value       = aws_vpc.main.id
}

output "subnet_ids" {
  description = "IDs of created subnets"
  value       = { for k, v in aws_subnet.subnets : k => v.id }
}
"""
        
        return content
    
    def _generate_aws_compute_module(self, answers: Dict[str, Any]) -> str:
        """Generate AWS compute module based on configuration"""
        # Extract compute services
        aws_compute = answers.get('aws-compute-services', [])
        if not isinstance(aws_compute, list):
            aws_compute = [aws_compute]
        
        content = """# AWS Compute Module

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "subnet_ids" {
  description = "Map of subnet IDs"
  type        = map(string)
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "instance_count" {
  description = "Number of EC2 instances to launch"
  type        = number
  default     = 2
}

variable "key_name" {
  description = "Name of the SSH key pair"
  type        = string
}

resource "aws_security_group" "allow_ssh" {
  name        = "allow_ssh"
  description = "Allow SSH inbound traffic"
  vpc_id      = var.vpc_id

  ingress {
    description = "SSH from anywhere"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

"""
        
        if 'ec2' in aws_compute:
            content += """resource "aws_instance" "ec2" {
  count         = var.instance_count
  ami           = "ami-0c55b159cbfafe1f0"  # Amazon Linux 2
  instance_type = var.instance_type
  subnet_id     = lookup(var.subnet_ids, "app", values(var.subnet_ids)[0])
  key_name      = var.key_name
  
  vpc_security_group_ids = [aws_security_group.allow_ssh.id]
  
  tags = {
    Name = "instance-${count.index}"
  }
}
"""
        
        if 'eks' in aws_compute:
            content += """
resource "aws_eks_cluster" "eks" {
  name     = "eks-cluster"
  role_arn = aws_iam_role.eks_role.arn

  vpc_config {
    subnet_ids = values(var.subnet_ids)
  }
}

resource "aws_iam_role" "eks_role" {
  name = "eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "eks_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_role.name
}
"""
        
        content += """
output "ec2_ids" {
  description = "IDs of the created EC2 instances"
  value       = try(aws_instance.ec2[*].id, [])
}

output "eks_id" {
  description = "ID of the created EKS cluster"
  value       = try(aws_eks_cluster.eks.id, "")
}
"""
        
        return content
    
    def _generate_aws_database_module(self, answers: Dict[str, Any]) -> str:
        """Generate AWS database module based on configuration"""
        db_types = answers.get('database-requirements', [])
        if not isinstance(db_types, list):
            db_types = [db_types]
        
        db_resilience = answers.get('database-resilience', 'single-instance')
        
        content = """# AWS Database Module

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "subnet_ids" {
  description = "Map of subnet IDs"
  type        = map(string)
}

"""
        
        if 'sql' in db_types:
            content += """
variable "db_username" {
  description = "Username for the RDS instance"
  type        = string
  default     = "admin"
}

variable "db_password" {
  description = "Password for the RDS instance"
  type        = string
  sensitive   = true
}

resource "aws_security_group" "rds_sg" {
  name        = "rds-security-group"
  description = "Allow database traffic"
  vpc_id      = var.vpc_id

  ingress {
    description = "Database port"
    from_port   = 3306
    to_port     = 3306
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_subnet_group" "rds_subnet_group" {
  name       = "rds-subnet-group"
  subnet_ids = values(var.subnet_ids)
}

resource "aws_rds_cluster" "rds_cluster" {
  cluster_identifier      = "aurora-cluster"
  engine                  = "aurora-mysql"
  database_name           = "mydb"
  master_username         = var.db_username
  master_password         = var.db_password
  db_subnet_group_name    = aws_db_subnet_group.rds_subnet_group.name
  vpc_security_group_ids  = [aws_security_group.rds_sg.id]
"""
            
            if db_resilience == 'multi-az':
                content += """
  availability_zones      = ["us-east-1a", "us-east-1b", "us-east-1c"]
"""
            
            content += """
}

resource "aws_rds_cluster_instance" "cluster_instances" {
  count               = 1
  identifier          = "aurora-cluster-instance-${count.index}"
  cluster_identifier  = aws_rds_cluster.rds_cluster.id
  instance_class      = "db.r5.large"
  engine              = "aurora-mysql"
  db_subnet_group_name = aws_db_subnet_group.rds_subnet_group.name
}
"""
        
        if 'nosql' in db_types:
            content += """
resource "aws_dynamodb_table" "dynamodb_table" {
  name           = "dynamodb-table"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }

  tags = {
    Name = "dynamodb-table"
  }
}
"""
        
        content += """
output "rds_cluster_id" {
  description = "ID of the created RDS cluster"
  value       = try(aws_rds_cluster.rds_cluster.id, "")
}

output "dynamodb_table_id" {
  description = "ID of the created DynamoDB table"
  value       = try(aws_dynamodb_table.dynamodb_table.id, "")
}
"""
        
        return content
    
    def _generate_variables_file(self, answers: Dict[str, Any]) -> str:
        """Generate variables.tf file"""
        cloud_providers = answers.get('cloud-provider', ['azure'])
        if not isinstance(cloud_providers, list):
            cloud_providers = [cloud_providers]
        
        content = """# Variables for Terraform configuration

"""
        
        if 'azure' in cloud_providers:
            content += """# Azure Variables
variable "azure_resource_group_name" {
  description = "Name of the Azure resource group"
  type        = string
  default     = "terraform-rg"
}

variable "azure_location" {
  description = "Azure region where resources will be created"
  type        = string
  default     = "eastus"
}

variable "azure_vnet_address_space" {
  description = "Address space for the Azure virtual network"
  type        = list(string)
  default     = ["10.0.0.0/16"]
}

variable "azure_subnet_definitions" {
  description = "Map of Azure subnet definitions"
  type        = map(object({
    address_prefixes = list(string)
    service_endpoints = optional(list(string))
    delegation = optional(map(object({
      name    = string
      actions = list(string)
    })))
  }))
  default = {
    web = {
      address_prefixes = ["10.0.1.0/24"]
    },
    app = {
      address_prefixes = ["10.0.2.0/24"]
    },
    data = {
      address_prefixes = ["10.0.3.0/24"]
    }
  }
}

variable "azure_admin_ssh_key" {
  description = "SSH public key for Azure VM admin user"
  type        = string
  default     = "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC+wWK73dCr+jgQOAxNsHAnNNNMEMWOHYEccp6wJm2gotpr9katuF/ZAdou5AaW1C61slRkHRkpRRX9FA9CYBiitZgvCCz+3nWNN7l/Up54Zps/pHWGZLHNJZRYyAB6j5yVLMVHIHriY49d/GZTZVNB8GoJv9Gakwc/fuEZYYl4YDFiGMBP///TzlI4jhiJzjKnEvqPFki5p2ZRJqcbCiF4pJrxUQR/RXqVFQdbRLZgYfJ8xGB878RENq3yQ39d8dVOkq4edbkzwcUmwwwkYVPIoDGsYLaRHnG+To7FvMeyO7xDVQkMKzopTQV8AuKpyvpqu0a9pWOMaiCyDytO7GGN"
}

"""
        
        if 'aws' in cloud_providers:
            content += """# AWS Variables
variable "aws_region" {
  description = "AWS region where resources will be created"
  type        = string
  default     = "us-east-1"
}

variable "aws_vpc_cidr_block" {
  description = "CIDR block for the AWS VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "aws_subnet_definitions" {
  description = "Map of AWS subnet definitions"
  type        = map(object({
    cidr_block        = string
    availability_zone = string
    public            = bool
  }))
  default = {
    public_a = {
      cidr_block        = "10.0.1.0/24"
      availability_zone = "us-east-1a"
      public            = true
    },
    public_b = {
      cidr_block        = "10.0.2.0/24"
      availability_zone = "us-east-1b"
      public            = true
    },
    private_a = {
      cidr_block        = "10.0.3.0/24"
      availability_zone = "us-east-1a"
      public            = false
    },
    private_b = {
      cidr_block        = "10.0.4.0/24"
      availability_zone = "us-east-1b"
      public            = false
    }
  }
}

variable "aws_key_name" {
  description = "Name of the SSH key pair for AWS instances"
  type        = string
  default     = "terraform-key"
}

"""
        
        if any('database-requirements' in answers for provider in cloud_providers):
            content += """# Database Variables
variable "db_admin_password" {
  description = "Password for database admin user"
  type        = string
  sensitive   = true
  default     = "ChangeMe123!"  # Only for example, should be changed in production
}

"""
        
        return content
    
    def _generate_outputs_file(self, answers: Dict[str, Any]) -> str:
        """Generate outputs.tf file"""
        cloud_providers = answers.get('cloud-provider', ['azure'])
        if not isinstance(cloud_providers, list):
            cloud_providers = [cloud_providers]
        
        content = """# Output values from Terraform configuration

"""
        
        if 'azure' in cloud_providers:
            content += """# Azure Outputs
output "azure_vnet_id" {
  description = "ID of the Azure virtual network"
  value       = module.azure_networking.vnet_id
}

output "azure_subnet_ids" {
  description = "IDs of the Azure subnets"
  value       = module.azure_networking.subnet_ids
}

"""
            
            # Add compute outputs if needed
            if 'azure-compute-services' in answers:
                content += """output "azure_vm_ids" {
  description = "IDs of the Azure VMs"
  value       = try(module.azure_compute.vm_ids, [])
}

output "azure_aks_id" {
  description = "ID of the Azure Kubernetes Service cluster"
  value       = try(module.azure_compute.aks_id, "")
}

"""
            
            # Add database outputs if needed
            if 'database-requirements' in answers:
                content += """output "azure_sql_server_id" {
  description = "ID of the Azure SQL Server"
  value       = try(module.azure_database.sql_server_id, "")
}

output "azure_cosmos_id" {
  description = "ID of the Azure Cosmos DB account"
  value       = try(module.azure_database.cosmos_id, "")
}

"""
        
        if 'aws' in cloud_providers:
            content += """# AWS Outputs
output "aws_vpc_id" {
  description = "ID of the AWS VPC"
  value       = module.aws_networking.vpc_id
}

output "aws_subnet_ids" {
  description = "IDs of the AWS subnets"
  value       = module.aws_networking.subnet_ids
}

"""
            
            # Add compute outputs if needed
            if 'aws-compute-services' in answers:
                content += """output "aws_ec2_ids" {
  description = "IDs of the AWS EC2 instances"
  value       = try(module.aws_compute.ec2_ids, [])
}

output "aws_eks_id" {
  description = "ID of the AWS EKS cluster"
  value       = try(module.aws_compute.eks_id, "")
}

"""
            
            # Add database outputs if needed
            if 'database-requirements' in answers:
                content += """output "aws_rds_cluster_id" {
  description = "ID of the AWS RDS cluster"
  value       = try(module.aws_database.rds_cluster_id, "")
}

output "aws_dynamodb_table_id" {
  description = "ID of the AWS DynamoDB table"
  value       = try(module.aws_database.dynamodb_table_id, "")
}

"""
        
        return content
    
    def _generate_documentation(self, answers: Dict[str, Any]) -> str:
        """Generate documentation for the Terraform code"""
        cloud_providers = answers.get('cloud-provider', ['azure'])
        if not isinstance(cloud_providers, list):
            cloud_providers = [cloud_providers]
        
        docs = """# Terraform Infrastructure Documentation

This Terraform configuration creates the infrastructure based on the answers provided in the wizard.

## Infrastructure Overview

"""
        
        if 'azure' in cloud_providers:
            docs += "### Azure Resources\n\n"
            docs += "- Resource Group: Contains all Azure resources\n"
            docs += "- Virtual Network: Main network for all resources\n"
            docs += "- Subnets: Organized for different tiers (web, app, data)\n"
            
            if 'azure-compute-services' in answers:
                azure_compute = answers.get('azure-compute-services', [])
                if not isinstance(azure_compute, list):
                    azure_compute = [azure_compute]
                
                if 'vm' in azure_compute:
                    docs += "- Virtual Machines: Linux VMs for application hosting\n"
                if 'aks' in azure_compute:
                    docs += "- AKS Cluster: Kubernetes for container orchestration\n"
            
            if 'database-requirements' in answers:
                db_types = answers.get('database-requirements', [])
                if not isinstance(db_types, list):
                    db_types = [db_types]
                
                if 'sql' in db_types:
                    docs += "- SQL Database: Managed SQL database service\n"
                if 'nosql' in db_types:
                    docs += "- Cosmos DB: NoSQL database service\n"
            
            docs += "\n"
        
        if 'aws' in cloud_providers:
            docs += "### AWS Resources\n\n"
            docs += "- VPC: Main network for all resources\n"
            docs += "- Subnets: Public and private subnets in multiple availability zones\n"
            docs += "- Internet Gateway: For public internet access\n"
            
            if 'aws-compute-services' in answers:
                aws_compute = answers.get('aws-compute-services', [])
                if not isinstance(aws_compute, list):
                    aws_compute = [aws_compute]
                
                if 'ec2' in aws_compute:
                    docs += "- EC2 Instances: Virtual servers for application hosting\n"
                if 'eks' in aws_compute:
                    docs += "- EKS Cluster: Kubernetes for container orchestration\n"
            
            if 'database-requirements' in answers:
                db_types = answers.get('database-requirements', [])
                if not isinstance(db_types, list):
                    db_types = [db_types]
                
                if 'sql' in db_types:
                    docs += "- RDS Cluster: Managed relational database service\n"
                if 'nosql' in db_types:
                    docs += "- DynamoDB: NoSQL database service\n"
            
            docs += "\n"
        
        docs += """## Deployment Instructions

1. Initialize Terraform:
   ```bash
   terraform init
   ```

2. Create a terraform.tfvars file with your specific variables.

3. Review the planned changes:
   ```bash
   terraform plan
   ```

4. Apply the changes:
   ```bash
   terraform apply
   ```

5. When finished, you can destroy the infrastructure:
   ```bash
   terraform destroy
   ```

## Security Considerations

- Update the default SSH keys before deploying to production
- Change all default passwords in the variables
- Consider adding more restrictive security group/NSG rules
"""
        
        return docs

def generate_terraform_code(answers: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate Terraform code from wizard answers
    
    Args:
        answers: Dictionary of wizard question answers
        
    Returns:
        Dictionary containing generated code files and documentation
    """
    generator = TerraformGenerator()
    return generator.generate_terraform(answers) 