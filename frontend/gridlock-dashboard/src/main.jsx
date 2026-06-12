import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Activity,
  AlertTriangle,
  Camera,
  CheckCircle2,
  Crosshair,
  FileUp,
  Gauge,
  GitBranch,
  ImageUp,
  Loader2,
  MapPin,
  Play,
  Radio,
  RefreshCcw,
  Route,
  Search,
  Shield,
  Upload,
  Video
} from "lucide-react";
import "./styles.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

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
  if (value == null) return "0%";
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

function Metric({ label, value, icon: Icon }) {
  return (
    <div className="metric">
      <div className="metric-icon">{Icon ? <Icon size={18} /> : null}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
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
        chainIds.has(cam.id) && "chain",
        predictionIds.has(cam.id) && "predicted"
      );
      const marker = L.marker([cam.lat, cam.lng], {
        icon: L.divIcon({
          className,
          html: `<span></span>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9]
        })
      }).addTo(map);
      marker.bindTooltip(`${cam.name}<br>${cam.type}`, { direction: "top" });
      marker.on("click", () => onSelectCamera(cam.id));
      layersRef.current.push(marker);
    });

    (predictions || []).forEach((pred) => {
      const from = byId.get(selectedCamera) || byId.get("hub_mgroad");
      const to = byId.get(pred.camera_id);
      if (!from || !to) return;
      const line = L.polyline(
        [
          [from.lat, from.lng],
          [to.lat, to.lng]
        ],
        {
          color: pred.probability >= 0.8 ? "#33d17a" : pred.probability >= 0.6 ? "#f6c343" : "#ff7b72",
          weight: 3,
          opacity: 0.8,
          dashArray: "8 8"
        }
      ).addTo(map);
      line.bindTooltip(`${pred.camera_name}: ${pred.eta_minutes} min, ${pct(pred.probability)}`);
      layersRef.current.push(line);
    });

    (trackingChain || []).slice(1).forEach((item, index) => {
      const prev = trackingChain[index];
      if (!prev) return;
      const line = L.polyline(
        [
          [prev.lat, prev.lng],
          [item.lat, item.lng]
        ],
        { color: "#58a6ff", weight: 5, opacity: 0.9 }
      ).addTo(map);
      layersRef.current.push(line);
    });

    if (cameras.length) {
      const group = L.featureGroup(layersRef.current.filter((layer) => layer.getLatLng || layer.getBounds));
      if (group.getLayers().length) map.fitBounds(group.getBounds().pad(0.18));
    }
  }, [cameras, selectedCamera, predictions, trackingChain, onSelectCamera]);

  return <div ref={mapEl} className="map" />;
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
  const [connections, setConnections] = useState([]);
  const [enhancement, setEnhancement] = useState(null);
  const [enhanceScale, setEnhanceScale] = useState(2);
  const [uploadResult, setUploadResult] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [busy, setBusy] = useState({});
  const [error, setError] = useState("");

  const selectedCameraInfo = useMemo(
    () => cameras.find((cam) => cam.id === selectedCamera),
    [cameras, selectedCamera]
  );

  const predictions = tracking?.predictions || tracking?.next_predictions || [];
  const chain = autoTracking?.tracking_chain || [];

  async function runTask(key, fn) {
    setBusy((prev) => ({ ...prev, [key]: true }));
    setError("");
    try {
      return await fn();
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setBusy((prev) => ({ ...prev, [key]: false }));
    }
  }

  async function loadCore() {
    await runTask("refresh", async () => {
      const [statusData, cameraData, cameraStatusData, vehicleList] = await Promise.all([
        api("/api/status"),
        api("/api/network/cameras"),
        api("/api/camera/status"),
        api("/api/vehicle/list")
      ]);
      setStatus(statusData);
      setCameras(cameraData.data || []);
      setCameraStatus(cameraStatusData);
      setVehicles(vehicleList.vehicles || []);
    });
  }

  async function loadConnections(cameraId) {
    const data = await runTask("connections", () => api(`/api/network/connections/${cameraId}`));
    setConnections(data?.data?.connections || []);
  }

  useEffect(() => {
    loadCore();
  }, []);

  useEffect(() => {
    if (selectedCamera) loadConnections(selectedCamera);
  }, [selectedCamera]);

  async function scanCamera() {
    const key = cameraAliases[selectedCamera] || selectedCamera;
    const data = await runTask("scan", () => api(`/api/camera/check/${key}`));
    if (data) setScanResult(data);
  }

  async function scanAll() {
    const data = await runTask("scanAll", () => api("/api/camera/scan-all", { method: "POST" }));
    if (data) setScanResult(data.best_detection || data);
  }

  async function startTracking(auto = false) {
    const payload = {
      camera_id: selectedCamera,
      vehicle: {
        color: vehicle.color,
        model: vehicle.model,
        license_plate: vehicle.license_plate,
        distinctive_features: vehicle.distinctive_features
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      }
    };
    const data = await runTask(auto ? "autoTrack" : "track", () =>
      api(auto ? "/api/track/auto" : "/api/track/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
    );
    if (!data?.data) return;
    if (auto) {
      setAutoTracking(data.data);
      setTracking(null);
    } else {
      setTracking(data.data);
      setAutoTracking(null);
    }
  }

  async function markFound(cameraId) {
    if (!tracking?.tracking_id) return;
    const data = await runTask("updateTrack", () =>
      api("/api/track/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tracking_id: tracking.tracking_id, found_at_camera: cameraId })
      })
    );
    if (data?.data) {
      setTracking({
        ...data.data,
        tracking_id: tracking.tracking_id,
        predictions: data.data.next_predictions || []
      });
      setSelectedCamera(cameraId);
    }
  }

  async function handleEnhance(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const body = new FormData();
    body.append("file", file);
    const data = await runTask("enhance", () =>
      api(`/api/enhance/variations?scale=${enhanceScale}`, {
        method: "POST",
        body
      })
    );
    if (data) setEnhancement(data);
    event.target.value = "";
  }

  async function handleVehicleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const body = new FormData();
    body.append("file", file);
    body.append("license_plate", vehicle.license_plate);
    body.append("color", vehicle.color);
    body.append("model", vehicle.model);
    body.append("description", vehicle.distinctive_features);
    const data = await runTask("vehicleUpload", () =>
      api("/api/vehicle/upload", { method: "POST", body })
    );
    if (data) {
      setUploadResult(data.data);
      loadCore();
    }
    event.target.value = "";
  }

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <div className="eyebrow"><Shield size={16} /> Sovereign city security intelligence</div>
          <h1>Operation Gridlock</h1>
        </div>
        <div className="topbar-actions">
          <StatusPill online={status?.backend === "online"} />
          <button className="icon-button" onClick={loadCore} title="Refresh backend state">
            {busy.refresh ? <Loader2 className="spin" size={18} /> : <RefreshCcw size={18} />}
          </button>
        </div>
      </section>

      {error ? (
        <div className="error-banner">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      ) : null}

      <section className="metrics-row">
        <Metric label="Camera nodes" value={cameras.length || "-"} icon={Camera} />
        <Metric label="Models mounted" value={status?.models_path || "-"} icon={Activity} />
        <Metric label="Assets mounted" value={status?.assets_path || "-"} icon={FileUp} />
        <Metric label="Tracked vehicles" value={vehicles.length} icon={Crosshair} />
      </section>

      <section className="workspace">
        <div className="map-panel">
          <div className="panel-heading">
            <div>
              <h2>Camera Network</h2>
              <p>{selectedCameraInfo?.name || "Select a camera"}</p>
            </div>
            <span className="camera-type">{selectedCameraInfo?.type || "camera"}</span>
          </div>
          <CameraMap
            cameras={cameras}
            selectedCamera={selectedCamera}
            predictions={predictions}
            trackingChain={chain}
            onSelectCamera={setSelectedCamera}
          />
        </div>

        <aside className="control-panel">
          <div className="panel-heading">
            <div>
              <h2>Mission Control</h2>
              <p>Run the backend demo flow from one screen</p>
            </div>
          </div>

          <label className="field">
            <span>Start camera</span>
            <select value={selectedCamera} onChange={(event) => setSelectedCamera(event.target.value)}>
              {cameras.map((cam) => (
                <option key={cam.id} value={cam.id}>{cam.name}</option>
              ))}
            </select>
          </label>

          <div className="field-grid">
            <label className="field">
              <span>Color</span>
              <input value={vehicle.color} onChange={(event) => setVehicle({ ...vehicle, color: event.target.value })} />
            </label>
            <label className="field">
              <span>Model</span>
              <input value={vehicle.model} onChange={(event) => setVehicle({ ...vehicle, model: event.target.value })} />
            </label>
          </div>

          <label className="field">
            <span>Plate</span>
            <input value={vehicle.license_plate} onChange={(event) => setVehicle({ ...vehicle, license_plate: event.target.value })} />
          </label>

          <label className="field">
            <span>Distinctive features</span>
            <textarea value={vehicle.distinctive_features} onChange={(event) => setVehicle({ ...vehicle, distinctive_features: event.target.value })} />
          </label>

          <div className="button-grid">
            <button onClick={scanCamera} disabled={busy.scan}>
              {busy.scan ? <Loader2 className="spin" size={18} /> : <Search size={18} />}
              Check camera
            </button>
            <button onClick={scanAll} disabled={busy.scanAll}>
              {busy.scanAll ? <Loader2 className="spin" size={18} /> : <Radio size={18} />}
              Scan all
            </button>
            <button onClick={() => startTracking(false)} disabled={busy.track}>
              {busy.track ? <Loader2 className="spin" size={18} /> : <Play size={18} />}
              Start track
            </button>
            <button onClick={() => startTracking(true)} disabled={busy.autoTrack}>
              {busy.autoTrack ? <Loader2 className="spin" size={18} /> : <GitBranch size={18} />}
              Auto track
            </button>
          </div>
        </aside>
      </section>

      <section className="lower-grid">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Detection Feed</h2>
              <p>Precomputed SAM detection output from the backend</p>
            </div>
            {scanResult?.found ? <CheckCircle2 className="ok" size={20} /> : <Camera size={20} />}
          </div>
          {scanResult ? (
            <div className="detection-layout">
              <div>
                <div className="result-line">
                  <span>Node</span>
                  <strong>{scanResult.node_display || scanResult.node || "Multiple cameras"}</strong>
                </div>
                <div className="result-line">
                  <span>Confidence</span>
                  <strong>{pct(scanResult.confidence)}</strong>
                </div>
                <div className="result-line">
                  <span>Frames</span>
                  <strong>{scanResult.detected_frames ?? 0}/{scanResult.total_frames ?? 0}</strong>
                </div>
                <div className="result-line">
                  <span>Detection rate</span>
                  <strong>{pct(scanResult.detection_rate)}</strong>
                </div>
              </div>
              {scanResult.overlay_path ? (
                <img className="preview-image" src={assetUrl(scanResult.overlay_path)} alt="Detection overlay" />
              ) : (
                <div className="empty-preview">No overlay available</div>
              )}
            </div>
          ) : (
            <div className="empty-state">Run a camera check to display detection metadata and overlay frames.</div>
          )}
        </div>

        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Tracking Predictions</h2>
              <p>ETA windows and next camera probabilities</p>
            </div>
            <Route size={20} />
          </div>
          {tracking?.tracking_id ? (
            <div>
              <div className="tracking-id">{tracking.tracking_id}</div>
              <div className="prediction-list">
                {predictions.map((pred) => (
                  <button key={pred.camera_id} className="prediction" onClick={() => markFound(pred.camera_id)}>
                    <div>
                      <strong>{pred.camera_name}</strong>
                      <span>{pred.road_name}</span>
                    </div>
                    <div className="prediction-meta">
                      <span>{pred.eta_minutes} min</span>
                      <b>{pct(pred.probability)}</b>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : autoTracking ? (
            <div>
              <div className="auto-summary">
                <Metric label="Hops" value={autoTracking.total_hops} icon={GitBranch} />
                <Metric label="Distance" value={`${autoTracking.total_distance_km} km`} icon={Route} />
                <Metric label="Checked" value={autoTracking.final_status?.total_cameras_checked || 0} icon={Camera} />
              </div>
              <div className="chain">
                {autoTracking.tracking_chain?.map((item) => (
                  <div key={`${item.hop}-${item.camera_id}`} className="chain-item">
                    <MapPin size={16} />
                    <span>{item.camera_name}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state">Start tracking to generate camera handoff predictions.</div>
          )}
        </div>

        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Evidence Intake</h2>
              <p>Upload vehicle evidence and generate enhanced viewpoints</p>
            </div>
            <Upload size={20} />
          </div>
          <div className="upload-row">
            <label className="upload-button">
              <Video size={18} />
              Upload vehicle
              <input type="file" accept="image/*,video/*" onChange={handleVehicleUpload} />
            </label>
            <label className="scale-select">
              <Gauge size={18} />
              <select value={enhanceScale} onChange={(event) => setEnhanceScale(Number(event.target.value))}>
                <option value={2}>2x</option>
                <option value={4}>4x</option>
              </select>
            </label>
            <label className="upload-button">
              <ImageUp size={18} />
              Enhance image
              <input type="file" accept="image/*" onChange={handleEnhance} />
            </label>
          </div>
          {uploadResult ? (
            <div className="result-line compact">
              <span>Latest upload</span>
              <strong>{uploadResult.filename} ({uploadResult.file_size_mb} MB)</strong>
            </div>
          ) : null}
          {enhancement ? (
            <div>
              <div className="result-line compact">
                <span>Enhancement</span>
                <strong>{enhancement.original_size} to {enhancement.enhanced_size}</strong>
              </div>
              <div className="variation-strip">
                {enhancement.variations?.slice(0, 5).map((variation) => (
                  <figure key={variation.path}>
                    <img src={assetUrl(variation.path)} alt={variation.name} />
                    <figcaption>{variation.angle}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state">Choose an image to call `/api/enhance/variations` and view outputs.</div>
          )}
        </div>

        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Camera Detail</h2>
              <p>Available footage nodes and outgoing roads</p>
            </div>
            <MapPin size={20} />
          </div>
          <div className="result-line">
            <span>Selected</span>
            <strong>{selectedCameraInfo?.name || selectedCamera}</strong>
          </div>
          <div className="connection-list">
            {connections.map((conn) => (
              <div key={`${conn.to}-${conn.road_name}`} className="connection">
                <span>{conn.road_name}</span>
                <strong>{conn.distance_km} km</strong>
              </div>
            ))}
          </div>
          <div className="camera-status-grid">
            {cameraStatus?.nodes
              ? Object.entries(cameraStatus.nodes).map(([id, node]) => (
                  <div key={id} className="node-status">
                    <span>{id.replaceAll("_", " ")}</span>
                    <strong>{node.available ? `${node.detected_frames}/${node.total_frames}` : "No data"}</strong>
                  </div>
                ))
              : null}
          </div>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
