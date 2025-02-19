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
    "excellent": "Excellent",
    "book": "Book",
    "miss": "Miss"
}


def evaluate_position(engine: chess.engine.SimpleEngine, board: chess.Board) -> float:
    """Evaluates the board position using the engine."""
    info = engine.analyse(board, chess.engine.Limit(depth=30))
    score = info["score"].relative
    return score.score(mate_score=100000) if score.is_mate() else score.score()


def classify_move(eval_loss: float, best_move: chess.Move, played_move: chess.Move) -> str:
    if played_move == best_move:
        return classifications["best"]
    elif eval_loss <= -200:
        return classifications["brilliant"]
    elif eval_loss <= -100:
        return classifications["great"]
    elif eval_loss <= -50:
        return classifications["excellent"]
    elif eval_loss >= 100:
        return classifications["mistake"]
    elif eval_loss >= 50:
        return classifications["inaccuracy"]
    elif eval_loss >= 300:
        return classifications["blunder"]
    return classifications["good"]


def get_opening_name(fen: str) -> Optional[str]:
    """Finds the opening name from the openings database."""
    for opening in openings:
        if opening["fen"] == fen:
            return opening["name"]
    return None


def parse_pgn(pgn_string):
    # Extract metadata
    metadata = {}
    metadata_matches = re.findall(r'\[(\w+)\s+"([^"]+)"\]', pgn_string)
    for key, value in metadata_matches:
        metadata[key] = value

    # Remove comments and clock information
    # Remove curly brace annotations
    pgn_moves = re.sub(r"{.*?}", "", pgn_string)
    pgn_moves = re.sub(r"\d+\.", "", pgn_moves)  # Remove move numbers
    pgn_moves = re.sub(r"\[.*?\]", "", pgn_moves)  # Remove metadata

    # Extract moves
    moves = pgn_moves.strip().split()

    # Remove the result (e.g., "1-0", "0-1", "1/2-1/2")
    moves = [move for move in moves if not re.match(
        r"^1-0$|^0-1$|^1/2-1/2$", move) and move != '..']

    return metadata, moves


@csrf_exempt
def analyze_pgn(request):
    """Analyzes a sequence of moves from either a PGN string or a JSON list and classifies them."""
    if request.method != "POST":
        return JsonResponse({"error": "Invalid request method"}, status=400)

    engine = chess.engine.SimpleEngine.popen_uci(engine_path)
    board = chess.Board()
    analysis = []
    results = {}
    classfication_index = {
        "Brilliant": 1,
        "Great": 2,
        "Best": 3,
        "Excellent": 4,
        "Good": 5,
        "Book": 6,
        "Inaccuracy": 7,
        "Mistake": 8,
        "Blunder": 9
    }
    prev_eval = 0
    Black_arr = [0]*10
    White_arr = [0]*10

    try:
        print(request)
        print()
        data = json.loads(request.body)
        print(data)
        print()
        pgn_string = data.get("pgn").strip()
        print(pgn_string)
        print()
        if not pgn_string:
            return JsonResponse({"error": "PGN data missing"}, status=400)

        metadata, moves = parse_pgn(pgn_string)
        for key, value in metadata.items():
            if key in ['White', 'Black', 'BlackElo', 'WhiteElo']:
                results[key] = value
        print(moves)
        for move in moves:
            try:
                best_move = engine.play(
                    board, chess.engine.Limit(depth=20)).move
                best = board.san(best_move)
                board.push_san(move)
            except ValueError:
                engine.quit()
                raise ValueError(f"Invalid move: {move}")
            eval_score = evaluate_position(engine, board)
            eval_loss = prev_eval - eval_score

            curr_fen = board.fen()
            move_color = curr_fen.split()[1]
            classification = classify_move(eval_loss, best_move, board.peek())

            if move_color == 'w':
                White_arr[classfication_index[classification]] += 1
            else:
                Black_arr[classfication_index[classification]] += 1

            analysis.append({
                "move": move,
                "classification": classification,
                "eval_loss": eval_loss,
                'best_move': best
            })
            prev_eval = eval_score

        total_moves = len(moves)
        white_accuracy = (White_arr[1] + White_arr[2] +
                          White_arr[3] + White_arr[4]) / total_moves * 100
        black_accuracy = (Black_arr[1] + Black_arr[2] +
                          Black_arr[3] + Black_arr[4]) / total_moves * 100
        results["white_accuracy"] = round(white_accuracy, 2)
        results["black_accuracy"] = round(black_accuracy, 2)
        results["black_arr"] = Black_arr
        results["white_arr"] = White_arr

        engine.quit()
        print(results)
        print(analysis)
        return JsonResponse({"result": results, "analysis": analysis})

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON format"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
