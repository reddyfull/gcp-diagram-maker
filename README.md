# Google Cloud Platform Diagram Maker

A tool for designing and deploying Google Cloud Platform infrastructures with AI-assisted diagram creation and Terraform generation.

## Features

- **GCP Infrastructure Wizard**: Step-by-step wizard for configuring GCP resources
- **Diagram Upload**: Upload and analyze existing infrastructure diagrams
- **AI-Powered Chat**: Get GCP-specific configuration assistance
- **Real-time Diagram Generation**: Visualize your GCP infrastructure as you build it
- **Terraform Code Preview**: Generate ready-to-deploy Terraform code

## 🚧 Project Status

This project is currently under active development. We've recently made a strategic pivot to focus exclusively on Google Cloud Platform for the initial release to simplify development and provide a better user experience.

See [memory.md](memory.md) for detailed development history and current status.

## Technology Stack

- **Frontend**: React with TypeScript, Material-UI
- **Backend**: Python Flask, Google Cloud API clients
- **Database**: MongoDB Atlas
- **Storage**: Google Cloud Storage (GCS)
- **AI**: Google Generative AI (Gemini), Google Vision API

## Development Setup

### Prerequisites

- Node.js (v16+)
- Python 3.10+
- MongoDB Atlas account
- Google Cloud Platform account with API access

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/reddyfull/gcp-diagram-maker.git
   cd gcp-diagram-maker
   ```

2. Install backend dependencies
   ```bash
   cd server
   python -m pip install -r requirements.txt
   ```

3. Install frontend dependencies
   ```bash
   cd ../client
   npm install
   ```

4. Set up environment variables
   ```bash
   # In server directory
   echo "MONGODB_URI=your_mongodb_connection_string" > .env
   echo "GEMINI_API_KEY=your_gemini_api_key" >> .env
   ```

5. Start the development servers
   ```bash
   # Terminal 1: Backend
   cd server
   python app.py
   
   # Terminal 2: Frontend
   cd client
   npm run dev
   ```

## Documentation

- [Project Memory](memory.md): Development history and current status
- [Tasks](tasks.md): Current tasks and progress
- [Google Cloud Architecture Framework](https://cloud.google.com/architecture/framework): Best practices for GCP architecture
- [Google Cloud Icons](https://cloud.google.com/icons): Official icons for GCP services

## License

MIT

## Contact

For questions or feedback, please open an issue on this repository. 