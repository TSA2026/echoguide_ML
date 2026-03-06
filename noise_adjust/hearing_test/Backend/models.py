from pydantic import BaseModel
from typing import Dict

class HearingResult(BaseModel):
    results: Dict[str, Dict[str, float]]

class EarSummary(BaseModel):
    average_dBHL: float
    classification: str

class AudiogramSummary(BaseModel):
    left: EarSummary
    right: EarSummary

class AudiogramResponse(BaseModel):
    audiogram: Dict[str, Dict[str, float]]
    summary: AudiogramSummary