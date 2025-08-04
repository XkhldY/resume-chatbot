# Document Chatbot

A modern AI-powered document chatbot application that allows users to upload documents and have intelligent conversations with them using Google's Gemini API.

## Features

- 📄 **Document Upload**: Support for PDF, DOCX, TXT, and Markdown files
- 🤖 **AI Chat**: Powered by Google Gemini 1.5 Flash for intelligent responses
- 🔍 **Vector Search**: ChromaDB for semantic document search
- 📱 **Modern UI**: Responsive design with Next.js 14 and Tailwind CSS
- 🐳 **Docker Ready**: Full containerization with Docker Compose
- 🔧 **Developer Friendly**: VS Code debugging support and hot reload

## Architecture

- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **Backend**: FastAPI with Python 3.11+ (uv managed)
- **AI**: Google Gemini API for chat and embeddings
- **Database**: ChromaDB for vector storage
- **Deployment**: Docker Compose

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Google Gemini API key ([Get one here](https://aistudio.google.com/app/apikey))

### Environment Setup

1. Copy environment template:
   ```bash
   cp backend/.env.example backend/.env
   ```

2. Add your Gemini API key to `backend/.env`:
   ```bash
   GEMINI_API_KEY=your_api_key_here
   ```

### Running with Docker

```bash
# Start all services
docker-compose up --build

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Development Setup

#### Backend (Python with uv)
```bash
cd backend
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend (Node.js)
```bash
cd frontend
npm install
npm run dev
```

## Development

### VS Code Debugging

#### Remote Debugging (Docker)
```bash
docker-compose -f docker-compose.debug.yml up --build
# In VS Code: F5 → "Python: Remote Attach"
```

#### Local Debugging
```bash
cd backend
uv run uvicorn app.main:app --reload
# In VS Code: F5 → "Python: FastAPI Local"
```

### Project Structure

```
document-chatbot/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── core/           # Configuration
│   │   ├── models/         # Pydantic models
│   │   └── services/       # Business logic
│   ├── pyproject.toml      # uv dependencies
│   └── Dockerfile
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── app/           # Next.js app router
│   │   ├── components/    # React components
│   │   └── lib/          # Utilities
│   ├── package.json
│   └── Dockerfile
├── documents/             # Uploaded documents
└── docker-compose.yml     # Production setup
```

### Available Scripts

#### Backend
- `uv run uvicorn app.main:app --reload` - Start development server
- `uv run pytest` - Run tests
- `uv add <package>` - Add dependencies

#### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run type-check` - TypeScript checking

## API Endpoints

### Documents
- `GET /api/documents` - List all documents
- `POST /api/documents/upload` - Upload documents
- `POST /api/documents/process` - Process documents for chat

### Chat
- `POST /api/chat` - Send message and get AI response
- `GET /api/chat/history/{conversation_id}` - Get conversation history

### Health
- `GET /api/health` - API health check
- `GET /api/health/llm` - Gemini API health check

## Environment Variables

### Backend
- `GEMINI_API_KEY` - Google Gemini API key (required)
- `DOCUMENTS_FOLDER` - Document storage path (default: `/app/documents`)
- `VECTOR_STORE_PATH` - ChromaDB path (default: `/app/data/chroma_db`)

### Frontend
- `NEXT_PUBLIC_API_URL` - Backend API URL (default: `http://localhost:8000`)

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue on GitHub or contact the development team.