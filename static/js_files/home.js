
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

    if (!fetchButton) {
        console.error("Fetch button not found in the DOM!");
        return;
    }
    inputField.placeholder = placeholderText[option] || "Enter value";

    if (selectedPlatform === "Chess.com" || selectedPlatform === "Lichess.org") {
        fetchButton.classList.remove("d-none");
        console.log("Fetch button is now visible.");
    } else {
        fetchButton.classList.add("d-none");
        console.log("Fetch button is now hidden.");
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

function parsePGN() {
    if (selectedPlatform === "Lichess.org" || selectedPlatform === "Chess.com") {
        if (!selectedPGN) {
            alert("No PGN provided!");
            return;
        }
        localStorage.setItem("pgnData", selectedPGN);
        window.location.href = "/reviewer/";

    } else if (selectedPlatform === "PGN") {
        selectedPGN = document.getElementById("inputField").value.trim();
        if (!selectedPGN) {
            alert("No PGN provided");
            return;
        }
        if (!checkPGNJSON(selectedPGN)) return;
        localStorage.setItem("pgnData", selectedPGN);
        window.location.href = "/reviewer/";

    } else {
        let json_data = document.getElementById("inputField").value.trim();
        if (!json_data) {
            alert("No JSON provided");
            return;
        }
        if (!checkPGNJSON(json_data)) return;
        localStorage.setItem("pgnData", json_data);
        window.location.href = "/reviewer/";
    }
}

function checkPGNJSON(data) {
    let isPGN = data.startsWith("[") || /\d+\.\s*[a-h][1-8]/.test(data);
    let isJSON = data.startsWith("{") || data.startsWith("[");

    if (selectedPlatform === "PGN") {
        if (!isPGN) { alert("Invalid PGN"); return false; }
    } else {
        if (!isJSON) { alert("Invalid JSON"); return false; }
    }
    return true;
}