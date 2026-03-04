from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from hearing_test import generate_pure_tone, compute_report

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

#---Server------

app = FastAPI()

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
    wav_buffer = generate_pure_tone(
        frequency, 
        duration, 
        amplitude,
        sample_rate, 
        channel
        )
    # Rewind just in case
    wav_buffer.seek(0)

    return StreamingResponse(
        wav_buffer,
        media_type="audio/wav",
        headers={"Content-Disposition": "inline; filename=tone.wav"}
    )
