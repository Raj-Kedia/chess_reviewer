from .engine import *
from .evaluate_positions import *

classifications = {
    "best": "Best",
    "brilliant": "Brilliant",
    "great": "Great",
    "good": "Good",
    "inaccuracy": "Inaccuracy",
    "mistake": "Mistake",
    "blunder": "Blunder",
    "forced": "Forced",
    "excellent": "Excellent",
    "book": "Book",
    "miss": "Miss"
}


def classify_move(board, played_move, best_move, eval_before, eval_after, eval_best, prev_move_class):
    if len(list(board.legal_moves)) == 1 and played_move == best_move:
        return classifications["forced"]

    eval_loss = eval_best - eval_after

    # Brilliant: Heuristic for moves that improve position evaluation significantly
    if eval_after - eval_before >= 300:
        return classifications["brilliant"]

    # Great: Best move that significantly improves the position
    if played_move == best_move and eval_after - eval_before >= 100:
        return classifications["great"]

    # Best: Played the engine's best move
    if played_move == best_move:
        return classifications["best"]

    # Miss: Missed a tactical opportunity (best move is a capture, but played move was not, and resulted in a significant loss)
    if board.is_capture(best_move) and not board.is_capture(played_move) and eval_loss >= 100:
        return classifications["miss"]

    # Blunder: Major mistake (loss of > 3.0 pawns)
    if eval_loss >= 300:
        if prev_move_class and prev_move_class in {"Best", "Great", "Brilliant", "Excellent", "Book", "Forced"}:
            if eval_before <= -600 or eval_after >= 600:
                return classifications["mistake"]
            return classifications["blunder"]
        return classifications["blunder"]

    # Mistake: Medium mistake (loss of 1.0 to 3.0 pawns)
    if eval_loss >= 100:
        return classifications["mistake"]

    # Inaccuracy: Minor mistake (loss of 0.5 to 1.0 pawns)
    if eval_loss >= 50:
        return classifications["inaccuracy"]

    # Excellent: Very good move (loss of <= 0.2 pawns)
    if eval_loss <= 20:
        return classifications["excellent"]

    # Good: Fine move (loss of 0.2 to 0.5 pawns)
    return classifications["good"]
