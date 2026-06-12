# 🚨 Operation Gridlock - FOSS Edition

**Sovereign City Security Intelligence Platform**  
_100% Open Source • Zero Cloud Dependencies • AI-Powered Vehicle Tracking_

---

## 🎯 Project Overview

Operation Gridlock is a real-time urban security intelligence system that tracks and predicts suspect vehicle movements using:
- **Computer Vision**: Meta SAM 3 for vehicle detection with visual fingerprinting
- **Geospatial Tracking**: Graph-based road network with predictive routing
- **Mission Control UI**: Step-by-step interactive demo interface
- **Routing Intelligence**: OSRM for path prediction with traffic simulation
- **Image Enhancement**: PIL-based upscaling (2x/4x) + Real-ESRGAN GAN-based super-resolution
- **Interactive Map**: Leaflet.js + OpenStreetMap with real-time animations
- **No Paid APIs**: Complete FOSS stack
- **Multi-Platform Deploy**: Vercel serverless + Render cloud ready

---

## 🏗️ Tech Stack

| Component | Technology | Why? |
|-----------|------------|------|
| Frontend | React + Leaflet.js | Interactive mapping & dashboards |
| Backend | FastAPI (Python) | High-performance REST API |
| Computer Vision | Meta SAM 3 (Hugging Face) | Vehicle detection & segmentation |
| Image Enhancement | PIL LANCZOS + Real-ESRGAN | Dual-mode: PIL upscaling (fast) + GAN super-resolution (quality) |
| Vehicle Tracking | Graph-based geospatial engine | ETA prediction & probability scoring |
| Routing | OSRM (Project-OSRM) | Open-source route calculation |
| Map Tiles | OpenStreetMap + CartoDB Dark | Free dark-mode tiles |
| Data | Precomputed SAM 3 masks | 100 detection frames for hub_mgroad |
| Deployment | Vercel (Frontend) + Render (Backend) | Serverless & cloud-ready |

---

## 📁 Project Structure

```
gridlock-vehicle-tracking/
├── frontend/gridlock-dashboard/    # React application
│   ├── src/
│   │   ├── main.jsx                     # Single-page dashboard (Leaflet + Mission Control)
│   │   └── styles.css                   # Dashboard styling
│   └── package.json
├── backend/                        # FastAPI server
│   ├── app/
│   │   ├── main.py                # FastAPI entry + routes (CORS, static mounts)
│   │   ├── road_network.py        # 9-camera graph structure
│   │   ├── vehicle_tracking.py    # Geospatial prediction logic
│   │   └── routes/
│   │       ├── camera.py          # SAM 3 detection endpoints
│   │       ├── route.py           # OSRM routing with traffic
│   │       ├── enhance.py         # PIL image upscaling
│   │       ├── tracking.py        # Vehicle tracking API
│   │       ├── vehicle.py         # Vehicle upload & matching
│   │       ├── sam3.py            # SAM 3 on-demand detection
│   │       └── realesrgan_enhance.py  # Real-ESRGAN GAN upscaling
│   ├── requirements.txt
│   ├── Procfile                   # Render deployment
│   ├── render.yaml                # Render cloud config
│   └── vercel.json                # Vercel serverless config
├── models/precomputed/             # Pre-computed SAM 3 data
│   ├── hub_mgroad/                # 100 detections (masks + overlays)
│   ├── node_1_indiranagar/        # Placeholder metadata
│   ├── node_2_koramangala/        # Placeholder metadata
│   └── node_3_silkboard/          # Placeholder metadata
├── assets/
│   ├── enhanced/                  # Enhanced images output
│   ├── vehicle_uploads/           # Uploaded vehicle images
│   └── videos/                    # Traffic footage (source)
├── scripts/
│   ├── demo.ps1                  # Full automated API test
│   ├── extract_sam3_data.ps1     # Extract precomputed masks
│   ├── test_sam3_data.ps1        # Validate SAM 3 data integrity
│   └── test_tracking.ps1         # Test tracking API
├── tools/Real-ESRGAN/             # Real-ESRGAN submodule
├── docs/
│   ├── SAM3_INTEGRATION.md        # SAM 3 setup guide
│   ├── TRACKING_SYSTEM.md         # Vehicle tracking docs
│   ├── MISSION_CONTROL.md         # UI demo guide
│   ├── QUICKSTART.md              # Demo instructions
│   ├── SETUP.md                   # Full setup guide
│   └── API_TESTING.md             # API test procedures
└── tests/
    ├── test_sam3_integration.py
    ├── test_auto_tracking.py
    └── test_enhancement.py
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Git

### 1. Backend Setup

```powershell
# Navigate to project
cd gridlock-vehicle-tracking

# Create & activate virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies
cd backend
pip install -r requirements.txt

# Start FastAPI server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will start at: **http://127.0.0.1:8000**  
Interactive API docs: **http://127.0.0.1:8000/docs**

### 2. Frontend Setup

```powershell
# In a NEW terminal (keep backend running)
cd gridlock-vehicle-tracking/frontend/gridlock-dashboard

# Install dependencies
npm install

# Start React dev server
npm start
```

Frontend will open at: **http://localhost:3000**

### 3. Test the Demo

Open browser to `http://localhost:3000` and click **"PROCEED TO NEXT STEP →"** button to go through:
1. Upload → 2. Enhance → 3. Scan → 4. Acquire → 5. Route → 6. Deploy → 7. Capture

---

## 🧪 Testing APIs

### Test Tracking System
```powershell
# Start tracking from MG Road
$body = @{
    camera_id = "hub_mgroad"
    vehicle = @{
        color = "white"
        model = "SUV"
        distinctive_features = @("dent on left door")
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/track/start" `
  -Method POST -Body $body -ContentType "application/json"
```

### Get All Cameras
```powershell
curl http://127.0.0.1:8000/api/network/cameras
```

### Check Enhancement Status
```powershell
curl http://127.0.0.1:8000/api/enhance/status
```

### Get SAM 3 Detection
```powershell
curl http://127.0.0.1:8000/api/camera/check/hub_mgroad
```

### Real-ESRGAN Enhancement
```powershell
curl -X POST http://127.0.0.1:8000/api/realesrgan/enhance \
  -F "file=@test_surveillance.png" \
  -F "scale=4"
```

---

## 📊 Phase-by-Phase Progress

- [x] **Phase 1**: Project skeleton + virtual environment ✅
- [x] **Phase 2**: React app with Leaflet map + Bangalore nodes ✅
- [x] **Phase 3**: Map UI with markers, polylines, animations ✅
- [x] **Phase 4**: Backend API (camera, routing, enhancement) ✅
- [x] **Phase 5**: SAM 3 integration (100 frames processed) ✅
- [x] **Phase 6**: Image enhancement (PIL LANCZOS upscaling) ✅
- [x] **Phase 7**: OSRM routing with traffic multipliers ✅
- [x] **Phase 8**: Frontend-backend integration complete ✅
- [x] **Phase 9**: Mission Control UI (7-step demo) ✅
- [x] **Phase 10**: Geospatial vehicle tracking system ✅
- [x] **Phase 11**: Real-ESRGAN GAN super-resolution integration ✅
- [x] **Phase 12**: Vercel + Render deployment configuration ✅
- [x] **Phase 13**: Enhanced vehicle matching & upload system ✅
- [ ] **Phase 14**: Process 3 more videos for additional nodes
- [ ] **Phase 15**: Comprehensive testing & validation

---

## 🎬 Demo Flow (Mission Control UI)

### Step-by-Step Interactive Experience

**1. UPLOAD** 📤
- Upload surveillance footage or image
- Shows filename confirmation

**2. ENHANCE** 🔍
- PIL LANCZOS 2x/4x upscaling (fast) or Real-ESRGAN GAN (high quality)
- Display before/after dimensions
- Quality metrics: 1920×1080 → 3840×2160 (PIL) / 7680×4320 (Real-ESRGAN 4x)

**3. SCAN** 🎯
- SAM 3 AI detection animation
- Frame counter: 0/100 → 100/100
- Detection rate: 100% confidence

**4. ACQUIRE** 📍
- Vehicle fingerprint: White SUV with dent
- Lock target location: MG Road Junction
- Confidence: 93%
- **Geospatial tracking starts:** Predict 3 next cameras

**5. ROUTE** 🗺️
- Calculate ETA to 3 predicted locations:
  - Indiranagar: 9 min, 3.2 km (85% probability)
  - Koramangala: 16 min, 5.8 km (65% probability)
  - Silk Board: 24 min, 8.5 km (45% probability)
- OSRM routing with traffic multipliers
- Display optimal intercept route

**6. DEPLOY** 🚓
- Animate police unit deployment
- Progress bar: 0% → 100%
- Police car moves along route on map
- Real-time ETA countdown

**7. CAPTURE** ✅
- Mission complete summary
- Total time: 8:45
- Accuracy: 93%
- Units deployed: 3
- **Tracking chain:** MG Road → Indiranagar → ...

---

## 🗺️ Geospatial Tracking System

### How It Works

**The Handover Loop:**

```
1. Theft at Camera A (MG Road)
   └─→ Predict next cameras: B, C, D
       ├─ Calculate ETA (distance ÷ speed × traffic)
       ├─ Generate probability scores (closer = higher)
       └─ Create search windows (ETA ± 20%)

2. Activate cameras B, C, D during search windows
   └─→ SAM 3 checks for vehicle fingerprint

3. Vehicle FOUND at Camera B (Indiranagar)
   └─→ Repeat from Camera B
       ├─ New predictions: E, F, G
       ├─ New ETAs calculated
       └─ Tracking chain: A → B → ...

4. Continue loop until capture or lost
```

### Road Network

**9 Camera Nodes:**
- hub_mgroad (MG Road Junction) - 3 connections
- node_1_indiranagar (Indiranagar 100ft) - 4 connections
- node_2_koramangala (Koramangala 80ft) - 4 connections
- node_3_silkboard (Silk Board) - 4 connections
- cam_a_airport (Airport Road) - 1 connection
- cam_b_whitefield (Whitefield) - 1 connection
- cam_c_hsr (HSR Layout) - 2 connections
- cam_d_electronic_city (E-City Toll) - 2 connections
- cam_e_btm (BTM 2nd Stage) - 2 connections

### API Endpoints

```bash
# Start tracking
POST /api/track/start
{
  "camera_id": "hub_mgroad",
  "vehicle": {
    "color": "white",
    "model": "SUV",
    "distinctive_features": ["dent on left door"]
  }
}

# Update with detection result
POST /api/track/update
{
  "tracking_id": "track_1763724894",
  "found_at_camera": "node_1_indiranagar"
}

# Get visualization data
GET /api/track/visualize/{tracking_id}

# List all cameras
GET /api/network/cameras

# Upload vehicle image (for matching)
POST /api/vehicle/upload
```

---

## 🎨 Features

### ✅ Implemented
- **Mission Control UI**: 7-step interactive demo with stepper component
- **Geospatial Vehicle Tracking**: Graph-based prediction with ETA calculation
- **SAM 3 Detection**: 100 precomputed frames for hub_mgroad (100% detection rate)
- **Image Enhancement**: PIL LANCZOS upscaling (2x/4x) + Real-ESRGAN GAN super-resolution
- **Vehicle Upload & Matching**: Upload suspect vehicle images for cross-referencing
- **OSRM Routing**: Real-time route calculation with traffic multipliers
- **Animated Map**: Leaflet.js with pulsing markers, probability circles, polylines
- **REST API**: 20+ endpoints for camera, routing, enhancement, tracking
- **Real-time Updates**: Backend health monitoring, ETA countdowns
- **Probability Scoring**: Distance-based route likelihood (85% → 25%)
- **Search Windows**: Automated camera activation timing (ETA ± 20%)
- **Multi-Platform Deploy**: Vercel serverless (frontend) + Render cloud (backend)
- **Render Vehicle Path**: Animated green line connecting detected camera locations

### 🔄 In Progress
- Additional SAM 3 processing for 3 more nodes
- Comprehensive test suite for all API endpoints

### 📋 Future Enhancements
- Real-time traffic API integration
- Multi-vehicle simultaneous tracking
- Historical path analysis & ML predictions
- Alert system for ground units
- Export mission reports (PDF)

---

## 📚 Documentation

- **[SAM3_INTEGRATION.md](docs/SAM3_INTEGRATION.md)** - SAM 3 setup & bounding box detection
- **[TRACKING_SYSTEM.md](docs/TRACKING_SYSTEM.md)** - Vehicle tracking architecture
- **[MISSION_CONTROL.md](docs/MISSION_CONTROL.md)** - UI demo guide
- **[QUICKSTART.md](docs/QUICKSTART.md)** - Quick demo instructions
- **[SETUP.md](docs/SETUP.md)** - Full setup guide
- **[API_TESTING.md](docs/API_TESTING.md)** - API test procedures
- **[RENDER_PATH_FEATURE.md](RENDER_PATH_FEATURE.md)** - Render Vehicle Path feature docs

---

## 🐛 Troubleshooting

**Backend won't start:**
```powershell
# Check port 8000 is free
Get-NetTCPConnection -LocalPort 8000

# Kill if needed
Stop-Process -Id <PID>
```

**Frontend compilation errors:**
- Check Node version: `node --version` (need 18+)
- Clear cache: `npm cache clean --force`
- Reinstall: `rm -rf node_modules; npm install`

**Map not showing:**
- Check backend status at http://127.0.0.1:8000/api/status
- Verify CORS settings in backend/app/main.py
- Check browser console for errors

---

## 🎬 Demo Resources

### For Judges
- **JUDGES_GUIDE.md** - Complete demo walkthrough with 2-minute pitch
- **PITCH_SCRIPT.md** - Timed presentation script with Q&A prep
- **PRE_DEMO_CHECKLIST.md** - 30+ checklist items for flawless demo

### For Developers
- **scripts/demo.ps1** - Automated API testing script (runs all 7 features)
- **API Documentation** - http://127.0.0.1:8000/docs (when backend running)
- **Phase Guides** - docs/ folder with detailed technical documentation

### Quick Demo Test
```powershell
# Test all features in 1 minute
cd scripts
.\demo.ps1
```

This will test:
1. ✅ Backend connectivity
2. ✅ Camera network (9 nodes)
3. ✅ SAM 3 detection
4. ✅ Image enhancement (PIL + Real-ESRGAN)
5. ✅ OSRM routing
6. ✅ Vehicle tracking
7. ✅ Tracking handover loop

---

## 🌐 Deployment

### Vercel (Frontend)
```powershell
cd frontend/gridlock-dashboard
npx vercel --prod
```

### Render (Backend)
The project includes a `render.yaml` and `Procfile` for Render deployment.  
See [Render Deployment Guide](backend/render.yaml) for details.

---

## 📝 License

MIT License - See [LICENSE](LICENSE) file

---

## 🏆 Hackathon Notes

**Why This Project Stands Out:**

✅ **100% FOSS Stack** - No proprietary APIs, no vendor lock-in  
✅ **Novel Geospatial Tracking** - Graph-based vehicle prediction system  
✅ **Production-Ready** - REST API, error handling, real-time updates  
✅ **Interactive Demo** - Mission Control UI tells a story  
✅ **Scalable Architecture** - Easy to add more cameras/cities  
✅ **Well-Documented** - Comprehensive guides + inline comments  
✅ **Real AI Integration** - SAM 3 with 100 processed frames  
✅ **No Credit Cards** - All tools free/self-hosted  
✅ **Dual Enhancement** - PIL (fast) + Real-ESRGAN GAN (quality)  
✅ **Cloud-Ready** - Vercel + Render deployment configs  

**Technical Highlights:**
- Graph theory for road networks
- ETA calculations with traffic simulation
- Probability-based route prediction
- Animated map visualizations
- 7-step narrative demo flow
- 20+ REST API endpoints
- GAN-based image super-resolution
- Serverless deployment architecture

---

**Built for CMRIT Hackathon 2025** 🚀  
**GitHub:** [github.com/pranavv1210/gridlock-vehicle-tracking](https://github.com/pranavv1210/gridlock-vehicle-tracking)  
**Status:** ✅ Fully operational | 🌐 Deployable to Vercel + Render  
**Demo Ready:** Backend APIs fully testable via curl/Postman