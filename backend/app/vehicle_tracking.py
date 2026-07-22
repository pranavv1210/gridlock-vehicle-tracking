"""
Vehicle Tracking Logic - Geospatial Prediction System
Implements the "handover" loop for camera-to-camera tracking
"""

from typing import List, Dict, Optional
from datetime import datetime, timedelta
from app.road_network import (
    ROAD_NETWORK,
    get_connected_cameras,
    get_camera_info,
    calculate_eta
)

class VehicleTracker:
    def __init__(self):
        self.tracking_history = []
        self.active_predictions = {}
        self.active_tracking_sessions = {}  # Store active tracking loops
        
    def predict_next_cameras(self, current_camera_id: str, detection_time: datetime) -> List[Dict]:
        """
        Given a detection at current_camera_id, predict which cameras to check next
        
        Returns list of predictions with:
        - camera_id: Next camera to check
        - eta_minutes: Expected arrival time
        - search_window: Time window to search (start, end)
        - distance_km: Distance to that camera
        - road_name: Road connecting them
        """
        predictions = []
        connections = get_connected_cameras(current_camera_id)
        
        for conn in connections:
            next_camera = conn["to"]
            distance = conn["distance_km"]
            road_name = conn["road_name"]
            
            # Calculate ETA
            eta_minutes = calculate_eta(distance, road_type="urban")
            
            # Create search window (ETA +/- 20% buffer)
            buffer_minutes = eta_minutes * 0.2
            search_start = detection_time + timedelta(minutes=eta_minutes - buffer_minutes)
            search_end = detection_time + timedelta(minutes=eta_minutes + buffer_minutes)
            
            prediction = {
                "camera_id": next_camera,
                "camera_name": get_camera_info(next_camera)["name"],
                "eta_minutes": eta_minutes,
                "search_window_start": search_start.isoformat(),
                "search_window_end": search_end.isoformat(),
                "distance_km": distance,
                "road_name": road_name,
                "probability": self._calculate_probability(distance, road_name)
            }
            
            predictions.append(prediction)
        
        # Sort by probability (closest cameras = higher probability)
        predictions.sort(key=lambda x: x["probability"], reverse=True)
        
        return predictions
    
    def _calculate_probability(self, distance_km: float, road_name: str) -> float:
        """
        Calculate probability of vehicle taking this route
        Shorter distances = higher probability
        """
        # Base probability inversely proportional to distance
        if distance_km < 3:
            return 0.85
        elif distance_km < 6:
            return 0.65
        elif distance_km < 10:
            return 0.45
        else:
            return 0.25
    
    def track_vehicle(self, 
                     start_camera_id: str, 
                     vehicle_fingerprint: Dict,
                     detection_time: Optional[datetime] = None) -> Dict:
        """
        Start tracking a vehicle from initial detection point
        
        Args:
            start_camera_id: Camera where vehicle was first detected
            vehicle_fingerprint: Visual features (color, model, dent, etc.)
            detection_time: When vehicle was detected (defaults to now)
        
        Returns:
            Tracking session with predictions and search instructions
        """
        if detection_time is None:
            detection_time = datetime.now()
        
        # Get predictions for next cameras
        predictions = self.predict_next_cameras(start_camera_id, detection_time)
        
        # Create tracking session
        session = {
            "tracking_id": f"track_{int(detection_time.timestamp())}",
            "status": "active",
            "initial_detection": {
                "camera_id": start_camera_id,
                "camera_name": get_camera_info(start_camera_id)["name"],
                "time": detection_time.isoformat(),
                "vehicle": vehicle_fingerprint
            },
            "predictions": predictions,
            "tracking_chain": [start_camera_id],
            "search_instructions": self._generate_search_instructions(predictions)
        }
        
        self.tracking_history.append(session)
        self.active_predictions[session["tracking_id"]] = predictions
        
        return session
    
    def _generate_search_instructions(self, predictions: List[Dict]) -> List[str]:
        """Generate human-readable search instructions"""
        instructions = []
        for pred in predictions:
            instruction = (
                f"Activate Camera {pred['camera_id']} ({pred['camera_name']}) "
                f"between {pred['search_window_start'][:16]} and {pred['search_window_end'][:16]}. "
                f"ETA: {pred['eta_minutes']} min, Distance: {pred['distance_km']} km, "
                f"Probability: {pred['probability']*100:.0f}%"
            )
            instructions.append(instruction)
        return instructions
    
    def handle_detection_result(self, 
                                tracking_id: str,
                                found_at_camera: Optional[str],
                                detection_time: Optional[datetime] = None) -> Dict:
        """
        Handle result of camera search
        
        Scenario 1 (Found): Vehicle spotted at one of predicted cameras
        Scenario 2 (Lost): Vehicle not found at any predicted camera
        """
        if detection_time is None:
            detection_time = datetime.now()
        
        # Find original tracking session
        session = next((s for s in self.tracking_history if s["tracking_id"] == tracking_id), None)
        if not session:
            return {"error": "Tracking session not found"}
        
        if found_at_camera:
            # SCENARIO 1: FOUND - Continue tracking from new location
            session["tracking_chain"].append(found_at_camera)
            session["status"] = "tracking"
            
            # Get new predictions from this camera
            new_predictions = self.predict_next_cameras(found_at_camera, detection_time)
            
            return {
                "status": "found",
                "message": f"Vehicle detected at {get_camera_info(found_at_camera)['name']}",
                "found_at": found_at_camera,
                "tracking_chain": session["tracking_chain"],
                "next_predictions": new_predictions,
                "action": "continue_tracking",
                "search_instructions": self._generate_search_instructions(new_predictions)
            }
        else:
            # SCENARIO 2: LOST - Vehicle disappeared
            session["status"] = "lost"
            
            # Analyze where vehicle might have gone
            lost_analysis = self._analyze_lost_vehicle(session)
            
            return {
                "status": "lost",
                "message": "Vehicle not detected at any predicted camera",
                "last_known_location": session["tracking_chain"][-1],
                "tracking_chain": session["tracking_chain"],
                "analysis": lost_analysis,
                "action": "expand_search"
            }
    
    def _analyze_lost_vehicle(self, session: Dict) -> Dict:
        """Analyze possible reasons vehicle was lost"""
        last_camera = session["tracking_chain"][-1]
        predictions = session["predictions"]
        
        return {
            "possible_scenarios": [
                "Vehicle stopped/parked near last detection point",
                "Vehicle took alternate route not covered by cameras",
                "Vehicle entered private property/parking",
                "Camera malfunction or occlusion at predicted location"
            ],
            "recommended_actions": [
                f"Review footage from {last_camera} for clues (turn signals, lane changes)",
                "Check secondary roads near last known location",
                "Alert ground units to patrol area",
                "Expand camera search radius"
            ],
            "last_seen": get_camera_info(last_camera)["name"],
            "checked_cameras": [p["camera_id"] for p in predictions]
        }
    
    def auto_track_vehicle(self, 
                          start_camera_id: str, 
                          vehicle_fingerprint: Dict,
                          max_hops: int = 10,
                          detection_time: Optional[datetime] = None) -> Dict:
        """
        Automatic tracking loop - continues until vehicle lost or max_hops reached
        
        Complete Implementation:
        1. Start at Point A (theft location - red marker)
        2. Find ALL possible cameras vehicle can reach from A (B, C, D...)
        3. Predict ETAs and activate AI detection on ALL cameras
        4. When found at camera D, repeat: predict from D to next cameras
        5. Continue loop until vehicle lost or max jumps reached
        
        Args:
            start_camera_id: Initial detection (e.g., "hub_mgroad")
            vehicle_fingerprint: Visual features (color, model, dent)
            max_hops: Maximum camera-to-camera jumps (default 10)
            detection_time: Initial detection time
        
        Returns:
            Complete tracking history with all predictions and detections
        """
        if detection_time is None:
            detection_time = datetime.now()
        
        tracking_id = f"auto_track_{int(detection_time.timestamp())}"
        current_camera = start_camera_id
        tracking_chain = []
        all_predictions = []
        visited_cameras = set()
        hop_count = 0
        
        print(f"ALERT Starting auto-track from {start_camera_id}")
        
        # MAIN TRACKING LOOP
        while hop_count < max_hops:
            camera_info = get_camera_info(current_camera)
            if not camera_info:
                print(f"ERROR Invalid camera: {current_camera}")
                break
            
            # Record detection at current camera
            visited_cameras.add(current_camera)
            detection_record = {
                "hop": hop_count,
                "camera_id": current_camera,
                "camera_name": camera_info["name"],
                "lat": camera_info["lat"],
                "lng": camera_info["lng"],
                "detection_time": detection_time.isoformat(),
                "status": "detected"
            }
            tracking_chain.append(detection_record)
            print(f"OK Hop {hop_count}: Vehicle detected at {camera_info['name']}")
            
            # Predict next possible cameras
            predictions = self.predict_next_cameras(current_camera, detection_time)
            unchecked_predictions = [
                prediction for prediction in predictions
                if prediction["camera_id"] not in visited_cameras
            ]
            
            if not unchecked_predictions:
                print(f"STOP Search frontier exhausted at {camera_info['name']}")
                break
            
            # Store predictions for this hop
            hop_predictions = {
                "hop": hop_count,
                "from_camera": current_camera,
                "from_camera_name": camera_info["name"],
                "predictions": unchecked_predictions,
                "cameras_to_check": [
                    {
                        "camera_id": p["camera_id"],
                        "camera_name": p["camera_name"],
                        "eta_minutes": p["eta_minutes"],
                        "probability": p["probability"]
                    } for p in unchecked_predictions
                ]
            }
            all_predictions.append(hop_predictions)
            
            print(f"SCAN Checking {len(unchecked_predictions)} cameras: {[p['camera_name'] for p in unchecked_predictions]}")
            
            # Simulate checking ALL predicted cameras
            # In real system: Activate AI on all cameras, check for visual fingerprint
            found_at = self._simulate_camera_check(unchecked_predictions, vehicle_fingerprint)
            
            if not found_at:
                # Vehicle LOST - not found at any predicted camera
                print(f"LOST Vehicle not found at any of {len(unchecked_predictions)} cameras")
                detection_record["status"] = "lost"
                break
            
            # Vehicle FOUND! Continue tracking from new camera
            print(f"FOUND Vehicle at {found_at['camera_name']}")
            current_camera = found_at["camera_id"]
            detection_time = detection_time + timedelta(minutes=found_at["eta_minutes"])
            hop_count += 1
        
        # Create complete tracking session
        total_distance = self._calculate_total_distance(tracking_chain)
        duration_minutes = 0
        if len(tracking_chain) > 1:
            start_time = datetime.fromisoformat(tracking_chain[0]["detection_time"])
            end_time = datetime.fromisoformat(tracking_chain[-1]["detection_time"])
            duration_minutes = (end_time - start_time).total_seconds() / 60
        
        session = {
            "tracking_id": tracking_id,
            "status": "completed" if hop_count >= max_hops else "lost",
            "vehicle": vehicle_fingerprint,
            "tracking_chain": tracking_chain,
            "all_predictions": all_predictions,
            "total_hops": hop_count,
            "total_distance_km": total_distance,
            "duration_minutes": round(duration_minutes, 2),
            "final_status": {
                "last_seen_camera": tracking_chain[-1]["camera_id"] if tracking_chain else None,
                "last_seen_name": tracking_chain[-1]["camera_name"] if tracking_chain else None,
                "reason": "max_hops_reached" if hop_count >= max_hops else "vehicle_lost",
                "total_cameras_checked": sum(len(h["cameras_to_check"]) for h in all_predictions)
            }
        }
        
        self.tracking_history.append(session)
        self.active_tracking_sessions[tracking_id] = session
        
        print(f"Tracking complete: {hop_count} hops, {total_distance}km, {len(tracking_chain)} detections")
        
        return session
    
    def _simulate_camera_check(self, predictions: List[Dict], vehicle_fingerprint: Dict) -> Optional[Dict]:
        """
        Simulate AI checking all predicted cameras for vehicle
        In production: Would trigger actual SAM3 detection on each camera
        
        For demo: deterministically choose the strongest unchecked candidate.
        """
        if not predictions:
            return None
        
        return predictions[0]
    
    def _calculate_total_distance(self, tracking_chain: List[Dict]) -> float:
        """Calculate total distance traveled across tracking chain"""
        total = 0.0
        for i in range(len(tracking_chain) - 1):
            cam1 = tracking_chain[i]["camera_id"]
            cam2 = tracking_chain[i + 1]["camera_id"]
            
            # Find connection distance
            connections = get_connected_cameras(cam1)
            for conn in connections:
                if conn["to"] == cam2:
                    total += conn["distance_km"]
                    break
        
        return round(total, 2)
    
    def get_tracking_status(self, tracking_id: str) -> Optional[Dict]:
        """Get current status of a tracking session"""
        # Check active sessions first
        session = self.active_tracking_sessions.get(tracking_id)
        if session:
            return session
        # Fallback to history
        return next((s for s in self.tracking_history if s["tracking_id"] == tracking_id), None)
    
    def get_tracking_visualization_data(self, tracking_id: str) -> Dict:
        """
        Get data formatted for frontend map visualization
        Includes: tracking chain, all predicted cameras, animation sequence
        """
        session = self.get_tracking_status(tracking_id)
        if not session:
            return {"error": "Session not found"}
        
        # Build comprehensive visualization data
        viz_data = {
            "tracking_id": tracking_id,
            "status": session["status"],
            "tracking_chain": session.get("tracking_chain", []),
            "all_camera_checks": [],  # Every camera checked
            "prediction_paths": [],  # Lines showing predicted routes
            "animation_sequence": [],  # Step-by-step animation data
            "statistics": {
                "total_hops": session.get("total_hops", 0),
                "total_distance_km": session.get("total_distance_km", 0),
                "duration_minutes": session.get("duration_minutes", 0),
                "cameras_checked": session.get("final_status", {}).get("total_cameras_checked", 0)
            }
        }
        
        # Extract all cameras that were checked
        for hop_pred in session.get("all_predictions", []):
            from_camera = get_camera_info(hop_pred["from_camera"])
            
            for pred in hop_pred["predictions"]:
                to_camera = get_camera_info(pred["camera_id"])
                
                # Add camera check details
                viz_data["all_camera_checks"].append({
                    "camera_id": pred["camera_id"],
                    "camera_name": pred["camera_name"],
                    "lat": to_camera["lat"],
                    "lng": to_camera["lng"],
                    "eta_minutes": pred["eta_minutes"],
                    "probability": pred["probability"],
                    "search_window": {
                        "start": pred["search_window_start"],
                        "end": pred["search_window_end"]
                    },
                    "hop": hop_pred["hop"]
                })
                
                # Add prediction path (road connection)
                viz_data["prediction_paths"].append({
                    "from": {
                        "id": hop_pred["from_camera"],
                        "lat": from_camera["lat"],
                        "lng": from_camera["lng"],
                        "name": from_camera["name"]
                    },
                    "to": {
                        "id": pred["camera_id"],
                        "lat": to_camera["lat"],
                        "lng": to_camera["lng"],
                        "name": pred["camera_name"]
                    },
                    "distance_km": pred["distance_km"],
                    "road_name": pred["road_name"],
                    "probability": pred["probability"],
                    "hop": hop_pred["hop"]
                })
        
        # Create animation sequence
        for i, chain_item in enumerate(session.get("tracking_chain", [])):
            # Detection event
            viz_data["animation_sequence"].append({
                "step": i * 2,
                "type": "detection",
                "camera_id": chain_item["camera_id"],
                "camera_name": chain_item["camera_name"],
                "lat": chain_item["lat"],
                "lng": chain_item["lng"],
                "time": chain_item["detection_time"],
                "message": f"Vehicle detected at {chain_item['camera_name']}"
            })
            
            # Prediction event (if not last)
            if i < len(session.get("all_predictions", [])):
                pred_data = session["all_predictions"][i]
                viz_data["animation_sequence"].append({
                    "step": i * 2 + 1,
                    "type": "prediction",
                    "from_camera": pred_data["from_camera"],
                    "from_camera_name": pred_data["from_camera_name"],
                    "predicted_cameras": pred_data["cameras_to_check"],
                    "message": f"Checking {len(pred_data['cameras_to_check'])} possible cameras..."
                })
        
        return viz_data

# Global tracker instance
vehicle_tracker = VehicleTracker()
