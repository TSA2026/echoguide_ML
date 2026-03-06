from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from hearing_test import generate_pure_tone, compute_report, create_return_audiogram, compute_report_from_thresholds
from models import HearingResult
from functools import lru_cache
import io

# --- Tone Generation Configuration -------------------------------------------
SAMPLE_RATE       = 44100  # CD-quality: 44,100 samples per second
TONE_DURATION     = 1.5    # Each test tone lasts 1.5 seconds
FADE_DURATION     = 0.05   # Cosine fade length in seconds (prevents audible clicks)
DEFAULT_AMPLITUDE = 0.6    # Default volume (0.0 - 1.0)

# --- Test Frequency Schedule --------------------------------------------------
# Mirrors the AirPods / clinical audiometry pattern:
# Start at 1 kHz (most speech-relevant), sweep to high frequencies, then low.
TEST_FREQUENCIES = [
    1000, 2000, 4000, 8000, 10000, 12000, 14000, 16000, 18000, 20000,  # High sweep
    500, 250, 125, 80, 60, 40, 20                                        # Low sweep
]


app = FastAPI()


origins = [
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,   
    allow_credentials=True,
    allow_methods=["*"],    
    allow_headers=["*"],     
)


@app.get("/")
def root():
    return {"message": "Hello World"}


# needs to be adaptive
@app.get("/generate_tone")
def generate_tone(
    frequency: float,
    duration: float = TONE_DURATION,
    amplitude: float = DEFAULT_AMPLITUDE,
    sample_rate: int = SAMPLE_RATE,
    channel: str = "both"
):
    buf = generate_pure_tone(frequency, duration, amplitude, sample_rate, channel)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="audio/mpeg",       # ← changed from audio/wav
        headers={"Content-Disposition": "inline; filename=tone.mp3"}
    )

@app.post("/compute_report")
def report(payload: HearingResult):
    return compute_report_from_thresholds(payload.results)

@app.post("/generate_audiogram")
def generate_audiogram(payload: HearingResult):
    print("results received:", payload.results)
    left_freqs       = sorted([float(f) for f in payload.results.keys()])
    left_thresholds  = [payload.results[str(int(f))]["left"]  for f in left_freqs]
    right_thresholds = [payload.results[str(int(f))]["right"] for f in left_freqs]
    print("left_freqs:", left_freqs)
    print("left_thresholds:", [payload.results[str(int(f))]["left"] for f in left_freqs])
    print("right_thresholds:", [payload.results[str(int(f))]["right"] for f in left_freqs])

    fig = create_return_audiogram(
        left_freqs, left_thresholds,
        left_freqs, right_thresholds
    )

    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight")
    buf.seek(0)

    return StreamingResponse(buf, media_type="image/png")

    
