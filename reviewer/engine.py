import chess
import chess.pgn
import chess.engine
import os
import platform

# Determine local Stockfish path
PARENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOCAL_STOCKFISH_PATH = os.path.join(PARENT_DIR, 'staticfiles', "stockfish")

# Define pre-installed Stockfish path in Google Cloud
CLOUD_STOCKFISH_PATH = "/usr/games/stockfish"


def is_running_in_cloud():
    """Check if running in a cloud environment (App Engine, Cloud Run, etc.)."""
    return os.getenv("GAE_ENV", "").startswith("standard") or os.getenv("K_SERVICE") is not None


def get_stockfish_path():
    """Determine which Stockfish path to use based on environment."""
    if is_running_in_cloud():
        # Use pre-installed Stockfish on Google Cloud
        return CLOUD_STOCKFISH_PATH
    else:
        # Use local Stockfish in development
        local_path = os.path.join(
            LOCAL_STOCKFISH_PATH, "stockfish-ubuntu-x86-64-avx2")
        if os.path.exists(local_path):
            print(f"Using local Stockfish: {local_path}")
            return local_path
        else:
            raise FileNotFoundError(
                f"Local Stockfish binary not found at {local_path}"
            )


engine_path = get_stockfish_path()
engine = None


def get_engine():
    global engine
    try:
        if engine is None:
            engine = chess.engine.SimpleEngine.popen_uci(engine_path)
        else:
            engine.ping()
    except (chess.engine.EngineTerminatedError, chess.engine.EngineError):
        engine = chess.engine.SimpleEngine.popen_uci(engine_path)

    return engine


board = chess.Board()
if engine is not None:
    engine.quit()
