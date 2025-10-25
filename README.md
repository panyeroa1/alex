<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1Z4VT6xD2VvsApDyo4Mgnzxdg5igsFIpK

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

---

## Available Functions

This application provides a comprehensive set of functions organized into the following categories:

### AI Agent Tool Functions

These functions are available to the AI agent (Alex) for executing various tasks:

#### Memory & Storage
- **saveMemory** - Saves a summary of the current conversation to long-term memory for future recall

#### Image Generation & Editing
- **generateImage** - Generates an image based on a textual description
- **editImage** - Edits an existing uploaded image based on a textual description

#### Music & Audio
- **createMusic** - Creates a piece of music based on a textual description
- **playMusic** - Plays a music track from the user-defined media library

#### Deployment & DevOps
- **runDeployment** - Deploys a new version of the application to a specified environment (staging/production)
- **checkLogs** - Retrieves and filters logs from a specific service or application
- **rollbackDeployment** - Rolls back a deployment to a previous stable version
- **listPipelines** - Lists available CI/CD pipelines
- **getPipelineStatus** - Checks the status of the latest run for a specific CI/CD pipeline
- **triggerPipeline** - Triggers a new run for a specific CI/CD pipeline
- **rerouteTraffic** - Reroutes network traffic from one cluster or service to another

#### File Management
- **listFiles** - Lists all files that have been uploaded in the current session
- **analyzeFileContents** - Reads and analyzes the contents of a previously uploaded file
- **extractZipArchive** - Extracts the contents of a previously uploaded .zip file
- **writeFile** - Writes or edits a file with the given content

#### Web & Search
- **searchWeb** - Performs a web search for a given query and returns the top results
- **cloneWebsite** - Clones a website to the local file system using a wget command

#### Code Execution
- **runPythonScript** - Executes a Python script in a sandboxed environment (using Pyodide)
- **invokeCodingAgent** - Invokes a specialized coding agent to perform tasks on uploaded project files

#### Email Integration
- **readEmails** - Reads emails from the integrated Gmail account with optional filters
- **sendEmail** - Sends an email from the integrated Gmail account

#### Advanced Tasks
- **executeComplexTask** - Handles complex, multi-step development tasks by leveraging multiple tools

---

### Gemini Service Functions

These functions interact with Google's Gemini AI API:

#### Session Management
- **connectToLiveSession** - Establishes a real-time voice/video session with Gemini
- **disconnectLiveSession** - Closes and cleans up a live session
- **startChatSession** - Initializes a text-based chat session with Gemini
- **sendChatMessage** - Sends a message in an active chat session

#### Audio/Video Processing
- **decode** - Decodes base64-encoded audio data to Uint8Array
- **decodeAudioData** - Decodes raw audio data into an AudioBuffer
- **blobToBase64** - Converts a Blob to base64 string
- **analyzeAudio** - Analyzes audio recordings (e.g., app idea descriptions)
- **synthesizeSpeech** - Converts text to speech using Gemini's TTS

#### Content Generation & Analysis
- **generateConversationTitle** - Generates a concise title for a conversation
- **generateConversationSummary** - Creates a summary of conversation history
- **summarizeConversationsForMemory** - Consolidates multiple conversation summaries for context
- **performWebSearch** - Executes web searches using Gemini's search capabilities
- **analyzeCode** - Performs detailed code analysis including bug detection, security vulnerabilities, and performance improvements

---

### Supabase Service Functions

These functions manage data persistence and storage:

#### Authentication
- **signInAnonymouslyIfNeeded** - Ensures user is authenticated, signing in anonymously if needed

#### Conversation Management
- **getConversations** - Retrieves all conversations for the current user
- **getConversation** - Fetches a specific conversation by ID
- **createConversation** - Creates a new conversation
- **saveConversationHistory** - Updates conversation history with new messages
- **updateConversationTitle** - Updates the title of a conversation
- **updateConversationSummary** - Saves a conversation summary to the database

#### File Storage
- **uploadRecording** - Uploads audio recordings to Supabase storage and links them to conversations

---

### React Component Functions

#### Main App Functions
- **initializePyodide** - Loads the Pyodide Python runtime for in-browser Python execution
- **executePython** - Executes Python code in the Pyodide sandbox

#### UI & Interaction
- **BiometricsEnrollment** - Handles voice biometrics enrollment for security
- **ChatView** - Renders the chat interface for text-based interactions

---

## Development

To build the application:
```bash
npm run build
```

To preview the production build:
```bash
npm run preview
```
