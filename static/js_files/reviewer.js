let pgnData = localStorage.getItem("pgnData");
const analyzeButton = document.getElementById("analyzebutton");
const toggleReviewButton = document.getElementById("toggleReview");
const analyzeWindow = document.getElementById("analyzeWindow");
const resultWindow = document.getElementById("resultWindow");
const moveHistoryWindow = document.getElementById("moveHistoryWindow");
let depthValue = 20;
let nextPageUrl = "./analyze_pgn/";
let cursor = null;
const game = new Chess();
let currentMoveIndex = 0;
const playerWhite = document.getElementById("1-username");
const playerBlack = document.getElementById("0-username");
playerBlack.innerHTML = '';
playerWhite.innerHTML = '';
const loaderOverlay = document.getElementById("loader-overlay");
let total_moves = 0;

let positions = [];
let best_move_position = [];
let opening_names = [];
let move_arr = []
let classification_arr = [];


function showAlert(message, type = "primary") {
    let existingAlert = document.getElementById("floatingAlert");
    if (existingAlert) {
        existingAlert.remove();
    }

    let alertDiv = document.createElement("div");
    alertDiv.id = "floatingAlert";
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.setAttribute("role", "alert");
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;


    alertDiv.style.position = "fixed";
    alertDiv.style.top = "20px";
    alertDiv.style.right = "20px";
    alertDiv.style.width = "25%";
    alertDiv.style.zIndex = "1050";
    alertDiv.style.boxShadow = "0px 4px 6px rgba(0, 0, 0, 0.1)";

    document.body.appendChild(alertDiv);


    setTimeout(() => {
        alertDiv.classList.remove("show");
        setTimeout(() => alertDiv.remove(), 500);
    }, 5000);
}
document.getElementById("depthSlider").addEventListener("input", function () {
    document.getElementById("depthValue").innerText = this.value;
    depthValue = this.value;
});
analyzeButton.addEventListener("click", function () {
    if (typeof analyzeGame === "function") {
        analyzeWindow.style.display = 'none';
        resultWindow.style.display = 'block';
        analyzeGame(true);
    }
});

function extractCursor(url) {
    const params = new URLSearchParams(url.split('?')[1]);
    return params.get('cursor');
}
function getCSRFToken() {
    return document.cookie.split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];
}
function analyzeGame(firstRequest = false) {
    if (!nextPageUrl) { return; }

    if (!firstRequest) {
        cursor = extractCursor(nextPageUrl);
    }

    const requestData = firstRequest
        ? { pgn: pgnData, depth: depthValue }
        : { cursor: cursor };

    if (firstRequest) {
        loaderOverlay.style.display = "flex";
        document.body.classList.add("loading");
    }

    fetch(nextPageUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify(requestData),
    })
        .then(response => response.json())
        .then(data => {
            if (!data || !data.results) {
                showAlert(data.error, "danger");
                loaderOverlay.style.display = 'none';
                document.body.classList.remove('loading');
                return;
            }

            if (firstRequest) {
                loaderOverlay.style.display = "none";
                document.body.classList.remove("loading");
            }

            if (data.results.result) {
                total_moves = data.results.result.total_moves;
                displayGameSummary(data.results.result);
            }
            displayAnalysis(data.results.analysis);
            nextPageUrl = data.next || null;

            if (nextPageUrl) {
                analyzeGame();
            }
        })
        .catch(error => {
            showAlert("Error in analyzing game:" + error, 'danger');

            loaderOverlay.style.display = "none";
            document.body.classList.remove("loading");
        });
}


function showErrorInGameReviewWindow(errorMessage) {
    const summaryDiv = document.getElementById("gameSummary");
    summaryDiv.innerHTML = `<p style="color: red;">Error: ${errorMessage}</p>`;
}

function displayGameSummary(results) {
    const classification_types = [
        "Brilliant", "Great", "Best", "Excellent", "Good", "Forced", "Book", "Inaccuracy", "Mistake", "Miss", "Blunder"
    ];
    const color_index = {
        "Brilliant": "Teal",
        "Great": "Dark_Blue",
        "Best": "Olive_Green",
        "Excellent": "Green",
        "Good": "Muted_Green",
        "Forced": "Black",
        "Book": "Brown",
        "Inaccuracy": "Yellow_Orange",
        "Mistake": "Orange",
        "Miss": "Red",
        "Blunder": "Dark_Red",
    }
    const summaryDiv = document.getElementById("gameSummary");
    playerWhite.innerHTML = `
    <img src="/static/media/pawn_profile.svg" alt="profile" width="40px" height="40px">
    <strong>${results.White} (${results.WhiteElo})</strong>
`;

    playerBlack.innerHTML = `
    <img src="/static/media/pawn_profile.svg" alt="profile" width="40px" height="40px">
    <strong>${results.Black} (${results.BlackElo})</strong>
`;

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
            ${classification_types.map((classification, index) => {
        const whiteColor = color_index[classification];
        const blackColor = color_index[classification];

        return `
                    <tr>
                        <th scope="row" style="text-align: center; vertical-align: middle;">${classification}</th>
                        <td style="text-align: center; vertical-align: middle; color: ${whiteColor};"><strong>${results.white_arr[index]}</strong></td>
                        <td style="text-align: center; vertical-align: middle;">${getIcon(classification)}</td>
                        <td style="text-align: center; vertical-align: middle; color: ${blackColor};"><strong>${results.black_arr[index]}</strong></td>
                    </tr>
                `;
    }).join("")}
            
            
        </tbody>
    </table>`;
}

const icons = {
    "Brilliant": "brilliant.svg",
    "Great": "great.svg",
    "Best": "best.svg",
    "Excellent": "excellent.svg",
    "Good": "good.svg",
    "Forced": "forced.svg",
    "Book": "book.svg",
    "Inaccuracy": "inaccuracy.svg",
    "Mistake": "mistake.svg",
    "Miss": "miss.svg",
    "Blunder": "blunder.svg"
};

function getIcon(classification) {

    const fileName = icons[classification];
    if (!fileName) return "";

    return `<img src="/static/media/${fileName}" alt="${classification}" class="move-icon" width='30px' height='30px'>`;
}


function displayAnalysis(analysisData) {
    const outputDiv = document.getElementById('moveDetails');
    if (!outputDiv) {
        return;
    }
    if (!analysisData || analysisData.length === 0) {
        return;
    }
    if (!outputDiv.querySelector("table")) {
        outputDiv.innerHTML = `
            <table>
                <thead>
                    <tr>
                    </tr>
                </thead>
                <tbody id="analysis-body"></tbody>
            </table>`;
    }
    const tableBody = document.getElementById("analysis-body");
    analysisData.forEach((move, index) => {
        opening_names.push(move.opening_name || "Unknown");

        if (index % 2 === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${Math.floor(move.move_number / 2) + 1}</td>
                <td>${move.move}</td>
                <td id="black-move-${Math.floor(move.move_number / 2)}"></td>
            `;
            tableBody.appendChild(row);
        } else {
            const moveNum = Math.floor(move.move_number / 2);
            const blackMoveCell = document.getElementById(`black-move-${moveNum}`);
            if (blackMoveCell) {
                blackMoveCell.textContent = move.move;
            }
        }
        let moveResult = game.move(move.move);
        if (moveResult) {
            let currentFen = game.fen();
            positions.push(currentFen);
        } else {
            positions.push(null);
        }
        game.undo();
        if (move.best_move) {
            let bestmoveResult = game.move(move.best_move);
            if (bestmoveResult) {
                best_move_position.push([bestmoveResult.from, bestmoveResult.to]);
            } else {
                best_move_position.push(null);
            }
            game.undo();
        } else {
            best_move_position.push(null);
        }
        game.move(move.move);
        move_arr.push(move.move)
        classification_arr.push(move.classification);
    });
    if (move_arr.length >= total_moves) {
        setupMoveHistoryNavigation(positions, best_move_position);
        setTimeout(() => {
            updateBoardToLastMove();
        }, 100);
    }
}

function updateBoardToLastMove() {
    if (positions.length > 0 && positions[positions.length - 1]) {
        board.position(positions[positions.length - 1]);
        playSound(move_arr[move_arr.length - 1]);
        highlightCurrentMove(positions.length - 1);
        updateOpeningDisplay(positions.length - 1);
        addClassificationIcon(move_arr.length - 1, move_arr[move_arr.length - 1], classification_arr[classification_arr.length - 1])

    }
}

function setupMoveHistoryNavigation(positions, best_move_position) {
    const moveEntries = document.querySelectorAll("#analysis-body tr");

    moveEntries.forEach((entry, index) => {
        entry.querySelectorAll("td").forEach((cell, turn) => {
            cell.addEventListener("click", function () {
                let idx = turn === 1 ? 2 * index : 2 * index + 1;
                if (positions[idx] && positions[idx] !== null) {
                    board.position(positions[idx]);
                    playSound(move_arr[idx]);

                    if (best_move_position[idx] && best_move_position[idx].length === 2) {
                        showSuggestedMove(...best_move_position[idx]);
                    } else {
                        clearArrowCanvas();
                    }
                    highlightCurrentMove(index, turn);
                    updateOpeningDisplay(idx);
                    addClassificationIcon(idx, move_arr[idx], classification_arr[idx]);
                }
            });
        });
    });
}


function highlightCurrentMove(index, turn) {
    document.querySelectorAll("#analysis-body td").forEach(cell => {
        cell.classList.remove("highlighted-move");
    });

    const moveEntries = document.querySelectorAll("#analysis-body tr");
    if (moveEntries[index]) {
        const moveCells = moveEntries[index].querySelectorAll("td");
        currentMoveIndex = 2 * index + (turn - 1);
        if (moveCells[turn]) {
            moveCells[turn].classList.add("highlighted-move");
        }
    }
}

function updateOpeningDisplay(index) {
    const openingDisplay = document.getElementById("opening_name");
    if (openingDisplay) {
        openingDisplay.textContent = "Opening: " + opening_names[index] || "Unknown Opening";
    }
}

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

    canvas.width = boardElement.clientWidth;
    canvas.height = boardElement.clientHeight;
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.pointerEvents = "none";

    const ctx = canvas.getContext("2d");

    function getSquareCenter(square) {
        const file = square.charCodeAt(0) - 97;
        const rank = 8 - parseInt(square[1]);
        const squareSize = canvas.width / 8;
        return {
            x: (file + 0.5) * squareSize,
            y: (rank + 0.5) * squareSize
        };
    }

    const start = getSquareCenter(from);
    const end = getSquareCenter(to);

    function drawArrow(ctx, from, to) {
        const headLength = 15;
        const angle = Math.atan2(to.y - from.y, to.x - from.x);

        ctx.strokeStyle = "green";
        ctx.lineWidth = 4;

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();

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

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawArrow(ctx, start, end);
}

if (toggleReviewButton && analyzeWindow && moveHistoryWindow) {
    toggleReviewButton.addEventListener("click", function () {
        analyzeWindow.style.display = "none";
        moveHistoryWindow.style.display = "block";
    });
}

function playSound(sanMove) {
    let soundFile = "move.mp3";
    if (sanMove.includes("#")) {
        soundFile = "game_end.mp3";
    } else if (sanMove.includes("+")) {
        soundFile = "check.mp3";
    } else if (sanMove.includes("=")) {
        soundFile = "promote.mp3";
    }
    else if (sanMove.includes("O-O") || sanMove.includes("O-O-O")) {
        soundFile = "castle.mp3";
    } else if (sanMove.includes("x")) {
        soundFile = "capture.mp3";
    }
    else {
        soundFile = "move.mp3";
    }

    const sound = new Audio(`/static/media/${soundFile}`);
    sound.play();
}

function getDestinationSquare(idx, move) {
    let isWhiteTurn = false;
    if ((idx & 1) === 0) isWhiteTurn = true;
    if (move === "O-O") return isWhiteTurn ? "g1" : "g8";
    if (move === "O-O-O") return isWhiteTurn ? "c1" : "c8";

    let match = move.match(/[a-h][1-8](?=[+#]?)/);
    return match ? match[0] : null;
}


document.addEventListener("DOMContentLoaded", function () {
    let moveHistoryStack = [];
    let selectedSquare = null;

    window.board = Chessboard("board", {
        draggable: true,
        position: "start",
        pieceTheme: "https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png",
        onDragStart: highlightMoves,
        onDrop: handleMove,
    });

    if (!pgnData) {
        showAlert("No PGN provided", 'warning');
    }
    else {
        showAlert("PGN prased successfully", 'success');
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
        let temp = playerWhite.innerHTML;
        playerWhite.innerHTML = playerBlack.innerHTML;
        playerBlack.innerHTML = temp;

    });

    document.getElementById("startPosition").addEventListener("click", function () {
        idx = 0
        board.position(positions[idx]);
        playSound(move_arr[idx]);

        if (best_move_position[idx] && best_move_position[idx].length === 2) {
            showSuggestedMove(...best_move_position[idx]);
        } else {
            clearArrowCanvas();
        }
        if (idx & 1) { turn = 2; index = (idx - 1) / 2; }
        else { turn = 1; index = idx / 2; }
        highlightCurrentMove(index, turn);
        updateOpeningDisplay(idx);
        addClassificationIcon(idx, move_arr[idx], classification_arr[idx]);
    });

    document.getElementById("undoMove").addEventListener("click", function () {
        idx = currentMoveIndex - 1;
        if (idx < 0) {
            return;
        }
        board.position(positions[idx]);
        playSound(move_arr[idx]);

        if (best_move_position[idx] && best_move_position[idx].length === 2) {
            showSuggestedMove(...best_move_position[idx]);
        } else {
            clearArrowCanvas();
        }
        if (idx & 1) { turn = 2; index = (idx - 1) / 2; }
        else { turn = 1; index = idx / 2; }
        highlightCurrentMove(index, turn);
        updateOpeningDisplay(idx);
        addClassificationIcon(idx, move_arr[idx], classification_arr[idx]);
    });

    document.getElementById("redoMove").addEventListener("click", function () {
        idx = currentMoveIndex + 1;
        if (idx >= positions.length) {
            return;
        }
        board.position(positions[idx]);
        playSound(move_arr[idx]);

        if (best_move_position[idx] && best_move_position[idx].length === 2) {
            showSuggestedMove(...best_move_position[idx]);
        } else {
            clearArrowCanvas();
        }
        if (idx & 1) { turn = 2; index = (idx - 1) / 2; }
        else { turn = 1; index = idx / 2; }
        highlightCurrentMove(index, turn);
        updateOpeningDisplay(idx);
        addClassificationIcon(idx, move_arr[idx], classification_arr[idx]);
    });

    document.getElementById("endPosition").addEventListener("click", function () {
        idx = positions.length - 1
        board.position(positions[idx]);
        playSound(move_arr[idx]);

        if (best_move_position[idx] && best_move_position[idx].length === 2) {
            showSuggestedMove(...best_move_position[idx]);
        } else {
            clearArrowCanvas();
        }
        if (idx & 1) { turn = 2; index = (idx - 1) / 2; }
        else { turn = 1; index = idx / 2; }
        highlightCurrentMove(index, turn);
        updateOpeningDisplay(idx);
        addClassificationIcon(idx, move_arr[idx], classification_arr[idx]);
    });

    window.addClassificationIcon = function (idx, move, classification) {
        let square = getDestinationSquare(idx, move);

        document.querySelectorAll(".classification-icon").forEach(icon => icon.remove());
        if (!square) return;

        let board = document.getElementById("board");
        let pieceSquare = board.querySelector(`.square-${square}`);
        if (!pieceSquare) return;

        setTimeout(() => {
            let piece = pieceSquare.querySelector("img");

            if (!piece) {
                setTimeout(() => window.addClassificationIcon(idx, move, classification), 50);
                return;
            }

            let wrapper = pieceSquare.querySelector(".classification-wrapper");
            if (!wrapper) {
                wrapper = document.createElement("div");
                wrapper.classList.add("classification-wrapper");
                pieceSquare.appendChild(wrapper);
                wrapper.appendChild(piece);
            }

            let fileName = icons[classification];
            let icon = document.createElement("img");
            icon.classList.add("classification-icon");
            icon.src = `/static/media/${fileName}`;
            icon.alt = classification;
            wrapper.appendChild(icon);
        }, 100);

    };
    window.addEventListener("pageshow", function (event) {
        if (event.persisted) {
            localStorage.removeItem("pgnData");
        }
    });

});
