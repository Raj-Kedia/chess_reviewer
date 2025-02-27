import re


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
