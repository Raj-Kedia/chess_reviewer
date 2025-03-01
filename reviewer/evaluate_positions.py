from .engine import *

engine = get_engine()


def evaluate_position(board: chess.Board, depthValue: int) -> float:
    """Evaluates the board position using the engine."""
    info = engine.analyse(board, chess.engine.Limit(depth=depthValue))

    if "score" not in info:
        return 0

    score = info["score"].relative
    if score is None:
        return 0

    return score.score(mate_score=100000) if score.is_mate() else score.score()
