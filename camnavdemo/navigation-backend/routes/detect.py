import os
import shutil
from fastapi import APIRouter, UploadFile, File
from pydantic import BaseModel

from services.vision_model import AccessibilityDetector

router = APIRouter()
UPLOAD_DIR = "data/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

detector = AccessibilityDetector()

class DetectionResponse(BaseModel):
    status: str
    message: str
    is_mock: bool
    results: list
    verification_status: str
    voice_message: str

@router.post("/detect", response_model=DetectionResponse)
@router.post("/api/detect", response_model=DetectionResponse)
async def analyze_image(file: UploadFile = File(...)):
    safe_filename = file.filename.replace(" ", "_")
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        ai_result = detector.detect_accessibility_features(file_path)
        
        # Safely delete file
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception:
            pass # Ignore deletion errors
            
        return DetectionResponse(
            status="success",
            message="Image analyzed successfully.",
            is_mock=detector.mock_mode,
            results=ai_result.get("objects", []),
            verification_status="AI_DETECTED",
            voice_message=ai_result.get("voice_message", "I did not detect anything specific.")
        )
    except Exception as e:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception:
            pass
            
        return DetectionResponse(
            status="error",
            message=str(e),
            is_mock=detector.mock_mode,
            results=[],
            verification_status="UNKNOWN",
            voice_message="Sorry, an error occurred during image analysis."
        )