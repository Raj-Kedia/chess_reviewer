import json
from typing import Optional
with open("static\\resources\\openings.json", "r") as f:
    openings = json.load(f)


def get_opening_name(fen: str) -> Optional[str]:
    for opening in openings:
        if opening["fen"] == fen:
            return opening["name"]
    return None
