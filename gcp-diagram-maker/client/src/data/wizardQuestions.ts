import React from 'react';

// Define the structure for question choices
export interface QuestionChoice {
  id: string;
  text: string;
  description?: string;
}

// Define the wizard question interface
export interface WizardQuestion {
  id: string;
  text: string;
  type: 'select' | 'multiple-choice' | 'boolean' | 'text';
  description?: string;
  choices?: Array<QuestionChoice | string>;
  default?: any;
  dependencies?: {
    questionId: string;
    answerValues: any[] | ((vals: any) => boolean);
  }[];
  followUpQuestions?: string[];
  category?: 'general' | 'provider' | 'region' | 'compute' | 'storage' | 'network' | 'database' | 'security' | 'resilience' | 'iac';
}

// Define the wizard question tree
export const wizardQuestions: WizardQuestion[] = [
  // General
  {
    id: 'workload-type',
    text: 'What type of workload are you deploying?',
    description: 'Select the primary purpose of your infrastructure',
    type: 'select',
    category: 'general',
    choices: [
      { id: 'web-app', text: 'Web Application', description: 'Customer-facing web applications or sites' },
      { id: 'api', text: 'API/Microservices', description: 'Backend services that expose APIs' },
      { id: 'batch', text: 'Batch Processing', description: 'Processing large volumes of data in batches' },
      { id: 'ml', text: 'Machine Learning', description: 'AI/ML model training and inference' },
      { id: 'analytics', text: 'Data Analytics', description: 'Business intelligence and reporting' },
    ],
    followUpQuestions: ['cloud-provider', 'high-availability'],
  },
  
  {
    id: 'high-availability',
    text: 'Do you require high availability (HA) for your infrastructure?',
    description: 'High availability ensures your application remains operational despite component failures',
    type: 'boolean',
    category: 'resilience',
    default: false,
    followUpQuestions: ['availability-requirements', 'compliance-requirements'],
  },
  
  {
    id: 'availability-requirements',
    text: 'What is your required uptime SLA?',
    description: 'Select the minimum acceptable uptime level for your application',
    type: 'select',
    category: 'resilience',
    choices: [
      { id: '99.9', text: '99.9% (8.76 hours downtime per year)', description: 'Standard availability' },
      { id: '99.95', text: '99.95% (4.38 hours downtime per year)', description: 'High availability' },
      { id: '99.99', text: '99.99% (52.56 minutes downtime per year)', description: 'Very high availability' },
      { id: '99.999', text: '99.999% (5.26 minutes downtime per year)', description: 'Ultra-high availability' },
    ],
    dependencies: [
      { questionId: 'high-availability', answerValues: [true] },
    ],
    followUpQuestions: ['multi-region-deployment', 'disaster-recovery-strategy'],
    default: '99.9',
  },
  
  {
    id: 'multi-region-deployment',
    text: 'Do you need multi-region deployment for global resiliency?',
    description: 'Multi-region deployment provides protection against regional outages',
    type: 'boolean',
    category: 'resilience',
    dependencies: [
      { questionId: 'high-availability', answerValues: [true] },
    ],
    followUpQuestions: ['region-strategy'],
    default: false,
  },
  
  {
    id: 'region-strategy',
    text: 'Which multi-region deployment strategy do you prefer?',
    description: 'Select the approach that best matches your requirements',
    type: 'select',
    category: 'resilience',
    choices: [
      { id: 'active-active', text: 'Active-Active', description: 'Traffic distributed across all regions simultaneously' },
      { id: 'active-passive', text: 'Active-Passive', description: 'One region active, others on standby' },
      { id: 'active-readonly', text: 'Active with Read-Only Replicas', description: 'Writes to primary region, reads from any region' },
    ],
    dependencies: [
      { questionId: 'multi-region-deployment', answerValues: [true] },
    ],
    default: 'active-passive',
  },
  
  {
    id: 'disaster-recovery-strategy',
    text: 'What is your required disaster recovery strategy?',
    description: 'Select your recovery time objective (RTO) and recovery point objective (RPO)',
    type: 'select',
    category: 'resilience',
    choices: [
      { id: 'backup-restore', text: 'Backup and Restore (24h+ RTO, 24h RPO)', description: 'Lowest cost but longest recovery time' },
      { id: 'pilot-light', text: 'Pilot Light (1-24h RTO, 1h RPO)', description: 'Minimal standby infrastructure' },
      { id: 'warm-standby', text: 'Warm Standby (Minutes to hours RTO, minutes RPO)', description: 'Scaled-down but ready standby environment' },
      { id: 'hot-standby', text: 'Hot Standby (Minutes RTO, near-zero RPO)', description: 'Fully-scaled duplicate environment ready for immediate failover' },
    ],
    dependencies: [
      { questionId: 'high-availability', answerValues: [true] },
    ],
    default: 'pilot-light',
  },
  
  {
    id: 'compliance-requirements',
    text: 'Do you have specific compliance requirements?',
    type: 'multiple-choice',
    category: 'security',
    choices: [
      { id: 'hipaa', text: 'HIPAA', description: 'Health Insurance Portability and Accountability Act' },
      { id: 'pci', text: 'PCI DSS', description: 'Payment Card Industry Data Security Standard' },
      { id: 'gdpr', text: 'GDPR', description: 'General Data Protection Regulation' },
      { id: 'sox', text: 'SOX', description: 'Sarbanes-Oxley Act' },
      { id: 'none', text: 'None', description: 'No specific compliance requirements' },
    ],
    default: ['none'],
  },
  
  // Provider Selection
  {
    id: 'cloud-provider',
    text: 'Which cloud provider(s) do you want to use?',
    type: 'multiple-choice',
    category: 'provider',
    choices: [
      { id: 'azure', text: 'Microsoft Azure', description: 'Microsoft\'s cloud platform' },
      { id: 'aws', text: 'Amazon Web Services (AWS)', description: 'Amazon\'s cloud platform' },
      { id: 'gcp', text: 'Google Cloud Platform (GCP)', description: 'Google\'s cloud platform' },
    ],
    followUpQuestions: ['azure-region', 'aws-region', 'multi-cloud-strategy'],
    default: ['azure'],
  },
  
  {
    id: 'multi-cloud-strategy',
    text: 'What is your multi-cloud strategy?',
    description: 'Select how you plan to use multiple cloud providers',
    type: 'select',
    category: 'resilience',
    choices: [
      { id: 'provider-redundancy', text: 'Provider Redundancy', description: 'Same workloads deployed across different providers for resilience' },
      { id: 'workload-specific', text: 'Workload-Specific', description: 'Different workloads on different providers based on capabilities' },
      { id: 'cost-optimization', text: 'Cost Optimization', description: 'Dynamic workload placement based on pricing' },
      { id: 'hybrid', text: 'Hybrid Approach', description: 'Combination of the above strategies' },
    ],
    dependencies: [
      { 
        questionId: 'cloud-provider', 
        answerValues: (vals: any) => Array.isArray(vals) && vals.length > 1
      },
    ],
    default: 'workload-specific',
  },
  
  // Region Selection
  {
    id: 'azure-region',
    text: 'Which Azure region(s) do you want to deploy to?',
    type: 'multiple-choice',
    category: 'region',
    choices: [
      { id: 'eastus', text: 'East US', description: 'Virginia' },
      { id: 'westus2', text: 'West US 2', description: 'Washington' },
      { id: 'centralus', text: 'Central US', description: 'Iowa' },
      { id: 'northeurope', text: 'North Europe', description: 'Ireland' },
      { id: 'westeurope', text: 'West Europe', description: 'Netherlands' },
      { id: 'southeastasia', text: 'Southeast Asia', description: 'Singapore' },
    ],
    dependencies: [
      { questionId: 'cloud-provider', answerValues: ['azure'] },
    ],
    followUpQuestions: ['azure-compute-services', 'azure-zone-redundancy'],
    default: ['eastus'],
  },
  
  {
    id: 'azure-zone-redundancy',
    text: 'Do you require zone redundancy within Azure regions?',
    description: 'Zone redundancy provides protection against datacenter failures within a region',
    type: 'boolean',
    category: 'resilience',
    dependencies: [
      { questionId: 'cloud-provider', answerValues: ['azure'] },
      { questionId: 'high-availability', answerValues: [true] },
    ],
    default: false,
  },
  
  {
    id: 'aws-region',
    text: 'Which AWS region(s) do you want to deploy to?',
    type: 'multiple-choice',
    category: 'region',
    choices: [
      { id: 'us-east-1', text: 'US East (N. Virginia)', description: 'us-east-1' },
      { id: 'us-west-2', text: 'US West (Oregon)', description: 'us-west-2' },
      { id: 'eu-west-1', text: 'EU West (Ireland)', description: 'eu-west-1' },
      { id: 'ap-southeast-1', text: 'Asia Pacific (Singapore)', description: 'ap-southeast-1' },
      { id: 'ap-northeast-1', text: 'Asia Pacific (Tokyo)', description: 'ap-northeast-1' },
    ],
    dependencies: [
      { questionId: 'cloud-provider', answerValues: ['aws'] },
    ],
    followUpQuestions: ['aws-compute-services', 'aws-multi-az'],
    default: ['us-east-1'],
  },
  
  {
    id: 'aws-multi-az',
    text: 'Do you require Multi-AZ deployment within AWS regions?',
    description: 'Multi-AZ provides redundancy across Availability Zones within a region',
    type: 'boolean',
    category: 'resilience',
    dependencies: [
      { questionId: 'cloud-provider', answerValues: ['aws'] },
      { questionId: 'high-availability', answerValues: [true] },
    ],
    default: false,
  },
  
  // Compute Services
  {
    id: 'azure-compute-services',
    text: 'Which Azure compute services do you need?',
    type: 'multiple-choice',
    category: 'compute',
    choices: [
      { id: 'vm', text: 'Virtual Machines', description: 'IaaS VMs for maximum control' },
      { id: 'aks', text: 'Azure Kubernetes Service (AKS)', description: 'Managed Kubernetes for containerized applications' },
      { id: 'app-service', text: 'App Service', description: 'PaaS for web applications' },
      { id: 'functions', text: 'Azure Functions', description: 'Serverless compute' },
      { id: 'container-instances', text: 'Container Instances', description: 'Run containers without managing servers' },
    ],
    dependencies: [
      { questionId: 'cloud-provider', answerValues: ['azure'] },
    ],
    followUpQuestions: ['azure-vm-size', 'azure-storage-services', 'azure-vm-availability'],
    default: ['vm'],
  },
  
  {
    id: 'azure-vm-availability',
    text: 'How do you want to ensure Azure VM high availability?',
    type: 'select',
    category: 'resilience',
    choices: [
      { id: 'availability-set', text: 'Availability Sets', description: 'Protection against hardware failures within a datacenter' },
      { id: 'availability-zone', text: 'Availability Zones', description: 'Protection against datacenter failures within a region' },
      { id: 'both', text: 'Both', description: 'Maximum availability using both approaches' },
    ],
    dependencies: [
      { questionId: 'azure-compute-services', answerValues: ['vm'] },
      { questionId: 'high-availability', answerValues: [true] },
    ],
    default: 'availability-set',
  },
  
  {
    id: 'aws-compute-services',
    text: 'Which AWS compute services do you need?',
    type: 'multiple-choice',
    category: 'compute',
    choices: [
      { id: 'ec2', text: 'EC2 Instances', description: 'IaaS VMs for maximum control' },
      { id: 'eks', text: 'Elastic Kubernetes Service (EKS)', description: 'Managed Kubernetes for containerized applications' },
      { id: 'elastic-beanstalk', text: 'Elastic Beanstalk', description: 'PaaS for web applications' },
      { id: 'lambda', text: 'Lambda Functions', description: 'Serverless compute' },
      { id: 'fargate', text: 'Fargate', description: 'Serverless containers' },
    ],
    dependencies: [
      { questionId: 'cloud-provider', answerValues: ['aws'] },
    ],
    followUpQuestions: ['aws-instance-type', 'aws-storage-services', 'aws-ec2-resilience'],
    default: ['ec2'],
  },
  
  {
    id: 'aws-ec2-resilience',
    text: 'How do you want to ensure AWS EC2 high availability?',
    type: 'select',
    category: 'resilience',
    choices: [
      { id: 'auto-scaling', text: 'Auto Scaling Groups', description: 'Automatic scaling and recovery of instances' },
      { id: 'multi-az', text: 'Multi-AZ Deployment', description: 'Instances distributed across Availability Zones' },
      { id: 'both', text: 'Both', description: 'Maximum resilience using both approaches' },
    ],
    dependencies: [
      { questionId: 'aws-compute-services', answerValues: ['ec2'] },
      { questionId: 'high-availability', answerValues: [true] },
    ],
    default: 'auto-scaling',
  },
  
  // VM/Instance Types
  {
    id: 'azure-vm-size',
    text: 'What size of Azure Virtual Machines do you need?',
    type: 'select',
    category: 'compute',
    choices: [
      { id: 'standard-b2s', text: 'B2s (2 vCPU, 4 GB RAM)', description: 'General purpose burstable, low cost' },
      { id: 'standard-d2s-v3', text: 'D2s v3 (2 vCPU, 8 GB RAM)', description: 'General purpose balanced' },
      { id: 'standard-f2s-v2', text: 'F2s v2 (2 vCPU, 4 GB RAM)', description: 'Compute optimized' },
      { id: 'standard-e2s-v3', text: 'E2s v3 (2 vCPU, 16 GB RAM)', description: 'Memory optimized' },
    ],
    dependencies: [
      { questionId: 'azure-compute-services', answerValues: ['vm'] },
    ],
    default: 'standard-b2s',
  },
  
  {
    id: 'aws-instance-type',
    text: 'What type of AWS EC2 instances do you need?',
    type: 'select',
    category: 'compute',
    choices: [
      { id: 't3.small', text: 't3.small (2 vCPU, 2 GB RAM)', description: 'General purpose burstable, low cost' },
      { id: 'm5.large', text: 'm5.large (2 vCPU, 8 GB RAM)', description: 'General purpose balanced' },
      { id: 'c5.large', text: 'c5.large (2 vCPU, 4 GB RAM)', description: 'Compute optimized' },
      { id: 'r5.large', text: 'r5.large (2 vCPU, 16 GB RAM)', description: 'Memory optimized' },
    ],
    dependencies: [
      { questionId: 'aws-compute-services', answerValues: ['ec2'] },
    ],
    default: 't3.small',
  },
  
  // Storage Services
  {
    id: 'azure-storage-services',
    text: 'Which Azure storage services do you need?',
    type: 'multiple-choice',
    category: 'storage',
    choices: [
      { id: 'blob', text: 'Blob Storage', description: 'Object storage for unstructured data' },
      { id: 'files', text: 'File Storage', description: 'Managed file shares' },
      { id: 'disk', text: 'Managed Disks', description: 'Block storage for VMs' },
      { id: 'tables', text: 'Table Storage', description: 'NoSQL key-value store' },
    ],
    dependencies: [
      { questionId: 'cloud-provider', answerValues: ['azure'] },
    ],
    followUpQuestions: ['azure-blob-redundancy'],
    default: ['blob'],
  },
  
  {
    id: 'aws-storage-services',
    text: 'Which AWS storage services do you need?',
    type: 'multiple-choice',
    category: 'storage',
    choices: [
      { id: 's3', text: 'S3', description: 'Object storage for unstructured data' },
      { id: 'efs', text: 'EFS', description: 'Managed file system' },
      { id: 'ebs', text: 'EBS', description: 'Block storage for EC2' },
      { id: 'dynamodb', text: 'DynamoDB', description: 'NoSQL database service' },
    ],
    dependencies: [
      { questionId: 'cloud-provider', answerValues: ['aws'] },
    ],
    followUpQuestions: ['aws-s3-class', 'aws-storage-resilience'],
    default: ['s3'],
  },
  
  {
    id: 'azure-blob-redundancy',
    text: 'What level of redundancy do you need for Azure Blob Storage?',
    type: 'select',
    category: 'resilience',
    choices: [
      { id: 'lrs', text: 'Locally-redundant storage (LRS)', description: 'Three copies within a single data center' },
      { id: 'zrs', text: 'Zone-redundant storage (ZRS)', description: 'Three copies across multiple zones in a region' },
      { id: 'grs', text: 'Geo-redundant storage (GRS)', description: 'Six copies across paired regions' },
      { id: 'ra-grs', text: 'Read-access geo-redundant storage (RA-GRS)', description: 'GRS with read access to the secondary region' },
    ],
    dependencies: [
      { questionId: 'azure-storage-services', answerValues: ['blob'] },
    ],
    default: 'lrs',
  },
  
  {
    id: 'aws-s3-class',
    text: 'What storage class do you need for AWS S3?',
    type: 'select',
    category: 'storage',
    choices: [
      { id: 'standard', text: 'Standard', description: 'Frequently accessed data with high durability' },
      { id: 'intelligent-tiering', text: 'Intelligent-Tiering', description: 'Automatic cost savings for data with unknown access patterns' },
      { id: 'standard-ia', text: 'Standard-IA', description: 'Infrequently accessed data with rapid retrieval' },
      { id: 'glacier', text: 'Glacier', description: 'Long-term archive with retrieval options from minutes to hours' },
    ],
    dependencies: [
      { questionId: 'aws-storage-services', answerValues: ['s3'] },
    ],
    default: 'standard',
  },
  
  {
    id: 'aws-storage-resilience',
    text: 'Do you want to enable cross-region replication for S3?',
    description: 'Cross-region replication copies objects to a bucket in a different region for disaster recovery',
    type: 'boolean',
    category: 'resilience',
    dependencies: [
      { questionId: 'aws-storage-services', answerValues: ['s3'] },
      { questionId: 'high-availability', answerValues: [true] },
    ],
    default: false,
  },
  
  // Database Resilience - Added Questions
  {
    id: 'database-requirements',
    text: 'Which database technologies do you need?',
    type: 'multiple-choice',
    category: 'database',
    choices: [
      { id: 'sql', text: 'Relational SQL', description: 'Traditional relational databases with ACID properties' },
      { id: 'nosql', text: 'NoSQL', description: 'Non-relational databases for flexible schemas' },
      { id: 'in-memory', text: 'In-memory Database', description: 'High-performance caching and data access' },
      { id: 'time-series', text: 'Time Series Database', description: 'Optimized for time-based data' },
    ],
    followUpQuestions: ['database-resilience'],
    default: ['sql'],
  },
  
  {
    id: 'database-resilience',
    text: 'What level of database resilience do you require?',
    type: 'select',
    category: 'resilience',
    choices: [
      { id: 'single-instance', text: 'Single Instance with Backups', description: 'Basic protection via regular backups' },
      { id: 'read-replicas', text: 'Read Replicas', description: 'Primary instance with read-only copies for scaling and minimal failover' },
      { id: 'multi-az', text: 'Multi-AZ/Zone Redundancy', description: 'Automatic failover within region' },
      { id: 'multi-region', text: 'Multi-Region', description: 'Cross-region replication for geographic redundancy' },
    ],
    dependencies: [
      { questionId: 'high-availability', answerValues: [true] },
    ],
    default: 'single-instance',
  },
  
  // Network Resilience
  {
    id: 'network-requirements',
    text: 'What networking capabilities do you need?',
    type: 'multiple-choice',
    category: 'network',
    choices: [
      { id: 'load-balancer', text: 'Load Balancing', description: 'Distribute traffic across multiple instances' },
      { id: 'cdn', text: 'Content Delivery Network', description: 'Edge caching for global performance' },
      { id: 'vpn', text: 'VPN Connectivity', description: 'Secure connection to on-premises' },
      { id: 'api-gateway', text: 'API Gateway', description: 'Managed API endpoint handling' },
      { id: 'firewall', text: 'Network Firewall', description: 'Advanced network security' },
    ],
    followUpQuestions: ['load-balancer-setup', 'vnet-configuration', 'subnet-strategy'],
    default: ['load-balancer'],
  },
  
  {
    id: 'load-balancer-setup',
    text: 'How should your load balancers be configured?',
    type: 'select',
    category: 'resilience',
    choices: [
      { id: 'single-region', text: 'Single Region', description: 'Load balancing within one region' },
      { id: 'multi-region', text: 'Multi-Region', description: 'Global load balancing across regions' },
      { id: 'traffic-manager', text: 'Traffic Manager/Route 53', description: 'DNS-based routing for global redundancy' },
    ],
    dependencies: [
      { questionId: 'network-requirements', answerValues: ['load-balancer'] },
      { questionId: 'high-availability', answerValues: [true] },
    ],
    default: 'single-region',
  },
  
  // ADDED: VNet Configuration
  {
    id: 'vnet-configuration',
    text: 'How should your virtual networks be configured?',
    type: 'select',
    category: 'network',
    choices: [
      { id: 'single-vnet', text: 'Single VNet', description: 'One VNet with multiple subnets' },
      { id: 'hub-spoke', text: 'Hub and Spoke', description: 'Hub VNet for shared services, spoke VNets for workloads' },
      { id: 'mesh', text: 'Mesh Network', description: 'Multiple interconnected VNets' },
    ],
    default: 'single-vnet',
    followUpQuestions: ['vnet-peering'],
  },
  
  // ADDED: VNet CIDR Block
  {
    id: 'vnet-cidr',
    text: 'What CIDR block should be used for your virtual network?',
    type: 'select',
    category: 'network',
    choices: [
      { id: '10.0.0.0/16', text: '10.0.0.0/16', description: 'Large network (65,536 addresses)' },
      { id: '10.0.0.0/18', text: '10.0.0.0/18', description: 'Medium network (16,384 addresses)' },
      { id: '10.0.0.0/20', text: '10.0.0.0/20', description: 'Small network (4,096 addresses)' },
      { id: 'custom', text: 'Custom CIDR', description: 'Specify a custom CIDR block' },
    ],
    dependencies: [
      { questionId: 'vnet-configuration', answerValues: ['single-vnet', 'hub-spoke', 'mesh'] },
    ],
    default: '10.0.0.0/16',
    followUpQuestions: ['custom-vnet-cidr', 'subnet-strategy'],
  },
  
  // ADDED: Custom VNet CIDR
  {
    id: 'custom-vnet-cidr',
    text: 'Enter your custom CIDR block:',
    type: 'text',
    category: 'network',
    dependencies: [
      { questionId: 'vnet-cidr', answerValues: ['custom'] },
    ],
    default: '',
  },
  
  // ADDED: VNet Peering
  {
    id: 'vnet-peering',
    text: 'Do you need VNet peering between regions or with on-premises networks?',
    type: 'multiple-choice',
    category: 'network',
    choices: [
      { id: 'cross-region', text: 'Cross-Region VNet Peering', description: 'Connect VNets across regions' },
      { id: 'on-premises', text: 'On-Premises Connectivity', description: 'Connect to your data center' },
      { id: 'none', text: 'No peering needed', description: 'Standalone cloud deployment' },
    ],
    dependencies: [
      { questionId: 'vnet-configuration', answerValues: ['hub-spoke', 'mesh'] },
    ],
    default: ['none'],
  },
  
  // ADDED: Subnet Strategy
  {
    id: 'subnet-strategy',
    text: 'How do you want to organize your subnets?',
    type: 'select',
    category: 'network',
    choices: [
      { id: 'tier-based', text: 'Tier-Based (Web/App/Data)', description: 'Separate subnets by application tier' },
      { id: 'service-based', text: 'Service-Based', description: 'Separate subnets by service type' },
      { id: 'environment-based', text: 'Environment-Based (Dev/Test/Prod)', description: 'Separate subnets by environment' },
      { id: 'simple', text: 'Simple (One subnet)', description: 'Single subnet for all resources' },
    ],
    dependencies: [
      { questionId: 'network-requirements', answerValues: (vals: any) => Array.isArray(vals) && vals.length > 0 },
    ],
    default: 'tier-based',
    followUpQuestions: ['subnet-cidrs'],
  },
  
  // ADDED: Subnet CIDRs
  {
    id: 'subnet-cidrs',
    text: 'What CIDR blocks should be used for your subnets?',
    type: 'select',
    category: 'network',
    choices: [
      { id: 'auto', text: 'Auto-assign', description: 'Automatically calculate optimal subnet ranges' },
      { id: 'large', text: 'Large Subnets (/20)', description: 'Fewer, larger subnets' },
      { id: 'medium', text: 'Medium Subnets (/24)', description: 'Balanced subnet sizes' },
      { id: 'small', text: 'Small Subnets (/27)', description: 'More, smaller subnets' },
    ],
    dependencies: [
      { questionId: 'subnet-strategy', answerValues: ['tier-based', 'service-based', 'environment-based'] },
    ],
    default: 'auto',
  },
  
  // ADDED: Network Security
  {
    id: 'network-security',
    text: 'What network security measures do you need?',
    type: 'multiple-choice',
    category: 'network',
    choices: [
      { id: 'nsg', text: 'Network Security Groups', description: 'Subnet and VM-level security rules' },
      { id: 'firewall', text: 'Cloud Firewall', description: 'Advanced network filtering' },
      { id: 'ddos', text: 'DDoS Protection', description: 'Protection against distributed denial of service attacks' },
      { id: 'private-endpoints', text: 'Private Endpoints', description: 'Private connectivity to PaaS services' },
    ],
    dependencies: [
      { questionId: 'network-requirements', answerValues: (vals: any) => Array.isArray(vals) && vals.length > 0 },
    ],
    default: ['nsg'],
  },
  
  // ADDED: Advanced Database Questions
  {
    id: 'sql-database-type',
    text: 'Which SQL database service do you prefer?',
    type: 'select',
    category: 'database',
    choices: [
      { id: 'azure-sql', text: 'Azure SQL Database', description: 'Fully managed SQL Server' },
      { id: 'sql-managed-instance', text: 'Azure SQL Managed Instance', description: 'Nearly 100% compatibility with SQL Server' },
      { id: 'postgres', text: 'PostgreSQL', description: 'Open-source relational database' },
      { id: 'mysql', text: 'MySQL', description: 'Open-source relational database' },
      { id: 'mariadb', text: 'MariaDB', description: 'Enhanced, open-source MySQL fork' },
    ],
    dependencies: [
      { questionId: 'database-requirements', answerValues: ['sql'] },
      { questionId: 'cloud-provider', answerValues: ['azure'] },
    ],
    default: 'azure-sql',
    followUpQuestions: ['sql-sizing', 'sql-scaling'],
  },
  
  {
    id: 'aws-sql-database-type',
    text: 'Which AWS SQL database service do you prefer?',
    type: 'select',
    category: 'database',
    choices: [
      { id: 'aurora', text: 'Aurora', description: 'MySQL and PostgreSQL-compatible database with high performance' },
      { id: 'rds-mysql', text: 'RDS MySQL', description: 'Managed MySQL database' },
      { id: 'rds-postgres', text: 'RDS PostgreSQL', description: 'Managed PostgreSQL database' },
      { id: 'rds-sqlserver', text: 'RDS SQL Server', description: 'Managed SQL Server database' },
    ],
    dependencies: [
      { questionId: 'database-requirements', answerValues: ['sql'] },
      { questionId: 'cloud-provider', answerValues: ['aws'] },
    ],
    default: 'aurora',
    followUpQuestions: ['aws-sql-sizing', 'aws-sql-scaling'],
  },
  
  {
    id: 'sql-sizing',
    text: 'What size SQL database do you need?',
    type: 'select',
    category: 'database',
    choices: [
      { id: 'basic', text: 'Basic (up to 2GB)', description: 'For development and small production workloads' },
      { id: 'standard', text: 'Standard (up to 250GB)', description: 'For medium workloads' },
      { id: 'premium', text: 'Premium (up to 4TB)', description: 'For high-performance requirements' },
      { id: 'hyperscale', text: 'Hyperscale (up to 100TB+)', description: 'For very large databases with elastic scaling' },
    ],
    dependencies: [
      { questionId: 'sql-database-type', answerValues: ['azure-sql', 'postgres', 'mysql', 'mariadb'] },
    ],
    default: 'standard',
  },
  
  {
    id: 'nosql-database-type',
    text: 'Which NoSQL database service do you prefer?',
    type: 'select',
    category: 'database',
    choices: [
      { id: 'cosmos-db', text: 'Cosmos DB', description: 'Multi-model globally distributed database' },
      { id: 'table-storage', text: 'Table Storage', description: 'Simple key-value store' },
      { id: 'mongodb', text: 'Azure Cosmos DB for MongoDB', description: 'MongoDB-compatible API' },
      { id: 'cassandra', text: 'Azure Cosmos DB for Cassandra', description: 'Cassandra-compatible API' },
    ],
    dependencies: [
      { questionId: 'database-requirements', answerValues: ['nosql'] },
      { questionId: 'cloud-provider', answerValues: ['azure'] },
    ],
    default: 'cosmos-db',
    followUpQuestions: ['nosql-consistency'],
  },
  
  {
    id: 'aws-nosql-database-type',
    text: 'Which AWS NoSQL database service do you prefer?',
    type: 'select',
    category: 'database',
    choices: [
      { id: 'dynamodb', text: 'DynamoDB', description: 'Key-value and document database with single-digit millisecond latency' },
      { id: 'documentdb', text: 'DocumentDB', description: 'MongoDB-compatible database service' },
      { id: 'elasticache', text: 'ElastiCache', description: 'In-memory data store (Redis or Memcached)' },
      { id: 'neptune', text: 'Neptune', description: 'Graph database service' },
    ],
    dependencies: [
      { questionId: 'database-requirements', answerValues: ['nosql'] },
      { questionId: 'cloud-provider', answerValues: ['aws'] },
    ],
    default: 'dynamodb',
  },
  
  {
    id: 'nosql-consistency',
    text: 'What consistency level do you need for Cosmos DB?',
    type: 'select',
    category: 'database',
    choices: [
      { id: 'strong', text: 'Strong', description: 'Linearizable reads (highest consistency, highest latency)' },
      { id: 'bounded-staleness', text: 'Bounded Staleness', description: 'Consistent prefix, bounded lag' },
      { id: 'session', text: 'Session', description: 'Consistent prefix, monotonic reads/writes within a session' },
      { id: 'consistent-prefix', text: 'Consistent Prefix', description: 'Updates returned in order, may see partial transactions' },
      { id: 'eventual', text: 'Eventual', description: 'Out of order reads (lowest consistency, lowest latency)' },
    ],
    dependencies: [
      { questionId: 'nosql-database-type', answerValues: ['cosmos-db', 'mongodb', 'cassandra'] },
    ],
    default: 'session',
  },
  
  // ADDED: IaC Preferences
  {
    id: 'iac-tool',
    text: 'Which Infrastructure as Code (IaC) tool do you prefer?',
    type: 'select',
    category: 'iac',
    choices: [
      { id: 'terraform', text: 'Terraform', description: 'Multi-cloud IaC tool using HCL' },
      { id: 'arm', text: 'Azure Resource Manager (ARM)', description: 'Native Azure IaC using JSON or Bicep' },
      { id: 'cloudformation', text: 'AWS CloudFormation', description: 'Native AWS IaC using JSON or YAML' },
      { id: 'pulumi', text: 'Pulumi', description: 'Multi-cloud IaC using your preferred programming language' },
    ],
    default: 'terraform',
    followUpQuestions: ['iac-scope', 'iac-organization'],
  },
  
  {
    id: 'iac-scope',
    text: 'What is your preferred scope for IaC resources?',
    type: 'select',
    category: 'iac',
    choices: [
      { id: 'monolithic', text: 'Monolithic (single file)', description: 'All resources in a single file/template' },
      { id: 'layered', text: 'Layered (foundation/shared/app)', description: 'Resources organized in layers' },
      { id: 'service-based', text: 'Service-based modules', description: 'Resources organized by service type' },
      { id: 'microservice', text: 'Microservice-based', description: 'One template per microservice or application component' },
    ],
    dependencies: [
      { questionId: 'iac-tool', answerValues: ['terraform', 'arm', 'cloudformation', 'pulumi'] },
    ],
    default: 'layered',
  },
  
  {
    id: 'iac-organization',
    text: 'How do you want to organize your IaC modules/templates?',
    type: 'select',
    category: 'iac',
    choices: [
      { id: 'flat', text: 'Flat structure', description: 'All files in the same directory' },
      { id: 'nested', text: 'Nested structure', description: 'Hierarchical directory structure' },
      { id: 'repository-per-env', text: 'Repository per environment', description: 'Separate repositories for dev/test/prod' },
      { id: 'repository-per-component', text: 'Repository per component', description: 'Separate repositories for each application component' },
    ],
    dependencies: [
      { questionId: 'iac-tool', answerValues: ['terraform', 'arm', 'cloudformation', 'pulumi'] },
    ],
    default: 'nested',
  },
  
  {
    id: 'iac-state-management',
    text: 'How do you want to manage your Terraform state?',
    type: 'select',
    category: 'iac',
    choices: [
      { id: 'local', text: 'Local state', description: 'State stored locally (not recommended for teams)' },
      { id: 'azure-storage', text: 'Azure Storage', description: 'State stored in Azure Blob Storage' },
      { id: 's3', text: 'AWS S3 + DynamoDB', description: 'State stored in S3 with locking in DynamoDB' },
      { id: 'terraform-cloud', text: 'Terraform Cloud', description: 'State managed in Terraform Cloud' },
    ],
    dependencies: [
      { questionId: 'iac-tool', answerValues: ['terraform'] },
    ],
    default: 'azure-storage',
  },
];

// Helper function to get next questions based on answers
export const getNextQuestions = (
  currentQuestionId: string,
  answers: Record<string, any>
): string[] => {
  const currentQuestion = wizardQuestions.find(q => q.id === currentQuestionId);
  if (!currentQuestion) return [];
  
  // Get follow-up questions for the current question
  let nextQuestions = currentQuestion.followUpQuestions || [];
  
  // Filter questions based on dependencies
  return nextQuestions.filter(questionId => {
    const question = wizardQuestions.find(q => q.id === questionId);
    if (!question) return false;
    
    // If there are no dependencies, include the question
    if (!question.dependencies || question.dependencies.length === 0) {
      return true;
    }
    
    // Check if all dependencies are satisfied
    return question.dependencies.some(dependency => {
      const dependencyAnswer = answers[dependency.questionId];
      if (!dependencyAnswer) return false;
      
      // Handle function-based answerValues (for more complex conditions)
      if (typeof dependency.answerValues === 'function') {
        return dependency.answerValues(dependencyAnswer);
      }
      
      // For array answers (multiple choice)
      if (Array.isArray(dependencyAnswer)) {
        return dependencyAnswer.some(answer => 
          Array.isArray(dependency.answerValues) && dependency.answerValues.includes(answer)
        );
      }
      
      // For single value answers
      return Array.isArray(dependency.answerValues) && dependency.answerValues.includes(dependencyAnswer);
    });
  });
}; 