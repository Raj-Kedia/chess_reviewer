from .engine import *

engine = get_engine()


def evaluate_position(board: chess.Board, depthValue: int) -> float:
    """Evaluates the board position using the engine."""
    print("depht: ", depthValue)
    info = engine.analyse(board, chess.engine.Limit(depth=depthValue))

    print("Debug: Engine analysis info ->", info)  # 🔍 Print the full response

    if "score" not in info:  # Handle missing score
        print("⚠️ Warning: 'score' missing in engine output!")
        return 0  # Default to 0 evaluation

    score = info["score"].relative
    if score is None:
        print("⚠️ Warning: 'relative' score is None!")
        return 0  # Default score if evaluation fails

    return score.score(mate_score=100000) if score.is_mate() else score.score()
