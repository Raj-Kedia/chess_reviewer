import chess
import chess.pgn
import chess.engine

engine_path = r"D:\study\projects\chess_reviewer\chess_reviewer\stockfish\stockfish-windows-x86-64-avx2.exe"
engine = None  # Initialize as None to handle restarts


def get_engine():
    global engine
    try:
        # If engine is None, start a new instance
        if engine is None:
            engine = chess.engine.SimpleEngine.popen_uci(engine_path)
        else:
            # Test if engine is still responsive
            engine.ping()
    except (chess.engine.EngineTerminatedError, chess.engine.EngineError):
        # If engine crashed or failed, restart it
        engine = chess.engine.SimpleEngine.popen_uci(engine_path)

    return engine


board = chess.Board()
