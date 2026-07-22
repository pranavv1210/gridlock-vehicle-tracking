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

  return (
    <div className="map-stage">
      <div ref={mapEl} className="map" />
      <div className="map-grid" />
      <div className="map-scanline" />
      <div className="radar-sweep" />
      <div className="map-corners" />
      <div className="map-hud top-left">
        <span>LIVE CITY MESH</span>
        <strong>{cameras.length || 0} NODES</strong>
      </div>
      <div className="map-hud bottom-left">
        <span>TRACK VECTOR</span>
        <strong>{trackingChain?.length ? `${trackingChain.length} HOPS` : `${predictions?.length || 0} PREDICTIONS`}</strong>
      </div>
      <div className="map-hud bottom-right">
        <span>GEO-FENCE</span>
        <strong>BENGALURU URBAN</strong>
      </div>
    </div>
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
  const [connections, setConnections] = useState([]);
  const [enhancement, setEnhancement] = useState(null);
  const [enhanceScale, setEnhanceScale] = useState(2);
  const [uploadResult, setUploadResult] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [busy, setBusy] = useState({});
  const [error, setError] = useState("");
  const [mobileSheet, setMobileSheet] = useState("mission");

  const selectedCameraInfo = useMemo(
    () => cameras.find((cam) => cam.id === selectedCamera),
    [cameras, selectedCamera]
  );

  const predictions = tracking?.predictions || tracking?.next_predictions || [];
  const chain = autoTracking?.tracking_chain || [];
  const isOperational = status?.backend === "online";
  const activeSearches = predictions.length || autoTracking?.final_status?.total_cameras_checked || 0;
  const threatState = autoTracking || predictions.length ? "ACTIVE PURSUIT" : scanResult?.found ? "TARGET ACQUIRED" : "SURVEILLANCE READY";
  const confidenceScore = scanResult?.found ? pct(scanResult.confidence) : isOperational ? "STANDBY" : "OFFLINE";
  const missionEvents = [
    scanResult?.found ? `Target seen at ${scanResult.node_display || scanResult.node}` : "Camera mesh awaiting acquisition",
    autoTracking ? `${autoTracking.total_hops} handoffs reconstructed` : predictions.length ? `${predictions.length} route options predicted` : "Prediction chain idle",
    uploadResult ? `Evidence ${uploadResult.filename} secured` : "Evidence locker ready"
  ];
  const mobileTabs = [
    { id: "mission", label: "Mission", icon: Shield },
    { id: "track", label: "Track", icon: Route },
    { id: "evidence", label: "Evidence", icon: Upload },
    { id: "cameras", label: "Cameras", icon: Camera },
    { id: "intel", label: "Intel", icon: Database }
  ];
  const missionSteps = [
    {
      label: "Evidence intake",
      value: uploadResult ? "Loaded" : "Standing by",
      active: Boolean(uploadResult),
      icon: Database
    },
    {
      label: "Feature lock",
      value: `${vehicle.color || "Unknown"} ${vehicle.model || "vehicle"}`,
      active: Boolean(vehicle.color || vehicle.model || vehicle.license_plate),
      icon: LockKeyhole
    },
    {
      label: "Camera scan",
      value: scanResult?.found ? `${pct(scanResult.confidence)} match` : "No scan yet",
      active: Boolean(scanResult?.found),
      icon: ScanLine
    },
    {
      label: "Route forecast",
      value: predictions.length ? `${predictions.length} routes` : autoTracking ? `${autoTracking.total_hops} hops` : "Awaiting track",
      active: Boolean(predictions.length || autoTracking),
      icon: Radar
    },
    {
      label: "Police alert",
      value: autoTracking || predictions.length ? "Units queued" : "Hold",
      active: Boolean(autoTracking || predictions.length),
      icon: Zap
    }
  ];

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
    <main className="gridlock-os">
      <div className="os-background" />
      <section className="os-map-canvas" aria-label="Live tactical city map">
        <CameraMap
          cameras={cameras}
          selectedCamera={selectedCamera}
          predictions={predictions}
          trackingChain={chain}
          onSelectCamera={setSelectedCamera}
        />
      </section>

      <div className="os-system-bar">
        <span>CLASSIFIED CITY RESPONSE INTERFACE</span>
        <span>GRIDLOCK OS / AUTH CHANNEL 7</span>
        <span>{new Date().toLocaleDateString()}</span>
      </div>

      <header className="os-command-header">
        <div className="os-brand">
          <div className="os-mark"><Shield size={24} /></div>
          <div>
            <span><Satellite size={14} /> Sovereign city intelligence</span>
            <h1>Operation Gridlock</h1>
          </div>
        </div>
        <div className="os-header-actions">
          <div className="os-threat">
            <span>Threat state</span>
            <strong>{threatState}</strong>
          </div>
          <StatusPill online={status?.backend === "online"} />
          <button className="os-icon-button" onClick={loadCore} title="Refresh backend state">
            {busy.refresh ? <Loader2 className="spin" size={18} /> : <RefreshCcw size={18} />}
          </button>
        </div>
      </header>

      {error ? (
        <div className="os-error">
          <AlertTriangle size={17} />
          <span>{error}</span>
        </div>
      ) : null}

      <aside className="os-panel os-left-intel">
        <div className="os-panel-title">
          <span>Mission intelligence</span>
          <strong>{vehicle.license_plate || "UNKNOWN"}</strong>
        </div>
        <div className="os-telemetry-grid">
          <div><span>Signature</span><strong>{vehicle.color} {vehicle.model}</strong></div>
          <div><span>Confidence</span><strong>{confidenceScore}</strong></div>
          <div><span>Cameras</span><strong>{cameras.length || "-"}</strong></div>
          <div><span>Tracked</span><strong>{vehicles.length}</strong></div>
        </div>
        <div className="os-mission-strip">
          {missionSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.label} className={cx("os-mission-step", step.active && "active")}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <Icon size={15} />
                <div>
                  <strong>{step.label}</strong>
                  <small>{step.value}</small>
                </div>
              </div>
            );
          })}
        </div>
        <div className="os-events">
          {missionEvents.map((event) => (
            <div key={event} className="os-event">
              <span />
              <p>{event}</p>
            </div>
          ))}
        </div>
      </aside>

      <aside className="os-panel os-detection-card">
        <div className="os-panel-title">
          <span>Detection feed</span>
          {scanResult?.found ? <CheckCircle2 className="ok" size={18} /> : <Camera size={18} />}
        </div>
        {scanResult ? (
          <>
            <div className="os-detection-data">
              <div><span>Node</span><strong>{scanResult.node_display || scanResult.node}</strong></div>
              <div><span>Confidence</span><strong>{pct(scanResult.confidence)}</strong></div>
              <div><span>Frames</span><strong>{scanResult.detected_frames ?? 0}/{scanResult.total_frames ?? 0}</strong></div>
              <div><span>Rate</span><strong>{pct(scanResult.detection_rate)}</strong></div>
            </div>
            {scanResult.overlay_path ? (
              <img className="os-detection-image" src={assetUrl(scanResult.overlay_path)} alt="Detection overlay" />
            ) : null}
          </>
        ) : (
          <div className="os-empty">No camera acquisition yet</div>
        )}
      </aside>

      <aside className="os-panel os-control-dock">
        <div className="os-panel-title">
          <span>Mission control</span>
          <strong>Real-time</strong>
        </div>
        <label className="os-field">
          <span>Start camera</span>
          <select value={selectedCamera} onChange={(event) => setSelectedCamera(event.target.value)}>
            {cameras.map((cam) => (
              <option key={cam.id} value={cam.id}>{cam.name}</option>
            ))}
          </select>
        </label>
        <div className="os-field-row">
          <label className="os-field">
            <span>Color</span>
            <input value={vehicle.color} onChange={(event) => setVehicle({ ...vehicle, color: event.target.value })} />
          </label>
          <label className="os-field">
            <span>Model</span>
            <input value={vehicle.model} onChange={(event) => setVehicle({ ...vehicle, model: event.target.value })} />
          </label>
        </div>
        <label className="os-field">
          <span>Plate</span>
          <input value={vehicle.license_plate} onChange={(event) => setVehicle({ ...vehicle, license_plate: event.target.value })} />
        </label>
        <label className="os-field">
          <span>Distinctive features</span>
          <textarea value={vehicle.distinctive_features} onChange={(event) => setVehicle({ ...vehicle, distinctive_features: event.target.value })} />
        </label>
        <div className="os-action-grid">
          <button onClick={scanCamera} disabled={busy.scan}>{busy.scan ? <Loader2 className="spin" size={17} /> : <Search size={17} />} Check</button>
          <button onClick={scanAll} disabled={busy.scanAll}>{busy.scanAll ? <Loader2 className="spin" size={17} /> : <Radio size={17} />} Scan all</button>
          <button onClick={() => startTracking(false)} disabled={busy.track}>{busy.track ? <Loader2 className="spin" size={17} /> : <Play size={17} />} Track</button>
          <button className="primary" onClick={() => startTracking(true)} disabled={busy.autoTrack}>{busy.autoTrack ? <Loader2 className="spin" size={17} /> : <GitBranch size={17} />} Auto</button>
        </div>
      </aside>

      <aside className="os-panel os-camera-card">
        <div className="os-panel-title">
          <span>Selected camera</span>
          <strong>{selectedCameraInfo?.name || selectedCamera}</strong>
        </div>
        <div className="os-connection-list">
          {connections.map((conn) => (
            <button key={`${conn.to}-${conn.road_name}`} onClick={() => setSelectedCamera(conn.to)}>
              <span>{conn.road_name}</span>
              <strong>{conn.distance_km} km</strong>
            </button>
          ))}
        </div>
      </aside>

      <section className="os-bottom-timeline">
        <div className="os-timeline-head">
          <span>Prediction chain</span>
          <strong>{autoTracking ? `${autoTracking.total_distance_km} km reconstructed` : predictions.length ? `${predictions.length} candidates` : "Awaiting route forecast"}</strong>
        </div>
        <div className="os-timeline-track">
          {autoTracking?.tracking_chain?.map((item) => (
            <div key={`${item.hop}-${item.camera_id}`} className="os-timeline-node">
              <span>{item.hop}</span>
              <strong>{item.camera_name}</strong>
            </div>
          ))}
          {!autoTracking && predictions.map((pred) => (
            <button key={pred.camera_id} className="os-route-card" onClick={() => markFound(pred.camera_id)}>
              <strong>{pred.camera_name}</strong>
              <span>{pred.eta_minutes} min / {pct(pred.probability)}</span>
            </button>
          ))}
          {!autoTracking && !predictions.length ? <div className="os-empty inline">Start tracking to draw the route graph</div> : null}
        </div>
      </section>

      <section className="os-evidence-float">
        <label>
          <Video size={16} />
          Upload
          <input type="file" accept="image/*,video/*" onChange={handleVehicleUpload} />
        </label>
        <select value={enhanceScale} onChange={(event) => setEnhanceScale(Number(event.target.value))}>
          <option value={2}>2x</option>
          <option value={4}>4x</option>
        </select>
        <label>
          <ImageUp size={16} />
          Enhance
          <input type="file" accept="image/*" onChange={handleEnhance} />
        </label>
      </section>

      <nav className="os-mobile-nav">
        {mobileTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} className={cx(mobileSheet === tab.id && "active")} onClick={() => setMobileSheet(tab.id)}>
              <Icon size={18} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <section className="os-mobile-sheet">
        <div className="sheet-handle" />
        {mobileSheet === "mission" ? (
          <>
            <div className="os-panel-title"><span>Active mission</span><strong>{threatState}</strong></div>
            <div className="os-telemetry-grid">
              <div><span>Plate</span><strong>{vehicle.license_plate}</strong></div>
              <div><span>Confidence</span><strong>{confidenceScore}</strong></div>
            </div>
            <div className="os-action-grid">
              <button onClick={scanCamera}><Search size={17} /> Check</button>
              <button className="primary" onClick={() => startTracking(true)}><GitBranch size={17} /> Auto track</button>
            </div>
          </>
        ) : null}
        {mobileSheet === "track" ? (
          <>
            <div className="os-panel-title"><span>Tracking</span><strong>{activeSearches || "Idle"}</strong></div>
            <div className="os-timeline-track mobile">
              {(autoTracking?.tracking_chain || []).map((item) => (
                <div key={`${item.hop}-${item.camera_id}`} className="os-timeline-node"><span>{item.hop}</span><strong>{item.camera_name}</strong></div>
              ))}
              {!autoTracking && predictions.map((pred) => (
                <div key={pred.camera_id} className="os-route-card"><strong>{pred.camera_name}</strong><span>{pred.eta_minutes} min</span></div>
              ))}
            </div>
          </>
        ) : null}
        {mobileSheet === "evidence" ? (
          <>
            <div className="os-panel-title"><span>Evidence</span><strong>{uploadResult ? "Loaded" : "Ready"}</strong></div>
            <div className="os-action-grid">
              <label><Video size={17} /> Upload<input type="file" accept="image/*,video/*" onChange={handleVehicleUpload} /></label>
              <label><ImageUp size={17} /> Enhance<input type="file" accept="image/*" onChange={handleEnhance} /></label>
            </div>
          </>
        ) : null}
        {mobileSheet === "cameras" ? (
          <>
            <div className="os-panel-title"><span>Cameras</span><strong>{cameras.length} nodes</strong></div>
            <div className="os-connection-list mobile">
              {cameras.slice(0, 8).map((cam) => <button key={cam.id} onClick={() => setSelectedCamera(cam.id)}><span>{cam.name}</span><strong>{cam.type}</strong></button>)}
            </div>
          </>
        ) : null}
        {mobileSheet === "intel" ? (
          <>
            <div className="os-panel-title"><span>Intel</span><strong>{vehicles.length} vehicles</strong></div>
            <div className="os-events">{missionEvents.map((event) => <div key={event} className="os-event"><span /><p>{event}</p></div>)}</div>
          </>
        ) : null}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
