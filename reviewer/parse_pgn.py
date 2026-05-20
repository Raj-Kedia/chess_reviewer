import re


def parse_pgn(pgn_string):
    metadata = {}
    metadata_matches = re.findall(r'\[(\w+)\s+"([^"]+)"\]', pgn_string)
    for key, value in metadata_matches:
        metadata[key] = value

    pgn_moves = re.sub(r"{.*?}", "", pgn_string)
    pgn_moves = re.sub(r"\d+\.", "", pgn_moves)
    pgn_moves = re.sub(r"\[.*?\]", "", pgn_moves)

    moves = pgn_moves.strip().split()

    moves = [move for move in moves if not re.match(
        r"^1-0$|^0-1$|^1/2-1/2$", move) and move != '..']

    return metadata, moves
