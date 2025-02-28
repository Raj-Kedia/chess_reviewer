from .prase_pgn import *
from .evaluate_positions import *
from .classifications import *
from .openings import *
from .engine import *
engine = get_engine()


def analyze_pgn(moves, metadata, depthValue):
    analysis = []
    results = {}
    classfication_index = {
        "Brilliant": 0,
        "Great": 1,
        "Best": 2,
        "Excellent": 3,
        "Good": 4,
        "Book": 5,
        "Miss": 6,
        "Inaccuracy": 7,
        "Mistake": 8,
        "Blunder": 9,
        "Forced": 10
    }
    prev_eval = 0
    Black_arr = [0]*11
    White_arr = [0]*11
    opening_name = None
    prev_move_class = None
    try:
        for key, value in metadata.items():
            if key in ['White', 'Black', 'BlackElo', 'WhiteElo']:
                results[key] = value
        board.reset()
        for move in moves:
            try:
                best_move = engine.play(
                    board, chess.engine.Limit(depth=depthValue)).move
                best = board.san(best_move)

                board.push_san(move)
            except ValueError:
                raise ValueError(f"Invalid move: {move}")

            eval_score = evaluate_position(board, depthValue)
            eval_loss = prev_eval - eval_score
            curr_fen = board.fen()
            move_color = curr_fen.split()[1]
            curr_opening = get_opening_name(curr_fen.split()[0])
            if curr_opening:
                opening_name = curr_opening
                classification = classifications['book']
            else:
                opening_name = 'unknown' if not opening_name else opening_name
                classification = classify_move(
                    eval_loss, best_move, board.peek(), eval_score, prev_move_class, depthValue)
            prev_move_class = classification
            if move_color == 'w':
                White_arr[classfication_index[classification]] += 1
            else:
                Black_arr[classfication_index[classification]] += 1
            analysis.append({
                "m": move,
                "class": classification,
                "loss": eval_loss,
                'bm': best,
                "op": opening_name
            })
            prev_eval = eval_score
        total_moves = len(moves)
        white_accuracy = (total_moves-(White_arr[-2] + White_arr[-3] +
                          White_arr[-4] + White_arr[-5])) / total_moves * 100
        black_accuracy = (total_moves - (Black_arr[-2] + Black_arr[-3] +
                          Black_arr[-4] + Black_arr[-5])) / total_moves * 100
        results["white_accuracy"] = round(white_accuracy, 2)
        results["black_accuracy"] = round(black_accuracy, 2)
        results["black_arr"] = Black_arr
        results["white_arr"] = White_arr
        results['total_moves'] = total_moves

        return analysis, results
    except Exception as e:
        raise ValueError(f"Something went wrong: {e}")
