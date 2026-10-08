from django.test import TestCase
from .parse_pgn import parse_pgn
from .openings import get_opening_name
from .analyze import analyze_pgn
import chess


class ChessReviewerTests(TestCase):
    def test_parse_pgn(self):
        pgn = '[Event "Casual Game"]\n[White "Player1"]\n[Black "Player2"]\n\n1. e4 e5 2. Nf3 Nc6 1-0'
        metadata, moves = parse_pgn(pgn)
        self.assertEqual(metadata.get("White"), "Player1")
        self.assertEqual(metadata.get("Black"), "Player2")
        self.assertEqual(moves, ["e4", "e5", "Nf3", "Nc6"])

    def test_get_opening_name(self):
        # Test full vs partial FEN matching
        # Ruy Lopez opening: r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 1
        name = get_opening_name("r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 1 3")
        self.assertIsNotNone(name)
        self.assertIn("Ruy Lopez", name)

    def test_analyze_pgn(self):
        # A simple standard game: 1. e4 e5
        moves = ["e4", "e5"]
        metadata = {"White": "Player1", "Black": "Player2"}
        analysis, results = analyze_pgn(moves, metadata, depthValue=5)
        
        self.assertEqual(len(analysis), 2)
        self.assertEqual(results["total_moves"], 2)
        self.assertIn("white_accuracy", results)
        self.assertIn("black_accuracy", results)
        self.assertEqual(len(results["white_arr"]), 11)
        self.assertEqual(len(results["black_arr"]), 11)
