import chess
import chess.pgn
import chess.engine

engine_path = r"D:\study\projects\chess_reviewer\chess_reviewer\stockfish\stockfish-windows-x86-64-avx2.exe"
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
