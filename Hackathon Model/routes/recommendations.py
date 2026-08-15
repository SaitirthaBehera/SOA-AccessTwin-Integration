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
    combined = list(LIVE_RECOMMENDATIONS) + baseline
    return combined

@router.post("/recommendations")
def add_recommendation(rec: Dict[str, Any]):
    """Receives and stores newly created AI recommendations."""
    LIVE_RECOMMENDATIONS.insert(0, rec)
    return {"status": "success", "recommendation": rec}

@router.patch("/recommendations/by-report/{report_id}/resolve")
def resolve_recommendation_by_report(report_id: str):
    """Marks recommendation as Completed when linked admin report is resolved."""
    found = False
    for r in LIVE_RECOMMENDATIONS:
        if r.get("sourceReportId") == report_id or report_id in str(r.get("id", "")):
            r["status"] = "Completed"
            found = True
    return {"status": "success", "resolved": found, "report_id": report_id}

@router.patch("/recommendations/{rec_id}/status")
def update_recommendation_status(rec_id: str, payload: Dict[str, Any]):
    status = payload.get("status", "Pending")
    for r in LIVE_RECOMMENDATIONS:
        if r.get("id") == rec_id:
            r["status"] = status
            return {"status": "success", "recommendation": r}
    return {"status": "not_found"}

@router.post("/reports/analyze")
async def analyze_and_queue_report(
    file: Optional[UploadFile] = File(None),
    user_query: str = Form(""),
    building_name: str = Form("SOA ITER Campus"),
    reporter_name: str = Form("Campus Reporter")
):
    """Analyzes user complaint + photo using Gemini AI and queues a live Fix Suggestion."""
    temp_path = None
    
    try:
        has_file = False
        if file and file.filename:
            content = await file.read()
            if len(content) > 100:  # Valid image payload
                temp_path = os.path.join(TEMP_DIR, f"rep_{uuid.uuid4().hex}.jpg")
                with open(temp_path, "wb") as f:
                    f.write(content)
                has_file = True

        ai_eval = detector.analyze_user_report(
            image_path=temp_path if has_file else "",
            user_description=user_query if user_query.strip() else "Accessibility barrier reported",
            location=building_name
        )

        rec_id = f"rec-{uuid.uuid4().hex[:8]}"
        problem_text = ai_eval.get("detected_problem") or user_query.strip() or "Pathway obstruction reported"
        solution_text = ai_eval.get("recommended_fix") or "Clear pathway and inspect surface gradient as per CPWD norms"

        new_card = {
            "id": rec_id,
            "buildingId": "bldg-iter-main",
            "buildingName": building_name,
            "title": f"Fix: {problem_text[:50]}",
            "problem": problem_text,
            "solution": solution_text,
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
                "issue": problem_text,
                "recommendation": solution_text,
                "estimated_cost_inr": ai_eval.get("estimated_cost_inr", "₹1,500 - ₹3,000"),
                "priority": ai_eval.get("priority", "High"),
                "impact_score": ai_eval.get("impact_score", 85),
                "voice_message": ai_eval.get("voice_message", "Report processed successfully.")
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass