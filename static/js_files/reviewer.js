
let pgnData = localStorage.getItem("pgnData");

function analyzeGame() {
    if (!pgnData) {
        console.error("No PGN data found!");
        return;
    }

    fetch("./analyze_pgn/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pgn: pgnData }),
    })
        .then(response => response.json())
        .then(data => {
            console.log("Server Response:", data);
            if (!data || !data.analysis || !data.result) {
                console.error("Error: Invalid response from server");
                return;
            }

            displayGameSummary(data.result);
            displayAnalysis(data.analysis);
        })
        .catch(error => console.error("Error analyzing game:", error));
}

document.addEventListener("DOMContentLoaded", function () {
    if (typeof analyzeGame === "function") {
        analyzeGame();
    }
});

function displayGameSummary(results) {
    if (!results) {
        console.error("Error: Missing results data");
        return;
    }

    const classification_index = {
        "Brilliant": 1,
        "Great": 2,
        "Best": 3,
        "Excellent": 4,
        "Good": 5,
        "Book": 6,
        "Inaccuracy": 7,
        "Mistake": 8,
        "Blunder": 9
    };

    const summaryDiv = document.getElementById("gameSummary");
    if (!summaryDiv) {
        console.error("Error: gameSummary element not found");
        return;
    }

    let summaryHtml = `<p><strong>Black:</strong> ${results.Black} (Accuracy: ${results.black_accuracy}%)</p>`;
    for (const [classification, index] of Object.entries(classification_index)) {
        summaryHtml += `<p>${classification}: ${results.black_arr[index] || 0}</p>`;
    }

    summaryHtml += `<p><strong>White:</strong> ${results.White} (Accuracy: ${results.white_accuracy}%)</p>`;
    for (const [classification, index] of Object.entries(classification_index)) {
        summaryHtml += `<p>${classification}: ${results.white_arr[index] || 0}</p>`;
    }

    summaryDiv.innerHTML = summaryHtml;
}

function displayAnalysis(analysisData) {
    const outputDiv = document.getElementById('analysis-output');
    if (!outputDiv) {
        console.error("Error: analysis-output element not found");
        return;
    }

    outputDiv.innerHTML = '';
    if (!analysisData || analysisData.length === 0) {
        outputDiv.innerHTML = '<p>No analysis available.</p>';
        return;
    }

    const resultTable = document.createElement('table');
    resultTable.innerHTML = `
        <tr>
            <th>Move</th>
            <th>Evaluation</th>
            <th>Suggestion</th>
        </tr>
    `;
    let index = 0;
    analysisData.forEach((move, classification, best_move) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}. ${move.move}</td>
            <td>${move.classification}</td>
            <td>${move.best_move}</td>
        `;
        resultTable.appendChild(row);
        index += 1;
    });

    outputDiv.appendChild(resultTable);
}

const toggleReviewButton = document.getElementById("toggleReview");
const analyzeWindow = document.getElementById("analyzeWindow");
const moveHistoryWindow = document.getElementById("moveHistoryWindow");

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

    const board = Chessboard("board", {
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

    document.getElementById("depthSlider").addEventListener("input", function () {
        document.getElementById("depthValue").innerText = this.value;
    });

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
