let pgnData = localStorage.getItem("pgnData");
const analyzeButton = document.getElementById("analyzebutton");
const toggleReviewButton = document.getElementById("toggleReview");
if (toggleReviewButton) {
    toggleReviewButton.disabled = true;
}
const analyzeWindow = document.getElementById("analyzeWindow");
const resultWindow = document.getElementById("resultWindow");
const moveHistoryWindow = document.getElementById("moveHistoryWindow");
const backToAnalyzeButton = document.getElementById("backToAnalyze");
const viewSummaryBtn = document.getElementById("viewSummaryBtn");
let depthValue = 15;
let nextPageUrl = "./analyze_pgn/";
let cursor = null;
const game = new Chess();
let currentMoveIndex = 0;
const playerWhite = document.getElementById("1-username");
const playerBlack = document.getElementById("0-username");
const loaderOverlay = document.getElementById("loader-overlay");
let total_moves = 0;

let positions = [];
let played_move_position = [];
let best_move_position = [];
let best_move_sans = [];
let opening_names = [];
let move_arr = [];
let classification_arr = [];
let destination_squares = [];
let gameResultInfo = null;

let pendingSyncTimer = null;

// Preload audio sound effects to eliminate playback latency
const soundFiles = {
    move: new Audio("/static/media/move.mp3"),
    capture: new Audio("/static/media/capture.mp3"),
    check: new Audio("/static/media/check.mp3"),
    castle: new Audio("/static/media/castle.mp3"),
    promote: new Audio("/static/media/promote.mp3"),
    game_end: new Audio("/static/media/game_end.mp3")
};
Object.values(soundFiles).forEach(audio => {
    audio.preload = "auto";
});

function playSound(sanMove) {
    if (!sanMove) return;
    let soundKey = "move";
    if (sanMove.includes("#")) {
        soundKey = "game_end";
    } else if (sanMove.includes("+")) {
        soundKey = "check";
    } else if (sanMove.includes("=")) {
        soundKey = "promote";
    } else if (sanMove.includes("O-O")) {
        soundKey = "castle";
    } else if (sanMove.includes("x")) {
        soundKey = "capture";
    }
    const audio = soundFiles[soundKey];
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
    }
}

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

    document.body.appendChild(alertDiv);

    setTimeout(() => {
        alertDiv.classList.remove("show");
        setTimeout(() => alertDiv.remove(), 500);
    }, 5000);
}

document.getElementById("depthSlider").addEventListener("input", function () {
    document.getElementById("depthValue").innerText = this.value;
    depthValue = this.value;
    if (analyzeButton) {
        analyzeButton.disabled = false;
    }
});

analyzeButton.addEventListener("click", function () {
    if (typeof analyzeGame === "function") {
        if (analyzeButton) {
            analyzeButton.disabled = true;
        }
        if (toggleReviewButton) {
            toggleReviewButton.disabled = true;
        }
        analyzeWindow.classList.add("hidden");
        moveHistoryWindow.classList.add("hidden");
        resultWindow.classList.remove("hidden");
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
    if (firstRequest) {
        nextPageUrl = "./analyze_pgn/";
        cursor = null;
        positions = [];
        played_move_position = [];
        best_move_position = [];
        best_move_sans = [];
        opening_names = [];
        move_arr = [];
        classification_arr = [];
        destination_squares = [];
        gameResultInfo = null;
        total_moves = 0;
        currentMoveIndex = 0;
        if (game && typeof game.reset === "function") {
            game.reset();
        }
        if (board) {
            board.position("start", false);
        }
        clearArrowCanvas();
        clearClassificationIcons();
        clearGameOverIcons();

        const tableBody = document.getElementById("analysis-body");
        if (tableBody) {
            tableBody.innerHTML = "";
        }
        const gameSummary = document.getElementById("gameSummary");
        if (gameSummary) {
            gameSummary.innerHTML = "";
        }
        if (moveHistoryWindow) {
            moveHistoryWindow.classList.add("hidden");
        }
    }

    if (!nextPageUrl) { return; }

    if (!firstRequest) {
        cursor = extractCursor(nextPageUrl);
    }

    const requestData = firstRequest
        ? { pgn: pgnData, depth: depthValue }
        : { cursor: cursor };

    if (firstRequest) {
        window.showChessLoader(
            "Analyzing Game",
            `Initializing Stockfish engine at depth ${depthValue}...`,
            "Starting"
        );
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
                showAlert(data.error || "Analysis failed", "danger");
                window.hideChessLoader();
                return;
            }

            if (data.results.result) {
                total_moves = data.results.result.total_moves;
                gameResultInfo = data.results.result;
                displayGameSummary(data.results.result);
            }
            displayAnalysis(data.results.analysis);
            nextPageUrl = data.next || null;

            if (nextPageUrl) {
                if (total_moves > 0) {
                    const progressCount = Math.min(move_arr.length, total_moves);
                    window.updateChessLoaderTask(
                        `Stockfish evaluating moves (${progressCount} of ${total_moves}) at depth ${depthValue}...`,
                        "Analyzing",
                        "Analyzing Moves"
                    );
                } else {
                    window.updateChessLoaderTask(
                        `Stockfish evaluating positions at depth ${depthValue}...`,
                        "Analyzing",
                        "Analyzing Moves"
                    );
                }
                analyzeGame();
            } else {
                window.updateChessLoaderTask(
                    "Finalizing move evaluations and accuracy...",
                    "Completed",
                    "Analysis Complete"
                );
                setTimeout(() => {
                    window.hideChessLoader();
                }, 300);
                if (toggleReviewButton) {
                    toggleReviewButton.disabled = false;
                }
            }
        })
        .catch(error => {
            showAlert("Error in analyzing game: " + error, 'danger');
            window.hideChessLoader();
        });
}

function displayGameSummary(results) {
    const classification_types = [
        "Brilliant", "Great", "Best", "Excellent", "Good", "Forced", "Book", "Inaccuracy", "Mistake", "Miss", "Blunder"
    ];
    const color_index = {
        "Brilliant": "#1baca6",
        "Great": "#3b77a7",
        "Best": "#95bb4a",
        "Excellent": "#4f843c",
        "Good": "#8ba862",
        "Forced": "#374151",
        "Book": "#a57753",
        "Inaccuracy": "#f0c15c",
        "Mistake": "#e67e22",
        "Miss": "#d94d4d",
        "Blunder": "#b33a3a",
    };

    const whiteName = results.White && results.White !== "undefined" ? results.White : "White Player";
    const whiteElo = results.WhiteElo && results.WhiteElo !== "undefined" ? ` (${results.WhiteElo})` : "";
    const blackName = results.Black && results.Black !== "undefined" ? results.Black : "Black Player";
    const blackElo = results.BlackElo && results.BlackElo !== "undefined" ? ` (${results.BlackElo})` : "";

    playerWhite.innerHTML = `
        <img src="/static/media/pawn_profile.svg" alt="profile" class="player-avatar">
        <span><strong>${whiteName}</strong>${whiteElo}</span>
    `;

    playerBlack.innerHTML = `
        <img src="/static/media/pawn_profile.svg" alt="profile" class="player-avatar">
        <span><strong>${blackName}</strong>${blackElo}</span>
    `;

    const summaryDiv = document.getElementById("gameSummary");
    summaryDiv.innerHTML = `
    <table class="table align-middle">
        <thead>
            <tr>
                <th scope="col" style="width: 32%;">Metric</th>
                <th scope="col" style="width: 30%; text-align: center;">${whiteName}</th>
                <th scope="col" style="width: 8%; text-align: center;"></th>
                <th scope="col" style="width: 30%; text-align: center;">${blackName}</th>
            </tr>
        </thead>
        <tbody class="table-group-divider">
            <tr>
                <th scope="row">Accuracy</th>
                <td style="text-align: center;"><div class="accuracy-box white">${results.white_accuracy}%</div></td>
                <td></td>
                <td style="text-align: center;"><div class="accuracy-box black">${results.black_accuracy}%</div></td>
            </tr>
            ${classification_types.map((classification, index) => {
                const whiteColor = color_index[classification];
                const blackColor = color_index[classification];
                return `
                    <tr>
                        <th scope="row" style="text-align: left; vertical-align: middle;">${classification}</th>
                        <td style="text-align: center; vertical-align: middle; color: ${whiteColor};"><strong>${results.white_arr ? results.white_arr[index] : 0}</strong></td>
                        <td style="text-align: center; vertical-align: middle;">${getIcon(classification)}</td>
                        <td style="text-align: center; vertical-align: middle; color: ${blackColor};"><strong>${results.black_arr ? results.black_arr[index] : 0}</strong></td>
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

const classificationArrowColors = {
    "Brilliant": "#1baca6",
    "Great": "#3b77a7",
    "Best": "#95bb4a",
    "Excellent": "#4f843c",
    "Good": "#8ba862",
    "Forced": "#475569",
    "Book": "#a57753",
    "Inaccuracy": "#eab308",
    "Mistake": "#f97316",
    "Miss": "#ef4444",
    "Blunder": "#b91c1c"
};

function getIcon(classification) {
    const fileName = icons[classification];
    if (!fileName) return "";
    return `<img src="/static/media/${fileName}?v=3" alt="${classification}" class="move-icon">`;
}

function displayAnalysis(analysisData) {
    const outputDiv = document.getElementById('moveDetails');
    if (!outputDiv || !analysisData || analysisData.length === 0) return;

    if (!outputDiv.querySelector("table")) {
        outputDiv.innerHTML = `
            <table>
                <tbody id="analysis-body"></tbody>
            </table>`;
    }
    const tableBody = document.getElementById("analysis-body");

    analysisData.forEach((move, index) => {
        opening_names.push(move.opening_name || "Unknown");
        best_move_sans.push(move.best_move || null);

        const currentOverallIndex = move_arr.length;
        if (currentOverallIndex % 2 === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${Math.floor(currentOverallIndex / 2) + 1}</td>
                <td>${move.move}</td>
                <td id="black-move-${Math.floor(currentOverallIndex / 2)}"></td>
            `;
            tableBody.appendChild(row);
        } else {
            const moveNum = Math.floor(currentOverallIndex / 2);
            const blackMoveCell = document.getElementById(`black-move-${moveNum}`);
            if (blackMoveCell) {
                blackMoveCell.textContent = move.move;
            }
        }

        // 1. Record Played Move
        let moveResult = game.move(move.move);
        if (moveResult) {
            positions.push(game.fen());
            destination_squares.push(moveResult.to);
            played_move_position.push([moveResult.from, moveResult.to]);
        } else {
            positions.push(null);
            destination_squares.push(getDestinationSquare(currentOverallIndex, move.move));
            played_move_position.push(null);
        }
        game.undo();

        // 2. Record Engine Best Move (in position before move was played)
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
        move_arr.push(move.move);
        classification_arr.push(move.classification);
    });

    if (move_arr.length >= total_moves) {
        setupMoveHistoryNavigation();
        setTimeout(() => {
            updateBoardToLastMove();
        }, 50);
    }
}

function clearClassificationIcons() {
    document.querySelectorAll(".classification-icon").forEach(icon => icon.remove());
}

function clearGameOverIcons() {
    document.querySelectorAll(".game-over-icon").forEach(icon => icon.remove());
}

function addClassificationIcon(idx, move, classification) {
    clearClassificationIcons();
    if (!classification || idx < 0 || idx >= move_arr.length) return;

    const fileName = icons[classification];
    if (!fileName) return;

    // Use destination square of the played move
    const square = (played_move_position[idx] && played_move_position[idx][1]) || destination_squares[idx] || getDestinationSquare(idx, move);
    if (!square) return;

    const boardElement = document.getElementById("board");
    if (!boardElement) return;

    const squareElement = boardElement.querySelector(`.square-${square}`);
    if (!squareElement) return;

    const icon = document.createElement("img");
    icon.className = "classification-icon";
    icon.src = `/static/media/${fileName}?v=3`;
    icon.alt = classification;
    squareElement.appendChild(icon);
}

function addGameOverKingIcon(square, iconSrc, title) {
    if (!square) return;
    const boardElement = document.getElementById("board");
    if (!boardElement) return;
    const squareElement = boardElement.querySelector(`.square-${square}`);
    if (!squareElement) return;

    const icon = document.createElement("img");
    icon.className = "game-over-icon";
    icon.src = `${iconSrc}?v=3`;
    icon.alt = title;
    icon.title = title;
    squareElement.appendChild(icon);
}

function findKings(fen) {
    if (!fen) return { whiteKing: null, blackKing: null };
    try {
        const tempChess = new Chess(fen);
        let whiteKing = null;
        let blackKing = null;
        const files = ['a','b','c','d','e','f','g','h'];
        for (let f = 0; f < 8; f++) {
            for (let r = 1; r <= 8; r++) {
                const sq = files[f] + r;
                const piece = tempChess.get(sq);
                if (piece && piece.type === 'k') {
                    if (piece.color === 'w') whiteKing = sq;
                    if (piece.color === 'b') blackKing = sq;
                }
            }
        }
        return { whiteKing, blackKing };
    } catch (e) {
        return { whiteKing: null, blackKing: null };
    }
}

function getGameOverDetails() {
    if (positions.length === 0) return null;
    const lastFen = positions[positions.length - 1];
    let finalChess = null;
    try {
        finalChess = new Chess(lastFen);
    } catch (e) {
        return null;
    }

    const lastMove = move_arr.length > 0 ? move_arr[move_arr.length - 1] : "";
    const pgnResult = (gameResultInfo && gameResultInfo.Result) || "";
    const pgnTermination = ((gameResultInfo && gameResultInfo.Termination) || "").toLowerCase();

    const kings = findKings(lastFen);
    if (!kings.whiteKing || !kings.blackKing) return null;

    // 1. Checkmate:
    const isCheckmate = finalChess.in_checkmate() || lastMove.includes("#") || pgnTermination.includes("checkmate");
    if (isCheckmate) {
        // The side who made the last move won
        const whiteWon = ((move_arr.length - 1) % 2 === 0);
        return {
            type: "checkmate",
            winner: whiteWon ? "white" : "black",
            winnerKing: whiteWon ? kings.whiteKing : kings.blackKing,
            loserKing: whiteWon ? kings.blackKing : kings.whiteKing,
            winnerIcon: "/static/media/game_over_crown.svg",
            loserIcon: "/static/media/game_over_checkmate.svg",
            reason: `Checkmate! ${whiteWon ? "White" : "Black"} wins.`
        };
    }

    // 2. Stalemate / Draw:
    const isDraw = finalChess.in_stalemate() || finalChess.in_draw() || pgnResult === "1/2-1/2" || pgnTermination.includes("stalemate") || pgnTermination.includes("draw");
    if (isDraw) {
        return {
            type: "stalemate",
            winner: "draw",
            whiteKing: kings.whiteKing,
            blackKing: kings.blackKing,
            icon: "/static/media/game_over_draw.svg",
            reason: "Draw / Stalemate"
        };
    }

    // 3. Resignation / Forfeit / Decisive:
    if (pgnResult === "1-0" || pgnResult === "0-1" || pgnTermination.includes("resign")) {
        const whiteWon = pgnResult === "1-0";
        return {
            type: "resign",
            winner: whiteWon ? "white" : "black",
            winnerKing: whiteWon ? kings.whiteKing : kings.blackKing,
            loserKing: whiteWon ? kings.blackKing : kings.whiteKing,
            winnerIcon: "/static/media/game_over_crown.svg",
            loserIcon: "/static/media/game_over_resign.svg",
            reason: `${whiteWon ? "Black" : "White"} resigned. ${whiteWon ? "White" : "Black"} wins.`
        };
    }

    return null;
}

function syncOverlays(idx) {
    if (idx < 0 || idx >= positions.length) {
        clearArrowCanvas();
        clearClassificationIcons();
        clearGameOverIcons();
        return;
    }

    // 1. Show Move Arrows
    const playedMove = played_move_position[idx];
    const bestMove = best_move_position[idx];
    const classification = classification_arr[idx];

    drawBoardArrows(playedMove, bestMove, classification);

    // 2. Show Move Classification Icon on destination square of the moved piece
    addClassificationIcon(idx, move_arr[idx], classification_arr[idx]);

    // 3. Show Winner & Loser Icons on Kings if at the end of the game
    clearGameOverIcons();
    if (idx === positions.length - 1 && positions.length > 0) {
        const gameOver = getGameOverDetails();
        if (gameOver) {
            if (gameOver.type === "stalemate") {
                addGameOverKingIcon(gameOver.whiteKing, gameOver.icon, "Stalemate / Draw");
                addGameOverKingIcon(gameOver.blackKing, gameOver.icon, "Stalemate / Draw");
            } else {
                addGameOverKingIcon(gameOver.winnerKing, gameOver.winnerIcon, `Winner: ${gameOver.winner}`);
                addGameOverKingIcon(gameOver.loserKing, gameOver.loserIcon, `${gameOver.type === "checkmate" ? "Checkmated" : "Resigned"}`);
            }
        }
    }
}

function goToMove(idx, explicitAnimate = null) {
    if (positions.length === 0) return;
    if (idx < -1 || idx >= positions.length) return;

    if (pendingSyncTimer) {
        clearTimeout(pendingSyncTimer);
        pendingSyncTimer = null;
    }

    const prevIndex = currentMoveIndex;
    currentMoveIndex = idx;

    if (idx === -1) {
        board.position("start", false);
        clearArrowCanvas();
        clearClassificationIcons();
        clearGameOverIcons();
        document.querySelectorAll("#analysis-body td").forEach(cell => {
            cell.classList.remove("highlighted-move");
        });
        const openingDisplay = document.getElementById("opening_name");
        if (openingDisplay) {
            openingDisplay.textContent = "Opening: Start Position";
        }
        return;
    }

    const isSingleStep = Math.abs(idx - prevIndex) === 1;
    const shouldAnimate = (explicitAnimate !== null) ? explicitAnimate : isSingleStep;

    const turn = (idx & 1) ? 2 : 1;
    const rowIndex = (idx & 1) ? (idx - 1) / 2 : idx / 2;
    highlightCurrentMove(rowIndex, turn);
    updateOpeningDisplay(idx);

    if (shouldAnimate) {
        // Clear overlays while piece is sliding across board
        clearArrowCanvas();
        clearClassificationIcons();
        clearGameOverIcons();

        board.position(positions[idx], true);
        playSound(move_arr[idx]);

        // Synchronize arrow and classification icon exactly when piece lands (100ms)
        pendingSyncTimer = setTimeout(() => {
            syncOverlays(idx);
            pendingSyncTimer = null;
        }, 105);
    } else {
        // Snap instantly with zero lag
        board.position(positions[idx], false);
        playSound(move_arr[idx]);
        syncOverlays(idx);
    }
}

function updateBoardToLastMove() {
    if (positions.length > 0) {
        goToMove(positions.length - 1, false);
    }
}

function setupMoveHistoryNavigation() {
    const moveEntries = document.querySelectorAll("#analysis-body tr");
    moveEntries.forEach((entry, index) => {
        const cells = entry.querySelectorAll("td");
        for (let turn = 1; turn <= 2; turn++) {
            const cell = cells[turn];
            if (!cell || !cell.textContent.trim()) continue;
            cell.addEventListener("click", function () {
                let idx = turn === 1 ? 2 * index : 2 * index + 1;
                if (idx < positions.length) {
                    goToMove(idx, false);
                }
            });
        }
    });
}

function highlightCurrentMove(index, turn) {
    document.querySelectorAll("#analysis-body td").forEach(cell => {
        cell.classList.remove("highlighted-move");
    });

    if (index < 0) return;

    const moveEntries = document.querySelectorAll("#analysis-body tr");
    if (moveEntries[index]) {
        const moveCells = moveEntries[index].querySelectorAll("td");
        if (moveCells[turn]) {
            moveCells[turn].classList.add("highlighted-move");
            moveCells[turn].scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
    }
}

function updateOpeningDisplay(index) {
    const openingDisplay = document.getElementById("opening_name");
    if (!openingDisplay) return;
    if (index === -1) {
        openingDisplay.textContent = "Opening: Start Position";
    } else {
        let text = "Opening: " + (opening_names[index] || "Unknown Opening");
        const classification = classification_arr[index];
        const bestSan = best_move_sans[index];
        if (bestSan && ["Inaccuracy", "Mistake", "Miss", "Blunder"].includes(classification)) {
            text += `  •  Best: ${bestSan}`;
        }
        openingDisplay.textContent = text;
    }
}

function clearArrowCanvas() {
    const canvas = document.getElementById("arrowCanvas");
    if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

function drawBoardArrows(playedMove, bestMove, classification) {
    const canvas = document.getElementById("arrowCanvas");
    const boardElement = document.getElementById("board");
    if (!canvas || !boardElement) return;

    if (canvas.width !== boardElement.clientWidth || canvas.height !== boardElement.clientHeight) {
        canvas.width = boardElement.clientWidth;
        canvas.height = boardElement.clientHeight;
    }

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const isFlipped = (window.board && window.board.orientation && window.board.orientation() === "black");

    function getSquareCenter(square) {
        const fileIdx = square.charCodeAt(0) - 97;
        const rankIdx = parseInt(square[1]);
        const file = isFlipped ? (7 - fileIdx) : fileIdx;
        const rank = isFlipped ? (rankIdx - 1) : (8 - rankIdx);
        const squareSize = canvas.width / 8;
        return {
            x: (file + 0.5) * squareSize,
            y: (rank + 0.5) * squareSize,
            squareSize: squareSize
        };
    }

    function renderArrow(fromSq, toSq, color, isDashed = false) {
        if (!fromSq || !toSq || fromSq === toSq) return;
        const start = getSquareCenter(fromSq);
        const end = getSquareCenter(toSq);
        const squareSize = start.squareSize;

        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const dist = Math.hypot(dx, dy);
        if (dist === 0) return;

        const angle = Math.atan2(dy, dx);
        const headLength = Math.max(14, squareSize * 0.38);
        const arrowWidth = isDashed ? Math.max(5, squareSize * 0.12) : Math.max(7, squareSize * 0.16);

        const tipX = end.x;
        const tipY = end.y;
        const startX = start.x + Math.cos(angle) * (squareSize * 0.18);
        const startY = start.y + Math.sin(angle) * (squareSize * 0.18);

        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.shadowColor = "rgba(0, 0, 0, 0.28)";
        ctx.shadowBlur = 5;

        if (isDashed) {
            ctx.setLineDash([7, 5]);
        } else {
            ctx.setLineDash([]);
        }

        // Draw arrow shaft
        ctx.beginPath();
        ctx.lineWidth = arrowWidth;
        ctx.moveTo(startX, startY);
        const shaftEndX = tipX - Math.cos(angle) * (headLength * 0.65);
        const shaftEndY = tipY - Math.sin(angle) * (headLength * 0.65);
        ctx.lineTo(shaftEndX, shaftEndY);
        ctx.stroke();

        // Draw arrow head (always solid fill)
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(
            tipX - headLength * Math.cos(angle - Math.PI / 6),
            tipY - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            tipX - (headLength * 0.58) * Math.cos(angle),
            tipY - (headLength * 0.58) * Math.sin(angle)
        );
        ctx.lineTo(
            tipX - headLength * Math.cos(angle + Math.PI / 6),
            tipY - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    // 1. Draw Played Move Arrow (always matches the moved piece and badge)
    if (playedMove && playedMove.length === 2) {
        const playedColor = classificationArrowColors[classification] || "#3b82f6";
        renderArrow(playedMove[0], playedMove[1], playedColor, false);
    }

    // 2. If suboptimal (Inaccuracy, Mistake, Miss, Blunder) and best move is different, draw dashed suggested arrow
    if (bestMove && bestMove.length === 2 && ["Inaccuracy", "Mistake", "Miss", "Blunder"].includes(classification)) {
        if (!playedMove || playedMove[0] !== bestMove[0] || playedMove[1] !== bestMove[1]) {
            renderArrow(bestMove[0], bestMove[1], "rgba(34, 197, 94, 0.9)", true);
        }
    }
}

if (toggleReviewButton && analyzeWindow && moveHistoryWindow && resultWindow) {
    toggleReviewButton.addEventListener("click", function () {
        resultWindow.classList.add("hidden");
        moveHistoryWindow.classList.remove("hidden");
        toggleReviewButton.disabled = true;
        if (typeof updateBoardToLastMove === "function") {
            updateBoardToLastMove();
        }
    });
}

if (viewSummaryBtn && moveHistoryWindow && resultWindow) {
    viewSummaryBtn.addEventListener("click", function () {
        moveHistoryWindow.classList.add("hidden");
        resultWindow.classList.remove("hidden");
        if (toggleReviewButton) {
            toggleReviewButton.disabled = false;
        }
    });
}

if (backToAnalyzeButton && analyzeWindow && resultWindow && moveHistoryWindow) {
    backToAnalyzeButton.addEventListener("click", function () {
        resultWindow.classList.add("hidden");
        moveHistoryWindow.classList.add("hidden");
        analyzeWindow.classList.remove("hidden");
        if (analyzeButton) {
            analyzeButton.disabled = false;
        }
    });
}

function getDestinationSquare(idx, move) {
    if (!move) return null;
    let isWhiteTurn = (idx & 1) === 0;
    if (move === "O-O") return isWhiteTurn ? "g1" : "g8";
    if (move === "O-O-O") return isWhiteTurn ? "c1" : "c8";

    let match = move.match(/[a-h][1-8]/);
    return match ? match[0] : null;
}

document.addEventListener("DOMContentLoaded", function () {
    let moveHistoryStack = [];
    let selectedSquare = null;

    window.board = Chessboard("board", {
        draggable: true,
        position: "start",
        moveSpeed: 100, // snappy 100ms piece slide
        pieceTheme: "https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png",
        onDragStart: highlightMoves,
        onDrop: handleMove,
        onMoveEnd: function () {
            // Keep overlays strictly synchronized after piece animation
            if (currentMoveIndex >= 0 && positions.length > 0) {
                syncOverlays(currentMoveIndex);
            }
        }
    });

    if (!pgnData) {
        showAlert("No PGN provided", 'warning');
    } else {
        showAlert("PGN parsed successfully", 'success');
    }

    function handleMove(source, target) {
        const move = game.move({ from: source, to: target, promotion: "q" });
        if (move === null) return "snapback";

        selectedSquare = null;
        moveHistoryStack = game.history({ verbose: true });
        currentMoveIndex = moveHistoryStack.length;
        board.position(game.fen(), false);
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

    document.getElementById("flipBoard").addEventListener("click", function () {
        board.flip();
        let temp = playerWhite.innerHTML;
        playerWhite.innerHTML = playerBlack.innerHTML;
        playerBlack.innerHTML = temp;
        if (currentMoveIndex >= 0) {
            syncOverlays(currentMoveIndex);
        }
    });

    document.getElementById("startPosition").addEventListener("click", function () {
        goToMove(-1, false);
    });

    document.getElementById("undoMove").addEventListener("click", function () {
        goToMove(currentMoveIndex - 1);
    });

    document.getElementById("redoMove").addEventListener("click", function () {
        goToMove(currentMoveIndex + 1);
    });

    document.getElementById("endPosition").addEventListener("click", function () {
        goToMove(positions.length - 1, false);
    });

    // Keyboard navigation: Left/Right arrows, Up/Down, F to flip
    document.addEventListener("keydown", function (e) {
        if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) return;
        if (moveHistoryWindow.classList.contains("hidden")) return;

        if (e.key === "ArrowLeft") {
            e.preventDefault();
            goToMove(currentMoveIndex - 1);
        } else if (e.key === "ArrowRight") {
            e.preventDefault();
            goToMove(currentMoveIndex + 1);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            goToMove(-1, false);
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            goToMove(positions.length - 1, false);
        } else if (e.key === "f" || e.key === "F") {
            e.preventDefault();
            document.getElementById("flipBoard").click();
        }
    });

    window.addEventListener("pageshow", function (event) {
        if (event.persisted) {
            localStorage.removeItem("pgnData");
        }
    });

    // Responsive resize handler with ResizeObserver
    function handleResize() {
        if (window.board && typeof window.board.resize === "function") {
            window.board.resize();
        }
        if (currentMoveIndex >= 0 && positions.length > 0) {
            syncOverlays(currentMoveIndex);
        } else {
            clearArrowCanvas();
        }
    }

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    const boardContainer = document.getElementById("board-container");
    if (boardContainer && window.ResizeObserver) {
        const resizeObserver = new ResizeObserver(() => {
            handleResize();
        });
        resizeObserver.observe(boardContainer);
    }

    setTimeout(handleResize, 150);
});
