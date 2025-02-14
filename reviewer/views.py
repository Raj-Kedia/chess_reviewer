from typing import List, Dict, Optional
import chess
import chess.pgn
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse, HttpResponse
import json
import io
import chess.engine
from django.shortcuts import render
import re


def index(request):
    return render(request, 'reviewer/reviewer.html')


engine_path = "D:\study\projects\chess_reviewer\chess_reviewer\stockfish\stockfish-windows-x86-64-avx2.exe"

# Load opening database
with open("static\\resources\\openings.json", "r") as f:
    openings = json.load(f)

# Piece values for evaluation
piece_values = {
    chess.PAWN: 100,
    chess.KNIGHT: 300,
    chess.BISHOP: 320,
    chess.ROOK: 500,
    chess.QUEEN: 900,
    chess.KING: 20000,
}

# Move classifications
classifications = {
    "best": "Best",
    "brilliant": "Brilliant",
    "great": "Great",
    "good": "Good",
    "inaccuracy": "Inaccuracy",
    "mistake": "Mistake",
    "blunder": "Blunder",
    "forced": "Forced",
    "mate": "Mate",
}


def evaluate_position(engine: chess.engine.SimpleEngine, board: chess.Board) -> float:
    """Evaluates the board position using the engine."""
    info = engine.analyse(board, chess.engine.Limit(depth=20))
    score = info["score"].relative
    return score.score(mate_score=100000) if score.is_mate() else score.score()


def classify_move(eval_loss: float) -> str:
    """Classifies move based on centipawn loss."""
    if eval_loss >= 300:
        return classifications["blunder"]
    elif eval_loss >= 100:
        return classifications["mistake"]
    elif eval_loss >= 50:
        return classifications["inaccuracy"]
    return classifications["good"]


def get_opening_name(fen: str) -> Optional[str]:
    """Finds the opening name from the openings database."""
    for opening in openings:
        if opening["fen"] == fen:
            return opening["name"]
    return None


def import_moves_from_pgn(pgn_string: str):
    """
    Reads a PGN string and extracts the list of UCI moves.

    Args:
        pgn_string (str): The PGN string representing the game.

    Returns:
        list: A list of UCI moves from the game.
    """
    pgn = io.StringIO(pgn_string)
    game = chess.pgn.read_game(pgn)

    if not game:
        raise ValueError("Invalid PGN format.")

    board = game.board()
    moves = [move.uci() for move in game.mainline_moves()]

    return moves


def parse_pgn(pgn_string):
    # Extract metadata (headers like [Event], [Site], etc.)
    metadata = {}
    metadata_matches = re.findall(r'\[(\w+)\s+"([^"]+)"\]', pgn_string)
    for key, value in metadata_matches:
        metadata[key] = value

    # Extract move sequences (handles SAN notation)
    move_list = re.findall(r'\d+\.\s*(\S+)\s+(\S+)?', pgn_string)
    moves = []

    for white_move, black_move in move_list:
        moves.append(white_move)  # White's move
        if black_move:  # If Black made a move in this turn
            moves.append(black_move)

    return metadata, moves


@csrf_exempt
def analyze_pgn(request):
    """Analyzes a sequence of moves from either a PGN string or a JSON list and classifies them."""
    if request.method != "POST":
        return JsonResponse({"error": "Invalid request method"}, status=400)

    engine = chess.engine.SimpleEngine.popen_uci(engine_path)
    board = chess.Board()
    analysis_results = []
    prev_eval = 0
    # Determine if input is PGN or a list of moves
    try:
        # Extract PGN data from the request body
        data = json.loads(request.body)
        # Ensure you're sending {"pgn": "your PGN data"}
        pgn_string = data.get("pgn")
        pgn_string.strip()
        if not pgn_string:
            return JsonResponse({"error": "PGN data missing"}, status=400)

        # Convert PGN string into move list
        # pgn_file = io.StringIO(pgn_string)
        # pgn_file.seek(0)
        # print(pgn.read())
        # pgn = open(pgn_file)
        # print(pgn)
        metadata, moves = parse_pgn(pgn_string)
        # game = chess.pgn.read_game(pgn_file)
        # # print(game)
        # if not game:
        #     return JsonResponse({"error": "Invalid PGN format"}, status=400)
        # # print(game.mainline_moves())
        # moves = [move for move in game.mainline_moves()]
        print(moves)
        for move in moves:
            prev_fen = board.fen()
            try:
                board.push_san(move)  # Supports both PGN and UCI moves
            except ValueError:
                engine.quit()
                raise ValueError(f"Invalid move: {move}")

            eval_score = evaluate_position(engine, board)
            eval_loss = prev_eval - eval_score

            classification = classify_move(eval_loss)
            opening_name = get_opening_name(prev_fen)

            analysis_results.append({
                "move": move,
                "classification": classification,
                "eval_loss": eval_loss,
                "opening": opening_name if opening_name else "Unknown"
            })

            prev_eval = eval_score

        engine.quit()
        print(analysis_results)
        return JsonResponse({"analysis_results": analysis_results})

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON format"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
