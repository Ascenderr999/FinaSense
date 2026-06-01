# FinaSense 💡

> **AI-Powered Real-Time Personal Financial Intelligence & Capital Optimization Platform**  
> *Architected and Developed by **Yashar İskenderli (Full Stack Developer)***

[![Demo Video](https://img.shields.io/badge/Demo_Video-Watch_Now-red?style=for-the-badge)](https://drive.google.com/file/d/13RnxNWgn93NwyW1eux39AKjy3LsVbdff/view?usp=drivesdk)
[![Live Application](https://img.shields.io/badge/Live_App-Open_Now-lime?style=for-the-badge)](https://finasense.vercel.app)
[![GitHub](https://img.shields.io/badge/Source_Code-GitHub-black?style=for-the-badge&logo=github)](https://github.com/Ascenderr999/FinaSense)

---

## 🎯 Project Description

### What issue are you solving?
Managing personal finances, tracking expenses, and analyzing spending patterns is traditionally a tedious, manual process. Tracking apps often force users to spend minutes categorizing every small expense or inputting data manually, leading to abandonment. Moreover, traditional dashboards are mostly static, displaying dry numbers without active financial guidance or intelligent pattern recognition. Finally, capturing receipts and deciphering bank SMS messages in multiple languages (such as Azerbaijani local banking messages) makes automation extremely difficult.

### How does your project address it?
**FinaSense** completely revitalizes the capital management ecosystem by heavily integrating AI at the core of the financial input layer and the analysis layer:
- **AI Smart Scan (Multimodal OCR & Parsing):** Instead of manually logging expenses, users can either paste a bank SMS or upload/snap a picture of a receipt. FinaSense automatically hooks into Hugging Face Vision Models (Qwen) for deep OCR and pipes the text through Groq’s Llama 3.1 Inference API for strictly typed JSON extraction. It categorizes the payment, reads the exact amount, identifies local Azerbaijani and global merchants, and understands the transaction type (income/expense) autonomously.
- **Elite Financial Insights:** FinaSense acts as a virtual CFO. Depending on your current wallet balances and active goals, Groq runs instantaneous sub-second diagnostics on your spending trends to deliver ultra-concise, actionable advice without hallucinations or generic platitudes.
- **Strict Real-Time Guardrails:** Built-in programmatic safeguards prevent negative spending logic, automatically blocking allocations that exceed physical account balances.
- **Multi-Wallet & Goal Architecture:** Segregates capital logically across Cash, Card, and Debt wallets, tracking live amortization for explicit user goals.

### What was the hardest part of the build?
The most challenging aspect was engineering the **AI Smart Scan Multimodal Pipeline** to reliably process messy receipt structures and highly specific localized bank SMS data.
Building a multi-stage fallback system across open-source vision models hosted on Hugging Face (such as `Qwen` and `Llama` variants) combined with `Groq-SDK` required intricate prompt engineering. We needed the LLM to output highly strict JSON schemas natively without markdown wrapping, and it had to intelligently map completely random local store names into our pre-selected application categories. Orchestrating these layers securely through an Express Node.js intermediate backend while managing rate limits and parsing times was an intense engineering challenge.

---

## 🚀 How to Run Locally

Follow these instructions to run the full-stack FinaSense environment locally.

### 1. Prerequisites
- **Node.js** (v18+)
- **npm** or **yarn**
- **Supabase** Project (for DB and Auth hooks)
- **Groq API Key**
- **Hugging Face Token**

### 2. Configuration
Clone the repository, then copy the `.env.example` file to create your local `.env`:
```bash
cp .env.example .env
```
Populate the missing environment keys in `.env`:
```env
HUGGINGFACE_API_KEY="your_hf_token"
GROQ_API_KEY_1="your_groq_key"
VITE_SUPABASE_URL="your_supabase_url"
VITE_SUPABASE_ANON_KEY="your_supabase_anon_key"
```

### 3. Installation & Bootstrapping
Install all frontend and backend dependencies using concurrently running setup:
```bash
npm install
```

### 4. Running the Dev Environment
Our custom architecture elegantly bundles the Express API proxy and Vite frontend using `tsx`. Run:
```bash
npm run dev
```
The server will bind to port `3000`. Navigate to `http://localhost:3000` in your browser.

---

## 💎 FinaSense Core Components & Technologies

### 1. Smart Ledger & Multimodal Smart Scan
- Utilize OCR mapping by uploading standard paper receipts using physical cameras. 
- Integrated Hugging Face OCR extraction.
- Automatic SMS transaction data JSON-wrapping using Groq.

### 2. Live Insights & Dashboard Logic
- **Adaptive Statistics Engine:** Monitors overall saving rates automatically and swaps metrics dynamically if no income is detected to calculate daily burn averages.
- **Recharts Data Visualization:** Beautiful, interactive expense distribution pies and dynamic goal tracking meters.

### 3. The Tech Stack
- **Frontend & UI Core**: `React 18`, `Vite`, `Tailwind CSS`, `Framer Motion`, `Lucide Icons`
- **Backend Infrastructure**: `Node.js`, `Express`, `tsx/esbuild`, `Vercel` (for deployment capabilities)
- **Database & Authentication**: `Supabase` (Row-Level Security, PostgreSQL hooks, Social Auth)
- **AI / LLM Layers**: `Groq SDK` (Llama-3.1-8B-Instant), `Hugging Face Inference API` (Qwen3-VL Vision Models)

---

## 🧑💻 The Development Team

- **Yashar İskenderli**
  - *Role*: Founder & Full Stack Developer
  - *Email*: yashariskenderli@gmail.com
  - *Philosophy*: Crafting highly direct, real-time, zero-friction software architectures that solve physical-world financial friction.

- **Royal İskenderli**
  - *Role*: Co-Founder & AI Backend Engineer
  - *Email*: isgandarliroyal45@gmail.com
  - *Philosophy*: Optimizing multi-stage cloud pipelines, structured LLM reasoning, and robust data integrity layers.
