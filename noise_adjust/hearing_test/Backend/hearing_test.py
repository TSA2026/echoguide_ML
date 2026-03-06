
import wave
import struct
import math
import io
from typing import Dict, Any
from calibration import dbfs_to_dbhl
from pydub import AudioSegment



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

# --- In-memory session store --------------------------------------------------
# Maps session_id (str) -> {'left': {freq_str: bool}, 'right': {freq_str: bool}}
sessions: Dict[str, Dict] = {}


# =============================================================================
# AUDIO GENERATION
# =============================================================================
def compute_report_from_thresholds(results: dict) -> dict:
    audiogram = {"left": {}, "right": {}}

    for freq, ears in results.items():
        for side in ("left", "right"):
            dbfs = ears.get(side, -30)
            dbhl = max(0, dbfs_to_dbhl(dbfs))
            audiogram[side][freq] = dbhl

    summary = {}
    for side in ("left", "right"):
        values = list(audiogram[side].values())
        avg = sum(values) / len(values) if values else 0
        if avg <= 20:   label = "Normal"
        elif avg <= 40: label = "Slight loss"
        elif avg <= 55: label = "Mild loss"
        elif avg <= 70: label = "Moderate loss"
        else:           label = "Severe loss"
        summary[side] = {"average_dBHL": round(avg, 1), "classification": label}

    return {"audiogram": audiogram, "summary": summary}

def generate_pure_tone(
    frequency: float,
    duration: float,
    amplitude: float,
    sample_rate: int,
    channel: str = "both"
) -> io.BytesIO:
    
    amplitude = max(amplitude, 0.001)
    
    num_samples = int(sample_rate * duration)
    fade_samples = int(sample_rate * 0.05)
    
    t = np.linspace(0, duration, num_samples, endpoint=False)
    tone = amplitude * np.sin(2 * np.pi * frequency * t)
    
    # Fade in/out
    fade_in  = 0.5 * (1 - np.cos(np.pi * np.arange(fade_samples) / fade_samples))
    fade_out = fade_in[::-1]
    tone[:fade_samples]  *= fade_in
    tone[-fade_samples:] *= fade_out
    tone = np.clip(tone, -1.0, 1.0)
    
    # Build stereo
    left  = tone if channel in ("left", "both")  else np.zeros(num_samples)
    right = tone if channel in ("right", "both") else np.zeros(num_samples)
    
    stereo = np.empty(num_samples * 2, dtype=np.int16)
    stereo[0::2] = (left  * 32767).astype(np.int16)
    stereo[1::2] = (right * 32767).astype(np.int16)
    
    # Write WAV to buffer
    wav_buf = io.BytesIO()
    with wave.open(wav_buf, 'wb') as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(stereo.tobytes())
    wav_buf.seek(0)
    
    # Convert to MP3 via pydub
    audio = AudioSegment.from_wav(wav_buf)
    mp3_buf = io.BytesIO()
    audio.export(mp3_buf, format="mp3")
    mp3_buf.seek(0)
    
    return mp3_buf

def compute_report(session_id: str) -> Dict[str, Any]:

    session = sessions[session_id]
    report: Dict[str, Any] = {}

    for ear in ('left', 'right'):

        results = session[ear]  # {freq_str: threshold_db}

        if not results:
            report[ear] = {'status': 'no_data'}
            continue

        # Convert keys to floats and sort
        freqs = sorted([float(f) for f in results.keys()])

        # Match thresholds in same order
        thresholds = [results[str(int(f))] for f in freqs]

        report[ear] = {
            "frequencies": freqs,
            "thresholds": thresholds
        }

    return report

import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns

def create_return_audiogram(frequenciesL, thresholdsL, frequenciesR, thresholdsR):
    from calibration import dbfs_to_dbhl

    # Convert from dBFS to dBHL for display
    thresholdsL = [dbfs_to_dbhl(t) for t in thresholdsL]
    thresholdsR = [dbfs_to_dbhl(t) for t in thresholdsR]

    # 1. Set seaborn style
    sns.set_style("whitegrid")

    # 2. Setup the plot
    fig, ax = plt.subplots(figsize=(10, 6))

    # 3. Plot the audiogram using seaborn
    sns.lineplot(x=frequenciesL, y=thresholdsL,
                 marker='o', color='blue', linewidth=2,
                 markersize=8, label='Right Ear', ax=ax)

    sns.lineplot(x=frequenciesR, y=thresholdsR,
                 marker='^', linewidth=2,
                 markersize=8, label='Left Ear', ax=ax)

    # 4. Customize axes
    ax.set_xscale('log')  # Frequencies are logarithmic
    ax.set_xticks([250, 500, 1000, 2000, 4000, 8000])
    ax.set_xticklabels(['250', '500', '1k', '2k', '4k', '8k'])
    ax.set_ylim(120, -10)  # Invert Y-axis: 120dB (poor) at bottom, -10dB (good) top

    # 5. Labels and styling
    ax.set_xlabel('Frequency (Hz)')
    ax.set_ylabel('Hearing Level (dB HL)')
    ax.set_title('Audiogram')
    ax.legend()

    # fig.savefig('audiogram', dpi=300)
    # plt.show()

    return fig

