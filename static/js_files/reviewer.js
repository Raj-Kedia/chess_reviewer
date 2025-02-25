// Global variables and elements
let pgnData = localStorage.getItem("pgnData");
const analyzeButton = document.getElementById("analyzebutton");
const toggleReviewButton = document.getElementById("toggleReview");
const analyzeWindow = document.getElementById("analyzeWindow");
const resultWindow = document.getElementById("resultWindow");
const moveHistoryWindow = document.getElementById("moveHistoryWindow");
let depthValue = 15;
let nextPageUrl = "./analyze_pgn/";  // Initial API endpoint
let cursor = null;  // Cursor for pagination
const game = new Chess();



document.getElementById("depthSlider").addEventListener("input", function () {
    document.getElementById("depthValue").innerText = this.value;
    depthValue = this.value;
});
analyzeButton.addEventListener("click", function () {
    if (typeof analyzeGame === "function") {
        analyzeWindow.style.display = 'none';
        resultWindow.classList.remove("d-none");
        analyzeGame(true);  // First request with PGN
    }
});

function extractCursor(url) {
    const params = new URLSearchParams(url.split('?')[1]);
    return params.get('cursor');
}

function analyzeGame(firstRequest = false) {
    if (!nextPageUrl) return;  // Stop if no more pages to fetch

    console.log("Fetching:", nextPageUrl, "Cursor:", cursor, depthValue);
    if (!firstRequest) {
        cursor = extractCursor(nextPageUrl); // Extract cursor for pagination
    }
    const requestData = firstRequest
        ? { pgn: pgnData, depth: depthValue }  // Send PGN only in the first request
        : { cursor: cursor };  // Only send cursor in subsequent requests

    fetch(nextPageUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
    })
        .then(response => response.json())
        .then(data => {
            console.log("Server Response:", data);
            if (!data || !data.results) {
                showErrorInGameReviewWindow("Invalid response from server");
                return;
            }

            if (data.results.result) {
                displayGameSummary(data.results.result);
            }
            displayAnalysis(data.results.analysis);
            // Update nextPageUrl and cursor for the next request
            nextPageUrl = data.next || null;  // Ensure we update nextPageUrl

            if (nextPageUrl) {
                analyzeGame();  // Call again for the next page
            }
        })
        .catch(error => {
            showErrorInGameReviewWindow("Error analyzing game:", error);
        });
}

function showErrorInGameReviewWindow(errorMessage) {
    const summaryDiv = document.getElementById("gameSummary");
    summaryDiv.innerHTML = `<p style="color: red;">Error: ${errorMessage}</p>`;
}

function displayGameSummary(results) {
    const classification_types = [
        "Brilliant", "Great", "Best", "Excellent", "Good", "Book", "Inaccuracy", "Mistake", "Miss", "Blunder"
    ];

    const summaryDiv = document.getElementById("gameSummary");

    summaryDiv.innerHTML = `
    <table class="table">
        <thead>
            <tr>
                <th scope="col">Players</th>
                <th scope="col">${results.White}</th>
                <th scope="col"></th>
                <th scope="col">${results.Black}</th>
            </tr>
        </thead>
        <tbody class="table-group-divider">
            <!-- Accuracy Row -->
            <tr>
                <th scope="row">Accuracy</th>
                <td><div class="accuracy-box white">${results.white_accuracy}%</div></td>
                <td></td>
                <td><div class="accuracy-box black">${results.black_accuracy}%</div></td>
            </tr>
            <!-- Move Classifications -->
            ${classification_types.map((classification, index) => `
                <tr>
                    <th scope="row">${classification}</th>
                    <td>${results.white_arr[index] || 0}</td>
                    <td>${getIcon(classification)}</td>
                    <td>${results.black_arr[index] || 0}</td>
                </tr>
            `).join("")}
        </tbody>
    </table>`;
}

function getIcon(classification) {
    const icons = {
        "Brilliant": "brilliant.png",
        "Great": "great.png",
        "Best": "best.png",
        "Excellent": "excellent.png",
        "Good": "good.png",
        "Book": "book.png",
        "Inaccuracy": "inaccuracy.png",
        "Mistake": "mistake.png",
        "Miss": "miss.png",
        "Blunder": "blunder.png"
    };

    const fileName = icons[classification];
    if (!fileName) return "";

    return `<img src="/static/media/${fileName}" alt="${classification}" class="move-icon">`;
}

// Global arrays for storing positions and best move positions
let positions = [];
let best_move_position = [];
let opening_names = []; // Store opening names corresponding to each move index
let move_arr = []

function displayAnalysis(analysisData) {
    const outputDiv = document.getElementById('analysis-output');
    if (!outputDiv) {
        console.error("Error: analysis-output element not found");
        return;
    }
    if (!analysisData || analysisData.length === 0) {
        return;
    }
    // Create or reset the table
    if (!outputDiv.querySelector("table")) {
        outputDiv.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Move Number</th>
                        <th>White Move</th>
                        <th>Black Move</th>
                    </tr>
                </thead>
                <tbody id="analysis-body"></tbody>
            </table>`;
    }
    const tableBody = document.getElementById("analysis-body");
    // Reset arrays
    analysisData.forEach((move, index) => {
        // Store opening name for each move. (Assuming move.opening_name is provided)
        opening_names.push(move.opening_name || "Unknown");

        // For move history table, pair white and black moves
        if (index % 2 === 0) {
            // Create a new row for white move with an empty black move cell
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${Math.floor(move.move_number / 2) + 1}</td>
                <td>${move.move}</td>
                <td id="black-move-${Math.floor(move.move_number / 2)}"></td>
            `;
            tableBody.appendChild(row);
        } else {
            // Fill black move in the corresponding row
            const moveNum = Math.floor(move.move_number / 2);
            const blackMoveCell = document.getElementById(`black-move-${moveNum}`);
            if (blackMoveCell) {
                blackMoveCell.textContent = move.move;
            }
        }

        console.log("Processing move:", move.move);


        // **Process actual move**
        let moveResult = game.move(move.move);
        if (moveResult) {
            let currentFen = game.fen();
            positions.push(currentFen);
        } else {
            positions.push(null);
        }
        game.undo();
        // **Process best move**
        if (move.best_move) {
            let bestmoveResult = game.move(move.best_move);
            if (bestmoveResult) {
                best_move_position.push([bestmoveResult.from, bestmoveResult.to]);
            } else {
                best_move_position.push(null);
            }
            game.undo(); // Undo best move separately
        } else {
            best_move_position.push(null);
        }

        game.move(move.move);
        move_arr.push(move.move) // Undo actual move separately
        console.log(move_arr)
    });

    console.log("Position array updated", positions);
    setupMoveHistoryNavigation(positions, best_move_position);
    // Delay updating board to ensure positions is fully populated
    setTimeout(() => {
        updateBoardToLastMove();
    }, 100);
}

function updateBoardToLastMove() {
    if (positions.length > 0 && positions[positions.length - 1]) {
        board.position(positions[positions.length - 1]);
        playSound(move_arr[move_arr.length - 1]);
        highlightCurrentMove(positions.length - 1);
        updateOpeningDisplay(positions.length - 1);
    }
}

function setupMoveHistoryNavigation(positions, best_move_position) {
    const moveEntries = document.querySelectorAll("#analysis-body tr");
    console.log("inside of setupmovehistorynavigation")
    let idx = 0;
    moveEntries.forEach((entry, index) => {
        entry.querySelectorAll("td").forEach((cell, turn) => {
            cell.addEventListener("click", function () {
                console.log(turn)
                if (turn === 1) idx = 2 * index;
                else if (turn === 2) idx = 2 * index + 1;
                if (positions[idx] && positions[idx] !== null) {
                    board.position(positions[idx]); // Update the same board instance
                    playSound(move_arr[idx]); // Play move sound

                    if (best_move_position[idx] && best_move_position[idx].length === 2) {
                        console.log("Drawing best move arrow:", best_move_position[idx]);
                        showSuggestedMove(...best_move_position[idx]); // Draw arrow
                    } else {
                        console.log("No best move found for index:", idx);
                        clearArrowCanvas();
                    }
                    console.log(positions[idx], turn)
                    console.log(best_move_position[idx], turn)
                    highlightCurrentMove(index, turn);
                    updateOpeningDisplay(idx);
                }
            });
        });
    });
}


// Function to highlight the move in the analysis table
function highlightCurrentMove(index, turn) {
    // Remove existing highlights
    document.querySelectorAll("#analysis-body td").forEach(cell => {
        cell.classList.remove("highlighted-move");
    });

    // Find the correct move cell to highlight
    const moveEntries = document.querySelectorAll("#analysis-body tr");
    if (moveEntries[index]) {
        const moveCells = moveEntries[index].querySelectorAll("td");
        if (moveCells[turn]) {
            moveCells[turn].classList.add("highlighted-move");
        }
    }
}

// Function to update the opening display based on the current move
function updateOpeningDisplay(index) {
    // Assume there is an element with id "current-opening" in your summary area.
    const openingDisplay = document.getElementById("opening_name");
    if (openingDisplay) {
        openingDisplay.textContent = "Opening: " + opening_names[index] || "Unknown Opening";
    }
}

// Clear canvas arrow (if needed)
function clearArrowCanvas() {
    const canvas = document.getElementById("arrowCanvas");
    if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

function showSuggestedMove(from, to) {
    const canvas = document.getElementById("arrowCanvas");
    const boardElement = document.getElementById("board");

    // Set canvas size to match board size
    canvas.width = boardElement.clientWidth;
    canvas.height = boardElement.clientHeight;
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.pointerEvents = "none"; // Prevent blocking clicks

    const ctx = canvas.getContext("2d");

    // Convert chess square (e.g., "e4") to pixel coordinates
    function getSquareCenter(square) {
        const file = square.charCodeAt(0) - 97; // 'a' -> 0, etc.
        const rank = 8 - parseInt(square[1]);  // '8' -> 0, etc.
        const squareSize = canvas.width / 8;
        return {
            x: (file + 0.5) * squareSize,
            y: (rank + 0.5) * squareSize
        };
    }

    const start = getSquareCenter(from);
    const end = getSquareCenter(to);

    // Draw arrow on canvas
    function drawArrow(ctx, from, to) {
        const headLength = 15; // Arrowhead size
        const angle = Math.atan2(to.y - from.y, to.x - from.x);

        ctx.strokeStyle = "green"; // Arrow color
        ctx.lineWidth = 4;

        // Draw line
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();

        // Draw arrowhead
        ctx.beginPath();
        ctx.moveTo(to.x, to.y);
        ctx.lineTo(to.x - headLength * Math.cos(angle - Math.PI / 6),
            to.y - headLength * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(to.x - headLength * Math.cos(angle + Math.PI / 6),
            to.y - headLength * Math.sin(angle + Math.PI / 6));
        ctx.lineTo(to.x, to.y);
        ctx.fillStyle = "green";
        ctx.fill();
    }

    // Clear previous arrow and draw new one
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawArrow(ctx, start, end);
}

// Toggle review panel
if (toggleReviewButton && analyzeWindow && moveHistoryWindow) {
    toggleReviewButton.addEventListener("click", function () {
        analyzeWindow.style.display = "none";
        moveHistoryWindow.style.display = "block";
    });
}

function playSound(sanMove) {
    let soundFile = "move.mp3"; // Default sound
    console.log(sanMove);
    if (sanMove.includes("#")) {
        soundFile = "game_end.mp3"; // Stalemate or Checkmate
    } else if (sanMove.includes("+")) {
        soundFile = "check.mp3"; // Check move
    } else if (sanMove.includes("=")) {
        soundFile = "promote.mp3"; // Promotion
    }
    else if (sanMove.includes("O-O") || sanMove.includes("O-O-O")) {
        soundFile = "castle.mp3"; // Castling
    } else if (sanMove.includes("x")) {
        soundFile = "capture.mp3"; // Capture move
    }

    const sound = new Audio(`/static/media/${soundFile}`); // Assuming sounds are in a 'sounds' folder
    sound.play();
}


// Board initialization and event handlers
document.addEventListener("DOMContentLoaded", function () {
    let moveHistoryStack = [];
    let currentMoveIndex = 0;
    let selectedSquare = null;

    window.board = Chessboard("board", {
        draggable: true,
        position: "start",
        pieceTheme: "https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png",
        onDragStart: highlightMoves,
        onDrop: handleMove,
    });

    if (!pgnData) {
        document.getElementById("pgnStatus").classList.replace("alert-success", "alert-danger");
        document.getElementById("pgnStatus").innerText = "No PGN found!";
    }

    function handleMove(source, target) {
        const move = game.move({ from: source, to: target, promotion: "q" });
        if (move === null) return "snapback";

        selectedSquare = null;
        moveHistoryStack = game.history({ verbose: true });
        currentMoveIndex = moveHistoryStack.length;
        board.position(game.fen());
        updateHistory();
        // Play move sound when user moves piece
        // playSound();
    }

    function highlightMoves(source) {
        clearHighlights();
        selectedSquare = source;
        const moves = game.moves({ square: source, verbose: true });
        moves.forEach((move) => {
            $(`.square-${move.to}`).addClass("highlight-square");
        });
    }

    function clearHighlights() {
        $(".square-55d63").removeClass("highlight-square");
    }

    $("#board").on("click", ".square", function () {
        const clickedSquare = $(this).attr("data-square");

        if (clickedSquare === selectedSquare) {
            clearHighlights();
            selectedSquare = null;
        } else {
            selectedSquare = clickedSquare;
            clearHighlights();
            highlightMoves(clickedSquare);
        }
    });

    function updateHistory() {
        let history = game.history({ verbose: true });
        let formattedHistory = "";
        for (let i = 0; i < history.length; i += 2) {
            let whiteMove = history[i] ? history[i].san : "";
            let blackMove = history[i + 1] ? history[i + 1].san : "";
            formattedHistory += `${i / 2 + 1}. ${whiteMove} ${blackMove}<br>`;
        }
        document.getElementById("moveHistory").innerHTML = formattedHistory;
    }

    document.getElementById("flipBoard").addEventListener("click", function () {
        board.flip();
    });

    document.getElementById("startPosition").addEventListener("click", function () {
        currentMoveIndex = 0;
        game.reset();
        board.position("start");
    });

    document.getElementById("undoMove").addEventListener("click", function () {
        if (currentMoveIndex > 0) {
            currentMoveIndex--;
            // Only update board position, not move history.
            const targetFen = moveHistoryStack[currentMoveIndex] ? game.load(moveHistoryStack[currentMoveIndex]) : "start";
            board.position(game.fen());
            moveSound.play();
        }
    });

    document.getElementById("redoMove").addEventListener("click", function () {
        if (currentMoveIndex < moveHistoryStack.length) {
            game.move(moveHistoryStack[currentMoveIndex]);
            currentMoveIndex++;
            board.position(game.fen());
            moveSound.play();
        }
    });

    document.getElementById("endPosition").addEventListener("click", function () {
        board.position(positions[positions.length - 1]);
        moveSound.play();
    });

});
