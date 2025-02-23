let pgnData = localStorage.getItem("pgnData");
const analyzeButton = document.getElementById("analyzebutton");
const toggleReviewButton = document.getElementById("toggleReview");
const analyzeWindow = document.getElementById("analyzeWindow");
const resultWindow = document.getElementById("resultWindow");
const moveHistoryWindow = document.getElementById("moveHistoryWindow");
let depthValue = 15;
let nextPageUrl = "./analyze_pgn/";  // Initial API endpoint
let cursor = null;  // Cursor for pagination

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

            console.log('HEllo error is after')
            if (data.results.result) { displayGameSummary(data.results.result); }
            console.log('HEllo error is after display Game summary')
            displayAnalysis(data.results.analysis);
            console.log('HEllo error is after display Game summary and display analysis')
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

// Store FEN states for move history navigation
let positions = [];
function displayAnalysis(analysisData) {
    const outputDiv = document.getElementById('analysis-output');
    if (!outputDiv) {
        console.error("Error: analysis-output element not found");
        return;
    }

    if (!analysisData || analysisData.length === 0) {
        return;
    }

    const resultTable = outputDiv.querySelector("table");
    if (!resultTable) {
        outputDiv.innerHTML = `
            <table>
                <tr>
                    <th>Move</th>
                    <th>Classification</th>
                    <th>Suggestion</th>
                    <th>Opening</th>
                </tr>
            </table>`;
    }

    analysisData.forEach((move, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${move.move_number % 2 === 0 ? (Math.floor(move.move_number / 2) + 1) + ". " : ""}${move.move}</td>
            <td>${move.classification}</td>
            <td>${move.best_move}</td>
            <td>${move.opening_name}</td>
        `;
        positions.push(move.fen);
        outputDiv.querySelector("table").appendChild(row);
    });
}

// Ensure board starts at the last move
function updateBoardToLastMove() {
    if (positions.length > 0) {
        board.position(positions[positions.length - 1]);
    }
}

// Allow clicking on a move to update the board position
function setupMoveHistoryNavigation() {
    const moveEntries = document.querySelectorAll("#analysis-output tr");

    moveEntries.forEach((entry, index) => {
        entry.addEventListener("click", function () {
            if (positions[index]) {
                board.position(positions[index]);
            }
        });
    });
}

// Show classification icon on the last moved piece
function showClassificationIcon(square, classification) {
    let pieceElement = document.querySelector(`.square-${square}`);
    if (!pieceElement) return;

    let icon = document.createElement("img");
    icon.src = `/static/media/${classification}.png`;
    icon.classList.add("classification-icon");

    pieceElement.appendChild(icon);
}

// Display suggested move arrow
function showSuggestedMove(from, to) {
    board.addArrow({ from: from, to: to, color: 'blue' });
}

if (toggleReviewButton && analyzeWindow && moveHistoryWindow) {
    toggleReviewButton.addEventListener("click", function () {
        analyzeWindow.style.display = "none";
        moveHistoryWindow.style.display = "block";
    });
}



document.addEventListener("DOMContentLoaded", function () {
    const game = new Chess();
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
            game.reset();
            for (let i = 0; i < currentMoveIndex; i++) {
                game.move(moveHistoryStack[i]);
            }
            board.position(game.fen());
        }
    });

    document.getElementById("redoMove").addEventListener("click", function () {
        if (currentMoveIndex < moveHistoryStack.length) {
            game.move(moveHistoryStack[currentMoveIndex]);
            currentMoveIndex++;
            board.position(game.fen());
        }
    });

    document.getElementById("endPosition").addEventListener("click", function () {
        game.reset();
        moveHistoryStack.forEach((move) => game.move(move));
        currentMoveIndex = moveHistoryStack.length;
        board.position(game.fen());
    });

});
