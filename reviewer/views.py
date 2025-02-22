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
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.pagination import CursorPagination
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from .models import *
from .serializer import *
from django.db import connection


def index(request):
    return render(request, 'reviewer/reviewer.html')


engine_path = "D:\study\projects\chess_reviewer\chess_reviewer\stockfish\stockfish-windows-x86-64-avx2.exe"

# Load opening database
with open("static\\resources\\openings.json", "r") as f:
    openings = json.load(f)

engine = chess.engine.SimpleEngine.popen_uci(engine_path)
board = chess.Board()
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

    print("Debug: Engine analysis info ->", info)  # 🔍 Print the full response

    if "score" not in info:  # Handle missing score
        print("⚠️ Warning: 'score' missing in engine output!")
        return 0  # Default to 0 evaluation

    score = info["score"].relative
    if score is None:
        print("⚠️ Warning: 'relative' score is None!")
        return 0  # Default score if evaluation fails

    return score.score(mate_score=100000) if score.is_mate() else score.score()


def classify_move(eval_loss, best_move, played_move, played_move_eval, prev_move_class):
    print("start")
    if len(list(board.legal_moves)) == 1 and best_move == played_move:
        return classifications["forced"]
    print("going to evaluate best move")
    if isinstance(best_move, str):  # Ensure it's a Move object
        best_move = chess.Move.from_uci(best_move)

    if best_move in board.legal_moves:  # Safety check
        board.push(best_move)  # Play best move
        best_move_eval = evaluate_position(
            engine, board)  # Evaluate new position
        board.pop()  # Undo the move
    else:
        # If best move is illegal (shouldn't happen)
        best_move_eval = float("-inf")
    prev_eval = (eval_loss+played_move_eval)
    gain_best = best_move_eval - prev_eval
    gain_played = played_move_eval - prev_eval
    print("Started classificaiton")
    if gain_played < gain_best:
        return classifications["brilliant"]

    if played_move == best_move:
        if gain_best >= 150:
            return classifications["great"]
        return classifications["best"]
    if eval_loss <= -50:
        return classifications['excellent']
    if -50 <= eval_loss <= 0:
        return classifications['good']
    print('Till now no error!!')
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


def get_opening_name(fen: str) -> Optional[str]:
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


def analyze_pgn(moves, metadata):
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
        print(moves)
        board.reset()
        for move in moves:
            try:
                best_move = engine.play(
                    board, chess.engine.Limit(depth=20)).move
                best = board.san(best_move)
                print(type(best), type(best_move))

                board.push_san(move)
            except ValueError:
                engine.quit()
                raise ValueError(f"Invalid move: {move}")

            print("best move calcualated")
            eval_score = evaluate_position(engine, board)
            eval_loss = prev_eval - eval_score
            print('postion evaluated')
            curr_fen = board.fen()
            move_color = curr_fen.split()[1]
            curr_opening = get_opening_name(curr_fen.split()[0])
            print("opening name done")
            print(opening_name, curr_opening)
            if curr_opening:
                opening_name = curr_opening
                classification = classifications['book']
            else:
                opening_name = 'unknown' if not opening_name else opening_name
                classification = classify_move(
                    eval_loss, best_move, board.peek(), eval_score, prev_move_class)
            prev_move_class = classification
            print("classification is also done")
            print(move_color)
            print(classification)
            print(classfication_index[classification])
            print(White_arr[classfication_index[classification]])
            print(Black_arr[classfication_index[classification]])
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
        print("completed analysis per move")
        total_moves = len(moves)
        white_accuracy = (total_moves-(White_arr[-2] + White_arr[-3] +
                          White_arr[-4] + White_arr[-5])) / total_moves * 100
        black_accuracy = (total_moves - (Black_arr[-2] + Black_arr[-3] +
                          Black_arr[-4] + Black_arr[-5])) / total_moves * 100
        results["white_accuracy"] = round(white_accuracy, 2)
        results["black_accuracy"] = round(black_accuracy, 2)
        results["black_arr"] = Black_arr
        results["white_arr"] = White_arr

        engine.quit()
        print(results)
        print(analysis)
        return analysis, results
    except Exception as e:
        raise ValueError(f"Something went wrong: {e}")


class MoveCursorPagination(CursorPagination):
    page_size = 10
    ordering = "id"  # Ensure ordering by created_at


@method_decorator(csrf_exempt, name='dispatch')
class AnalyzePGNView(APIView):
    """Handles PGN analysis and returns move classifications."""
    pagination_class = MoveCursorPagination

    def post(self, request):
        """Processes PGN input and returns analysis with move classifications."""
        try:
            data = request.data
            pgn_string = cursor = None
            if data.get("pgn"):
                pgn_string = data.get("pgn", "").strip()
            if data.get("cursor", ''):
                cursor = data.get("cursor", '').strip()
            if not pgn_string and not cursor:
                return Response({"error": "PGN data missing"}, status=status.HTTP_400_BAD_REQUEST)
            # Parse PGN
            if pgn_string:
                MoveAnalysis.objects.all().delete()

                with connection.cursor() as cursor:
                    cursor.execute(
                        "DELETE FROM sqlite_sequence WHERE name='reviewer_moveanalysis';")

                metadata, moves = parse_pgn(pgn_string)

                # Process moves
                analysis, results = analyze_pgn(moves, metadata)
                # Paginate response
                print(analysis)

                for idx, move_data in enumerate(analysis):
                    MoveAnalysis.objects.create(
                        move_number=idx,
                        move=move_data['m'],
                        loss=move_data['loss'],
                        best_move=move_data['bm'],
                        opening_name=move_data['op'],
                        classification=move_data['class']
                    )
                    print(move_data)
                # Paginate using a QuerySet instead of a list
                paginator = self.pagination_class()
                queryset = MoveAnalysis.objects.all().order_by(
                    "id")  # Ensure ordering
                result_page = paginator.paginate_queryset(queryset, request)

                return paginator.get_paginated_response({
                    "result": results,
                    "analysis": MoveAnalysisSerializer(result_page, many=True).data,
                })
            else:
                paginator = self.pagination_class()
                queryset = MoveAnalysis.objects.all().order_by("id")
                result_page = paginator.paginate_queryset(queryset, request)

                return paginator.get_paginated_response({
                    "analysis": MoveAnalysisSerializer(result_page, many=True).data,
                })

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
