# simple&easy — Contact Center & Logistics CX Suite

> Built by **Mazen Tharwat** (`m4zen.tharwat@gmail.com`)  
> High-performance Cisco Finesse-inspired customer service and CTI dispatch workspace for logistics operations, equipped with AES-256-GCM encrypted client vaults, live call simulation, knowledge base SOP library, case escalation tracking, and AI knowledge matching.

---

## 🚀 Quick Start & Deployment to Vercel

This repository is pre-configured for one-click deployment to **Vercel** with full Vite Single-Page Application (SPA) routing and Serverless API functions.

### Step 1: Push to GitHub

If you haven't already linked your remote repository on GitHub:

```bash
# 1. Add your GitHub remote repository URL
git remote add origin https://github.com/<your-username>/<your-repo-name>.git

# 2. Stage all files
git add .

# 3. Commit
git commit -m "Initial release: simple&easy Contact Center suite"

# 4. Push to GitHub
git push -u origin main
```

### Step 2: Deploy to Vercel

1. Log into your [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** → **Project**.
3. Import your GitHub repository (`<your-repo-name>`).
4. Vercel automatically detects the build settings:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. *(Optional but Recommended)* In **Environment Variables**, add:
   - `GEMINI_API_KEY`: Your Google Gemini API key (enables real-time generative reasoning in the AI SOP Assistant modal; if omitted, the app automatically uses built-in heuristic matching without error).
6. Click **Deploy**.

### Step 3: Authorize Vercel Domain in Firebase

To allow Google Sign-In and Firestore connections on your live Vercel URL:

1. Open your [Firebase Console](https://console.firebase.google.com/project/csr-tool-2d6c0/authentication/settings).
2. Navigate to **Authentication** → **Settings** → **Authorized domains**.
3. Click **Add domain** and enter your Vercel deployment domain (e.g. `your-app.vercel.app`).

---

## 🛠 Features & Architecture

- **Branding & Identity**: Created by Mazen Tharwat under the **simple&easy** platform branding.
- **CTI Softphone Interface**: Real-time Cisco Finesse call states (Ready, Not Ready, Talking, Wrap-Up), simulated inbound/outbound calls, and timer tracking.
- **Client Vault Security**: Client-side AES-256-GCM encryption for sensitive customer identifiers, security PINs, and audio/chat transcripts.
- **Customer & Case Tracking**: Fast lookup by account number, name, or phone with linked service cases and offline queue handovers.
- **Knowledge Base & SOPs**: Standard operating procedures for cold chain safety, driver dispatch, tip protections, and curbside fulfillment.
- **AI Knowledge Assistant**: AI-powered SOP resolution engine via `/api/ai/match-article` powered by Gemini with automatic offline/heuristic fallback.
- **Firebase Backend (`csr-tool-2d6c0`)**:
  - Firestore database
  - Firebase Authentication (Google OAuth)
  - Firebase Analytics (`G-T2K3YV2JXL`)
  - Zero-Trust Firestore Security Rules (`firestore.rules`)

---

## 💻 Local Development

```bash
# Install dependencies
npm install

# Start development server on http://localhost:3000
npm run dev

# Run TypeScript type verification
npm run lint

# Build for production
npm run build
```

---

## 📁 Repository Structure

```
├── api/
│   └── ai/
│       └── match-article.ts   # Vercel Serverless Function for AI SOP matching
├── src/
│   ├── assets/                # App assets & Mazen Tharwat profile photos
│   ├── components/            # Workspace, Softphone, Knowledge Base, & Modals
│   ├── firebase.ts            # Firebase client (csr-tool-2d6c0) & Analytics
│   ├── types.ts               # Core domain TypeScript definitions
│   ├── utils/                 # AES-256-GCM cryptography & Word doc generator
│   ├── App.tsx                # Main container & state coordination
│   ├── main.tsx               # DOM entry point
│   └── index.css              # Tailwind CSS styling
├── firestore.rules            # Hardened Firestore security rules
├── server.ts                  # Local development & Express container server
├── vercel.json                # Vercel SPA rewrites & serverless routing
├── vite.config.ts             # Vite build configuration
└── package.json               # Dependencies and scripts
```
