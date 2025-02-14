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

    let pgnData = localStorage.getItem("pgnData");
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

    let analyzeWindow = document.getElementById("analyzeWindow");
    let moveHistoryWindow = document.getElementById("moveHistoryWindow");

    moveHistoryWindow.style.display = "none";
    let moveHistoryDiv = document.getElementById("moveHistory");
    let moveDetailsDiv = document.getElementById("moveDetails");


    window.analyzeGame = async function () {
        fetch("./analyze_pgn/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pgn: pgnData }),
        })
            .then(response => response.json())
            .then(data => {
                console.log("Server Response:", data); // Debugging line
                console.log(data.analysis_results)
                if (!data || !data.analysis_results) {
                    console.error("Error: Invalid response from server", data.analysis_results);
                    return;
                }
                displayAnalysis(data.analysis_results); // Update function call
            })
            .catch(error => console.error("Error analyzing game:", error));
    }


    function displayAnalysis(analysisData) {
        const outputDiv = document.getElementById('analysis-output');
        outputDiv.innerHTML = '';

        if (!analysisData.moves || analysisData.moves.length === 0) {
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

        analysisData.moves.forEach((move, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}. ${move.move}</td>
                <td>${move.evaluation}</td>
                <td>${move.suggestion || 'Good move'}</td>
            `;
            resultTable.appendChild(row);
        });

        outputDiv.appendChild(resultTable);
    }

});
