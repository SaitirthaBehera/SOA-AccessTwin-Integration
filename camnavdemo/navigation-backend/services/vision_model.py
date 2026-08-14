import json
import logging
from typing import Dict, Any
from google import genai
import PIL.Image

from config import settings

logger = logging.getLogger(__name__)

class AccessibilityDetector:
    def __init__(self):
        self.mock_mode = settings.MOCK_MODE
        
        if not self.mock_mode:
            try:
                if not settings.GEMINI_API_KEY:
                    logger.error("GEMINI_API_KEY is missing in .env file!")
                    self.mock_mode = True
                else:
                    logger.info("Initializing New Google GenAI API...")
                    self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
                    
                    # Direct and most stable model
                    self.model_name = 'gemini-3.6-flash' 
                    
                    logger.info(f"Using Model: {self.model_name}")
            except Exception as e:
                logger.error(f"Failed to load new Gemini API: {e}")
                self.mock_mode = True

    def detect_accessibility_features(self, image_path: str) -> Dict[str, Any]:
        if self.mock_mode:
            return self._mock_detect(image_path)

        try:
            with PIL.Image.open(image_path) as img:
                prompt = """
                You are an AI assistant for a visually impaired person. Analyze this image for accessibility features and obstacles.
                Look for: stairs, ramps, handrails, doors, elevators.
                
                CRITICAL HACKATHON REQUIREMENTS: 
                1. Explicitly read and identify any 'signage' or 'Braille signs'.
                2. Identify any 'sensory conditions' (e.g., poor lighting, slippery floors, missing tactile paving).
                3. Identify any 'service barriers' (e.g., path blockages, inaccessible counters, missing ramps).
                
                Determine their position (left, center, or right) relative to the person walking forward.
                
                Return ONLY a valid JSON object (no markdown formatting, no backticks, just raw JSON) with exactly this structure:
                {
                    "objects": [
                        {"label": "stairs", "confidence": 0.95, "position": "center"},
                        {"label": "service barrier: path blocked", "confidence": 0.90, "position": "right"},
                        {"label": "signage: washroom", "confidence": 0.99, "position": "left"}
                    ],
                    "accessibility_score": 6.5,
                    "voice_message": "I detected an accessible path ahead, but there is a service barrier on the right due to a blockage. A washroom sign is visible on the left."
                }
                Make the voice_message natural, conversational, and highly helpful for a blind user. Use the exact keywords 'sensory condition' or 'service barrier' in the voice message if you find them.
                """
                
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=[img, prompt]
                )
                
                text = response.text.replace("```json", "").replace("```", "").strip()
                
            return json.loads(text)
            
        except Exception as e:
            return {
                "objects": [],
                "accessibility_score": 0.0,
                "voice_message": f"NEW SDK API ERROR: {str(e)}"
            }
    def analyze_user_report(self, image_path: str, user_description: str, location: str = "") -> Dict[str, Any]:
        """Analyzes a user's reported issue + photo and calculates repair recommendation and estimated ₹ cost."""
        if self.mock_mode:
            return {
                "is_verified": True,
                "confidence": 0.95,
                "issue_type": "Service Barrier",
                "detected_problem": user_description or "Reported obstacle in pathway",
                "recommended_fix": "Clear debris and repair damaged infrastructure",
                "cost_category": "Low",
                "estimated_cost_inr": "₹1,500 - ₹3,000",
                "priority": "High",
                "impact_score": 85,
                "voice_message": f"Report verified: {user_description}. Recommended low-cost repair estimate is under 3000 rupees."
            }

        try:
            with PIL.Image.open(image_path) as img:
                prompt = f"""
                You are an expert Accessibility Auditor and Civil Cost Estimator for public buildings in India.
                A user/student submitted an accessibility issue report with a photograph.
                
                USER'S COMPLAINT/QUERY: "{user_description}"
                LOCATION: "{location}"

                Perform the following analysis:
                1. Look at the photo and verify if the user's complaint is real and visible.
                2. Classify whether it is a "Service Barrier" (e.g. broken lift, blocked ramp) or a "Sensory Condition" (e.g. dim lighting, slippery tiles).
                3. Propose a realistic, low-cost practical fix/solution.
                4. Estimate the realistic repair/fix cost in Indian Rupees (INR) range.
                5. Set Priority: "Critical", "High", "Medium", or "Low".
                6. Estimate an Impact Score from 1 to 100 on how much this fix will help disabled persons.

                Return ONLY a valid JSON object (no markdown, no backticks) with this exact structure:
                {{
                    "is_verified": true,
                    "confidence": 0.94,
                    "issue_type": "Service Barrier",
                    "detected_problem": "Concise summary of verified problem",
                    "recommended_fix": "Specific low-cost action item for campus administration",
                    "cost_category": "Low",
                    "estimated_cost_inr": "₹1,000 - ₹2,500",
                    "priority": "Critical",
                    "impact_score": 90,
                    "admin_summary": "1-sentence audit note for administration",
                    "voice_message": "Voice confirmation message for the reporting user acknowledging the issue and stating the estimated fix cost."
                }}
                """

                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=[img, prompt]
                )

                text = response.text.replace("```json", "").replace("```", "").strip()
                return json.loads(text)

        except Exception as e:
            return {
                "is_verified": False,
                "confidence": 0.0,
                "issue_type": "Unknown",
                "detected_problem": f"Analysis failed: {str(e)}",
                "recommended_fix": "Manual inspection required",
                "cost_category": "Unknown",
                "estimated_cost_inr": "To be assessed",
                "priority": "Medium",
                "impact_score": 50,
                "admin_summary": "System error during AI vision analysis.",
                "voice_message": "Could not complete image analysis. Please try again."
            }

    def _mock_detect(self, image_path: str) -> Dict[str, Any]:
        return {
            "objects": [{"label": "elevator_button", "confidence": 0.88, "position": "right"}],
            "accessibility_score": 8.0,
            "voice_message": "I detected an elevator button on your right."
        }