<div align="center">

# ♿ SOA AccessTwin

### AI-Powered Campus Accessibility Audit & Navigation Platform

*Transforming SOA University ITER Campus into an inclusive, barrier-free environment using Computer Vision, Digital Twin Technology, and Intelligent Wayfinding*

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Cloud-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Gemini](https://img.shields.io/badge/Gemini_3.7-Vision_AI-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev)

</div>

---

## 🎯 Problem Statement

> **1.3 billion people worldwide live with some form of disability** (WHO, 2024). Most university campuses in India lack proper accessibility infrastructure, and even when facilities exist, there's no systematic way to audit, monitor, or navigate them.

SOA AccessTwin solves this by combining **AI-powered barrier detection**, a **campus-wide digital twin**, and **accessible turn-by-turn navigation** — all in one platform.

---

## ✨ Key Features

### 🔍 1. AI Barrier Detection (Gemini 3.7 Vision + YOLOv8)
- Upload any campus photo → AI automatically detects accessibility barriers
- Identifies: blocked ramps, missing handrails, broken lifts, inaccessible restrooms, narrow doorways
- Returns **confidence scores**, **barrier classification**, and **CPWD-compliant fix recommendations** with cost estimates

### 🗺️ 2. Campus Digital Twin (387 Nodes, 430 Edges)
- Complete spatial graph of **Block C, Block D, Block E** and outdoor campus grounds
- Multi-floor mapping with **real elevator shafts, stairwells, sky-bridges, and corridor junctions**
- Interactive floor plan viewer with accessibility overlays

### ♿ 3. Wheelchair-Accessible Navigation with Voice Guidance
- **Dijkstra shortest-path routing** with accessibility profile support (Wheelchair / Visual / Hearing / Motor)
- Wheelchair mode **automatically avoids stairs** and routes through elevators + bridges
- **Natural voice guidance** via Web Speech API:
  > *"Start from E-509. Take Lift 1 down to Ground Floor. Cross the bridge to Block D. Walk to C-112. You have arrived."*
- 3-Tier cascading location selector: **Block → Floor → Room**

### 📊 4. Smart Recommendations Engine
- Domain-aware civil engineering recommendations following **CPWD 2021 Guidelines**
- Blocked ramp → *"Clear obstruction, paint yellow hatched zone"* (not "install new ramp")
- Missing ramp → *"Install 1:12 gradient modular aluminum ramp with handrails"*
- Each fix includes **estimated cost range in ₹ (INR)**

### 🏗️ 5. AI Blueprint Ingestion (Admin Panel)
- Upload architectural CAD drawings or floor plan photos
- **Gemini 3.7 Vision** extracts rooms, corridors, lifts, and coordinates automatically
- Extracted data syncs to both **local graph** and **Supabase cloud database**

### 📋 6. Community-Powered Issue Reporting
- Any student/staff can report accessibility barriers with photo evidence
- Admin verification workflow with accept/reject + notes
- Real-time barrier tracking dashboard with building-wise accessibility scores

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React + Vite Frontend                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │Navigation│ │AI Detect │ │  Admin   │ │  Reports   │ │
│  │  + Voice │ │  Upload  │ │Dashboard │ │  & Scores  │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬──────┘ │
│       │             │            │              │        │
│       └─────────────┴────────────┴──────────────┘        │
│                         │ REST API                       │
├─────────────────────────┼───────────────────────────────-┤
│              Node.js Express Proxy (Port 3000)           │
│                         │                                │
├─────────────────────────┼────────────────────────────────┤
│              Python FastAPI Backend (Port 8000)           │
│  ┌──────────────┐ ┌─────────────┐ ┌───────────────────┐ │
│  │ Gemini 3.7   │ │  Dijkstra   │ │  CPWD Civil Fix   │ │
│  │ Vision Model │ │  Router     │ │  Engine           │ │
│  └──────┬───────┘ └──────┬──────┘ └────────┬──────────┘ │
│         │                │                  │            │
│         └────────────────┴──────────────────┘            │
│                         │                                │
├─────────────────────────┼────────────────────────────────┤
│                    Data Layer                             │
│  ┌──────────────────┐  ┌────────────────────────┐        │
│  │ unified_graph.json│  │  Supabase (PostgreSQL) │        │
│  │ 387 nodes/430 edg│  │  campus_nodes/edges    │        │
│  └──────────────────┘  └────────────────────────┘        │
└──────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **Gemini API Key** ([Get one free](https://aistudio.google.com/apikey))

### 1. Clone the Repository
```bash
git clone https://github.com/SaitirthaBehera/SOA-AccessTwin-Integration.git
cd SOA-AccessTwin-Integration
```

### 2. Setup Backend (Python FastAPI)
```bash
cd server
pip install -r requirements.txt
```

Create a `.env` file:
```env
GEMINI_API_KEY=your_gemini_api_key_here
MOCK_MODE=false
CONFIDENCE_THRESHOLD=0.35
```

Start the backend:
```bash
uvicorn main:app --reload --port 8000
```

### 3. Setup Frontend (React + Vite)
```bash
cd client
npm install
npm run dev
```

### 4. Open in Browser
```
http://localhost:3000
```

---

## 📁 Project Structure

```
SOA-AccessTwin-Integration/
│
├── server/                       # ⚙️ Python FastAPI Backend
│   ├── main.py                   #    FastAPI app entry point
│   ├── config.py                 #    Environment configuration
│   ├── requirements.txt          #    Python dependencies
│   ├── routes/
│   │   ├── detect.py             #    /api/detect - AI barrier detection
│   │   └── navigate.py           #    /api/navigate - Accessible routing
│   ├── services/
│   │   ├── vision_model.py       #    Gemini 3.7 Vision + YOLOv8 inference
│   │   ├── accessibility_router.py   # Dijkstra multi-profile routing engine
│   │   ├── blueprint_parser.py   #    AI floor plan extraction (Gemini Vision)
│   │   └── supabase_sync.py      #    Cloud database sync service
│   ├── data/
│   │   └── unified_graph.json    #    Campus graph (387 nodes, 430 edges)
│   ├── static/maps/
│   │   ├── campus/               #    Campus satellite map
│   │   └── floors/               #    Architectural floor plans (Blocks A-F)
│   └── scripts/
│       └── push_to_supabase.py   #    One-click Supabase data sync
│
├── client/                       # 🎨 React + TypeScript Frontend
│   ├── server.ts                 #    Express proxy server + API middleware
│   ├── src/
│   │   ├── components/
│   │   │   ├── AccessibleNavigation.tsx   # Wheelchair nav + voice guidance
│   │   │   ├── AiDetection.tsx            # AI barrier detection UI
│   │   │   ├── AdminDashboard.tsx         # Admin panel + report management
│   │   │   ├── FloorMapIngestion.tsx      # AI blueprint upload (Gemini)
│   │   │   ├── LocationCascadeSelector.tsx # 3-tier Block→Floor→Room picker
│   │   │   ├── ReportIssue.tsx            # Community issue reporting
│   │   │   ├── SmartRecommendations.tsx   # CPWD civil fix recommendations
│   │   │   ├── DigitalTwinMap.tsx         # Interactive campus map
│   │   │   └── HomeDashboard.tsx          # Landing page + accessibility scores
│   │   ├── services/
│   │   │   ├── api.ts             #    Supabase CRUD operations
│   │   │   └── navigationApi.ts   #    Navigation API client
│   │   ├── utils/
│   │   │   └── campusGraph.ts     #    Graph loader for frontend
│   │   └── data/
│   │       └── unified_graph.json #    Campus graph (frontend copy)
│   └── package.json
│
└── .gitattributes                # Binary file handling for Git
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite | Responsive SPA with interactive maps |
| **Backend** | Python FastAPI, Uvicorn | REST API, AI inference, routing engine |
| **AI / ML** | Google Gemini 3.7 Vision, YOLOv8 | Barrier detection, blueprint parsing |
| **Database** | Supabase (PostgreSQL) | Cloud storage for reports, nodes, edges |
| **Routing** | Dijkstra Algorithm, NetworkX | Multi-profile accessible pathfinding |
| **Voice** | Web Speech API | Turn-by-turn voice navigation |
| **Proxy** | Express.js | Frontend-backend bridge with failover |
| **Maps** | Custom SVG + Floor Plans | Interactive campus & floor visualization |

---

## 📊 Database Schema (Supabase)

### `campus_nodes` — Campus Points of Interest
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `TEXT PK` | Unique node ID (e.g., `e_f5_r09`) |
| `label` | `TEXT` | Display name (e.g., `E-509 Block E Floor 5`) |
| `building_id` | `TEXT` | Block identifier (`block_e`, `block_c`, `block_d`) |
| `floor` | `INT` | Floor number (0 = Ground) |
| `type` | `TEXT` | `room`, `lift`, `stairs`, `bridge`, `entrance`, `washroom` |
| `accessible` | `BOOLEAN` | Wheelchair accessible flag |
| `coord_x`, `coord_y` | `FLOAT` | 2D map coordinates (0–100%) |

### `campus_edges` — Navigation Connections
| Column | Type | Description |
| :--- | :--- | :--- |
| `from_node_id` | `TEXT FK` | Source node |
| `to_node_id` | `TEXT FK` | Destination node |
| `distance` | `INT` | Distance in meters |
| `type` | `TEXT` | `corridor`, `elevator`, `stairs`, `bridge`, `pathway` |
| `accessible` | `BOOLEAN` | Wheelchair passable flag |

---

## 🧪 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/detect` | Upload image → AI barrier detection |
| `GET` | `/api/navigate` | Accessible route between two campus points |
| `POST` | `/api/recommendations/analyze` | Generate CPWD-compliant fix recommendations |
| `GET` | `/api/health` | Backend health check |
| `POST` | `/api/admin/ingest-blueprint` | AI blueprint extraction + Supabase sync |

**Example Navigation Request:**
```
GET /api/navigate?start=iter_cafeteria&end=c_f1_r13&profile=wheelchair
```

**Response:**
```json
{
  "status": "success",
  "path_nodes": ["iter_cafeteria", "e_entrance", "e_f0_lift1", "e_f1_lift1", "e_d_bridge_f1", "d_c_bridge_f1", "c_f1_r13"],
  "total_distance": 226,
  "stairs_count": 0,
  "voice_guidance": "Start from ITER Cafeteria. Enter Block E. Take Lift 1 up to Floor 1. Cross the bridge to Block D. Cross the bridge to Block C. Walk down the corridor to Room C-113. You have arrived."
}
```

---

## 👥 Team

| Name | Role |
| :--- | :--- |
| **Saitirtha Behera** | AI/ML Integration, Backend Architecture, Navigation Engine |
| **Sujit Kumar Nayak** | Frontend Development, Supabase, UI/UX |

---

## 📜 Standards & References

- **CPWD Guidelines 2021** — Harmonised Guidelines for Universal Accessibility in India
- **RPWD Act 2016** — Rights of Persons with Disabilities Act, India
- **WCAG 2.1** — Web Content Accessibility Guidelines
- **IS 11592:2023** — BIS Barrier-Free Built Environment Standards

---

## 📄 License

This project was built for the **SOA University Hackathon 2026**. Open for educational and accessibility advocacy purposes.

---

<div align="center">

**Built with ❤️ for an Inclusive Campus**

*Making SOA ITER barrier-free, one node at a time* ♿🏫

</div>
