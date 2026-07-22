"""
SAM3 Processing Endpoints
Handle video uploads and real-time vehicle detection
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pathlib import Path
from typing import Dict, Any, Optional
import shutil
from datetime import datetime
import os

from app.cv.vehicle_matcher import vehicle_matcher

router = APIRouter()

# Paths
UPLOADS_PATH = Path(__file__).parent.parent.parent.parent / "assets" / "videos"
MODELS_PATH = Path(__file__).parent.parent.parent.parent / "models" / "precomputed"
UPLOADS_PATH.mkdir(parents=True, exist_ok=True)
MODELS_PATH.mkdir(parents=True, exist_ok=True)

# Configuration
MAX_VIDEO_SIZE_MB = int(os.getenv("MAX_VIDEO_SIZE_MB", 500))
ALLOWED_FORMATS = os.getenv("ALLOWED_VIDEO_FORMATS", "mp4,avi,mov,mkv").split(",")


def load_sam3_detector():
    """
    Load SAM3 only when a SAM3 endpoint needs it.

    The rest of Operation Gridlock uses precomputed detection metadata, routing,
    and vehicle tracking. Importing torch/transformers at FastAPI startup makes
    health checks and cloud cold starts unnecessarily slow.
    """
    try:
        from app.cv.sam3_detector import get_detector, SAM3_AVAILABLE
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"SAM3 not available. Install: pip install transformers torch. Import error: {exc}",
        )
    return get_detector, SAM3_AVAILABLE


@router.get("/status")
async def sam3_status() -> Dict[str, Any]:
    """
    Check SAM3 availability and status
    """
    try:
        get_detector, sam3_available = load_sam3_detector()
    except HTTPException as exc:
        return {
            "sam3_available": False,
            "initialized": False,
            "model_name": None,
            "device": None,
            "hf_token_set": bool(os.getenv("HF_TOKEN")),
            "supported_formats": ALLOWED_FORMATS,
            "max_size_mb": MAX_VIDEO_SIZE_MB,
            "error": exc.detail,
        }

    detector = get_detector()
    
    return {
        "sam3_available": sam3_available,
        "initialized": detector.initialized,
        "model_name": detector.model_name,
        "device": detector.device,
        "hf_token_set": bool(detector.hf_token),
        "supported_formats": ALLOWED_FORMATS,
        "max_size_mb": MAX_VIDEO_SIZE_MB
    }


@router.post("/initialize")
async def initialize_sam3() -> Dict[str, Any]:
    """
    Initialize SAM3 model (load into memory)
    """
    get_detector, sam3_available = load_sam3_detector()
    if not sam3_available:
        raise HTTPException(
            status_code=503,
            detail="SAM3 dependencies not installed. Run: pip install transformers torch"
        )
    
    detector = get_detector()
    
    if detector.initialized:
        return {
            "status": "already_initialized",
            "model": detector.model_name,
            "device": detector.device
        }
    
    success = detector.initialize()
    
    if not success:
        raise HTTPException(
            status_code=500,
            detail="Failed to initialize SAM3 model. Check HF_TOKEN in .env"
        )
    
    return {
        "status": "initialized",
        "model": detector.model_name,
        "device": detector.device
    }


@router.post("/process-video")
async def process_video(
    video: UploadFile = File(...),
    node_name: str = Form(...),
    max_frames: int = Form(100),
    use_hsv: bool = Form(False)
) -> Dict[str, Any]:
    """
    Upload and process a video for vehicle detection
    
    Args:
        video: Video file to process
        node_name: Name of the camera node (e.g., 'hub_mgroad')
        max_frames: Maximum frames to process (default: 100)
        use_hsv: Use HSV color detection instead of SAM3 (default: False)
    
    Returns:
        Processing results with detection statistics
    """
    # Validate file format
    file_ext = video.filename.split(".")[-1].lower()
    if file_ext not in ALLOWED_FORMATS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format. Allowed: {', '.join(ALLOWED_FORMATS)}"
        )
    
    # Check file size
    video.file.seek(0, 2)  # Seek to end
    file_size = video.file.tell()
    video.file.seek(0)  # Reset
    
    if file_size > MAX_VIDEO_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max size: {MAX_VIDEO_SIZE_MB}MB"
        )
    
    try:
        # Save uploaded video
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        video_filename = f"{node_name}_{timestamp}.{file_ext}"
        video_path = UPLOADS_PATH / video_filename
        
        with open(video_path, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)
        
        print(f"📹 Saved video: {video_path}")
        
        # Create output directory for this node
        output_dir = MODELS_PATH / node_name
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Get detector only after upload validation. This keeps normal API
        # startup and non-SAM3 endpoints fast.
        get_detector, _ = load_sam3_detector()
        detector = get_detector()
        
        # Initialize if needed and not using HSV
        if not use_hsv and not detector.initialized:
            print("🔄 Initializing SAM3 model...")
            success = detector.initialize()
            if not success:
                print("⚠️ SAM3 initialization failed, falling back to HSV")
                use_hsv = True
        
        # Process video
        print(f"🎬 Processing video with {'HSV' if use_hsv else 'SAM3'}...")
        metadata = detector.process_video(
            video_path=video_path,
            output_dir=output_dir,
            max_frames=max_frames,
            use_hsv=use_hsv
        )
        
        return {
            "status": "success",
            "node_name": node_name,
            "video_filename": video_filename,
            "method": "HSV" if use_hsv else "SAM3",
            "total_frames": metadata["total_frames"],
            "processed_frames": max_frames,
            "detected_frames": metadata["detected_frames"],
            "detection_rate": metadata["detection_rate"],
            "output_path": str(output_dir),
            "metadata": metadata
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Processing failed: {str(e)}"
        )


@router.delete("/clear-data/{node_name}")
async def clear_node_data(node_name: str) -> Dict[str, Any]:
    """
    Clear precomputed data for a specific node
    """
    node_dir = MODELS_PATH / node_name
    
    if not node_dir.exists():
        raise HTTPException(status_code=404, detail=f"Node {node_name} not found")
    
    try:
        # Remove all files in the directory
        import shutil
        shutil.rmtree(node_dir)
        node_dir.mkdir(parents=True, exist_ok=True)
        
        return {
            "status": "cleared",
            "node_name": node_name,
            "message": f"All data cleared for {node_name}"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to clear data: {str(e)}"
        )


@router.post("/set-reference-vehicle")
async def set_reference_vehicle(vehicle_id: str = Form(...)) -> Dict[str, Any]:
    """
    Set the reference vehicle for matching
    
    Args:
        vehicle_id: Vehicle ID from /api/vehicle/upload
    
    Returns:
        Status of reference vehicle setup
    """
    try:
        # Find vehicle file
        vehicle_uploads = Path(__file__).parent.parent.parent.parent / "assets" / "vehicle_uploads"
        
        # Find the most recent vehicle image (not video)
        vehicle_files = list(vehicle_uploads.glob(f"vehicle_{vehicle_id}.*"))
        
        if not vehicle_files:
            # Try to find any vehicle file with this ID
            vehicle_files = list(vehicle_uploads.glob(f"*{vehicle_id}*"))
        
        # Filter for image files only
        image_extensions = ['.jpg', '.jpeg', '.png', '.bmp']
        image_files = [f for f in vehicle_files if f.suffix.lower() in image_extensions]
        
        if not image_files:
            raise HTTPException(
                status_code=404,
                detail=f"No vehicle image found for ID: {vehicle_id}"
            )
        
        reference_image = image_files[0]
        
        # Load reference vehicle into matcher
        success = vehicle_matcher.set_reference_vehicle(str(reference_image))
        
        if not success:
            raise HTTPException(
                status_code=500,
                detail="Failed to load reference vehicle image"
            )
        
        return {
            "status": "success",
            "vehicle_id": vehicle_id,
            "reference_image": reference_image.name,
            "message": "Reference vehicle set successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error setting reference vehicle: {str(e)}"
        )


@router.post("/compare-video")
async def compare_video_with_reference(
    video: UploadFile = File(...),
    camera_name: str = Form(...),
    max_frames: int = Form(100)
) -> Dict[str, Any]:
    """
    Compare camera video with reference vehicle
    
    Args:
        video: Camera video file
        camera_name: Name of camera
        max_frames: Maximum frames to process
    
    Returns:
        Comparison result indicating if reference vehicle was found
    """
    if vehicle_matcher.reference_vehicle is None:
        print("⚠️  No reference vehicle set!")
        raise HTTPException(
            status_code=400,
            detail="No reference vehicle set. Call /set-reference-vehicle first"
        )
    
    # Validate file format
    file_ext = video.filename.split(".")[-1].lower()
    if file_ext not in ALLOWED_FORMATS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format. Allowed: {', '.join(ALLOWED_FORMATS)}"
        )
    
    try:
        # Save uploaded video temporarily
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        video_filename = f"{camera_name}_{timestamp}.{file_ext}"
        video_path = UPLOADS_PATH / video_filename
        
        with open(video_path, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)
        
        print(f"📹 Comparing video: {video_path}")
        print(f"   Processing {max_frames} frames...")
        
        # Match video against reference vehicle
        match_result = vehicle_matcher.match_video_frames(
            video_path=str(video_path),
            max_frames=max_frames
        )
        
        print("OK Comparison complete:")
        print(f"   - Matched: {match_result['matched']}")
        print(f"   - Total frames: {match_result['total_frames']}")
        print(f"   - Matched frames: {match_result['matched_frames']}")
        print(f"   - Match rate: {match_result['match_rate']}%")
        print(f"   - Best score: {match_result.get('best_score', 0.0)}")
        print(f"   - Reason: {match_result['reason']}")
        
        return {
            "status": "success",
            "camera_name": camera_name,
            "video_filename": video_filename,
            "matched": match_result["matched"],
            "total_frames": match_result["total_frames"],
            "matched_frames": match_result["matched_frames"],
            "match_rate": match_result["match_rate"],
            "best_score": match_result.get("best_score", 0.0),
            "message": match_result["reason"]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Comparison failed: {str(e)}"
        )



@router.get("/test-detection")
async def test_detection() -> Dict[str, Any]:
    """
    Test endpoint to verify SAM3 is working
    """
    get_detector, _ = load_sam3_detector()
    detector = get_detector()
    
    if not detector.initialized:
        return {
            "status": "not_initialized",
            "message": "Call /api/sam3/initialize first"
        }
    
    return {
        "status": "ready",
        "model": detector.model_name,
        "device": detector.device,
        "message": "SAM3 is ready for video processing"
    }
