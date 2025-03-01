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


def classify_move(eval_loss, best_move, played_move, played_move_eval, prev_move_class, depthValue):
    if len(list(board.legal_moves)) == 1 and best_move == played_move:
        return classifications["forced"]
    if isinstance(best_move, str):
        best_move = chess.Move.from_uci(best_move)

    if best_move in board.legal_moves:
        board.push(best_move)
        best_move_eval = evaluate_position(
            board, depthValue)
        board.pop()
    else:
        best_move_eval = float("-inf")
    prev_eval = (eval_loss+played_move_eval)
    gain_best = best_move_eval - prev_eval
    gain_played = played_move_eval - prev_eval
    if gain_played < gain_best and eval_loss <= -500:
        return classifications["brilliant"]

    if played_move == best_move:
        if eval_loss <= -150:
            return classifications["great"]
        return classifications["best"]
    if eval_loss <= -50:
        return classifications['excellent']
    if -50 <= eval_loss <= 0:
        return classifications['good']
    if board.is_capture(best_move) and not board.is_capture(played_move) and eval_loss > 0:
        return classifications["miss"]
    if eval_loss >= 50:
        return classifications["inaccuracy"]

    if eval_loss >= 100:
        return classifications["mistake"]

    if prev_move_class and prev_move_class in {"Best", "Great", "Brilliant", "Excellent", "Book", "Forced"} and eval_loss >= 300:
        if prev_eval <= -600:
            return classifications["mistake"]
        if played_move_eval >= 600:
            return classifications["mistake"]
        return classifications["blunder"]
    return classifications["good"]
