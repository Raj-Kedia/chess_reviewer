from .parse_pgn import *
from .evaluate_positions import *
from .classifications import *
from .openings import *
from .engine import *


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
    
    engine = get_engine()
    Black_arr = [0]*11
    White_arr = [0]*11
    opening_name = None
    prev_move_class = None
    
    try:
        for key, value in metadata.items():
            if key in ['White', 'Black', 'BlackElo', 'WhiteElo']:
                results[key] = value
                
        board.reset()
        score_white_before = evaluate_position(board, depthValue)
        
        for move in moves:
            try:
                # Get engine's best move in the current position
                best_move = engine.play(
                    board, chess.engine.Limit(depth=depthValue)).move
                best = board.san(best_move)
            except Exception as e:
                raise ValueError(f"Engine play error: {e}")

            # Determine moving player and their before evaluation
            who_moved = board.turn
            if who_moved == chess.WHITE:
                eval_before = score_white_before
            else:
                eval_before = -score_white_before

            # Play actual move
            try:
                board.push_san(move)
            except ValueError:
                raise ValueError(f"Invalid move: {move}")

            # Evaluate position after the move
            score_white_after = evaluate_position(board, depthValue)
            
            if who_moved == chess.WHITE:
                eval_after = score_white_after
            else:
                eval_after = -score_white_after

            eval_best = eval_before
            eval_loss = eval_best - eval_after
            
            # Identify opening and classify the move
            curr_fen = board.fen()
            curr_opening = get_opening_name(curr_fen.split()[0])
            
            played_move = board.peek()
            board.pop() # Temporarily pop to inspect board state at P_i in classify_move
            
            if curr_opening:
                opening_name = curr_opening
                classification = classifications['book']
            else:
                opening_name = 'unknown' if not opening_name else opening_name
                classification = classify_move(
                    board=board,
                    played_move=played_move,
                    best_move=best_move,
                    eval_before=eval_before,
                    eval_after=eval_after,
                    eval_best=eval_best,
                    prev_move_class=prev_move_class
                )
                
            board.push(played_move) # Push the move back to return to P_{i+1}
            prev_move_class = classification
            
            # Increment correct player's classification array
            if who_moved == chess.WHITE:
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
            score_white_before = score_white_after
            
        total_moves = len(moves)
        white_moves_count = sum(White_arr)
        black_moves_count = sum(Black_arr)
        
        if white_moves_count > 0:
            white_accuracy = (white_moves_count - (White_arr[9] + White_arr[8] +
                              White_arr[7] + White_arr[6])) / white_moves_count * 100
        else:
            white_accuracy = 100.0
            
        if black_moves_count > 0:
            black_accuracy = (black_moves_count - (Black_arr[9] + Black_arr[8] +
                              Black_arr[7] + Black_arr[6])) / black_moves_count * 100
        else:
            black_accuracy = 100.0
            
        results["white_accuracy"] = round(white_accuracy, 2)
        results["black_accuracy"] = round(black_accuracy, 2)
        results["black_arr"] = Black_arr
        results["white_arr"] = White_arr
        results['total_moves'] = total_moves
        atexit.register(cleanup_engine)

        return analysis, results
    except Exception as e:
        atexit.register(cleanup_engine)
        raise ValueError(f"Something went wrong: {e}")
