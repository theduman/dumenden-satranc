document.addEventListener("DOMContentLoaded", function () {
  const params = new Proxy(new URLSearchParams(window.location.search), {
    get: (searchParams, prop) => searchParams.get(prop),
  });

  const username = params.username;
  const url = `https://lichess.org/api/user/${username}/current-game`;

  const contentSection = document.querySelector(".content");
  const gameContainer = document.querySelector(".game-container");
  const whitePiecesList = document.querySelector(".white-player .piece-list");
  const blackPiecesList = document.querySelector(".black-player .piece-list");
  const whitePlayerName = document.querySelector(".white-player .player-name");
  const blackPlayerName = document.querySelector(".black-player .player-name");
  const whitePlayerInfo = document.querySelector(".white-player .player-info");
  const blackPlayerInfo = document.querySelector(".black-player .player-info");

  const onGoingStatuses = ["created", "started"];
  let isStreaming = false;
  let isChecking = false;
  let checkTimeoutId = null;
  let statusElement;
  let currentWhitePlayer = null;
  let currentBlackPlayer = null;

  // Update the piece names to Turkish names
  function getPieceName(piece) {
    switch (piece) {
      case "pawn":
        return "Piyon";
      case "knight":
        return "At";
      case "bishop":
        return "Fil";
      case "rook":
        return "Kale";
      case "queen":
        return "Vezir";
      case "king":
        return "Şah";
      case "joker":
        return "Joker";
      default:
        return piece;
    }
  }

  // Helper function to convert piece names to symbols/emojis
  function pieceNameToSymbol(piece, color) {
    if (piece === "joker") {
      return "🃏"; // Using joker card emoji for consistency
    }

    const isWhite = color === "white";
    switch (piece) {
      case "pawn":
        return isWhite ? "♙" : "♟︎"; // Added variation selector for better black rendering
      case "knight":
        return isWhite ? "♘" : "♞";
      case "bishop":
        return isWhite ? "♗" : "♝";
      case "rook":
        return isWhite ? "♖" : "♜";
      case "queen":
        return isWhite ? "♕" : "♛";
      case "king":
        return isWhite ? "♔" : "♚";
      default:
        return piece;
    }
  }

  // Initialize the status element
  function initializeStatusElement() {
    // Clear previous content first
    contentSection.innerHTML = "";

    statusElement = document.createElement("p");
    statusElement.textContent = `Monitoring for games by ${
      username || "user"
    }...`;
    contentSection.appendChild(statusElement);

    return statusElement;
  }

  // Update the player information display
  function updatePlayerDisplay(gameData) {
    if (!gameData || !gameData.players) return;

    // Extract player info
    const whitePlayerName = gameData.players.white?.user?.name || "Anonymous";
    const blackPlayerName = gameData.players.black?.user?.name || "Anonymous";
    const whiteRating = gameData.players.white?.rating || "?";
    const blackRating = gameData.players.black?.rating || "?";

    // Determine if our monitored user is white or black
    const isUserWhite = whitePlayerName === username;
    const isUserBlack = blackPlayerName === username;

    // Store current players
    currentWhitePlayer = whitePlayerName;
    currentBlackPlayer = blackPlayerName;

    // Set up the left side (monitored user) and right side (opponent)
    let leftName, leftRating, leftColor;
    let rightName, rightRating, rightColor;

    if (isUserWhite) {
      leftName = whitePlayerName;
      leftRating = whiteRating;
      leftColor = "white";
      rightName = blackPlayerName;
      rightRating = blackRating;
      rightColor = "black";
    } else {
      leftName = blackPlayerName;
      leftRating = blackRating;
      leftColor = "black";
      rightName = whitePlayerName;
      rightRating = whiteRating;
      rightColor = "white";
    }

    // Update the player containers with the correct classes
    const leftContainer = document.querySelector(
      ".player-container:nth-child(1)"
    );
    const rightContainer = document.querySelector(
      ".player-container:nth-child(2)"
    );

    // Reset classes
    leftContainer.className = "player-container";
    rightContainer.className = "player-container";

    // Add appropriate classes
    leftContainer.classList.add(`${leftColor}-player`);
    rightContainer.classList.add(`${rightColor}-player`);

    // Update player names with color indication
    const leftPlayerNameEl = leftContainer.querySelector(".player-name");
    const rightPlayerNameEl = rightContainer.querySelector(".player-name");
    leftPlayerNameEl.textContent = `${
      leftColor === "white" ? "⚪" : "⚫"
    } ${leftName} (You)`;
    rightPlayerNameEl.textContent = `${
      rightColor === "white" ? "⚪" : "⚫"
    } ${rightName}`;

    // Add ratings
    const leftPlayerInfoEl = leftContainer.querySelector(".player-info");
    const rightPlayerInfoEl = rightContainer.querySelector(".player-info");
    leftPlayerInfoEl.textContent = `Rating: ${leftRating}`;
    rightPlayerInfoEl.textContent = `Rating: ${rightRating}`;

    // Store which player is on which side for piece updates
    leftContainer.dataset.playerColor = leftColor;
    rightContainer.dataset.playerColor = rightColor;

    // Make the game container visible
    gameContainer.classList.add("active");

    // Trigger a custom event that wheel.js can listen for
    const event = new CustomEvent("gameDataUpdated", {
      detail: {
        leftColor,
        rightColor,
        leftContainer,
        rightContainer,
      },
    });
    document.dispatchEvent(event);
  }

  // Update piece counts display
  function updatePieceCounts(pieces) {
    if (!pieces) return;

    // Get the containers with their assigned colors
    const leftContainer = document.querySelector(
      ".player-container:nth-child(1)"
    );
    const rightContainer = document.querySelector(
      ".player-container:nth-child(2)"
    );

    const leftColor = leftContainer.dataset.playerColor;
    const rightColor = rightContainer.dataset.playerColor;

    const leftPiecesList = leftContainer.querySelector(".piece-list");
    const rightPiecesList = rightContainer.querySelector(".piece-list");

    // Clear existing lists
    leftPiecesList.innerHTML = "";
    rightPiecesList.innerHTML = "";

    // Update left player pieces
    for (const [piece, count] of Object.entries(pieces[leftColor])) {
      if (piece !== "total") {
        const listItem = document.createElement("li");
        listItem.innerHTML = `
          <div class="piece-info">
            <span class="piece-symbol">${pieceNameToSymbol(
              piece,
              leftColor
            )}</span>
            <span class="piece-count">${count}</span>
          </div>
        `;
        leftPiecesList.appendChild(listItem);
      }
    }

    // Add total for left player
    const leftTotalItem = document.createElement("li");
    leftTotalItem.classList.add("total-item");
    leftTotalItem.innerHTML = `<div class="piece-info"><strong>Total</strong> <strong>${pieces[leftColor].total}</strong></div>`;
    leftPiecesList.appendChild(leftTotalItem);

    // Update right player pieces
    for (const [piece, count] of Object.entries(pieces[rightColor])) {
      if (piece !== "total") {
        const listItem = document.createElement("li");
        listItem.innerHTML = `
          <div class="piece-info">
            <span class="piece-symbol">${pieceNameToSymbol(
              piece,
              rightColor
            )}</span>
            <span class="piece-count">${count}</span>
          </div>
        `;
        rightPiecesList.appendChild(listItem);
      }
    }

    // Add total for right player
    const rightTotalItem = document.createElement("li");
    rightTotalItem.classList.add("total-item");
    rightTotalItem.innerHTML = `<div class="piece-info"><strong>Total</strong> <strong>${pieces[rightColor].total}</strong></div>`;
    rightPiecesList.appendChild(rightTotalItem);

    // Dispatch a custom event with piece data that wheel.js can listen for
    const event = new CustomEvent("piecesUpdated", {
      detail: {
        pieces,
        leftColor,
        rightColor,
      },
    });
    document.dispatchEvent(event);
  }

  async function streamGameData(gameId) {
    try {
      // Stop checking before starting to stream
      stopGameChecking();

      isStreaming = true;
      console.log(`Starting to stream game data for game ID: ${gameId}`);

      // Update status
      statusElement.textContent = `Streaming game ${gameId}...`;

      // Hide content section while streaming
      contentSection.style.display = "none";

      const streamUrl = `https://lichess.org/api/stream/game/${gameId}`;

      const response = await fetch(streamUrl, {
        headers: {
          Accept: "application/x-ndjson",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Handle the streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // Create a container for game stream updates
      const gameUpdatesContainer = document.createElement("div");
      gameUpdatesContainer.className = "game-updates";
      contentSection.appendChild(gameUpdatesContainer);

      // Process the stream
      while (true) {
        const { value, done } = await reader.read();

        if (done) {
          console.log("Game stream ended");
          statusElement.textContent =
            "Game stream complete. Resuming monitoring...";
          isStreaming = false;

          // Hide the game display when stream ends
          gameContainer.classList.remove("active");

          // Show content section again when streaming ends
          contentSection.style.display = "";

          scheduleNextCheck();
          return;
        }

        // Decode the chunk
        const chunk = decoder.decode(value, { stream: true });

        // NDJSON format is one JSON object per line
        const lines = chunk.split("\n").filter((line) => line.trim() !== "");

        for (const line of lines) {
          try {
            const update = JSON.parse(line);
            //console.log("Game update:", update);

            const pieces = countPiecesFromFEN(update.fen);
            //console.log("Pieces:", pieces);

            // Update the UI with the latest piece counts
            updatePieceCounts(pieces);
          } catch (e) {
            console.warn("Error while reading", line, e.message);
          }
        }
      }
    } catch (error) {
      console.error("Error streaming game data:", error);

      // Display error in UI
      const errorElement = document.createElement("p");
      errorElement.textContent = `Streaming error: ${error.message}`;
      errorElement.style.color = "red";

      // Show content section again on error
      contentSection.style.display = "";
      contentSection.appendChild(errorElement);

      // Reset streaming state and schedule next check
      isStreaming = false;
      isChecking = false;
      scheduleNextCheck();
    }
  }

  async function checkForActiveGame() {
    // Don't proceed if we're already checking or streaming
    if (isChecking || isStreaming) return;

    isChecking = true;

    // Ensure content section is visible during checks
    contentSection.style.display = "";

    try {
      console.log("Checking for active games...");
      statusElement.textContent = `Checking for active games by ${
        username || "user"
      }...`;

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        // If user not found or other error, schedule next check
        if (response.status === 404) {
          statusElement.textContent = `No user found with username: ${username}. Will check again in 5 seconds.`;
          isChecking = false;
          scheduleNextCheck();
          return;
        }
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Parse the JSON response
      const jsonData = await response.json();
      console.log("Received game data:", jsonData);

      if (onGoingStatuses.includes(jsonData.status)) {
        const gameId = jsonData.id;
        console.log("Game is ongoing. Streaming game data...");

        // Update status and start streaming
        statusElement.textContent = "Found ongoing game. Starting stream...";

        // Initialize the player display with data from the game response
        updatePlayerDisplay(jsonData);

        isChecking = false;
        await streamGameData(gameId);
      } else {
        statusElement.textContent = `No active games found for ${
          username || "user"
        }. Will check again in 5 seconds.`;
        isChecking = false;
        scheduleNextCheck();
      }
    } catch (error) {
      console.error("Error checking for games:", error);
      statusElement.textContent = `Error checking for games: ${error.message}. Will check again in 5 seconds.`;
      isChecking = false;
      scheduleNextCheck();
    }
  }

  function scheduleNextCheck() {
    // Clear any existing timeout
    stopGameChecking(); // Use stopGameChecking instead of directly clearing timeout

    // Schedule a new check after 5 seconds
    checkTimeoutId = setTimeout(() => {
      checkForActiveGame();
    }, 5000);

    console.log("Scheduled next check in 5 seconds");
  }

  function startGameChecking() {
    // Reset both flags to ensure we start fresh
    isStreaming = false;
    isChecking = false;

    // Clear any existing timeout
    stopGameChecking();

    // Ensure content section is visible when starting checks
    contentSection.style.display = "";

    // Immediately perform first check
    checkForActiveGame();
  }

  function stopGameChecking() {
    if (checkTimeoutId) {
      clearTimeout(checkTimeoutId);
      checkTimeoutId = null;
      console.log("Stopped checking for games");
    }
  }

  function countPiecesFromFEN(fen) {
    // Extract the board position part of the FEN string (everything before the first space)
    const boardPosition = fen.split(" ")[0];

    // Initialize piece counters
    const pieces = {
      white: {
        pawn: 0,
        knight: 0,
        bishop: 0,
        rook: 0,
        queen: 0,
        king: 0,
        total: 0,
      },
      black: {
        pawn: 0,
        knight: 0,
        bishop: 0,
        rook: 0,
        queen: 0,
        king: 0,
        total: 0,
      },
    };

    // Process each character in the board position
    for (const char of boardPosition) {
      // Skip slashes (row separators)
      if (char === "/") continue;

      // Skip numbers (empty squares)
      if (!isNaN(parseInt(char))) continue;

      // Determine piece color and type
      const isWhite = char === char.toUpperCase();
      const color = isWhite ? "white" : "black";
      const pieceChar = char.toLowerCase();

      // Count the piece
      switch (pieceChar) {
        case "p":
          pieces[color].pawn++;
          break;
        case "n":
          pieces[color].knight++;
          break;
        case "b":
          pieces[color].bishop++;
          break;
        case "r":
          pieces[color].rook++;
          break;
        case "q":
          pieces[color].queen++;
          break;
        case "k":
          pieces[color].king++;
          break;
      }

      // Increment total counter
      pieces[color].total++;
    }

    return pieces;
  }

  // Add username input if not provided in URL
  if (!username) {
    const usernameForm = document.createElement("form");

    const usernameInput = document.createElement("input");
    usernameInput.type = "text";
    usernameInput.placeholder = "Enter Lichess username";
    usernameInput.required = true;

    const submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.textContent = "Start monitoring";

    usernameForm.appendChild(usernameInput);
    usernameForm.appendChild(submitButton);

    usernameForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const newUsername = usernameInput.value.trim();
      if (newUsername) {
        window.location.search = `?username=${encodeURIComponent(newUsername)}`;
      }
    });

    contentSection.appendChild(usernameForm);
  } else {
    // Initialize status and start checking
    initializeStatusElement();
    startGameChecking();
  }

  // Add a cleanup function to stop checking when page is unloaded
  window.addEventListener("beforeunload", function () {
    stopGameChecking();
  });

  // Make pieceNameToSymbol and getPieceName globally available for wheel.js
  window.pieceNameToSymbol = pieceNameToSymbol;
  window.getPieceName = getPieceName;
});
