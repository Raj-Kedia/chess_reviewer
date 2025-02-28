
let selectedPlatform = "PGN";
let selectedPGN = "";
let selectedGameIndex = -1;
let gameData = [];
const confirmSelection = document.getElementById("confirmSelection");

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
        // console.log("Fetch button is now visible.");
    } else {
        fetchButton.classList.add("d-none");
        // console.log("Fetch button is now hidden.");
    }
    document.getElementById("dropdownMenuButton").innerHTML = `${selectedPlatform}`
}
let nextPageUrl = "./fetch_game/";
let cursor = null;
async function fetchGame(firstRequest = true) {
    let username = document.getElementById("inputField").value.trim();
    if (!username) {
        alert("Please enter a username.");
        return;
    }

    const loaderOverlay = document.getElementById("loader-overlay");

    // Show loader and disable background interaction
    loaderOverlay.style.display = "flex";
    document.body.classList.add("loading");
    // console.log(loaderOverlay.style.display);
    if (!nextPageUrl) return;  // Stop if no more pages to fetch

    const requestData = firstRequest
        ? { username: username, platform: selectedPlatform }
        : { username: username, platform: selectedPlatform, cursor: cursor };  // Send cursor for pagination

    try {
        let response = await fetch(nextPageUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestData),
        });

        let data = await response.json();
        // console.log("Server Response:", data);


        if (!data || !data.results) {
            if (!data || !data.results) {
                alert("Invalid response from server: " + data.error);
            }
            loaderOverlay.style.display = "none";
            document.body.classList.remove("loading");
            return;
        }
        gameData = [];
        gameData.push(...data.results);  // Append new games
        displayGames(gameData);  // Update the UI

        if (data.next_cursor) {
            cursor = data.next_cursor;
            // console.log("Updated cursor:", cursor);
        }
    } catch (error) {
        alert("Error fetching games: " + error);
        loaderOverlay.style.display = "none";
        document.body.classList.remove("loading");
    }
    setTimeout(() => {
        // console.log("Game Data Fetched!");

        // Hide loader and re-enable background interaction
        loaderOverlay.style.display = "none";
        document.body.classList.remove("loading");
    });
}

function displayGames(newGames) {
    let gameList = document.getElementById("gameList");
    if (!gameList) {
        console.error("gameList element not found!");
        return;
    }

    if (newGames.length === 0) {
        if (gameList.children.length === 0) {
            gameList.innerHTML = "<li class='list-group-item'>No recent games found.</li>";
        }
        return;
    }

    // console.log(newGames);
    let startIndex = gameList.children.length; // Get current length before adding

    newGames.forEach((game, index) => {
        let listItem = document.createElement("li");
        listItem.className = "list-group-item";
        let actualIndex = startIndex + index;  // Adjust index to prevent overwriting
        if (selectedPlatform === "Chess.com") {

            let endTime = game.end_time;
            let dateObj = new Date(endTime * 1000);
            let gameDate = dateObj.toISOString().split("T")[0];
            let gameTime = dateObj.toLocaleTimeString();
            listItem.innerHTML = `
            <input type="radio" name="selectedGame" id="game${actualIndex}" value="${actualIndex}" onclick="selectGame(${actualIndex})">
            <label for="game${actualIndex}">
                <strong>${game.white.username} vs ${game.black.username}</strong><br>
                <small>${gameDate} ${gameTime}</small>
            </label>
        `;
        }
        else if (selectedPlatform === 'Lichess.org') {
            let endTime = game.createdAt; // Already in milliseconds
            let dateObj = new Date(endTime); // No need to multiply by 1000

            // Format date properly
            let gameDate = dateObj.toISOString().split("T")[0]; // YYYY-MM-DD format
            let gameTime = dateObj.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true, // AM/PM format
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
                <input type="radio" name="selectedGame" id="game${actualIndex}" value="${actualIndex}" onclick="selectGame(${actualIndex})">
                <label for="game${actualIndex}">
                    <strong>${whitePlayer} vs ${blackPlayer}</strong><br>
                    <small>${gameDate} ${gameTime}</small>
                </label>
            `;
        }

        gameList.appendChild(listItem);

    });

    let gameModalElement = document.getElementById("gameModal");
    if (!gameModalElement) {
        console.error("gameModal element not found!");
        return;
    }

    // ✅ Check if modal is already visible before showing it
    if (!gameModalElement.classList.contains("show")) {
        let gameModal = new bootstrap.Modal(gameModalElement);
        gameModalElement.addEventListener("shown.bs.modal", function () {
            let confirmBtn = document.getElementById("confirmSelection");
            if (confirmBtn) confirmBtn.focus();

            // ✅ Ensure aria-hidden is removed when modal is shown
            gameModalElement.removeAttribute("aria-hidden");
        });
        gameModal.show();
    } else {
        // console.log("Modal is already shown, skipping show()");
    }
}

function selectGame(index) {
    selectedGameIndex = index;
    confirmSelection.classList.remove("d-none");
}

function confirmGameSelection() {
    let game = gameData[selectedGameIndex];
    // console.log(gameData[selectedGameIndex])
    selectedPGN = game.pgn;
    if (selectedPlatform === 'Chess.com') {
        let endTime = game.end_time;  // Unix timestamp from the game data
        let dateObj = new Date(endTime * 1000);  // Convert to milliseconds

        // Extract date and time
        let gameDate = dateObj.toISOString().split("T")[0];  // YYYY-MM-DD format
        let gameTime = dateObj.toLocaleTimeString();
        document.getElementById(
            "selectedGameText"
        ).innerHTML = `<strong>Selected Game:</strong> ${game.white.username} vs ${game.black.username
        } <br> <small>${gameDate} ${gameTime}</small>`;
    }
    else if (selectedPlatform === 'Lichess.org') {
        let endTime = game.createdAt; // Already in milliseconds
        let dateObj = new Date(endTime); // No need to multiply by 1000

        // Format date properly
        let gameDate = dateObj.toISOString().split("T")[0]; // YYYY-MM-DD format
        let gameTime = dateObj.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true, // AM/PM format
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
            // console.log(game.source, game.players);
            // console.log(game.players.black);
            // console.log(game.players.white);
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
        console.error("gameModal element not found!");
        return;
    }

    let gameModal = bootstrap.Modal.getInstance(gameModalElement);

    if (gameModal) {
        gameModalElement.addEventListener("hidden.bs.modal", function () {
            // ✅ Ensure no element inside modal retains focus
            document.activeElement?.blur();

            // ✅ Restore focus to the button that triggered the modal
            let triggerButton = document.querySelector('[data-bs-toggle="modal"][data-bs-target="#gameModal"]');
            if (triggerButton) triggerButton.focus();

            // ✅ Restore aria-hidden attribute
            gameModalElement.setAttribute("aria-hidden", "true");
        });

        gameModal.hide();
    }
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


document.addEventListener("DOMContentLoaded", function () {
    const modal = document.getElementById("gameModal");

    // modal.addEventListener("show.bs.modal", function () {
    //     modal.removeAttribute("aria-hidden"); // Make it visible for assistive tech
    //     modal.style.pointerEvents = "auto"; // Enable interactions
    //     modal.style.overflow = "auto"; // Enable scrolling
    // });

    modal.addEventListener("hidden.bs.modal", function () {
        // modal.setAttribute("aria-hidden", "true"); // Hide when fully closed
        // modal.style.pointerEvents = "none"; // Prevent interactions
        // modal.style.overflow = "hidden"; // Prevent unwanted scrolling when hidden
        gameList.innerHTML = '';
        confirmSelection.classList.add('d-none');
    });
});
