# Oasis Project Offline 🌴

Oasis Project Offline is a powerful, local-first web application designed for seamless creativity and collaboration, even without an active internet connection. Built with modern technologies like React, Vite, and AI integration, it provides an "oasis" of productivity.

## ✨ Features

- **Local-First Architecture**: Work offline with robust local storage synchronization.
- **Real-time Sync**: Automatically syncs with Supabase when online.
- **AI Integration**: Powered by Google's Gemini API for intelligent content generation.
- **Drag-and-Drop Editor**: Intuitive UI for managing projects and components using `@dnd-kit`.
- **Rich Text Editing**: Advanced text editing capabilities.
- **QR Code Generation**: Easily share projects via generated QR codes.
- **Modern UI/UX**: Dynamic backgrounds and animated components for a premium experience.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

1.  **Clone the repository**:
    ```bash
    git clone [repository-url]
    cd oasis-project-offline
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**:
    Create a `.env.local` file in the root directory and add your keys:
    ```env
    VITE_GEMINI_API_KEY=your_gemini_api_key_here
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Run the development server**:
    ```bash
    npm run dev
    ```
    Open your browser at `http://localhost:5173`.

## 🛠️ Scripts

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the application for production.
- `npm run preview`: Previews the production build locally.
- `npm run deploy`: Builds and pushes changes to the main branch.

## 🧰 Tech Stack

- **Framework**: React 19
- **Build Tool**: Vite
- **AI**: Google Generative AI (Gemini)
- **Backend/Storage**: Supabase & LocalStorage
- **Icons**: Lucide React
- **Drag & Drop**: @dnd-kit

## 📄 License

This project is private and for internal use.

---
*Built with ❤️ for a better offline experience.*
