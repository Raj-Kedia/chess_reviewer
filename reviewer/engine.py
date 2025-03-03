import chess
import chess.pgn
import chess.engine
import os
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
engine_path = os.path.join(BASE_DIR, 'staticfiles',
                           'stockfish', 'stockfish-windows-x86-64-avx2.exe')
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
