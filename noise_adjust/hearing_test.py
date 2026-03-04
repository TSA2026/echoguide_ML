import http.server
import urllib.parse
import json
import uuid
import wave
import struct
import math
import io
from typing import Dict, Any

# --- Server Configuration ----------------------------------------------------
HOST = '0.0.0.0'   # Listen on all interfaces
PORT = 5000        # Match the port the frontend expects

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

def generate_pure_tone(frequency: float, duration: float,
                       amplitude: float, sample_rate: int,
                       channel: str) -> io.BytesIO:
    
    n_samples    = int(sample_rate * duration)
    fade_samples = int(sample_rate * FADE_DURATION)

    # Pre-compute the mono sine wave as a list of floats.
    # math.sin is used instead of numpy to keep this stdlib-only.
    two_pi_f_over_sr = 2.0 * math.pi * frequency / sample_rate
    tone = [math.sin(two_pi_f_over_sr * i) for i in range(n_samples)]

    # Apply cosine fade-in (0 -> 1) to the first `fade_samples` samples.
    # Using (1 - cos(x)) / 2 gives a smooth S-curve window.
    for i in range(fade_samples):
        window = (1.0 - math.cos(math.pi * i / fade_samples)) / 2.0
        tone[i] *= window

    # Apply cosine fade-out (1 -> 0) to the last `fade_samples` samples.
    for i in range(fade_samples):
        window = (1.0 - math.cos(math.pi * (fade_samples - i) / fade_samples)) / 2.0
        tone[n_samples - fade_samples + i] *= window

    # Scale float samples to signed 16-bit integers [-32767, 32767].
    scale    = amplitude * 32767.0
    tone_i16 = [max(-32767, min(32767, int(s * scale))) for s in tone]

    # Build per-channel sample lists.
    silence = [0] * n_samples

    if channel == 'left':
        left_ch, right_ch = tone_i16, silence
    elif channel == 'right':
        left_ch, right_ch = silence, tone_i16
    else:  # 'both'
        left_ch, right_ch = tone_i16, tone_i16

    # Interleave stereo: [L0, R0, L1, R1, ...] packed as little-endian 16-bit.
    # struct.pack '<h' = signed 16-bit little-endian short (WAV standard).
    pcm_frames = bytearray()
    for l_sample, r_sample in zip(left_ch, right_ch):
        pcm_frames += struct.pack('<h', l_sample)
        pcm_frames += struct.pack('<h', r_sample)

    # Write a proper WAV header using the stdlib `wave` module.
    wav_buffer = io.BytesIO()
    with wave.open(wav_buffer, 'wb') as wf:
        wf.setnchannels(2)           # Stereo
        wf.setsampwidth(2)           # 2 bytes = 16-bit
        wf.setframerate(sample_rate)
        wf.writeframes(bytes(pcm_frames))

    wav_buffer.seek(0)  # Rewind so the caller can read from the start
    return wav_buffer

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

    fig.savefig('audiogram', dpi=300)
    plt.show()

    return fig

# example
# frequenciesL = [250, 500, 1000, 2000, 4000, 8000]
# thresholdsL = [10, 15, 25, 40, 50, 45]

# frequenciesR = [250, 500, 1000, 2000, 4000, 8000]
# thresholdsR = [10, 25, 25, 45, 50, 45]

# report = compute_report(session_id)
# frequenciesL = report["left"]["frequencies"]
# thresholdsL = report["left"]["thresholds"]
# frequenciesR = report["right"]["frequencies"]
# thresholdsR = report["right"]["thresholds"]

# figure_object = create_return_audiogram(frequenciesL, thresholdsL, frequenciesR, thresholdsR)



class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/start":
            session_id = str(uuid.uuid4())
            sessions[session_id] = {"left": {}, "right": {}}
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"session_id": session_id}).encode())
            return

        if self.path.startswith("/tone"):
            query = self.path.split("?")
            params = {}
            if len(query) > 1:
                for part in query[1].split("&"):
                    k, v = part.split("=")
                    params[k] = v

            freq = float(params.get("freq", 1000))
            channel = params.get("channel", "both")
            session_id = params.get("session_id")

            if not session_id or session_id not in sessions:
                self.send_error(400, "no session")
                return

            tone = generate_pure_tone(freq, TONE_DURATION, DEFAULT_AMPLITUDE, SAMPLE_RATE, channel)
            data = tone.read()

            self.send_response(200)
            self.send_header("Content-Type", "audio/wav")
            self.end_headers()
            self.wfile.write(data)
            return

        if self.path.startswith("/report"):
            query = self.path.split("?")
            session_id = None
            if len(query) > 1:
                for part in query[1].split("&"):
                    k, v = part.split("=")
                    if k == "session_id":
                        session_id = v

            report = compute_report(session_id)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(report).encode())
            return

        self.send_error(404)


if __name__ == "__main__":
    print(f"Server running on http://{HOST}:{PORT}")
    server = http.server.HTTPServer((HOST, PORT), Handler)
    server.serve_forever()