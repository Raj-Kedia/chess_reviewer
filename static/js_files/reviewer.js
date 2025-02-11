
document.addEventListener("DOMContentLoaded", function () {
    const game = new Chess();
    let moveHistoryStack = [];
    let currentMoveIndex = 0;
    let selectedSquare = null;
    /*const moveSound = document.getElementById("moveSound");
    const checkmateSound = document.getElementById("checkmateSound");
    const stalemateSound = document.getElementById("stalemateSound");*/
    const board = Chessboard("board", {
        draggable: true,
        position: "start",
        pieceTheme:
            "https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png",
        onDragStart: highlightMoves,
        onDrop: handleMove,
    });
    let pgn = localStorage.getItem("pgnData");
    if (!pgn) {
        document
            .getElementById("pgnStatus")
            .classList.replace("alert-success", "alert-danger");
        document.getElementById("pgnStatus").innerText = "No PGN found!";
    }

    document
        .getElementById("depthSlider")
        .addEventListener("input", function () {
            document.getElementById("depthValue").innerText = this.value;
        });

    function handleMove(source, target) {
        //console.log(source, target);
        const move = game.move({
            from: source,
            to: target,
            promotion: "q",
        });
        if (move === null) {
            playSound();
            return "snapback";
        }
        selectedSquare = null;
        moveHistoryStack = game.history({ verbose: true });
        currentMoveIndex = moveHistoryStack.length;
        board.position(game.fen());
        updateHistory();
        playSound(move);
    }

    function playSound(move) {
        console.log(move);
        if (!move) {
            illegalSound.play();
            return;
        }

        if (game.in_checkmate() || game.in_stalemate()) {
            gameEnd.play();
        } else if (move.san.includes("+")) {
            checkSound.play();
        } else if (move.san.includes("x")) {
            captureSound.play();
        } else if (move.san === "O-O" || move.san === "O-O-O") {
            castleSound.play();
        } else if (move.san.includes("=")) {
            promoteSound.play();
        } else {
            moveSound.play();
        }
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
            clearHighlights(); // If clicking the same square, just clear highlights
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

    document
        .getElementById("startPosition")
        .addEventListener("click", function () {
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
            playSound(move);
        }
    });

    document.getElementById("redoMove").addEventListener("click", function () {
        if (currentMoveIndex < moveHistoryStack.length) {
            game.move(moveHistoryStack[currentMoveIndex]);
            currentMoveIndex++;
            board.position(game.fen());
            playSound(move);
        }
    });

    document
        .getElementById("endPosition")
        .addEventListener("click", function () {
            game.reset();
            moveHistoryStack.forEach((move) => game.move(move));
            currentMoveIndex = moveHistoryStack.length;
            board.position(game.fen());
        });
    async function analyzeGame() {
        let pgn = localStorage.getItem("pgnData");
        let depth = document.getElementById("depthSlider").value;

        if (!pgn) {
            alert("No PGN found!");
            return;
        }

        let response = await fetch("/analyze_pgn/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pgn: pgn, depth: parseInt(depth) }),
        });

        let result = await response.json();
        if (result.analysis) {
            alert("Analysis complete! Move history updated.");

            // Hide analyze panel and show move history panel
            document.getElementById("analyzeWindow").classList.add("hidden");
            document.getElementById("moveHistoryWindow").classList.remove("hidden");

            // Populate move history with Stockfish evaluation
            let history = "";
            result.analysis.forEach((move, index) => {
                history += `${index + 1}. ${move.move} (Eval: ${move.score})<br>`;
            });
            document.getElementById("moveHistory").innerHTML = history;
        } else {
            alert("Analysis failed: " + result.error);
        }
    }
});