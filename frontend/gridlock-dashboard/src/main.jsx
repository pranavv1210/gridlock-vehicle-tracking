import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Activity,
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock3,
  Crosshair,
  Database,
  FileUp,
  Gauge,
  GitBranch,
  ImageUp,
  LockKeyhole,
  Loader2,
  MapPin,
  Play,
  Radio,
  Radar,
  RefreshCcw,
  Route,
  Satellite,
  ScanLine,
  Search,
  Shield,
  Upload,
  Video,
  Zap
} from "lucide-react";
import "./styles.css";

const API_BASE = import.meta.env.VITE_API_BASE || "https://gridlock-vehicle-tracking.onrender.com";

const cameraAliases = {
  hub_mgroad: "hub",
  node_1_indiranagar: "node1",
  node_2_koramangala: "node2",
  node_3_silkboard: "node3"
};

const defaultVehicle = {
  color: "white",
  model: "SUV",
  license_plate: "KA01AB1234",
  distinctive_features: "dent on left door, broken taillight"
};

const workflowBase = [
  ["Evidence", "Vehicle source"],
  ["Feature lock", "AI signature"],
  ["Camera scan", "City mesh"],
  ["Tracking", "Route chain"],
  ["Prediction", "Next camera"],
  ["Dispatch", "Police response"]
];

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(data?.detail || data?.message || `Request failed: ${response.status}`);
  }
  return data;
}

function pct(value) {
  if (value == null || Number.isNaN(Number(value))) return "0%";
  return `${Math.round(Number(value) * 100)}%`;
}

function assetUrl(path) {
  if (!path) return "";
  return path.startsWith("http") ? path : `${API_BASE}${path}`;
}

function StatusPill({ online }) {
  return (
    <span className={cx("status-pill", online ? "online" : "offline")}>
      <span />
      {online ? "Backend online" : "Backend offline"}
    </span>
  );
}

function GridGlass({ className, eyebrow, title, action, children }) {
  return (
    <section className={cx("grid-glass", className)}>
      {(eyebrow || title || action) && (
        <div className="glass-head">
          <div>
            {eyebrow ? <p>{eyebrow}</p> : null}
            {title ? <h2>{title}</h2> : null}
          </div>
          {action ? <div className="glass-action">{action}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}

function GridButton({ children, icon: Icon, variant = "soft", busy, className, ...props }) {
  return (
    <button className={cx("grid-button", variant, className)} disabled={busy || props.disabled} {...props}>
      {busy ? <Loader2 className="spin" size={17} /> : Icon ? <Icon size={17} /> : null}
      <span>{children}</span>
    </button>
  );
}

function GridChip({ icon: Icon, label, value, tone = "cyan" }) {
  return (
    <div className={cx("grid-chip", tone)}>
      {Icon ? <Icon size={15} /> : null}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CameraMap({ cameras, selectedCamera, predictions, trackingChain, onSelectCamera }) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef([]);

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    mapRef.current = L.map(mapEl.current, {
      center: [12.956, 77.63],
      zoom: 12,
      zoomControl: false
    });
    L.control.zoom({ position: "bottomright" }).addTo(mapRef.current);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; OpenStreetMap &copy; CARTO",
      maxZoom: 19
    }).addTo(mapRef.current);
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    layersRef.current.forEach((layer) => layer.remove());
    layersRef.current = [];

    const byId = new Map(cameras.map((cam) => [cam.id, cam]));
    const chainIds = new Set((trackingChain || []).map((item) => item.camera_id));
    const predictionIds = new Set((predictions || []).map((item) => item.camera_id));

    cameras.forEach((cam) => {
      const className = cx(
        "camera-marker",
        cam.type,
        selectedCamera === cam.id && "selected",
        chainIds.has(cam.id) && "tracked",
        predictionIds.has(cam.id) && "predicted"
      );
      const marker = L.marker([cam.lat, cam.lng], {
        icon: L.divIcon({
          className: "camera-icon",
          html: `<button class="${className}" aria-label="${cam.name}"><span></span></button>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        })
      }).addTo(map);
      marker.on("click", () => onSelectCamera(cam.id));
      marker.bindTooltip(
        `<strong>${cam.name}</strong><br/><span>${cam.status || "online"} / ${cam.type || "node"}</span>`,
        { direction: "top", offset: [0, -14], opacity: 0.95 }
      );
      layersRef.current.push(marker);
    });

    const routePoints = (trackingChain || [])
      .map((item) => byId.get(item.camera_id))
      .filter(Boolean)
      .map((cam) => [cam.lat, cam.lng]);

    if (routePoints.length > 1) {
      const path = L.polyline(routePoints, {
        color: "#6cf6ed",
        weight: 4,
        opacity: 0.78,
        dashArray: "10 14",
        lineCap: "round"
      }).addTo(map);
      layersRef.current.push(path);
    }

    (predictions || []).forEach((prediction) => {
      const cam = byId.get(prediction.camera_id);
      const from = byId.get(prediction.from_camera || selectedCamera);
      if (!cam || !from || cam.id === from.id) return;
      const line = L.polyline(
        [
          [from.lat, from.lng],
          [cam.lat, cam.lng]
        ],
        {
          color: "#f4bd5d",
          weight: 2,
          opacity: 0.62,
          dashArray: "4 12",
          lineCap: "round"
        }
      ).addTo(map);
      layersRef.current.push(line);
    });
  }, [cameras, onSelectCamera, predictions, selectedCamera, trackingChain]);

  return (
    <div className="map-stage">
      <div ref={mapEl} className="leaflet-stage" />
      <div className="map-shader" />
      <div className="radar-sweep" />
      <div className="city-grid" />
    </div>
  );
}

function MissionPipeline({ steps }) {
  return (
    <div className="mission-rail" aria-label="Mission pipeline">
      {steps.map((step, index) => (
        <div key={step.label} className={cx("rail-step", step.state)}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <div className="rail-dot" />
          <strong>{step.label}</strong>
          <small>{step.caption}</small>
        </div>
      ))}
    </div>
  );
}

function DetectionFeed({ scanResult, selectedCamera }) {
  const frame = scanResult?.frame_url || scanResult?.frame || scanResult?.image_url;
  return (
    <GridGlass
      className="detection-module"
      eyebrow="Detection feed"
      title={selectedCamera ? selectedCamera.replaceAll("_", " ") : "Awaiting acquisition"}
      action={<Camera size={18} />}
    >
      {scanResult ? (
        <div className="detection-live">
          <div className="feed-meta">
            <span>confidence</span>
            <strong>{pct(scanResult.confidence ?? scanResult.match_confidence)}</strong>
            <span>frames</span>
            <strong>{scanResult.frames_processed ?? scanResult.frames ?? "100/100"}</strong>
          </div>
          <div className="feed-window">
            {frame ? <img src={assetUrl(frame)} alt="Detected traffic frame" /> : <Video size={34} />}
            <div className="bbox one" />
            <div className="bbox two" />
            <div className="feed-osd">CAM LOCK / {selectedCamera}</div>
          </div>
        </div>
      ) : (
        <div className="empty-surface">
          <ScanLine size={22} />
          <span>No camera acquisition yet</span>
        </div>
      )}
    </GridGlass>
  );
}

function EvidenceIntake({ handleVehicleUpload, handleEnhance, busy, enhanceScale, setEnhanceScale, enhancement, uploadResult }) {
  const variations = enhancement?.variations || enhancement?.outputs || [];
  return (
    <GridGlass className="evidence-module" eyebrow="Evidence intake" title="Vehicle source" action={<Upload size={18} />}>
      <div className="evidence-actions">
        <label className="grid-upload">
          <input type="file" accept="image/*" onChange={handleVehicleUpload} />
          <FileUp size={17} />
          Upload vehicle
        </label>
        <select value={enhanceScale} onChange={(event) => setEnhanceScale(event.target.value)}>
          <option value="2">2x</option>
          <option value="3">3x</option>
          <option value="4">4x</option>
        </select>
        <label className={cx("grid-upload", busy === "enhance" && "disabled")}>
          <input type="file" accept="image/*" disabled={busy === "enhance"} onChange={handleEnhance} />
          {busy === "enhance" ? <Loader2 className="spin" size={17} /> : <ImageUp size={17} />}
          Enhance
        </label>
      </div>
      {uploadResult || variations.length ? (
        <div className="evidence-gallery">
          {uploadResult?.file_url ? <img src={assetUrl(uploadResult.file_url)} alt="Uploaded evidence" /> : null}
          {variations.slice(0, 3).map((variation, index) => (
            <img key={`${variation}-${index}`} src={assetUrl(variation)} alt={`Enhanced vehicle ${index + 1}`} />
          ))}
        </div>
      ) : (
        <div className="drop-state">
          <Upload size={24} />
          <strong>Drop evidence into Gridlock OS</strong>
          <span>AI crops, attributes, and enhancement previews appear here.</span>
        </div>
      )}
    </GridGlass>
  );
}

function PredictionDock({ predictions, trackingChain, cameras, autoTracking }) {
  const cameraNames = new Map(cameras.map((cam) => [cam.id, cam.name || cam.id]));
  const nodes = predictions?.length
    ? predictions
    : (trackingChain || []).map((item, index) => ({
        camera_id: item.camera_id,
        probability: item.confidence ?? item.score ?? Math.max(0.18, 1 - index * 0.16),
        eta_minutes: item.eta_minutes ?? index * 4 + 2
      }));

  return (
    <section className="route-dock">
      <div className="dock-head">
        <div>
          <p>Prediction chain</p>
          <h2>{nodes.length ? "Camera handoff flow" : "Awaiting route forecast"}</h2>
        </div>
        <GitBranch size={19} />
      </div>
      {nodes.length ? (
        <div className="prediction-chain">
          {nodes.slice(0, 5).map((node, index) => (
            <div key={`${node.camera_id}-${index}`} className="prediction-node">
              <div className="prob-ring" style={{ "--score": node.probability || 0.4 }}>
                <span>{Math.round((node.probability || 0.4) * 100)}</span>
              </div>
              <strong>{cameraNames.get(node.camera_id) || node.camera_id}</strong>
              <small>{node.eta_minutes ?? index * 3 + 2} min ETA</small>
            </div>
          ))}
        </div>
      ) : (
        <div className="route-empty">Start tracking to draw the live pursuit route.</div>
      )}
      <div className="dock-foot">
        <span>Route lock</span>
        <strong>{autoTracking?.status || "standby"}</strong>
      </div>
    </section>
  );
}

function CameraDrawer({ cameras, selectedCamera }) {
  const selected = cameras.find((cam) => cam.id === selectedCamera) || cameras[0];
  const roads = selected?.connections || selected?.outgoing_roads || [];
  return (
    <GridGlass className="camera-drawer" eyebrow="Selected camera" title={selected?.name || "No camera"}>
      <div className="camera-title-row">
        <MapPin size={17} />
        <strong>{selected?.id || "camera pending"}</strong>
      </div>
      <div className="road-stack">
        {roads.length ? (
          roads.slice(0, 5).map((road, index) => (
            <div key={`${road.to || road.camera_id || index}`} className="road-link">
              <span>{road.road_name || road.name || `${selected?.name} -> node ${index + 1}`}</span>
              <strong>{road.distance_km || road.distance || "3.2"} km</strong>
            </div>
          ))
        ) : (
          <div className="road-link muted">
            <span>Outgoing roads sync after camera mesh loads</span>
            <strong>--</strong>
          </div>
        )}
      </div>
    </GridGlass>
  );
}

function MissionControl({
  vehicle,
  setVehicle,
  cameras,
  selectedCamera,
  setSelectedCamera,
  scanCamera,
  scanAll,
  startTracking,
  busy
}) {
  return (
    <GridGlass className="mission-control" eyebrow="Mission control" title="Pursuit authorization" action={<Radio size={18} />}>
      <label>
        <span>Start camera</span>
        <select value={selectedCamera} onChange={(event) => setSelectedCamera(event.target.value)}>
          {cameras.map((cam) => (
            <option key={cam.id} value={cam.id}>
              {cam.name || cam.id}
            </option>
          ))}
        </select>
      </label>
      <div className="control-grid">
        <label>
          <span>Color</span>
          <input value={vehicle.color} onChange={(event) => setVehicle({ ...vehicle, color: event.target.value })} />
        </label>
        <label>
          <span>Model</span>
          <input value={vehicle.model} onChange={(event) => setVehicle({ ...vehicle, model: event.target.value })} />
        </label>
      </div>
      <label>
        <span>Plate</span>
        <input
          className="mono-input"
          value={vehicle.license_plate}
          onChange={(event) => setVehicle({ ...vehicle, license_plate: event.target.value })}
        />
      </label>
      <label>
        <span>Distinctive features</span>
        <textarea
          value={vehicle.distinctive_features}
          onChange={(event) => setVehicle({ ...vehicle, distinctive_features: event.target.value })}
        />
      </label>
      <div className="action-grid">
        <GridButton icon={Search} busy={busy === "scan"} onClick={() => scanCamera(selectedCamera)}>
          Check camera
        </GridButton>
        <GridButton icon={Radar} busy={busy === "scanAll"} onClick={scanAll}>
          Scan mesh
        </GridButton>
        <GridButton icon={Play} busy={busy === "track"} onClick={() => startTracking(false)}>
          Track
        </GridButton>
        <GridButton icon={Route} variant="primary" busy={busy === "auto"} onClick={() => startTracking(true)}>
          Auto track
        </GridButton>
      </div>
    </GridGlass>
  );
}

function MissionDrawer({
  vehicle,
  status,
  cameras,
  scanResult,
  selectedCamera,
  workflow,
  handleVehicleUpload,
  handleEnhance,
  busy,
  enhanceScale,
  setEnhanceScale,
  enhancement,
  uploadResult
}) {
  return (
    <aside className="mission-drawer">
      <GridGlass className="telemetry-panel" eyebrow="Mission intelligence" title={vehicle.license_plate}>
        <div className="telemetry-grid">
          <div>
            <span>Signature</span>
            <strong>{vehicle.color} {vehicle.model}</strong>
          </div>
          <div>
            <span>Confidence</span>
            <strong>{scanResult ? pct(scanResult.confidence ?? scanResult.match_confidence) : "Standby"}</strong>
          </div>
          <div>
            <span>Cameras</span>
            <strong>{cameras.length || status?.camera_count || "--"}</strong>
          </div>
          <div>
            <span>Network</span>
            <strong>{status?.models_mounted || status?.model_ready || status?.models_path === "True" ? "Mounted" : "Syncing"}</strong>
          </div>
        </div>
      </GridGlass>
      <GridGlass className="pipeline-panel" eyebrow="Mission flow">
        <MissionPipeline steps={workflow} />
      </GridGlass>
      <DetectionFeed scanResult={scanResult} selectedCamera={selectedCamera} />
      <EvidenceIntake
        handleVehicleUpload={handleVehicleUpload}
        handleEnhance={handleEnhance}
        busy={busy}
        enhanceScale={enhanceScale}
        setEnhanceScale={setEnhanceScale}
        enhancement={enhancement}
        uploadResult={uploadResult}
      />
    </aside>
  );
}

function MobileSheet({
  tab,
  setTab,
  vehicle,
  status,
  cameras,
  selectedCamera,
  scanResult,
  predictions,
  trackingChain,
  controls
}) {
  return (
    <>
      <nav className="mobile-nav" aria-label="Field officer navigation">
        {["Mission", "Track", "Evidence", "Cameras", "Intel"].map((item) => (
          <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>
            {item}
          </button>
        ))}
      </nav>
      <section className="mobile-sheet">
        <div className="sheet-handle" />
        {tab === "Mission" && (
          <>
            <h2>{vehicle.license_plate}</h2>
            <p>{vehicle.color} {vehicle.model} / {vehicle.distinctive_features}</p>
            <div className="mobile-metrics">
              <GridChip icon={Camera} label="mesh" value={cameras.length || status?.camera_count || "--"} />
              <GridChip icon={Gauge} label="confidence" value={scanResult ? pct(scanResult.confidence) : "standby"} />
            </div>
          </>
        )}
        {tab === "Track" && (
          <>
            <h2>Route chain</h2>
            <div className="mobile-route">
              {(predictions.length ? predictions : trackingChain).slice(0, 5).map((item, index) => (
                <div key={`${item.camera_id}-${index}`}>
                  <span>{item.camera_id || "camera"}</span>
                  <strong>{Math.round((item.probability || item.confidence || 0.5) * 100)}%</strong>
                </div>
              ))}
              {!predictions.length && !trackingChain.length ? <p>Start tracking to generate handoff predictions.</p> : null}
            </div>
          </>
        )}
        {tab === "Evidence" && (
          <>
            <h2>Evidence</h2>
            <div className="mobile-actions">
              <label className="grid-upload">
                <input type="file" accept="image/*" onChange={controls.handleVehicleUpload} />
                <Upload size={16} />
                Upload
              </label>
              <label className="grid-upload">
                <input type="file" accept="image/*" onChange={controls.handleEnhance} />
                <ImageUp size={16} />
                Enhance
              </label>
            </div>
          </>
        )}
        {tab === "Cameras" && (
          <>
            <h2>Camera mesh</h2>
            <div className="mobile-camera-list">
              {cameras.slice(0, 8).map((cam) => (
                <button key={cam.id} className={selectedCamera === cam.id ? "active" : ""} onClick={() => controls.setSelectedCamera(cam.id)}>
                  <span>{cam.name || cam.id}</span>
                  <strong>{cam.status || "online"}</strong>
                </button>
              ))}
            </div>
          </>
        )}
        {tab === "Intel" && (
          <>
            <h2>Backend intelligence</h2>
            <p>{status ? "Live system state connected to Render backend." : "Backend handshake pending."}</p>
            <div className="mobile-actions">
              <GridButton icon={Search} onClick={() => controls.scanCamera(selectedCamera)} busy={controls.busy === "scan"}>Scan</GridButton>
              <GridButton icon={Route} onClick={() => controls.startTracking(true)} busy={controls.busy === "auto"}>Auto</GridButton>
            </div>
          </>
        )}
      </section>
    </>
  );
}

function App() {
  const [status, setStatus] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [cameraStatus, setCameraStatus] = useState(null);
  const [selectedCamera, setSelectedCamera] = useState("hub_mgroad");
  const [scanResult, setScanResult] = useState(null);
  const [vehicle, setVehicle] = useState(defaultVehicle);
  const [tracking, setTracking] = useState(null);
  const [autoTracking, setAutoTracking] = useState(null);
  const [connections, setConnections] = useState(null);
  const [enhancement, setEnhancement] = useState(null);
  const [enhanceScale, setEnhanceScale] = useState("2");
  const [uploadResult, setUploadResult] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [mobileTab, setMobileTab] = useState("Mission");

  const loadCore = async () => {
    try {
      const [statusData, networkData] = await Promise.all([api("/api/status"), api("/api/network/cameras")]);
      setStatus(statusData);
      const cameraList = Array.isArray(networkData) ? networkData : networkData.cameras || networkData.data || [];
      setCameras(cameraList);
      if (cameraList.length && !cameraList.some((camera) => camera.id === selectedCamera)) {
        setSelectedCamera(cameraList[0].id);
      }
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  const loadConnections = async (cameraId) => {
    if (!cameraId) return;
    try {
      const data = await api(`/api/network/cameras/${cameraId}/connections`);
      const connectionData = data?.data || data;
      setConnections(connectionData);
      setCameras((current) =>
        current.map((camera) =>
          camera.id === cameraId
            ? { ...camera, connections: connectionData.connections || connectionData.outgoing_roads || [] }
            : camera
        )
      );
    } catch {
      setConnections(null);
    }
  };

  useEffect(() => {
    loadCore();
    const timer = window.setInterval(loadCore, 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    loadConnections(selectedCamera);
  }, [selectedCamera]);

  const selectedAlias = cameraAliases[selectedCamera] || selectedCamera;

  const submitVehicle = () => ({
    color: vehicle.color,
    model: vehicle.model,
    license_plate: vehicle.license_plate,
    distinctive_features: vehicle.distinctive_features
  });

  const scanCamera = async (cameraId = selectedCamera) => {
    setBusy("scan");
    setError("");
    try {
      const result = await api(`/api/camera/check/${cameraAliases[cameraId] || cameraId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitVehicle())
      });
      setSelectedCamera(cameraId);
      setScanResult(result);
      setCameraStatus(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const scanAll = async () => {
    setBusy("scanAll");
    setError("");
    try {
      const result = await api("/api/camera/scan-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitVehicle())
      });
      setScanResult(result);
      const found = result?.best_match?.camera_id || result?.camera_id;
      if (found) setSelectedCamera(found);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const startTracking = async (auto = false) => {
    setBusy(auto ? "auto" : "track");
    setError("");
    try {
      const endpoint = auto ? "/api/tracking/auto-track" : "/api/tracking/start";
      const result = await api(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicle: submitVehicle(),
          start_camera: selectedAlias,
          start_camera_id: selectedCamera
        })
      });
      if (auto) setAutoTracking(result);
      setTracking(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const handleEnhance = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy("enhance");
    setError("");
    try {
      const form = new FormData();
      form.append("image", file);
      form.append("scale", enhanceScale);
      const result = await api("/api/enhance/variations", {
        method: "POST",
        body: form
      });
      setEnhancement(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
      event.target.value = "";
    }
  };

  const handleVehicleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy("upload");
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const result = await api("/api/upload/vehicle", {
        method: "POST",
        body: form
      });
      setUploadResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
      event.target.value = "";
    }
  };

  const trackingChain = useMemo(
    () => autoTracking?.tracking_chain || tracking?.tracking_chain || tracking?.chain || [],
    [autoTracking, tracking]
  );

  const predictions = useMemo(
    () => tracking?.predictions || tracking?.next_predictions || autoTracking?.predictions || [],
    [autoTracking, tracking]
  );

  const workflow = useMemo(() => {
    const activeIndex = uploadResult ? (scanResult ? (tracking ? 4 : 2) : 1) : 0;
    return workflowBase.map(([label, caption], index) => ({
      label,
      caption: index === 1 ? `${vehicle.color} ${vehicle.model}` : caption,
      state: index < activeIndex ? "complete" : index === activeIndex ? "active" : "idle"
    }));
  }, [scanResult, tracking, uploadResult, vehicle.color, vehicle.model]);

  const networkHealth = status?.backend || status?.status || (status ? "operational" : "offline");

  return (
    <main className="gridlock-product">
      <div className="ambient-field" />
      <CameraMap
        cameras={cameras}
        selectedCamera={selectedCamera}
        predictions={predictions}
        trackingChain={trackingChain}
        onSelectCamera={setSelectedCamera}
      />

      <header className="system-strip">
        <span>GRIDLOCK OS</span>
        <span>AUTH CHANNEL 7</span>
        <span>BENGALURU URBAN</span>
        <span>{new Date().toLocaleDateString()}</span>
      </header>

      <section className="command-header">
        <div className="brand-lockup">
          <div className="brand-sigil"><Shield size={26} /></div>
          <div>
            <p><Crosshair size={15} /> Sovereign City Security Intelligence</p>
            <h1>Operation Gridlock</h1>
          </div>
        </div>
        <div className="header-hud">
          <GridChip icon={AlertTriangle} label="threat" value={scanResult ? "target acquired" : "surveillance ready"} tone="red" />
          <GridChip icon={Activity} label="network" value={networkHealth} />
          <StatusPill online={Boolean(status)} />
          <button className="icon-button" onClick={loadCore} aria-label="Refresh backend state">
            <RefreshCcw size={18} />
          </button>
        </div>
      </section>

      {error ? (
        <div className="system-alert">
          <AlertTriangle size={17} />
          {error}
        </div>
      ) : null}

      <div className="map-hud top">
        <GridChip icon={Satellite} label="mesh" value={`${cameras.length || status?.camera_count || 0} nodes`} />
        <GridChip icon={Gauge} label="confidence" value={scanResult ? pct(scanResult.confidence ?? scanResult.match_confidence) : "standby"} />
        <GridChip icon={Clock3} label="timer" value="00:17:42" tone="amber" />
      </div>

      <div className="map-hud bottom-left">
        <GridChip icon={Radar} label="track vector" value={`${predictions.length} predictions`} />
      </div>
      <div className="map-hud bottom-right">
        <GridChip icon={LockKeyhole} label="geo-fence" value="Bengaluru urban" />
      </div>

      <MissionDrawer
        vehicle={vehicle}
        status={status}
        cameras={cameras}
        scanResult={scanResult}
        selectedCamera={selectedCamera}
        workflow={workflow}
        handleVehicleUpload={handleVehicleUpload}
        handleEnhance={handleEnhance}
        busy={busy}
        enhanceScale={enhanceScale}
        setEnhanceScale={setEnhanceScale}
        enhancement={enhancement}
        uploadResult={uploadResult}
      />

      <aside className="command-dock">
        <MissionControl
          vehicle={vehicle}
          setVehicle={setVehicle}
          cameras={cameras}
          selectedCamera={selectedCamera}
          setSelectedCamera={setSelectedCamera}
          scanCamera={scanCamera}
          scanAll={scanAll}
          startTracking={startTracking}
          busy={busy}
        />
        <CameraDrawer cameras={cameras} selectedCamera={selectedCamera} connections={connections} />
        <GridGlass className="quick-actions" eyebrow="Police response" title="Interception posture" action={<Zap size={18} />}>
          <div className="response-grid">
            <button>Hold pursuit</button>
            <button>Notify patrol</button>
            <button>Lock route</button>
            <button>Export intel</button>
          </div>
          <div className="response-status">
            <CheckCircle2 size={17} />
            <span>Camera mesh awaiting operator authorization.</span>
          </div>
        </GridGlass>
      </aside>

      <PredictionDock predictions={predictions} trackingChain={trackingChain} cameras={cameras} autoTracking={autoTracking} />

      <MobileSheet
        tab={mobileTab}
        setTab={setMobileTab}
        vehicle={vehicle}
        status={status}
        cameras={cameras}
        selectedCamera={selectedCamera}
        scanResult={scanResult}
        predictions={predictions}
        trackingChain={trackingChain}
        controls={{
          busy,
          setSelectedCamera,
          scanCamera,
          startTracking,
          handleVehicleUpload,
          handleEnhance
        }}
      />
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
