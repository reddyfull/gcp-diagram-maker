System Context
Application: A SaaS platform for designing and deploying Google Cloud Platform (GCP) infrastructures with:
Step-by-step wizard for GCP service configuration.
Diagram upload for visual infrastructure input.
AI-driven chat for GCP configuration assistance.
Live Terraform code preview and deployment.
User session persistence, chat logs, and AI memory.
Tech Stack:
Front-end: ReactJS, Material-UI, CodeMirror for code preview.
Back-end: Python Flask, Google Cloud API clients, Jinja2 for Terraform templates.
Database: MongoDB Atlas (sessions, configs, chats, documents, icons, AI memory using GridFS).
Storage: Google Cloud Storage (GCS) for diagrams.
AI: Google Vision API, Google Generative AI (Gemini), memory (Sentence Transformers for embeddings).
UI Inspiration: Mermaid.live's clean, real-time, sidebar + canvas + editor layout.

# Current Progress - Updated on May 1, 2025
We've successfully implemented several core components of the application:
- MongoDB Atlas integration with proper authentication (password with @ character properly URL-encoded)
- Basic project structure with components, pages, and API services
- Core routing and layouts
- Wizard UI framework components
- Google Cloud Storage integration for file storage
- Initial Mermaid diagram generation capabilities

## Latest Updates
- Strategic pivot to GCP-only focus for initial release to simplify development
- Identified bug in diagram generator where 'azure_regions' is undefined
- Preparing to refactor backend for GCP-specific regions and services
- Need to update UI components to use GCP branding and icons

## Next Steps (Prioritized)
1. Refactor diagram generator for GCP regions and services
2. Update wizard questions for GCP-specific configurations
3. Implement GCP-focused Terraform generation
4. Update UI with GCP branding and icons

# Front-end Tasks (ReactJS)
The front-end is responsible for delivering an interactive UI with a wizard, diagram upload, chat, Terraform preview, and user authentication, styled to match Mermaid.live's intuitive and dynamic design.

## High-Level Task 1: Design and Set Up Front-end Environment
**Status**: ✅ Completed (Needs GCP focus update)
**Low-Level Tasks**:
- [x] Initialize React project with Vite and TypeScript
- [x] Set up folder structure and core dependencies
- [x] Configure development tools (ESLint, Prettier, TypeScript)
- [ ] Update styling to use GCP's color scheme (blue-focused palette)
- [ ] Replace multi-provider UI elements with GCP-specific components

## High-Level Task 2: Build Core Layout
**Status**: ✅ Completed (Needs GCP focus update)
**Low-Level Tasks**:
- [x] Develop Layout component with collapsible sidebar and header
- [x] Implement routing system with React Router
- [x] Create Dashboard page with action cards
- [ ] Update navigation structure to focus on GCP services
- [ ] Replace multi-cloud visual indicators with GCP-specific branding

## High-Level Task 3: Develop GCP Wizard UI
**Status**: 🚧 In Progress
**Low-Level Tasks**:
- [x] Build Wizard component framework
- [ ] Create GcpRegionSelector for Google Cloud regions
- [ ] Implement GcpServiceSelector for GCP services (GCE, GKE, Cloud SQL, etc.)
- [ ] Design GcpServiceConfig forms with GCP-specific parameters
- [ ] Add validation for GCP resource constraints
- [ ] Create Review step with GCP resources summary
- [ ] Ensure accessibility with ARIA labels and keyboard navigation

# GCP Wizard Implementation Tasks

- [x] Create route and entry point for GCP Wizard
- [x] Implement horizontal Material-UI Stepper
- [x] Ensure wizard flow is logic-driven (not LLM)
- [ ] Refactor diagram generator for GCP regions and services (Fix 'azure_regions' bug)
- [ ] Update wizardQuestions.ts for GCP-specific configurations
- [ ] Generate real-time Mermaid diagrams of GCP infrastructure
- [ ] Generate Terraform code for GCP resources
- [ ] Integrate MongoDB Atlas for storing wizard answers and chat history
- [ ] Add error handling with local storage fallback
- [ ] Enhance UI/UX with GCP documentation links

## High-Level Task 4: Create Diagram Upload UI
**Status**: 🚧 In Progress
**Low-Level Tasks**:
- [x] Develop DiagramUpload component with drag-and-drop
- [x] Configure GCS storage integration
- [ ] Update diagram analysis to recognize GCP resources
- [ ] Add GCP-specific suggestions based on uploaded diagrams

## High-Level Task 5: Build Chat Interface for GCP Assistance
**Status**: 🚧 In Progress
**Low-Level Tasks**:
- [x] Develop basic ChatInterface component structure
- [ ] Update chat to provide GCP-specific assistance
- [ ] Add quick-reply buttons for common GCP configurations
- [ ] Include GCP documentation links in responses

## High-Level Task 6: Implement GCP Terraform Code Preview
**Status**: 🚧 In Progress
**Low-Level Tasks**:
- [x] Create TerraformViewer with syntax highlighting
- [ ] Update templates for GCP provider and resources
- [ ] Generate terraform code with GCP best practices
- [ ] Add download/export options for .tf files

## High-Level Task 7: Develop Authentication UI
**Status**: 🔜 Not Started
**Low-Level Tasks**:
- [ ] Build Auth component with login/signup
- [ ] Implement JWT authentication
- [ ] Create user dashboard for saved GCP configurations
- [ ] Add session persistence for GCP wizard progress

# Back-end Tasks (Python Flask)
The back-end handles GCP API interactions, Terraform generation, AI processing, and storage (MongoDB, GCS).

## High-Level Task 1: Refactor Backend for GCP Focus
**Status**: 🚧 In Progress
**Low-Level Tasks**:
- [ ] Fix 'azure_regions' bug in diagram generator
- [ ] Remove Azure/AWS specific code
- [ ] Implement GCP-specific regions and services
- [ ] Update diagram generator for GCP resources

## High-Level Task 2: Implement GCP Service APIs
**Status**: 🔜 Not Started
**Low-Level Tasks**:
- [ ] Create `/api/gcp/regions` endpoint
- [ ] Implement `/api/gcp/services` endpoint
- [ ] Develop `/api/gcp/service-config` endpoint
- [ ] Add `/api/gcp/cost-estimate` endpoint

## High-Level Task 3: Develop GCP Terraform Generation
**Status**: 🔜 Not Started
**Low-Level Tasks**:
- [ ] Create GCP Terraform templates
- [ ] Implement template rendering with Jinja2
- [ ] Generate terraform code for GCP configurations
- [ ] Add validation for generated terraform

## High-Level Task 4: Enhance AI for GCP Recommendations
**Status**: 🔜 Not Started
**Low-Level Tasks**:
- [ ] Update Gemini prompts for GCP-specific advice
- [ ] Add GCP best practices in recommendations
- [ ] Implement GCP-focused diagram analysis
- [ ] Create GCP cost optimization suggestions

## Known Issues and Limitations
- ❌ Diagram generator has a bug with 'azure_regions' not defined - needs GCP refactor
- ❌ Frontend UI needs styling updates to reflect GCP focus
- ❌ Missing GCP-specific question flow in AI wizard
- ❌ MongoDB connection issues need resolution for production use

## Next Steps (Immediate)
1. Refactor diagram generator to focus on GCP regions/services
2. Update wizard questions for GCP-specific configurations
3. Implement GCP resource visualization in Mermaid diagrams
4. Update UI components with GCP branding and icons