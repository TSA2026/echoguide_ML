# amplitude to dbhl convertion

import math

# -30 dBFS reference point = 0 dBHL 
REFERENCE_DBFS = -30.0

def dbfs_to_dbhl(dbfs: float) -> float:
    """Convert internal dBFS scale to clinical dBHL."""
    return round(REFERENCE_DBFS - dbfs)

def dbhl_to_dbfs(dbhl: float) -> float:
    """Convert clinical dBHL back to internal dBFS scale."""
    return REFERENCE_DBFS - dbhl

def dbfs_to_amplitude(dbfs: float) -> float:
    """Convert dBFS to 0.0 ~ 1.0 amplitude for tone generation."""
    if dbfs <= -96:
        return 0.0
    return math.pow(10, dbfs / 20)

def amplitude_to_dbfs(amplitude: float) -> float:
    """Convert 0.0 ~1.0 amplitude back to dBFS."""
    if amplitude <= 0:
        return -96.0
    return 20 * math.log10(amplitude)