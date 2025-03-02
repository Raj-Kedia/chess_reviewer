
let selectedPlatform = "PGN";
let selectedPGN = "";
let selectedGameIndex = -1;
let gameData = [];
const confirmSelection = document.getElementById("confirmSelection");

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
        return;
    }
    inputField.placeholder = placeholderText[option] || "Enter value";

    if (selectedPlatform === "Chess.com" || selectedPlatform === "Lichess.org") {
        fetchButton.classList.remove("d-none");
    } else {
        fetchButton.classList.add("d-none");
    }
    document.getElementById("dropdownMenuButton").innerHTML = `${selectedPlatform}`
}

function getCSRFToken() {
    return document.cookie.split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];
}

let nextPageUrl = "./fetch_game/";
let cursor = null;
async function fetchGame(firstRequest = true) {
    let username = document.getElementById("inputField").value.trim();
    if (!username) {
        showAlert("Please enter your username", '"danger"');
        return;
    }

    const loaderOverlay = document.getElementById("loader-overlay");

    loaderOverlay.style.display = "flex";
    document.body.classList.add("loading");
    if (!nextPageUrl) return;

    const requestData = firstRequest
        ? { username: username, platform: selectedPlatform }
        : { username: username, platform: selectedPlatform, cursor: cursor };

    try {
        let response = await fetch(nextPageUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify(requestData),
        });

        let data = await response.json();


        if (!data || !data.results) {
            if (!data || !data.results) {
                showAlert("Invalid response from server: " + data.error, "danger");
            }
            loaderOverlay.style.display = "none";
            document.body.classList.remove("loading");
            return;
        }
        gameData.push(...data.results);
        displayGames(gameData);

        if (data.next_cursor) {
            cursor = data.next_cursor;
        }
    } catch (error) {
        showAlert("Error fetching games: " + error, "danger");
        loaderOverlay.style.display = "none";
        document.body.classList.remove("loading");
    }
    setTimeout(() => {
        loaderOverlay.style.display = "none";
        document.body.classList.remove("loading");
    });
}

function displayGames(newGames) {
    let gameList = document.getElementById("gameList");
    if (!gameList) {
        return;
    }

    if (newGames.length === 0) {
        if (gameList.children.length === 0) {
            gameList.innerHTML = "<li class='list-group-item'>No recent games found.</li>";
        }
        else {
            showAlert("No recent games found", 'warning')
        }
        return;
    }

    let startIndex = gameList.children.length;
    newGames.forEach((game, index) => {
        if (index >= startIndex) {
            let listItem = document.createElement("li");
            listItem.className = "list-group-item";
            if (selectedPlatform === "Chess.com") {

                let endTime = game.end_time;
                let dateObj = new Date(endTime * 1000);
                let gameDate = dateObj.toISOString().split("T")[0];
                let gameTime = dateObj.toLocaleTimeString();
                listItem.innerHTML = `
            <input type="radio" name="selectedGame" id="game${index}" value="${index}" onclick="selectGame(${index})">
            <label for="game${index}">
                <strong>${game.white.username} vs ${game.black.username}</strong><br>
                <small>${gameDate} ${gameTime}</small>
            </label>
        `;
            }
            else if (selectedPlatform === 'Lichess.org') {
                let endTime = game.createdAt;
                let dateObj = new Date(endTime);

                let gameDate = dateObj.toISOString().split("T")[0];
                let gameTime = dateObj.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true,
                });
                let whitePlayer = 'Unknown';
                let blackPlayer = 'Unknown';

                if (game.source === 'ai') {
                    if (game.players?.black?.aiLevel) {
                        blackPlayer = `AI Level ${game.players.black.aiLevel}`;
                        whitePlayer = game.players?.white?.user?.id || "Unknown";
                    } else if (game.players?.white?.aiLevel) {
                        whitePlayer = `AI Level ${game.players.white.aiLevel}`;
                        blackPlayer = game.players?.black?.user?.id || "Unknown";
                    }
                }
                else if (game.source === "friend") {
                    if (game.players?.black?.user?.id) {
                        blackPlayer = game.players.black.user.id;
                        whitePlayer = 'Friend';
                    } else if (game.players?.white?.user?.id) {
                        whitePlayer = game.players.white.user.id;
                        blackPlayer = 'Friend';
                    }
                }
                else {
                    whitePlayer = game.players?.white?.user?.id || "Unknown";
                    blackPlayer = game.players?.black?.user?.id || "Unknown";
                }

                listItem.innerHTML = `
                <input type="radio" name="selectedGame" id="game${index}" value="${index}" onclick="selectGame(${index})">
                <label for="game${index}">
                    <strong>${whitePlayer} vs ${blackPlayer}</strong><br>
                    <small>${gameDate} ${gameTime}</small>
                </label>
            `;
            }

            gameList.appendChild(listItem);
        }

    });

    let gameModalElement = document.getElementById("gameModal");
    if (!gameModalElement) {
        return;
    }

    if (!gameModalElement.classList.contains("show")) {
        let gameModal = new bootstrap.Modal(gameModalElement);
        gameModalElement.addEventListener("shown.bs.modal", function () {
            let confirmBtn = document.getElementById("confirmSelection");
            if (confirmBtn) confirmBtn.focus();

            gameModalElement.removeAttribute("aria-hidden");
        });
        gameModal.show();
    }
}

function selectGame(index) {
    selectedGameIndex = index;
    confirmSelection.classList.remove("d-none");
}

function confirmGameSelection() {
    let game = gameData[selectedGameIndex];
    selectedPGN = game.pgn;
    if (selectedPlatform === 'Chess.com') {
        let endTime = game.end_time;
        let dateObj = new Date(endTime * 1000);

        let gameDate = dateObj.toISOString().split("T")[0];
        let gameTime = dateObj.toLocaleTimeString();
        document.getElementById(
            "selectedGameText"
        ).innerHTML = `<strong>Selected Game:</strong> ${game.white.username} vs ${game.black.username
        } <br> <small>${gameDate} ${gameTime}</small>`;
    }
    else if (selectedPlatform === 'Lichess.org') {
        let endTime = game.createdAt;
        let dateObj = new Date(endTime);
        let gameDate = dateObj.toISOString().split("T")[0];
        let gameTime = dateObj.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
        });
        let whitePlayer = 'Unknown';
        let blackPlayer = 'Unknown';

        if (game.source === 'ai') {
            if (game.players?.black?.aiLevel) {
                blackPlayer = `AI Level ${game.players.black.aiLevel}`;
                whitePlayer = game.players?.white?.user?.id || "Unknown";
            } else if (game.players?.white?.aiLevel) {
                whitePlayer = `AI Level ${game.players.white.aiLevel}`;
                blackPlayer = game.players?.black?.user?.id || "Unknown";
            }
        }
        else if (game.source === "friend") {
            if (game.players?.black?.user?.id) {
                blackPlayer = game.players.black.user.id;
                whitePlayer = 'Friend';
            } else if (game.players?.white?.user?.id) {
                whitePlayer = game.players.white.user.id;
                blackPlayer = 'Friend';
            }
        }
        else {
            whitePlayer = game.players?.white?.user?.id || "Unknown";
            blackPlayer = game.players?.black?.user?.id || "Unknown";
        }
        document.getElementById(
            "selectedGameText"
        ).innerHTML = `<strong>Selected Game:</strong> ${whitePlayer} vs ${blackPlayer
        } <br> <small>${gameDate} ${gameTime}</small>`;
    }
    document.getElementById("selectedGameContainer").style.display = "block";

    let gameModalElement = document.getElementById("gameModal");

    if (!gameModalElement) {
        return;
    }

    let gameModal = bootstrap.Modal.getInstance(gameModalElement);

    if (gameModal) {
        gameModalElement.addEventListener("hidden.bs.modal", function () {
            document.activeElement?.blur();

            let triggerButton = document.querySelector('[data-bs-toggle="modal"][data-bs-target="#gameModal"]');
            if (triggerButton) triggerButton.focus();

            gameModalElement.setAttribute("aria-hidden", "true");
        });

        gameModal.hide();
    }
}

function parsePGN() {
    if (selectedPlatform === "Lichess.org" || selectedPlatform === "Chess.com") {
        if (!selectedPGN) {
            showAlert("No PGN provided!", "danger");
            return;
        }
        localStorage.setItem("pgnData", selectedPGN);
        window.location.href = "/reviewer/";

    } else if (selectedPlatform === "PGN") {
        selectedPGN = document.getElementById("inputField").value.trim();
        if (!selectedPGN) {
            showAlert("No PGN provided", "danger");
            return;
        }
        if (!checkPGNJSON(selectedPGN)) return;
        localStorage.setItem("pgnData", selectedPGN);
        window.location.href = "/reviewer/";

    } else {
        let json_data = document.getElementById("inputField").value.trim();
        if (!json_data) {
            showAlert("No JSON provided", "danger");
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
        if (!isPGN) { showAlert("Invalid PGN", "danger"); return false; }
    } else {
        if (!isJSON) { showAlert("Invalid JSON", "danger"); return false; }
    }
    return true;
}


document.addEventListener("DOMContentLoaded", function () {
    const modal = document.getElementById("gameModal");


    modal.addEventListener("hidden.bs.modal", function () {
        gameList.innerHTML = '';
        confirmSelection.classList.add('d-none');
    });
});
