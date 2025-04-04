# Chess Game Reviewer

## Overview
Chess Game Reviewer is a web application that allows users to review their chess games by fetching them from Chess.com and Lichess.org or manually inputting games. The application analyzes moves, provides best move suggestions, and offers an interactive game review experience.

## Features
- **Game Import**: Fetch games from Chess.com and Lichess.org or manually input them.
- **Move Analysis**: Highlights best moves, blunders, and inaccuracies with visual indicators.
- **Best Move Suggestions**: Suggests the optimal move with arrows on the board.
- **Move History Display**: Displays all played moves in a structured format.
- **Game Listing**: Users can view and load more games using a 'Load More Games' button.
- **UI Enhancements**: Floating alerts, modals, and accessible navigation.
- **Performance Fixes**:
  - Resolved duplicate fetch requests.
  - Improved modal accessibility.
  - Optimized local storage management.

## Tech Stack
- **Frontend**:
  - JavaScript (No React, Basic CSS for styling)
  - HTML, CSS
  
- **Backend**:
  - Django (for user authentication and game storage
  - Gunicorn (WSGI server for deployment)

## How to Run
### Prerequisites
- Python & Django
- JavaScript-enabled browser

### Setup
1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd chess-game-reviewer
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run Django server:
   ```bash
   python manage.py runserver
   ```
4. Open the frontend in a browser and start reviewing games.

## Future Improvements
- Implement advanced positional evaluation
- Improve best move accuracy
- Enhance UI with better animations and visual indicators
