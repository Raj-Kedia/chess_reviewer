
let selectedPlatform = "PGN";
let selectedPGN = "";
let selectedGameIndex = -1;
let gameData = [];

function updatePlaceholder(option) {
    selectedPlatform = option;
    let placeholderText = {
        "Chess.com": "Username of Chess.com",
        "Lichess.org": "Username of Lichess.org",
        PGN: "Write PGN",
        JSON: "Write JSON",
    };

    let inputField = document.getElementById("inputField");
    let fetchButton = document.getElementById("fetchButton");

    inputField.placeholder = placeholderText[option] || "Enter value";
    document.getElementById("dropdownMenuButton").textContent = option;

    if (option === "Chess.com" || option === "Lichess.org") {
        fetchButton.classList.remove("d-none");
    } else {
        fetchButton.classList.add("d-none");
    }
}

async function fetchGame() {
    let username = document.getElementById("inputField").value.trim();
    if (!username) {
        alert("Please enter a username.");
        return;
    }

    let apiUrl = "";
    let maxGames = 0;

    if (selectedPlatform === "Chess.com") {
        apiUrl = `https://api.chess.com/pub/player/${username}/games/archives`;
        maxGames = 300;
    } else if (selectedPlatform === "Lichess.org") {
        apiUrl = `https://lichess.org/api/games/user/${username}?max=100&clocks=true&pgnInJson=true`;
        maxGames = 100;
    }

    try {
        gameData = [];

        if (selectedPlatform === "Chess.com") {
            let archivesResponse = await fetch(apiUrl);
            let archivesData = await archivesResponse.json();
            let latestArchives = archivesData.archives.slice(-5);

            let gameRequests = latestArchives.map((url) =>
                fetch(url).then((res) => res.json())
            );
            let gameDetails = await Promise.all(gameRequests);

            gameDetails.forEach((monthData) => {
                monthData.games.forEach((game) => {
                    if (gameData.length < maxGames) {
                        gameData.push({
                            user: game.white.username,
                            opponent: game.black.username,
                            time: new Date(game.end_time * 1000),
                            pgn: game.pgn,
                        });
                    }
                });
            });
        } else if (selectedPlatform === "Lichess.org") {
            let response = await fetch(apiUrl);
            let textData = await response.text();
            let lines = textData.split("\n").filter((line) => line.trim() !== "");

            lines.forEach((line) => {
                try {
                    let game = JSON.parse(line);
                    if (gameData.length < maxGames) {
                        gameData.push({
                            user: game.players.white.userId,
                            opponent: game.players.black.userId,
                            time: new Date(game.createdAt),
                            pgn: game.pgn,
                        });
                    }
                } catch (e) {
                    console.error("Error parsing Lichess game data:", e);
                }
            });
        }

        gameData.sort((a, b) => b.time - a.time);
        displayGames(gameData);
    } catch (error) {
        console.error("Error fetching game data:", error);
        alert("Failed to fetch game data. Check the username and try again.");
    }
}

function displayGames(games) {
    let gameList = document.getElementById("gameList");
    gameList.innerHTML = "";

    if (games.length === 0) {
        gameList.innerHTML =
            "<li class='list-group-item'>No recent games found.</li>";
    } else {
        games.forEach((game, index) => {
            let listItem = document.createElement("li");
            listItem.className = "list-group-item";
            listItem.innerHTML = `
        <input type="radio" name="selectedGame" id="game${index}" value="${index}" onclick="selectGame(${index})">
        <label for="game${index}">
          <strong>${game.user} vs ${game.opponent}</strong><br>
          <small>${game.time.toLocaleString()}</small>
        </label>
      `;
            gameList.appendChild(listItem);
        });

        document.getElementById("confirmSelection").classList.add("d-none");
    }

    let gameModal = new bootstrap.Modal(document.getElementById("gameModal"));
    gameModal.show();
}

function selectGame(index) {
    selectedGameIndex = index;
    document.getElementById("confirmSelection").classList.remove("d-none");
}

function confirmGameSelection() {
    let game = gameData[selectedGameIndex];
    selectedPGN = game.pgn;

    document.getElementById(
        "selectedGameText"
    ).innerHTML = `<strong>Selected Game:</strong> ${game.user} vs ${game.opponent
        } <br> <small>${game.time.toLocaleString()}</small>`;
    document.getElementById("selectedGameContainer").style.display = "block";

    let gameModalElement = document.getElementById("gameModal");
    let gameModal = bootstrap.Modal.getInstance(gameModalElement);
    gameModal.hide();
}

document.addEventListener("DOMContentLoaded", function () {
    updatePlaceholder("PGN");
});
function confirmGameSelection() {
    let game = gameData[selectedGameIndex];
    selectedPGN = game.pgn;

    document.getElementById(
        "selectedGameText"
    ).innerHTML = `<strong>Selected Game:</strong> ${game.user} vs ${game.opponent
        } <br> <small>${game.time.toLocaleString()}</small>`;
    document.getElementById("selectedGameContainer").style.display = "block";

    let gameModalElement = document.getElementById("gameModal");
    let gameModal = bootstrap.Modal.getInstance(gameModalElement);
    gameModal.hide();

    // Show "Parse PGN" button, hide "Analyze" button
    document.getElementById("parsePGNButton").classList.remove("d-none");
    document.getElementById("analyzeButton").classList.add("d-none");
}

function parsePGN() {
    if (!selectedPGN) {
        alert("No PGN provided!");
        return;
    }

    localStorage.setItem("pgnData", selectedPGN);
    window.location.href = "/reviewer/";
}

function analyzeGame() {
    alert("Stockfish analysis will be implemented here!");
}