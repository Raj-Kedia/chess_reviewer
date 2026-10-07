import os
import platform
import shutil
import atexit
import chess
import chess.pgn
import chess.engine

PARENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOCAL_STOCKFISH_PATH = os.path.join(PARENT_DIR, 'static', 'stockfish')

_engine = None


def _ensure_executable(path):
    """Ensure the binary has executable permissions on Unix systems."""
    if os.name != 'nt' and os.path.exists(path):
        try:
            current_mode = os.stat(path).st_mode
            os.chmod(path, current_mode | 0o755)
        except Exception as e:
            print(f"Warning: could not set executable permissions on {path}: {e}")


def get_stockfish_path():
    """Find the appropriate Stockfish binary path across development and cloud environments."""
    # 1. Custom explicit path from environment variable
    custom_path = os.environ.get('STOCKFISH_PATH')
    if custom_path and os.path.exists(custom_path):
        _ensure_executable(custom_path)
        return custom_path

    # 2. Check system-installed stockfish (e.g. apt-get install stockfish in Docker/Cloud Run)
    system_path = shutil.which('stockfish')
    if system_path and os.path.exists(system_path):
        return system_path

    common_linux_paths = ['/usr/games/stockfish', '/usr/bin/stockfish', '/usr/local/bin/stockfish']
    for p in common_linux_paths:
        if os.path.exists(p):
            return p

    # 3. Bundled static binary based on OS
    if platform.system() == 'Windows':
        stockfish_file = os.environ.get('STOCKFISH_FILE', 'stockfish-windows-x86-64-avx2.exe')
    else:
        stockfish_file = os.environ.get('STOCKFISH_FILE', 'stockfish-ubuntu-x86-64-avx2')

    bundled_path = os.path.join(LOCAL_STOCKFISH_PATH, stockfish_file)
    if os.path.exists(bundled_path):
        _ensure_executable(bundled_path)
        return bundled_path

    raise FileNotFoundError(
        f"Stockfish binary not found. Checked system PATH and {bundled_path}."
    )


def get_engine():
    """Return an active SimpleEngine instance, starting one if needed."""
    global _engine
    if _engine is not None:
        try:
            # Quick ping to verify process is still alive and responsive
            _engine.ping()
            return _engine
        except Exception:
            cleanup_engine()

    stockfish_path = get_stockfish_path()
    _engine = chess.engine.SimpleEngine.popen_uci(stockfish_path)
    return _engine


def cleanup_engine():
    global _engine
    if _engine is not None:
        try:
            _engine.quit()
        except Exception:
            pass
        _engine = None


board = chess.Board()
atexit.register(cleanup_engine)
