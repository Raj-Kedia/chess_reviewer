import chess
import chess.pgn
import chess.engine
import os
import platform
import urllib.request
from stockfish import Stockfish
# BUCKET_URL = "https://storage.googleapis.com/check-chess-game-review-system.appspot.com/"

# # Determine correct Stockfish file based on OS
STOCKFISH_FILES = ["stockfish-windows-x86-64-avx2.exe"]

PARENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOCAL_STOCKFISH_PATH = os.path.join(PARENT_DIR, 'staticfiles', "stockfish")


def is_running_in_cloud():
    """Check if running in a cloud environment (App Engine, Cloud Run, etc.)."""
    return os.getenv("GAE_ENV", "").startswith("standard") or os.getenv("K_SERVICE") is not None


# def download_stockfish():
#     """Use local Stockfish for development; download from GCS only in production."""
#     # os_name = platform.system()
#     # stockfish_file = STOCKFISH_FILES.get(os_name)

#     # if not stockfish_file:
#     #     raise Exception("Unsupported OS for Stockfish")

#     if not is_running_in_cloud():
#         # Running locally, use the staticfiles directory
#         stockfish_file = STOCKFISH_FILES[0]
#         local_path = os.path.join(LOCAL_STOCKFISH_PATH, stockfish_file)
#         if os.path.exists(local_path):
#             print(f"Using local Stockfish: {local_path}")
#             return local_path
#         else:
#             raise FileNotFoundError(
#                 f"Local Stockfish binary not found at {local_path}")

#     # Running in cloud, use /tmp for App Engine
#     stockfish_file = STOCKFISH_FILES[1]
#     cloud_path = os.path.join("/tmp", stockfish_file)

#     if not os.path.exists(cloud_path):  # Download only if not already present
#         file_url = BUCKET_URL + stockfish_file
#         print(f"Downloading Stockfish: {file_url}")
#         urllib.request.urlretrieve(file_url, cloud_path)
#         os.chmod(cloud_path, 0o755)  # Make it executable

#     return cloud_path  # Return the path of the downloaded file


# engine_path = download_stockfish()
engine = None


def get_engine():
    # if is_running_in_cloud():
    #     stockfish_path = os.path.expanduser(
    #         "~/stockfish/stockfish-ubuntu-x86-64-avx2")
    #     stockfish = Stockfish(stockfish_path)
    #     return stockfish
    # else:
    stockfish_file = STOCKFISH_FILES[0]
    local_path = os.path.join(LOCAL_STOCKFISH_PATH, stockfish_file)
    if os.path.exists(local_path):
        print(f"Using local Stockfish: {local_path}")
        return chess.engine.SimpleEngine.popen_uci(local_path)
    else:
        raise FileNotFoundError(
            f"Local Stockfish binary not found at {local_path}")


board = chess.Board()
# if engine is not None:
#     engine.quit()
