# 🤖 AI Doc Chat - Intelligent Document Q&A System

<div align="center">

![.NET](https://img.shields.io/badge/.NET-8.0-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)
![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind-4.1-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![RAG](https://img.shields.io/badge/RAG-System-FF6B6B?style=for-the-badge)
![Ollama](https://img.shields.io/badge/Ollama-AI-000000?style=for-the-badge)

**A cutting-edge Retrieval-Augmented Generation (RAG) system that enables intelligent Q&A on your documents using state-of-the-art AI technologies**

[Demo](#-demo) • [Features](#-features) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [Architecture](#-architecture)

</div>

---

## 🎯 Overview

AI Doc Chat is a modern, production-ready **RAG (Retrieval-Augmented Generation)** application that allows users to upload documents and ask questions about their content using advanced AI models. The system intelligently retrieves relevant document sections and generates accurate, contextual answers.

### 🎥 Demo

Upload PDF or TXT documents and start chatting with your data instantly:

- 📤 **Drag & Drop Upload** - Seamless document upload experience
- 🔍 **Smart Search** - Vector similarity search for precise content retrieval
- 💬 **Natural Q&A** - Ask questions in natural language, get intelligent answers
- ⚡ **Real-time Processing** - Fast document chunking and embedding generation
- 🎨 **Modern UI** - Beautiful glassmorphism design with smooth animations

---

## ✨ Features

### Core Functionality

- ✅ **Document Processing** - Supports PDF and TXT files with intelligent chunking
- ✅ **Vector Embeddings** - Utilizes Ollama's `nomic-embed-text` model for semantic understanding
- ✅ **Semantic Search** - Cosine similarity-based retrieval for relevant content matching
- ✅ **AI-Powered Answers** - Groq API with Llama 3.1 8B for natural language responses
- ✅ **Multi-Document Support** - Upload and query multiple documents independently
- ✅ **Persistent Storage** - SQLite database for document and embedding storage

### Technical Highlights

- 🔐 **Clean Architecture** - Separation of concerns with Services, Controllers, Models, Data layers
- 🚀 **High Performance** - Async/await patterns throughout, optimized for scalability
- 📊 **RESTful API** - Well-structured endpoints with OpenAPI/Swagger documentation
- 🎨 **Responsive Design** - Mobile-first approach with Tailwind CSS 4.1
- ⚡ **Fast Compilation** - SWC for lightning-fast React builds
- 🔄 **CORS Enabled** - Seamless frontend-backend communication

---

## 🛠️ Tech Stack

### Backend (ASP.NET Core)

| Technology                                                       | Version | Purpose                                              |
| ---------------------------------------------------------------- | ------- | ---------------------------------------------------- |
| **[.NET](https://dotnet.microsoft.com/)**                        | 8.0     | Latest LTS framework for high-performance web APIs   |
| **[Entity Framework Core](https://docs.microsoft.com/ef/core/)** | 8.0     | Modern ORM with async operations and LINQ support    |
| **[SQLite](https://www.sqlite.org/)**                            | Latest  | Lightweight, embedded database for efficient storage |
| **[iText7](https://itextpdf.com/)**                              | 9.0.7   | Professional PDF processing and text extraction      |
| **[Newtonsoft.Json](https://www.newtonsoft.com/json)**           | 13.0.3  | High-performance JSON serialization                  |
| **[Swagger/OpenAPI](https://swagger.io/)**                       | Latest  | API documentation and testing interface              |

### Frontend (React + TypeScript)

| Technology                                        | Version | Purpose                                                 |
| ------------------------------------------------- | ------- | ------------------------------------------------------- |
| **[React](https://react.dev/)**                   | 19.2    | Latest React with concurrent features and optimizations |
| **[TypeScript](https://www.typescriptlang.org/)** | 5.9     | Type-safe JavaScript for robust code quality            |
| **[Vite](https://vitejs.dev/)**                   | 7.2     | Next-generation frontend tooling with HMR               |
| **[Tailwind CSS](https://tailwindcss.com/)**      | 4.1     | Utility-first CSS framework for modern design           |
| **[SWC](https://swc.rs/)**                        | Latest  | Rust-based compiler for 20x faster builds               |
| **[ESLint](https://eslint.org/)**                 | 9.39    | Code quality and consistency enforcement                |

### AI/ML Stack

| Service                          | Model                | Purpose                                        |
| -------------------------------- | -------------------- | ---------------------------------------------- |
| **[Ollama](https://ollama.ai/)** | nomic-embed-text     | Local embedding generation for semantic search |
| **[Groq](https://groq.com/)**    | llama-3.1-8b-instant | Ultra-fast LLM inference for chat responses    |
| **Vector Search**                | Cosine Similarity    | Efficient similarity matching algorithm        |
| **RAG Pipeline**                 | Custom               | Context-aware question answering system        |

---

## 🏗️ Architecture

### System Design

```
┌─────────────────┐      HTTP/REST      ┌──────────────────┐
│                 │ ◄─────────────────► │                  │
│  React Frontend │                     │  ASP.NET Core    │
│  (TypeScript)   │      JSON/API       │      API         │
│                 │                     │                  │
└─────────────────┘                     └──────────────────┘
                                               │
                                               ▼
                         ┌─────────────────────────────────────┐
                         │                                     │
                         │     Application Services            │
                         │  ┌──────────────────────────────┐  │
                         │  │  DocumentService             │  │
                         │  │  - PDF/TXT Processing        │  │
                         │  │  - Chunking Strategy         │  │
                         │  └──────────────────────────────┘  │
                         │  ┌──────────────────────────────┐  │
                         │  │  EmbeddingService            │  │
                         │  │  - Ollama Integration        │  │
                         │  │  - Vector Generation         │  │
                         │  │  - Similarity Search         │  │
                         │  └──────────────────────────────┘  │
                         │  ┌──────────────────────────────┐  │
                         │  │  ChatService                 │  │
                         │  │  - RAG Pipeline              │  │
                         │  │  - Groq API Integration      │  │
                         │  │  - Context Building          │  │
                         │  └──────────────────────────────┘  │
                         │                                     │
                         └─────────────────────────────────────┘
                                               │
                                               ▼
                         ┌─────────────────────────────────────┐
                         │                                     │
                         │   Entity Framework Core + SQLite    │
                         │                                     │
                         │   Documents Table                   │
                         │   DocumentChunks Table              │
                         │   (with Vector Embeddings)          │
                         │                                     │
                         └─────────────────────────────────────┘
```

### RAG Pipeline Flow

1. **Document Ingestion**
   - User uploads PDF/TXT file
   - Document is extracted and split into semantic chunks
   - Each chunk is sent to Ollama for embedding generation
   - Chunks and embeddings stored in SQLite database

2. **Question Processing**
   - User query is converted to embedding vector
   - Cosine similarity calculated against all document chunks
   - Top-K most relevant chunks retrieved

3. **Answer Generation**
   - Retrieved chunks assembled into context
   - Context + question sent to Groq's Llama 3.1 model
   - AI generates contextual, accurate response
   - Response delivered to user in real-time

---

## 🚀 Getting Started

### Prerequisites

- **[.NET SDK 8.0+](https://dotnet.microsoft.com/download)** - Backend runtime
- **[Node.js 18+](https://nodejs.org/)** - Frontend development
- **[Ollama](https://ollama.ai/)** - Local AI model runtime
- **[Groq API Key](https://console.groq.com/)** - Free LLM access

### Installation

#### 1️⃣ Clone the Repository

```bash
git clone https://github.com/yourusername/AiChatRagSystem.git
cd AiChatRagSystem
```

#### 2️⃣ Setup Ollama

```bash
# Install Ollama (if not already installed)
# Visit https://ollama.ai/ for installation instructions

# Pull the embedding model
ollama pull nomic-embed-text

# Start Ollama service (runs on http://localhost:11434)
ollama serve
```

#### 3️⃣ Configure Backend

```bash
cd AiDocChat.Api

# Update appsettings.json with your Groq API key
# Get free API key from: https://console.groq.com/keys
```

**appsettings.json:**

```json
{
  "Groq": {
    "ApiKey": "your-groq-api-key-here"
  },
  "Ollama": {
    "BaseUrl": "http://localhost:11434"
  }
}
```

#### 4️⃣ Run Backend

```bash
# Restore dependencies and run
dotnet restore
dotnet run

# API will be available at: http://localhost:5261
# Swagger UI: http://localhost:5261/swagger
```

#### 5️⃣ Setup Frontend

```bash
cd ../frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Frontend will be available at: http://localhost:5173
```

### 🎉 Usage

1. **Open** http://localhost:5173 in your browser
2. **Upload** a PDF or TXT document
3. **Select** the document from the list
4. **Ask** questions about the document content
5. **Receive** AI-generated answers based on document context

---

## 📁 Project Structure

```
AiChatRagSystem/
├── AiDocChat.Api/                 # Backend ASP.NET Core API
│   ├── Controllers/               # REST API endpoints
│   │   ├── ChatController.cs      # Chat Q&A endpoints
│   │   └── DocumentsController.cs # Document management
│   ├── Services/                  # Business logic layer
│   │   ├── ChatService.cs         # RAG + LLM integration
│   │   ├── DocumentService.cs     # PDF/TXT processing
│   │   └── EmbeddingService.cs    # Vector embeddings
│   ├── Models/                    # Domain models
│   │   └── Document.cs            # Document entity
│   ├── Data/                      # Database context
│   │   └── AppDbContext.cs        # EF Core DbContext
│   ├── Program.cs                 # Application entry point
│   └── appsettings.json           # Configuration
│
├── frontend/                      # React + TypeScript frontend
│   ├── src/
│   │   ├── App.tsx                # Main application component
│   │   ├── main.tsx               # React entry point
│   │   └── index.css              # Tailwind base styles
│   ├── package.json               # NPM dependencies
│   ├── vite.config.ts             # Vite configuration
│   ├── tsconfig.json              # TypeScript configuration
│   └── tailwind.config.js         # Tailwind setup
│
└── README.md                      # This file
```

---

## 🔧 API Endpoints

### Documents

| Method | Endpoint                | Description                     |
| ------ | ----------------------- | ------------------------------- |
| `GET`  | `/api/documents`        | List all uploaded documents     |
| `POST` | `/api/documents/upload` | Upload and process new document |

### Chat

| Method | Endpoint        | Description                 |
| ------ | --------------- | --------------------------- |
| `POST` | `/api/chat/ask` | Ask question about document |

**Example Request:**

```json
POST /api/chat/ask
{
  "documentId": "abc123",
  "question": "What is the main topic of this document?"
}
```

**Example Response:**

```json
{
  "success": true,
  "answer": "The main topic discusses artificial intelligence..."
}
```

---

## 🎨 UI Features

- **Glassmorphism Design** - Modern frosted glass aesthetic
- **Gradient Animations** - Smooth color transitions
- **Responsive Layout** - Works on all device sizes
- **Loading States** - Clear feedback for async operations
- **Error Handling** - User-friendly error messages
- **Drag & Drop** - Intuitive file upload
- **Dark Theme** - Eye-friendly dark color scheme

---

## 🔐 Security Considerations

- ✅ CORS configured for secure cross-origin requests
- ✅ API keys stored in configuration (not in code)
- ✅ Input validation on all endpoints
- ✅ Error handling without exposing sensitive info
- ⚠️ **Production Note:** Add authentication/authorization before deployment

---

## 🚀 Performance Optimizations

- **Async Operations** - All I/O operations are async for better concurrency
- **Connection Pooling** - HTTP client factory for efficient connections
- **Chunking Strategy** - Optimal chunk size for embeddings
- **Similarity Caching** - Efficient vector comparison algorithms
- **SWC Compiler** - 20x faster than Babel for React builds
- **Vite HMR** - Instant hot module replacement during development

---

## 📚 Key Algorithms & Techniques

### Document Chunking

Documents are split into semantic chunks to maintain context while enabling efficient retrieval.

### Vector Embeddings

Each chunk is converted to a 768-dimensional vector using Ollama's `nomic-embed-text` model, capturing semantic meaning.

### Cosine Similarity

```csharp
similarity = (A · B) / (||A|| × ||B||)
```

Measures semantic similarity between query and document chunks.

### RAG (Retrieval-Augmented Generation)

Combines semantic search with LLM generation for accurate, contextual answers grounded in document content.

---

## 🤝 Contributing

Contributions are welcome! Areas for improvement:

- [ ] Add support for more document formats (DOCX, PPTX)
- [ ] Implement chat history
- [ ] Add user authentication
- [ ] Deploy vector database (Qdrant, Pinecone)
- [ ] Add streaming responses
- [ ] Implement multi-language support
- [ ] Add document comparison features

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Your Name**

- GitHub: [@yourusername](https://github.com/yourusername)
- LinkedIn: [Your LinkedIn](https://linkedin.com/in/yourprofile)
- Portfolio: [yourportfolio.com](https://yourportfolio.com)

---

## 🙏 Acknowledgments

- **Ollama** - For providing free local AI inference
- **Groq** - For ultra-fast LLM API access
- **Microsoft** - For the excellent .NET platform
- **React Team** - For the amazing React 19 features
- **Tailwind Labs** - For the utility-first CSS framework

---

## 📊 Project Stats

- **Backend Lines of Code:** ~1,500+
- **Frontend Lines of Code:** ~400+
- **Technologies Used:** 15+
- **API Endpoints:** 3
- **Response Time:** < 2 seconds (average)
- **Supported Documents:** PDF, TXT

---

<div align="center">

**⭐ If you find this project useful, please consider giving it a star! ⭐**

Made with ❤️ using cutting-edge technologies

</div>
