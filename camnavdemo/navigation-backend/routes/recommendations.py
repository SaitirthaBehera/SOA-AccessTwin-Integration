import os
import shutil
from enum import Enum
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Dict, Any, List

from services.vision_model import AccessibilityDetector

router = APIRouter()
detector = AccessibilityDetector()

# In-memory storage for dynamic user-reported recommendations
DYNAMIC_USER_RECOMMENDATIONS: List[Dict[str, Any]] = []

# Clean Dropdown Choices for Swagger UI
class CampusLocation(str, Enum):
    BLOCK_A = "Block A"
    BLOCK_B = "Block B"
    BLOCK_C = "Block C"
    BLOCK_D = "Block D"
    BLOCK_E = "Block E"
    SC_BLOCK = "SC Block (Student Activity Center)"
    LIBRARY = "Central Library"
    CAFETERIA = "Campus Cafeteria"
    SPORTS_GROUND = "Sports Ground (Cricket & Football)"
    AUDITORIUM = "Main Auditorium"
    MAIN_GATE = "Main Campus Gate"
    OTHER = "Other / Open Area"

# Base Campus Infrastructure Audit Data
BUILDING_AUDIT_DATA = {
    "block_a": {
        "name": "Block A",
        "has_ramp": True,
        "has_handrail": True,
        "has_tactile_paving": False,
        "has_braille_signage": False,
        "has_elevator": False,
        "lighting_condition": "good",
        "floor_condition": "smooth",
    },
    "block_b": {
        "name": "Block B",
        "has_ramp": False,
        "has_handrail": True,
        "has_tactile_paving": False,
        "has_braille_signage": False,
        "has_elevator": True,
        "lighting_condition": "dim",
        "floor_condition": "smooth",
    },
    "block_c": {
        "name": "Block C",
        "has_ramp": True,
        "has_handrail": False,
        "has_tactile_paving": True,
        "has_braille_signage": False,
        "has_elevator": False,
        "lighting_condition": "good",
        "floor_condition": "cracked",
    },
    "block_d": {
        "name": "Block D",
        "has_ramp": False,
        "has_handrail": False,
        "has_tactile_paving": False,
        "has_braille_signage": True,
        "has_elevator": True,
        "lighting_condition": "dim",
        "floor_condition": "slippery",
    },
    "block_e": {
        "name": "Block E",
        "has_ramp": True,
        "has_handrail": True,
        "has_tactile_paving": False,
        "has_braille_signage": False,
        "has_elevator": False,
        "lighting_condition": "good",
        "floor_condition": "smooth",
    },
    "sc_block": {
        "name": "SC Block (Student Activity Center)",
        "has_ramp": False,
        "has_handrail": True,
        "has_tactile_paving": False,
        "has_braille_signage": False,
        "has_elevator": False,
        "lighting_condition": "good",
        "floor_condition": "smooth",
    },
    "library": {
        "name": "Central Library",
        "has_ramp": True,
        "has_handrail": True,
        "has_tactile_paving": True,
        "has_braille_signage": True,
        "has_elevator": True,
        "lighting_condition": "good",
        "floor_condition": "smooth",
    },
    "cafeteria": {
        "name": "Campus Cafeteria",
        "has_ramp": False,
        "has_handrail": False,
        "has_tactile_paving": False,
        "has_braille_signage": False,
        "has_elevator": False,
        "lighting_condition": "good",
        "floor_condition": "slippery",
    },
    "sports_ground": {
        "name": "Sports Ground (Cricket & Football)",
        "has_ramp": True,
        "has_handrail": False,
        "has_tactile_paving": False,
        "has_braille_signage": False,
        "has_elevator": False,
        "lighting_condition": "dim",
        "floor_condition": "rough",
    },
}

IMPROVEMENT_CATALOG = {
    "has_ramp": {
        "recommendation": "Install a wheelchair-accessible ramp at the entrance",
        "cost": "Medium",
        "priority": "Critical",
        "estimated_cost_inr": "₹15,000 - ₹40,000",
    },
    "has_handrail": {
        "recommendation": "Install sturdy metal handrails along stairs and pathways",
        "cost": "Low",
        "priority": "High",
        "estimated_cost_inr": "₹5,000 - ₹12,000",
    },
    "has_tactile_paving": {
        "recommendation": "Install yellow tactile paving tiles for visually impaired navigation",
        "cost": "Low",
        "priority": "High",
        "estimated_cost_inr": "₹3,000 - ₹8,000",
    },
    "has_braille_signage": {
        "recommendation": "Install Braille and tactile signage boards at key locations",
        "cost": "Very Low",
        "priority": "High",
        "estimated_cost_inr": "₹1,000 - ₹3,000",
    },
    "has_elevator": {
        "recommendation": "Install an elevator or wheelchair lift for multi-floor accessibility",
        "cost": "Very High",
        "priority": "Critical",
        "estimated_cost_inr": "₹5,00,000+",
    },
}

SENSORY_FIXES = {
    "dim": {
        "recommendation": "Upgrade to high-luminance LED lighting for safe visibility",
        "cost": "Low",
        "priority": "Medium",
        "estimated_cost_inr": "₹2,000 - ₹6,000",
    },
    "cracked": {
        "recommendation": "Repair cracked flooring to prevent tripping hazards",
        "cost": "Medium",
        "priority": "Critical",
        "estimated_cost_inr": "₹10,000 - ₹25,000",
    },
    "slippery": {
        "recommendation": "Apply anti-slip floor coating or non-skid rubber runners",
        "cost": "Low",
        "priority": "Critical",
        "estimated_cost_inr": "₹3,000 - ₹7,000",
    },
    "rough": {
        "recommendation": "Level the uneven surface for wheelchair accessible pathways",
        "cost": "Medium",
        "priority": "High",
        "estimated_cost_inr": "₹8,000 - ₹18,000",
    },
}


def _generate_recommendations(block_id: str, data: Dict) -> List[Dict[str, Any]]:
    recommendations = []
    for feature_key, catalog in IMPROVEMENT_CATALOG.items():
        if not data.get(feature_key, False):
            recommendations.append({
                "block": data["name"],
                "source": "Structured Audit",
                "verification_status": "admin_verified",
                "type": "Service Barrier",
                "issue": f"Missing: {feature_key.replace('has_', '').replace('_', ' ').title()}",
                **catalog,
            })

    lighting = data.get("lighting_condition", "good")
    if lighting in SENSORY_FIXES:
        recommendations.append({
            "block": data["name"],
            "source": "Sensory Audit",
            "verification_status": "admin_verified",
            "type": "Sensory Condition",
            "issue": f"Poor lighting ({lighting})",
            **SENSORY_FIXES[lighting],
        })

    floor = data.get("floor_condition", "smooth")
    if floor in SENSORY_FIXES:
        recommendations.append({
            "block": data["name"],
            "source": "Safety Audit",
            "verification_status": "admin_verified",
            "type": "Sensory Condition",
            "issue": f"Unsafe floor ({floor})",
            **SENSORY_FIXES[floor],
        })

    return recommendations


@router.post("/reports/analyze")
@router.post("/api/reports/analyze")
async def report_issue_and_get_cost_estimate(
    file: UploadFile = File(...),
    user_query: str = Form(..., description="User complaint e.g. 'Ramp blocked by boxes' or 'Lift kharab hai'"),
    building_name: CampusLocation = Form(CampusLocation.BLOCK_A, description="Select campus location from dropdown"),
    reporter_name: str = Form("Anonymous User")
):
    """
    User uploads a photo + describes the problem at any campus location.
    AI verifies the problem, classifies barrier, and calculates estimated fix cost in ₹.
    """
    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    temp_file_path = os.path.join(temp_dir, f"report_{file.filename}")

    with open(temp_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        location_value = building_name.value

        ai_result = detector.analyze_user_report(
            image_path=temp_file_path,
            user_description=user_query,
            location=location_value
        )

        new_rec = {
            "id": f"rec-user-{len(DYNAMIC_USER_RECOMMENDATIONS) + 1}",
            "block": location_value,
            "source": "Crowdsourced User Report",
            "reporter": reporter_name,
            "user_complaint": user_query,
            "ai_verified": ai_result.get("is_verified", True),
            "verification_status": "pending_admin_approval",
            "confidence": ai_result.get("confidence", 0.90),
            "type": ai_result.get("issue_type", "Service Barrier"),
            "issue": ai_result.get("detected_problem", user_query),
            "recommendation": ai_result.get("recommended_fix", "Inspection required"),
            "cost": ai_result.get("cost_category", "Low"),
            "estimated_cost_inr": ai_result.get("estimated_cost_inr", "₹1,000 - ₹3,000"),
            "priority": ai_result.get("priority", "High"),
            "impact_score": ai_result.get("impact_score", 85),
            "voice_message": ai_result.get("voice_message", "Report processed.")
        }

        DYNAMIC_USER_RECOMMENDATIONS.insert(0, new_rec)

        return {
            "status": "success",
            "message": "User report analyzed by AI and queued for Admin Approval.",
            "data": new_rec
        }

    finally:
        if os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception:
                pass


@router.patch("/recommendations/{rec_id}/verify")
@router.patch("/api/recommendations/{rec_id}/verify")
def verify_recommendation_by_admin(
    rec_id: str,
    action: str = Form(..., description="Action: 'admin_verified' or 'rejected'"),
    admin_notes: str = Form("Verified during on-site inspection by facility manager")
):
    """Admin Endpoint: Approve or Reject a user-submitted recommendation."""
    for rec in DYNAMIC_USER_RECOMMENDATIONS:
        if rec.get("id") == rec_id:
            rec["verification_status"] = action
            rec["admin_notes"] = admin_notes
            rec["verified_by"] = "Campus Facility Manager"
            return {
                "status": "success",
                "message": f"Recommendation '{rec_id}' status updated to '{action}'.",
                "data": rec
            }
    raise HTTPException(status_code=404, detail="Recommendation not found")


@router.get("/recommendations")
@router.get("/api/recommendations")
def get_all_recommendations():
    """Get all recommendations (Structured Audits + Live Crowdsourced User Reports)."""
    all_recs = []

    # 1. Add crowdsourced live user reports
    all_recs.extend(DYNAMIC_USER_RECOMMENDATIONS)

    # 2. Add baseline structured audit recommendations
    for block_id, data in BUILDING_AUDIT_DATA.items():
        all_recs.extend(_generate_recommendations(block_id, data))

    priority_order = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
    all_recs.sort(key=lambda x: priority_order.get(x["priority"], 99))

    return {
        "status": "success",
        "total_issues_found": len(all_recs),
        "user_reported_issues": len(DYNAMIC_USER_RECOMMENDATIONS),
        "recommendations": all_recs,
    }