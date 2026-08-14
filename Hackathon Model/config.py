import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "S37 Accessibility Digital Twin"
    MOCK_MODE: bool = False
    GEMINI_API_KEY: str = ""
    
    CONFIDENCE_THRESHOLD: float = 0.35
    MAX_IMAGE_SIZE_MB: int = 10
    DEMO_IMAGES_PATH: str = "data/demo_images"

    class Config:
        env_file = ".env"

settings = Settings()