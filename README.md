# DataLens — AI-Powered Data Analysis Platform

## What it does
DataLens is a comprehensive, state-of-the-art AI-powered data analytics and business intelligence platform. It enables teams and individuals to import raw datasets from CSV, Excel, JSON, and REST APIs, perform advanced data cleaning using visual tools or real Python with WASM (Pyodide), build stunning interactive dashboards via drag-and-drop mechanics, and generate deep business insights with a context-aware AI Assistant powered by Claude.

The entire application runs directly inside the browser, meaning your data never leaves your device for processing. It scales dynamically from small phone screens to large dual-monitor 4K screens and features an Emergency Mobile Dashboard mode for instantly creating, analyzing, and sharing key data visualizations during high-pressure outages or operational events.

## Screenshots
![Dashboard](./docs/screenshot-dashboard.png)

## Quick Start (3 ways)

### Option 1 — One-command setup (Mac/Linux)
```bash
git clone https://github.com/yourusername/datalens.git
cd datalens
chmod +x install.sh && ./install.sh
npm run dev
```

### Option 2 — Manual setup (Windows/Mac/Linux)
```bash
git clone https://github.com/yourusername/datalens.git
cd datalens
npm install
copy .env.example .env.local   # Windows
cp .env.example .env.local     # Mac/Linux
# (open .env.local, add your ANTHROPIC_API_KEY)
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### Option 3 — Docker (no Node.js needed)
```bash
git clone https://github.com/yourusername/datalens.git
cd datalens
echo "ANTHROPIC_API_KEY=your_key" > .env.local
docker compose up
```
Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel (free)
```bash
npm i -g vercel
vercel login
vercel --prod
# (add ANTHROPIC_API_KEY in Vercel dashboard → Settings → Env Vars)
```

## Get Your Free API Key
1. Go to https://console.anthropic.com
2. Sign up (free tier available)
3. Go to API Keys → Create Key
4. Copy and paste into .env.local

## Features
- **Data Import**: CSV, Excel, JSON, REST API, Google Sheets
- **Visual Data Cleaning**: No-code column dropping, null-filling, type conversion, and filtering
- **Python Preprocessing**: Real Python with pandas in WebAssembly worker (Pyodide)
- **Drag-and-Drop Builder**: Interactive dashboard creation with @dnd-kit
- **Cross-Filtering**: Responsive charts cross-filter others on click
- **8 Chart Types**: Bar, Stacked Bar, Horizontal Bar, Line, Multi-Line, Area, Pie, Donut, Scatter, Heatmap, KPI Card
- **AI Assistant**: Intelligent assistant powered by Claude Sonnet 3.5 for data questions
- **Canvas Background Themes**: Curated aesthetic palettes, customizable styles
- **Responsive Layout**: Adapts smoothly to Mobile, Tablet, Laptop, Desktop, and 4K displays
- **Emergency Mobile Mode**: Capture physical tabular photos (OCR), select chart, and share instantly
- **High-Res Export**: Download full high-resolution PNG images or PDFs in one-click

## Environment Variables
| Variable | Required | Description |
|---|---|---|
| ANTHROPIC_API_KEY | Yes | Claude API key |
| NEXT_PUBLIC_APP_NAME | No | App name (default: DataLens) |
| NEXT_PUBLIC_MAX_FILE_SIZE_MB | No | Max upload size (default: 50) |

## Tech Stack
Next.js 14 · TypeScript · Tailwind CSS · shadcn/ui · Recharts · Pyodide · Monaco Editor · Zustand · Anthropic Claude API · Vercel

## License
MIT — free to use, modify, and deploy
