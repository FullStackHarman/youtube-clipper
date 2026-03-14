# ⚡ ClipForge — YouTube Video Segment Downloader

A lightweight browser-based video clip editor for YouTube. Select specific portions of any YouTube video using an interactive timeline, add multiple segments, reorder them, and download a single merged video.

---

## ✨ Features

- 🎬 **YouTube Video Loader** — Paste any YouTube URL
- 📏 **Interactive Timeline** — noUiSlider dual-handle timeline
- ✂️ **Multiple Segments** — Add, edit, delete, drag-to-reorder
- 👁️ **Segment Preview** — Click segment to preview
- ⬇️ **One-Click Download** — Cuts + merges into single MP4
- 📊 **Real-Time Progress** — SSE-based live progress
- ⌨️ **Keyboard Shortcuts** — Space: play/pause, A: add segment
- 🔒 **Security** — Rate limiting, 1-hour cap, auto temp cleanup
- 🐳 **Docker Ready**

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **FFmpeg** (`brew install ffmpeg`)
- **yt-dlp** (`brew install yt-dlp`)

### Run

```bash
npm install
npm start    # starts frontend (5173) + backend (3001)
```

Open **http://localhost:5173**

### Docker

```bash
docker compose up --build
# → http://localhost:3001
```

---

## 📁 Structure

```
├── server/                  # Express backend
│   ├── index.js             # API routes + SSE + cleanup
│   ├── services/ytdlp.js    # yt-dlp wrapper
│   ├── services/ffmpeg.js   # FFmpeg wrapper
│   └── middleware/rateLimiter.js
├── src/                     # React frontend
│   ├── App.jsx / App.css
│   ├── components/          # Header, VideoInput, VideoPlayer,
│   │                        # TimelineSlider, SegmentList,
│   │                        # SegmentItem, ProgressBar
│   └── utils/formatTime.js
├── Dockerfile + docker-compose.yml
└── README.md
```

## 🔑 API

| Method | Endpoint              | Description              |
|--------|-----------------------|--------------------------|
| POST   | `/api/metadata`       | Fetch video info         |
| POST   | `/api/process`        | Start segment processing |
| GET    | `/api/progress/:jobId`| SSE progress stream      |
| GET    | `/api/file/:jobId`    | Download processed video |

## 📝 License

MIT
# youtube-clipper
