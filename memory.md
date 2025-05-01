# GitHub Repository

The project code is now hosted on GitHub: [https://github.com/reddyfull/gcp-diagram-maker](https://github.com/reddyfull/gcp-diagram-maker)

This repository follows our strategic pivot to a GCP-only implementation. Major updates and development progress will be tracked in this memory.md file and synchronized with the repository.

---

# Google Cloud Platform Diagram Maker - Development Memory

This document tracks the progress, changes, and important details of the project to maintain context between development sessions.

## Strategic Pivot: GCP-First Approach (May 1, 2025)

After evaluating the current development challenges and marketplace opportunities, we have decided to pivot our focus to a GCP-only implementation for the initial release. This strategic change will:

1. Simplify development by focusing on a single cloud provider
2. Leverage Google's ecosystem integration (Gemini AI, Google Cloud Storage)
3. Eliminate cross-provider compatibility issues that were causing bugs
4. Accelerate time-to-market by narrowing the scope of the first release

The existing codebase will be refactored to focus exclusively on Google Cloud Platform services, regions, and best practices. Multi-cloud support may be added in future versions.

## Current Task Progress

### Front-end Tasks (ReactJS)

#### High-Level Task 1: Design and Set Up Front-end Environment
**Status**: Completed (Needs GCP focus update)

**Progress Notes**:
- Created React project with Vite and TypeScript using bash script
- Set up project structure with all necessary directories
- Selected Material-UI as the styling library
- Need to update color schemes to align with GCP branding (blue-focused palette)
- Need to replace multi-provider UI elements with GCP-specific components

#### High-Level Task 2: Build Core Layout
**Status**: Completed (Needs GCP focus update)

**Progress Notes**:
- Enhanced MainLayout component with responsive sidebar and header
- Created Sidebar component with navigation menu structure
- Implemented application routing system
- Developed Dashboard page with action cards
- Need to update navigation structure to focus on GCP services
- Need to replace multi-cloud visual indicators with GCP focus

#### High-Level Task 3: Develop GCP Wizard UI
**Status**: In Progress

**Current Subtask**: Refactoring for GCP focus

**Progress Notes**:
- Basic wizard structure is implemented but needs refactoring for GCP focus
- Need to update WizardProgress to show GCP-focused steps
- Need to replace provider selection with GCP region selection as first step
- Need to update service selection to list only GCP services
- Need to refine configuration screens for GCP service specifics

## GCP Wizard Implementation Updates

We encountered a significant bug in the diagram generator where 'azure_regions' was not defined, causing the diagram generation to fail. As part of our pivot to GCP-only:

- The diagram generator will be completely refactored to focus on GCP regions and services
- All references to Azure and AWS regions will be removed
- The backend API will be updated to process only GCP-specific configurations
- Gemini AI integration will be enhanced for GCP-specific recommendations

## Bug Fixes Needed

1. **Diagram Generator Bug**: The current implementation references `azure_regions` which is undefined in some contexts. This needs a complete refactor to:
   - Focus only on GCP regions (us-central1, us-east1, etc.)
   - Remove all Azure/AWS specific network configurations
   - Implement GCP-specific VPC, subnet, and firewall configurations
   - Add GCP resource icons and styling

2. **Frontend Updates Needed**:
   - Remove Azure/AWS service selections
   - Update color schemes to match GCP's branding
   - Replace cloud provider icons with GCP-specific ones
   - Update service configuration forms for GCP service parameters

## MongoDB Atlas Connection

- Connection URL format with proper URL-encoding remains unchanged:
  ```
  mongodb+srv://srinisona:SaiKalika%401209@sridraw.rpkmj.mongodb.net/?retryWrites=true&w=majority&appName=sridraw
  ```
- The @ symbol in the password (SaiKalika@1209) must be URL-encoded as %40
- Collections structure will be simplified to focus on GCP-specific data:
  - `gcp_regions`: Store GCP region metadata
  - `gcp_services`: Store GCP service details and parameters
  - `user_diagrams`: Store user-generated diagrams with GCP focus
  - `user_sessions`: Store user session data for GCP wizard

## Google Cloud Storage (GCS) Integration

- Already successfully integrated GCS for file storage:
  ```
  INFO:gcs:Successfully connected to GCS bucket: aiicons
  INFO:gcs:Successfully initialized GCS client with credentials
  ```
- Directory structure in GCS bucket will be updated:
  - `cloudicons/gcp/{category}/{filename}` for GCP service icons
  - `diagrams/{userId}/{diagramId}` for user diagrams
- This integration provides a strong foundation for our GCP-focused approach

## Project Structure Updates

- Front-end environment will remain ReactJS with TypeScript and Material-UI
- Directory structure remains similar but content will be GCP-focused:
  ```
  gcp-diagram-maker/
  ├── src/
  │   ├── api/
  │   │   ├── mongodb.ts
  │   │   └── gcpServices.ts
  │   ├── components/
  │   │   ├── GcpIconExplorer.tsx
  │   │   ├── MainLayout.tsx
  │   │   ├── Sidebar.tsx
  │   │   ├── ThemeProvider.tsx
  │   │   └── wizard/
  │   │       └── GcpWizardProgress.tsx
  │   ├── pages/
  │   │   ├── Dashboard.tsx
  │   │   ├── DiagramUpload.tsx
  │   │   └── wizard/
  │   │       ├── GcpRegionSelection.tsx
  │   │       ├── GcpServiceSelection.tsx
  │   │       ├── GcpServiceConfig.tsx
  │   │       └── WizardLayout.tsx
  ```

## UI Design Updates

- Updating color scheme to focus on Google Cloud blues (#4285F4 primary color)
- Replacing cloud provider selection with GCP region map
- Updating service icons to use official Google Cloud icons
- Maintaining the three-panel layout inspired by Mermaid.live
- Adding Google Cloud documentation links throughout the UI

## Navigation Structure Updates

- **Dashboard**: Home page with quick actions and recent sessions
- **GCP Wizard**: Step-by-step GCP configuration
  - Region: GCP region selection
  - Services: GCP service selection (GCE, GKE, Cloud SQL, etc.)
  - Configuration: GCP service parameter configuration
  - Review: Configuration summary
- **Diagram Upload**: Upload and analysis of infrastructure diagrams (GCP focus)
- **Icon Explorer**: Browse and upload GCP icons
- **AI Chat**: Conversational interface with focus on GCP best practices
- **Terraform Preview**: Generated GCP infrastructure code preview
- **Settings**: Application configuration and account settings

## Next Steps (May 1, 2025)

1. Refactor diagram generator to work with GCP regions instead of Azure/AWS
2. Update wizardQuestions.ts to focus exclusively on GCP services
3. Redesign the AI wizard flow for GCP-specific questions
4. Implement GCP-focused Terraform template generation
5. Update UI components with GCP styling and icons

## Known Issues and Limitations

- Diagram generator has a bug with 'azure_regions' not defined - needs complete GCP refactor
- Front-end UI needs styling updates to reflect GCP-focused approach
- Missing GCP-specific question flow in AI wizard
- Need to implement GCP cost estimation logic
- MongoDB connection issues need resolution for production use

## How to Test the GCP Wizard (Coming Soon)

1. Start the server with `cd /Users/sritadip/Documents/Kalidraw/gcp-diagram-maker/server && python app.py`
2. In another terminal, start the client with `cd /Users/sritadip/Documents/Kalidraw/gcp-diagram-maker/client && npm run dev`
3. Access the application at http://localhost:5173
4. Start the GCP wizard and select regions, services and configurations
5. View the generated Mermaid diagram with GCP resources

## Resources and Documentation

- [Google Cloud Architecture Framework](https://cloud.google.com/architecture/framework) - Best practices for GCP architecture
- [Google Cloud Icons](https://cloud.google.com/icons) - Official icons for GCP services
- [Terraform Google Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs) - Terraform documentation for GCP
- [Google Cloud Regions](https://cloud.google.com/about/locations) - List of available GCP regions and zones