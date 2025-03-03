import json
from typing import Optional
import os
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
file_path = os.path.join(BASE_DIR, 'staticfiles',
                         'resources', 'openings.json')
with open(file_path, "r") as f:
    openings = json.load(f)


def get_opening_name(fen: str) -> Optional[str]:
    for opening in openings:
        if opening["fen"] == fen:
            return opening["name"]
    return None
