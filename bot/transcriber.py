"""
Voice transcription using faster-whisper (local, no API key required).

The WhisperModel is loaded once at module import time so startup cost is paid
only when the bot first loads, not on each voice message.

Model choice: "base" — fast enough for real-time use, accurate for
Filipino-accented English and mixed Tagalog/English (Taglish).
Swap to "small" or "medium" if accuracy needs improvement.

Requires ffmpeg to be installed on the system:
  brew install ffmpeg
"""

import logging
from faster_whisper import WhisperModel

logger = logging.getLogger(__name__)

# Load model once at import time. device="cpu", compute_type="int8" keeps
# memory usage low on a standard laptop/VPS without a GPU.
logger.info("Loading Whisper model (base)...")
_model = WhisperModel("base", device="cpu", compute_type="int8")
logger.info("Whisper model ready.")


def transcribe(audio_path: str) -> str:
    """
    Transcribe a local audio file and return the full text.

    Args:
        audio_path: Path to the audio file (ogg, mp3, wav, etc.).

    Returns:
        Transcribed string, stripped of leading/trailing whitespace.
    """
    segments, _ = _model.transcribe(audio_path, language="en")
    return " ".join(seg.text for seg in segments).strip()
