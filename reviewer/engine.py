import chess
import chess.pgn
import chess.engine
import os
import platform
import urllib.request

# Define Cloud Storage bucket URL
BUCKET_URL = "https://storage.cloud.google.com/check-chess-game-review-system.appspot.com/"

# Determine correct Stockfish file based on OS
STOCKFISH_FILES = {
    "Windows": "stockfish-windows-x86-64-avx2.exe",
    "Linux": "stockfish-ubuntu-x86-64-avx2"
}


def download_stockfish():
    """Download Stockfish from Google Cloud Storage if not already present."""
    os_name = platform.system()
    stockfish_file = STOCKFISH_FILES.get(os_name)

    if not stockfish_file:
        raise Exception("Unsupported OS for Stockfish")

    # Use /tmp for App Engine
    local_path = os.path.join("/tmp", stockfish_file)

    if not os.path.exists(local_path):  # Download only if not already present
        file_url = BUCKET_URL + stockfish_file
        print(f"Downloading Stockfish: {file_url}")
        urllib.request.urlretrieve(file_url, local_path)
        os.chmod(local_path, 0o755)  # Make it executable

    return local_path  # Return the path of the downloaded file


engine_path = download_stockfish()
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
engine.quit()
