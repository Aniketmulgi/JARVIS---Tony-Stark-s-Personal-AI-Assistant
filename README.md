

https://github.com/user-attachments/assets/684f5b50-3962-4b6a-bf7d-8cd26264e529

# JARVIS — Stark Command Centre

A full-stack **JARVIS × Doomsday personal AI assistant** built for the recruitment task.

JARVIS is a functional command centre rather than a simple chatbot. It can interpret commands, route them to the appropriate integration, queue or interrupt tasks, request confirmation for consequential actions, execute the action, and maintain an action history.

---

## ✨ Features

### 🧠 AI Command Processing

- Natural-language command processing.
- Provider-agnostic AI architecture.
- Supports OpenAI-compatible `/chat/completions` APIs.
- Deterministic local parser fallback when no AI API key is configured.
- Command routing based on the requested action.
- Multi-step command orchestration.

### 🎛️ Stark Command Centre

- Futuristic responsive UI.
- JARVIS-style command centre interface.
- Assistant chat interface.
- Online/offline integration status.
- Command queue.
- Action history.
- Live integration preview.
- Success and error states.
- Queue and interrupt execution modes.

### 📅 Google Calendar

- Google OAuth 2.0 authentication.
- Create calendar events.
- List calendar events.
- Live calendar preview.
- Confirmation before creating consequential calendar events.

### ⏰ Personal Reminders

- Create reminders.
- List reminders.
- Mark reminders as completed.
- Delete reminders.
- Local JSON-based persistence.

### ☁️ Google Drive

- Authenticate using Google OAuth 2.0.
- List Drive files.
- Search Drive files.
- Create folders.
- Upload files using multipart upload.
- Display Drive operations in the command centre.

### 📱 Telegram

- Telegram Bot API integration.
- Resolve recipients using username or chat ID.
- Send Telegram messages.
- Confirmation before sending messages.
- Support for known Telegram recipients.

### 📜 Action History

- Track executed commands.
- Display successful actions.
- Display failed actions.
- Provide clear execution feedback.

### 🔀 Command Queue

Commands can be processed using two modes:

**Queue mode**

Commands are executed sequentially.

```text
Command 1
   ↓
Command 2
   ↓
Command 3
   ↓
Command 4
```

**Interrupt mode**

A new command can interrupt the currently queued workflow when appropriate.

---

# 🏗️ Architecture

JARVIS follows a frontend/backend architecture where the backend is responsible for integrations and action execution.

```text
┌─────────────────────────────────────────────┐
│              JARVIS UI                      │
│          React + Vite + TypeScript          │
└──────────────────────┬──────────────────────┘
                       │
                       │ REST API
                       ▼
┌─────────────────────────────────────────────┐
│              Express Server                 │
│              Node.js + TypeScript            │
├─────────────────────────────────────────────┤
│                                             │
│  Command Parser                             │
│        │                                    │
│        ▼                                    │
│  Command Router                             │
│        │                                    │
│        ▼                                    │
│  Orchestration Layer                        │
│        │                                    │
│   ┌────┼─────────┬──────────┐               │
│   ▼    ▼         ▼          ▼               │
│Calendar Reminders Drive   Telegram          │
│                                             │
└─────────────────────────────────────────────┘
```

The frontend is responsible primarily for the command-centre experience, while the backend handles authentication, integrations, command execution, persistence, and orchestration.

---

# 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React |
| Build Tool | Vite |
| Frontend Language | TypeScript |
| Styling | CSS |
| Backend | Node.js |
| API Framework | Express |
| Backend Language | TypeScript |
| Authentication | Google OAuth 2.0 |
| Calendar | Google Calendar API |
| Cloud Storage | Google Drive API |
| Messaging | Telegram Bot API |
| Persistence | JSON file |
| AI | OpenAI-compatible API |
| Session | Cookie-based session |
| Containerization | Docker / Docker Compose |

---

# 📁 Project Structure

```text
jarvis-stark/
│
├── client/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
│
├── server/
│   ├── src/
│   ├── package.json
│   └── ...
│
├── .env.example
├── docker-compose.yml
├── package.json
└── README.md
```

---

# ⚙️ Requirements

Before running the project, make sure you have:

- Node.js 20 or newer
- npm
- A Google Cloud project
- Google OAuth credentials
- Google Calendar API enabled
- Google Drive API enabled

Optional:

- Telegram Bot token
- OpenAI-compatible API key

---

# 🔐 Google Cloud Setup

JARVIS uses Google OAuth 2.0 for Calendar and Drive access.

## 1. Create a Google Cloud Project

Open Google Cloud Console and create a new project or select an existing project.

## 2. Enable Required APIs

Enable the following APIs:

- Google Calendar API
- Google Drive API

## 3. Configure OAuth Consent Screen

Configure the OAuth consent screen for your application.

Depending on the Google Cloud configuration, you may need to add your Google account as a test user.

## 4. Create OAuth Credentials

Create an OAuth 2.0 Client ID.

Select:

```text
Application type: Web application
```

Add the following redirect URI:

```text
http://localhost:4000/api/auth/google/callback
```

For production, replace the localhost URL with your deployed HTTPS callback URL.

---

# 📱 Telegram Setup

Telegram integration uses the Telegram Bot API.

## 1. Create a Telegram Bot

Open Telegram and interact with **BotFather**.

Create a new bot and obtain its bot token.

## 2. Configure the Bot Token

Add the token to your environment file:

```env
TELEGRAM_BOT_TOKEN=your_bot_token
```

## 3. Recipient Resolution

A Telegram bot generally cannot freely search for every Telegram user.

The recipient must typically:

- Have interacted with the bot, or
- Be represented by a known chat ID.

JARVIS therefore supports:

```text
Username
```

and

```text
Numeric Chat ID
```

for recipient resolution.

---

# 🔑 Environment Configuration

Create a `.env` file from the provided example:

```bash
cp .env.example .env
```

Then configure the required variables.

Example:

```env
# Server
PORT=4000

# Frontend
CLIENT_URL=http://localhost:5173

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback

# Telegram
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# AI - Optional
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=your_api_key
AI_MODEL=gpt-4o-mini
```

Do not commit your `.env` file to GitHub.

---

# 🤖 AI Configuration

The AI layer is provider-agnostic.

JARVIS can communicate with any provider exposing an OpenAI-compatible chat-completions endpoint.

Example:

```env
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=your_api_key
AI_MODEL=gpt-4o-mini
```

## AI-Free Mode

An AI API key is **not required** to demonstrate the core application.

If AI configuration is missing, JARVIS uses a deterministic local command parser for supported commands.

This allows the application to run without requiring a paid AI API key.

---

# 🚀 Installation

Clone the repository:

```bash
git clone <YOUR_REPOSITORY_URL>
cd jarvis-stark
```

Install the root dependencies:

```bash
npm install
```

Install frontend and backend dependencies:

```bash
npm run install:all
```

Create your environment file:

```bash
cp .env.example .env
```

Configure the required environment variables.

---

# ▶️ Running the Application

Start the development environment:

```bash
npm run dev
```

The application will run on:

### Frontend

```text
http://localhost:5173
```

### Backend

```text
http://localhost:4000
```

Open the frontend URL in your browser:

```text
http://localhost:5173
```

---

# 🔄 How a Command Works

A typical JARVIS command follows this flow:

```text
User Command
     │
     ▼
Command Parser
     │
     ▼
Command Router
     │
     ▼
Confirmation Check
     │
     ▼
Queue / Interrupt Controller
     │
     ▼
Orchestration Layer
     │
     ├──────────────┐
     ▼              ▼
Integration      Integration
     │              │
     ▼              ▼
Google / Telegram / Local
     │
     ▼
Execution Result
     │
     ▼
Action History
     │
     ▼
UI Update
```

---

# 🧩 Example Commands

Depending on the configured integrations, JARVIS can process commands such as:

```text
Create a meeting tomorrow at 10 AM.
```

```text
Show my upcoming calendar events.
```

```text
Remind me to submit my assignment at 8 PM.
```

```text
List my reminders.
```

```text
Search my Drive for project files.
```

```text
Create a folder called Doomsday Research.
```

```text
Send a Telegram message to @username.
```

Multiple actions can also be orchestrated as part of a single workflow when supported by the command parser.

---

# 🔒 Confirmation System

JARVIS uses confirmation before executing consequential actions.

For example:

```text
User:
Send a Telegram message to John saying the meeting is cancelled.

JARVIS:
I am ready to send this message to John:

"The meeting is cancelled."

Confirm?
```

Only after confirmation is the action executed.

The same principle is applied to consequential Calendar actions.

---

# 🗂️ Data Storage

The current implementation uses a JSON-based store for:

- Reminders
- Action history
- Local application state

This keeps the project lightweight and easy to run during development and evaluation.

For production deployments, the storage layer should be replaced with a database such as:

```text
PostgreSQL
```

or:

```text
MongoDB
```

Redis can additionally be used for queues and temporary state.

---

# 🐳 Docker

A `docker-compose.yml` file is included for containerized development/deployment.

Build the containers:

```bash
docker compose build
```

Start the application:

```bash
docker compose up
```

Stop the application:

```bash
docker compose down
```

Make sure the required environment variables are configured before starting the containers.

---

# 🧪 Development

The project is divided into two major applications:

```text
client/
server/
```

The frontend communicates with the backend through REST APIs.

The backend contains the integration adapters and orchestration logic.

This separation makes it possible to add additional integrations without rewriting the command-centre UI.

---

# 🔌 Integration Architecture

The integration layer is designed around separate capabilities.

```text
                JARVIS
                   │
          ┌────────┴────────┐
          │ Command Router  │
          └────────┬────────┘
                   │
       ┌───────────┼───────────┐
       │           │           │
       ▼           ▼           ▼
   Calendar     Drive       Telegram
       │           │           │
       ▼           ▼           ▼
 Google API    Google API   Bot API
```

This makes the system extensible.

Future integrations can be added without changing the fundamental command-processing architecture.

---

# 📊 Task Coverage

The implementation covers the major requirements of the recruitment task:

| Requirement | Implementation |
|---|---|
| Command-centre UI | React + Vite dashboard |
| Assistant interaction | JARVIS command interface |
| Command routing | Backend command router |
| Queue handling | Sequential command queue |
| Interrupt behaviour | Interrupt execution mode |
| Multi-step commands | Orchestration layer |
| Google Calendar | OAuth + Calendar API |
| Calendar preview | Live UI preview |
| Personal reminders | Local reminder system |
| Reminder management | Create / list / complete / delete |
| Google Drive | Drive API integration |
| Drive search | File search functionality |
| Drive upload | Multipart upload |
| Folder creation | Drive folder creation |
| Telegram | Telegram Bot API |
| Recipient resolution | Username / chat ID |
| Confirmation | Consequential action confirmation |
| History | Persistent action history |
| AI parsing | OpenAI-compatible endpoint |
| AI fallback | Deterministic local parser |

---

# 🔐 Security Considerations

The current project is designed primarily for development and evaluation.

For a production deployment, the following improvements are recommended:

- Encrypt Google OAuth refresh tokens at rest.
- Use a secure production session store.
- Enable HTTPS.
- Add CSRF protection.
- Add API rate limiting.
- Validate and sanitize user input.
- Restrict Google OAuth origins.
- Restrict Telegram recipients.
- Avoid exposing integration credentials to the frontend.
- Use separate credentials for development and production.
- Store secrets using a dedicated secrets manager.
- Isolate user data by authenticated user ID.

---

# 🌍 Production Deployment

Before deploying to production, update:

```env
CLIENT_URL=https://your-frontend-domain.com
```

and configure the Google OAuth redirect URI to your production backend:

```text
https://your-backend-domain.com/api/auth/google/callback
```

Do not use localhost OAuth URLs in production.

The production architecture should look approximately like:

```text
                    Internet
                       │
                       ▼
              ┌─────────────────┐
              │   React Client  │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │ Express Backend │
              └────────┬────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
      PostgreSQL     Google       Telegram
                     APIs           API
```

---

# 🛣️ Future Improvements

Potential improvements include:

- PostgreSQL persistence.
- Redis-based command queues.
- WebSocket-based real-time updates.
- Voice commands.
- Wake-word activation.
- More Google Workspace integrations.
- Gmail integration.
- Slack integration.
- Notion integration.
- Multiple AI providers.
- Streaming AI responses.
- Advanced permission management.
- Multi-user support.
- Encrypted credential storage.
- Background task execution.
- Scheduled autonomous tasks.
- More sophisticated intent detection.
- Improved command planning and tool selection.

---

# 🧠 Design Philosophy

JARVIS is designed around the idea that an AI assistant should **execute tasks**, not simply generate conversational responses.

Instead of:

```text
User → Chatbot → Text Response
```

JARVIS follows:

```text
User
  ↓
Intent
  ↓
Plan
  ↓
Confirm
  ↓
Execute
  ↓
Verify
  ↓
Record
```

This makes the system closer to an actual personal command centre.

---

# 📜 License

This project was created as part of a recruitment/task submission.

Add your preferred license here if the repository is intended for public distribution.

---

# 👨‍💻 Author

**Aniket Mulgi**

Mechanical Engineering  
NITK Surathkal

---

# ⭐ JARVIS — Stark Command Centre

> **"The system doesn't just understand commands. It executes them."**

```text
┌──────────────────────────────────────────────┐
│                                              │
│        J A R V I S                          │
│        STARK COMMAND CENTRE                  │
│                                              │
│        SYSTEM ONLINE                         │
│        INTEGRATIONS READY                    │
│        AWAITING COMMAND                      │
│                                              │
└──────────────────────────────────────────────┘
```
