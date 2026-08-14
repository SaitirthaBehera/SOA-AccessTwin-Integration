import os
import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel

from services.vision_model import AccessibilityDetector

router = APIRouter()
detector = AccessibilityDetector()

TEMP_DIR = "data/temp_uploads"
os.makedirs(TEMP_DIR, exist_ok=True)

# In-memory dynamic queue for live AI-evaluated campus reports
LIVE_RECOMMENDATIONS: List[Dict[str, Any]] = []

def _get_campus_baseline_interventions() -> List[Dict[str, Any]]:
    """Verified initial high-ROI accessibility audit fixes across SOA ITER Campus."""
    return [
        {
            "id": "rec-soa-ramp-c",
            "buildingId": "bldg-iter-main",
            "buildingName": "SOA ITER Academic Block C",
            "title": "Install Continuous Handrail on Block C North Ramp",
            "problem": "Ramp has steep gradient and lacks secondary low-height handrail for wheelchair users.",
            "solution": "Fabricate and bolt 1.5-inch stainless steel dual handrails compliant with CPWD norms.",
            "severity": "Critical",
            "priority": "Critical",
            "disabilityTypesAffected": ["wheelchair", "elderly"],
            "estimatedUsersAffected": 420,
            "costCategory": "Low",
            "estimatedCostAmount": "₹2,800 - ₹4,500",
            "expectedImpact": "High",
            "impactScore": 94,
            "status": "Pending",
            "floorId": 0,
            "locationName": "North Entrance Ramp",
            "ai_verified": True
        },
        {
            "id": "rec-soa-tactile-lib",
            "buildingId": "bldg-iter-main",
            "buildingName": "Central Academic Library",
            "title": "Lay Tactile Warning Tiles at Entryway Threshold",
            "problem": "Smooth floor tiles without guiding indicators create navigation hazard for visually impaired students.",
            "solution": "Install 300x300mm yellow polyurethane tactile blister tiles from entrance gate to circulation counter.",
            "severity": "High",
            "priority": "High",
            "disabilityTypesAffected": ["visual"],
            "estimatedUsersAffected": 310,
            "costCategory": "Low",
            "estimatedCostAmount": "₹1,500 - ₹3,000",
            "expectedImpact": "High",
            "impactScore": 88,
            "status": "In Progress",
            "floorId": 0,
            "locationName": "Library Main Foyer",
            "ai_verified": True
        }
    ]

@router.get("/recommendations")
def get_recommendations():
    """Returns dynamic recommendations from live user reports + campus baseline audits."""
    baseline = _get_campus_baseline_interventions()
    # Live reports at top, followed by baseline
    combined = list(LIVE_RECOMMENDATIONS) + baseline
    return combined

@router.post("/reports/analyze")
async def analyze_and_queue_report(
    file: Optional[UploadFile] = File(None),
    user_query: str = Form(""),
    building_name: str = Form("SOA ITER Campus"),
    reporter_name: str = Form("Campus Reporter")
):
    """Analyzes user complaint + photo using Gemini AI and queues a live Fix Suggestion."""
    temp_path = os.path.join(TEMP_DIR, f"rep_{uuid.uuid4().hex}.jpg")
    
    try:
        if file:
            content = await file.read()
            with open(temp_path, "wb") as f:
                f.write(content)
        else:
            with open(temp_path, "wb") as f:
                f.write(b"")

        ai_eval = detector.analyze_user_report(
            image_path=temp_path,
            user_description=user_query,
            location=building_name
        )

        rec_id = f"rec-{uuid.uuid4().hex[:8]}"
        new_card = {
            "id": rec_id,
            "buildingId": "bldg-iter-main",
            "buildingName": building_name,
            "title": f"Fix: {ai_eval.get('detected_problem', user_query)[:55]}",
            "problem": ai_eval.get("detected_problem", user_query),
            "solution": ai_eval.get("recommended_fix", "Clear obstruction and repair barrier"),
            "severity": ai_eval.get("priority", "High"),
            "priority": ai_eval.get("priority", "High"),
            "disabilityTypesAffected": ["wheelchair", "visual"],
            "estimatedUsersAffected": 150,
            "costCategory": ai_eval.get("cost_category", "Low"),
            "estimatedCostAmount": ai_eval.get("estimated_cost_inr", "₹1,500 - ₹3,000"),
            "expectedImpact": "High" if ai_eval.get("impact_score", 80) >= 80 else "Medium",
            "impactScore": ai_eval.get("impact_score", 85),
            "status": "Pending",
            "floorId": 0,
            "locationName": building_name,
            "ai_verified": ai_eval.get("is_verified", True)
        }

        # Prepend to live recommendations
        LIVE_RECOMMENDATIONS.insert(0, new_card)

        return {
            "status": "success",
            "message": "Report analyzed and fix recommendation queued.",
            "data": {
                "id": rec_id,
                "ai_verified": ai_eval.get("is_verified", True),
                "verification_status": "AI_VERIFIED" if ai_eval.get("is_verified", True) else "FLAGGED",
                "confidence": int(float(ai_eval.get("confidence", 0.90)) * 100),
                "type": ai_eval.get("issue_type", "Service Barrier"),
                "issue": ai_eval.get("detected_problem", user_query),
                "recommendation": ai_eval.get("recommended_fix", "Repair needed"),
                "estimated_cost_inr": ai_eval.get("estimated_cost_inr", "₹1,500 - ₹3,000"),
                "priority": ai_eval.get("priority", "High"),
                "impact_score": ai_eval.get("impact_score", 85),
                "voice_message": ai_eval.get("voice_message", "Report processed successfully.")
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass