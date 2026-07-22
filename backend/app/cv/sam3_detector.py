"""
SAM 3 Vehicle Detection Service
Real-time vehicle segmentation using Meta's Segment Anything Model 3
"""
import os
import cv2
import numpy as np
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
import json
from datetime import datetime
from PIL import Image

# Try to import SAM3 dependencies
try:
    import torch
    from transformers import AutoProcessor, AutoModelForZeroShotObjectDetection
    SAM3_AVAILABLE = True
except ImportError as e:
    SAM3_AVAILABLE = False
    torch = None
    print(f"⚠️ SAM3 dependencies not available: {e}")
    print("Install with: pip install transformers torch")

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class SAM3VehicleDetector:
    """
    Vehicle detection using SAM 3 (Segment Anything Model 3)
    """
    
    def __init__(self):
        self.hf_token = os.getenv("HF_TOKEN")
        self.model_name = os.getenv("SAM3_MODEL_NAME", "facebook/sam2.1-hiera-large")
        self.device = os.getenv("DEVICE", "cpu")
        self.processor = None
        self.model = None
        self.initialized = False
        
    def initialize(self) -> bool:
        """
        Initialize SAM3 model and processor
        
        Returns:
            bool: True if initialization successful
        """
        if not SAM3_AVAILABLE:
            print("ERROR SAM3 not available - missing dependencies")
            return False
            
        if not self.hf_token:
            print("ERROR HF_TOKEN not set in .env file")
            return False
            
        try:
            print(f"🔄 Loading SAM3 model: {self.model_name}")
            
            # Load processor and model
            self.processor = AutoProcessor.from_pretrained(
                self.model_name,
                token=self.hf_token,
                trust_remote_code=True
            )
            
            self.model = AutoModelForZeroShotObjectDetection.from_pretrained(
                self.model_name,
                token=self.hf_token,
                trust_remote_code=True
            ).to(self.device)
            
            self.initialized = True
            print(f"OK SAM3 model loaded successfully on {self.device}")
            return True
            
        except Exception as e:
            print(f"ERROR Failed to load SAM3 model: {str(e)}")
            return False
    
    def detect_vehicles_in_frame(
        self, 
        frame: np.ndarray,
        confidence_threshold: float = 0.3
    ) -> List[Dict[str, Any]]:
        """
        Detect vehicles in a single frame
        
        Args:
            frame: BGR image from OpenCV
            confidence_threshold: Minimum confidence for detection
            
        Returns:
            List of detections with masks and bounding boxes
        """
        if not self.initialized:
            return []
        
        try:
            # Convert BGR to RGB
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            pil_image = Image.fromarray(frame_rgb)
            
            # Prepare inputs with vehicle-related prompts
            text_prompts = [
                "a car",
                "a vehicle", 
                "a red car",
                "an automobile"
            ]
            
            inputs = self.processor(
                images=pil_image,
                text=text_prompts,
                return_tensors="pt"
            ).to(self.device)
            
            # Run inference
            if torch is None:
                raise RuntimeError("Torch is not available. SAM3 requires torch to be installed.")
            with torch.no_grad():
                outputs = self.model(**inputs)
            
            # Process results
            results = self.processor.post_process_grounded_object_detection(
                outputs,
                inputs.input_ids,
                box_threshold=confidence_threshold,
                text_threshold=confidence_threshold,
                target_sizes=[pil_image.size[::-1]]
            )[0]
            
            detections = []
            
            # Extract boxes, labels, and scores
            if "boxes" in results:
                boxes = results["boxes"].cpu().numpy()
                scores = results["scores"].cpu().numpy()
                labels = results["labels"]
                
                for idx, (box, score, label) in enumerate(zip(boxes, scores, labels)):
                    x1, y1, x2, y2 = map(int, box)
                    
                    # Create simple mask for the bounding box region
                    mask = np.zeros(frame.shape[:2], dtype=np.uint8)
                    mask[y1:y2, x1:x2] = 255
                    
                    detections.append({
                        "bbox": [x1, y1, x2, y2],
                        "confidence": float(score),
                        "label": label,
                        "mask": mask,
                        "area": (x2 - x1) * (y2 - y1)
                    })
            
            return detections
            
        except Exception as e:
            print(f"Error in detection: {str(e)}")
            return []
    
    def detect_red_vehicles_hsv(
        self,
        frame: np.ndarray,
        min_area: int = 1000
    ) -> List[Dict[str, Any]]:
        """
        Fallback method: Detect red vehicles using HSV color detection
        
        Args:
            frame: BGR image from OpenCV
            min_area: Minimum contour area
            
        Returns:
            List of detections
        """
        try:
            # Convert to HSV
            hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
            
            # Red color ranges in HSV
            lower_red1 = np.array([0, 100, 100])
            upper_red1 = np.array([10, 255, 255])
            lower_red2 = np.array([160, 100, 100])
            upper_red2 = np.array([180, 255, 255])
            
            # Create masks
            mask1 = cv2.inRange(hsv, lower_red1, upper_red1)
            mask2 = cv2.inRange(hsv, lower_red2, upper_red2)
            mask = cv2.bitwise_or(mask1, mask2)
            
            # Morphological operations
            kernel = np.ones((5, 5), np.uint8)
            mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
            mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
            
            # Find contours
            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            detections = []
            for contour in contours:
                area = cv2.contourArea(contour)
                if area > min_area:
                    x, y, w, h = cv2.boundingRect(contour)
                    
                    # Create mask for this contour
                    contour_mask = np.zeros(frame.shape[:2], dtype=np.uint8)
                    cv2.drawContours(contour_mask, [contour], -1, 255, -1)
                    
                    detections.append({
                        "bbox": [x, y, x + w, y + h],
                        "confidence": 0.85,  # Fixed confidence for HSV
                        "label": "red_vehicle",
                        "mask": contour_mask,
                        "area": int(area)
                    })
            
            return detections
            
        except Exception as e:
            print(f"Error in HSV detection: {str(e)}")
            return []
    
    def process_video(
        self,
        video_path: Path,
        output_dir: Path,
        max_frames: int = 100,
        use_hsv: bool = False
    ) -> Dict[str, Any]:
        """
        Process video and extract vehicle detections
        
        Args:
            video_path: Path to video file
            output_dir: Directory to save results
            max_frames: Maximum frames to process
            use_hsv: Use HSV fallback instead of SAM3
            
        Returns:
            Metadata with detection results
        """
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Open video
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise ValueError(f"Cannot open video: {video_path}")
        
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        
        print(f"📹 Processing video: {total_frames} frames @ {fps} FPS")
        
        metadata = {
            "video_path": str(video_path),
            "node_name": output_dir.name,
            "processed_at": datetime.now().isoformat(),
            "total_frames": total_frames,
            "fps": fps,
            "frames": [],
            "detected_frames": 0,
            "detection_rate": 0.0
        }
        
        frame_idx = 0
        processed_count = 0
        
        while cap.isOpened() and processed_count < max_frames:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Skip frames to process at 2 FPS
            if frame_idx % (fps // 2) != 0:
                frame_idx += 1
                continue
            
            # Detect vehicles
            if use_hsv or not self.initialized:
                detections = self.detect_red_vehicles_hsv(frame)
            else:
                detections = self.detect_vehicles_in_frame(frame)
            
            if detections:
                # Get best detection
                best_detection = max(detections, key=lambda x: x["confidence"])
                
                # Save mask
                mask_filename = f"frame_{processed_count:05d}_mask.png"
                cv2.imwrite(str(output_dir / mask_filename), best_detection["mask"])
                
                # Create overlay
                overlay = frame.copy()
                x1, y1, x2, y2 = best_detection["bbox"]
                cv2.rectangle(overlay, (x1, y1), (x2, y2), (0, 255, 0), 3)
                
                # Add mask overlay with transparency
                colored_mask = np.zeros_like(frame)
                colored_mask[best_detection["mask"] > 0] = [0, 255, 0]
                overlay = cv2.addWeighted(overlay, 0.7, colored_mask, 0.3, 0)
                
                # Save overlay
                overlay_filename = f"frame_{processed_count:05d}_overlay.png"
                cv2.imwrite(str(output_dir / overlay_filename), overlay)
                
                # Add to metadata
                metadata["frames"].append({
                    "frame_idx": frame_idx,
                    "processed_idx": processed_count,
                    "confidence": best_detection["confidence"],
                    "bbox": best_detection["bbox"],
                    "mask_path": mask_filename,
                    "overlay_path": overlay_filename,
                    "area": best_detection["area"]
                })
                
                metadata["detected_frames"] += 1
            
            processed_count += 1
            
            if processed_count % 10 == 0:
                print(f"  Processed {processed_count}/{max_frames} frames...")
            
            frame_idx += 1
        
        cap.release()
        
        # Calculate detection rate
        if processed_count > 0:
            metadata["detection_rate"] = metadata["detected_frames"] / processed_count
        
        # Save metadata
        with open(output_dir / "metadata.json", "w") as f:
            json.dump(metadata, f, indent=2)
        
        print(f"OK Processed {processed_count} frames, found {metadata['detected_frames']} detections")
        print(f"   Detection rate: {metadata['detection_rate']:.1%}")
        
        return metadata


# Global detector instance
_detector = None

def get_detector() -> SAM3VehicleDetector:
    """Get or create global detector instance"""
    global _detector
    if _detector is None:
        _detector = SAM3VehicleDetector()
    return _detector
