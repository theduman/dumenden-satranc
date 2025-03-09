document.addEventListener("DOMContentLoaded", function () {
  // Store player wheel data including wheel dimensions (increased by 50%)
  let wheelData = {
    left: {
      pieces: [],
      selectedPieces: [],
      color: null,
      container: null,
      rotation: 0,
      currentlySpinning: false,
      width: 450, // Increased from 300 by 50%
      height: 450, // Increased from 300 by 50%
    },
    right: {
      pieces: [],
      selectedPieces: [],
      color: null,
      container: null,
      rotation: 0,
      currentlySpinning: false,
      width: 450, // Increased from 300 by 50%
      height: 450, // Increased from 300 by 50%
    },
  };

  // Keep track of previous piece counts for each side
  let previousPieceCounts = {
    left: {},
    right: {},
  };

  // Listen for game data updates
  document.addEventListener("gameDataUpdated", function (event) {
    const { leftColor, rightColor, leftContainer, rightContainer } =
      event.detail;

    // Store color information and containers
    wheelData.left.color = leftColor;
    wheelData.right.color = rightColor;
    wheelData.left.container = leftContainer;
    wheelData.right.container = rightContainer;

    // Reset piece counts to ensure proper shuffling for new games
    previousPieceCounts = {
      left: {},
      right: {},
    };

    // Clear existing wheels
    clearWheels();
  });

  // Listen for piece updates
  document.addEventListener("piecesUpdated", function (event) {
    const { pieces, leftColor, rightColor } = event.detail;

    // Update wheel data
    updateWheelDataWithPieceChanges(pieces, leftColor, rightColor);

    // If wheels are currently spinning, reset them
    resetActiveSpinners();

    // Create or update wheels
    createD3Wheel("left");
    createD3Wheel("right");
  });

  // Update the wheel data based on current pieces, but only remove specific pieces that have been lost
  function updateWheelDataWithPieceChanges(pieces, leftColor, rightColor) {
    // Process left player pieces
    const leftPreviousCounts = previousPieceCounts.left;
    const leftCurrentCounts = pieces[leftColor];

    // If this is the first update, or we have no previous data, just shuffle and set
    if (
      Object.keys(leftPreviousCounts).length === 0 ||
      wheelData.left.pieces.length === 0
    ) {
      // Initial setup with shuffling
      wheelData.left.pieces = [];
      for (const [piece, count] of Object.entries(leftCurrentCounts)) {
        if (piece !== "total") {
          for (let i = 0; i < count; i++) {
            wheelData.left.pieces.push(piece);
          }
        }
      }

      // Add 1 joker to the wheel
      wheelData.left.pieces.push("joker");

      shuffleArray(wheelData.left.pieces);
    } else {
      // Selectively remove lost pieces
      for (const piece of [
        "pawn",
        "knight",
        "bishop",
        "rook",
        "queen",
        "king",
      ]) {
        const prevCount = leftPreviousCounts[piece] || 0;
        const currCount = leftCurrentCounts[piece] || 0;

        // If pieces have been lost
        if (currCount < prevCount) {
          const piecesToRemove = prevCount - currCount;
          removePiecesFromArray(wheelData.left.pieces, piece, piecesToRemove);
        }
        // If pieces have been added (rare, but possible with pawn promotion)
        else if (currCount > prevCount) {
          const piecesToAdd = currCount - prevCount;
          for (let i = 0; i < piecesToAdd; i++) {
            wheelData.left.pieces.push(piece);
          }
        }
      }

      // Make sure joker is still in the wheel
      if (!wheelData.left.pieces.includes("joker")) {
        wheelData.left.pieces.push("joker");
      }
    }

    // Store current counts for next comparison
    previousPieceCounts.left = { ...leftCurrentCounts };

    // Process right player pieces - same logic as above
    const rightPreviousCounts = previousPieceCounts.right;
    const rightCurrentCounts = pieces[rightColor];

    if (
      Object.keys(rightPreviousCounts).length === 0 ||
      wheelData.right.pieces.length === 0
    ) {
      wheelData.right.pieces = [];
      for (const [piece, count] of Object.entries(rightCurrentCounts)) {
        if (piece !== "total") {
          for (let i = 0; i < count; i++) {
            wheelData.right.pieces.push(piece);
          }
        }
      }

      // Add 1 joker to the wheel
      wheelData.right.pieces.push("joker");

      shuffleArray(wheelData.right.pieces);
    } else {
      for (const piece of [
        "pawn",
        "knight",
        "bishop",
        "rook",
        "queen",
        "king",
      ]) {
        const prevCount = rightPreviousCounts[piece] || 0;
        const currCount = rightCurrentCounts[piece] || 0;

        if (currCount < prevCount) {
          const piecesToRemove = prevCount - currCount;
          removePiecesFromArray(wheelData.right.pieces, piece, piecesToRemove);
        } else if (currCount > prevCount) {
          const piecesToAdd = currCount - prevCount;
          for (let i = 0; i < piecesToAdd; i++) {
            wheelData.right.pieces.push(piece);
          }
        }
      }

      // Make sure joker is still in the wheel
      if (!wheelData.right.pieces.includes("joker")) {
        wheelData.right.pieces.push("joker");
      }
    }

    // Store current counts for next comparison
    previousPieceCounts.right = { ...rightCurrentCounts };
  }

  // Helper function to remove a specific number of piece instances from an array
  function removePiecesFromArray(piecesArray, pieceType, countToRemove) {
    // Get all indexes of this piece type
    const indexes = [];
    for (let i = 0; i < piecesArray.length; i++) {
      if (piecesArray[i] === pieceType) {
        indexes.push(i);
      }
    }

    // Shuffle the indexes to remove random instances of this piece
    shuffleArray(indexes);

    // Take just the number we need to remove
    const indexesToRemove = indexes.slice(0, countToRemove);

    // Sort in descending order to avoid shifting issues when removing
    indexesToRemove.sort((a, b) => b - a);

    // Remove the pieces at these indexes
    for (const index of indexesToRemove) {
      piecesArray.splice(index, 1);
    }
  }

  // Fisher-Yates shuffle algorithm to randomize arrays
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // Clear existing wheels
  function clearWheels() {
    if (wheelData.left.container) {
      const wheelDiv =
        wheelData.left.container.querySelector(".wheel-container");
      if (wheelDiv) wheelDiv.innerHTML = "";
    }

    if (wheelData.right.container) {
      const wheelDiv =
        wheelData.right.container.querySelector(".wheel-container");
      if (wheelDiv) wheelDiv.innerHTML = "";
    }
  }

  // Create a D3.js wheel for a given side
  function createD3Wheel(side) {
    const data = wheelData[side];

    if (!data.container || data.pieces.length === 0) return;

    // Get wheel container
    const wheelDiv = data.container.querySelector(".wheel-container");
    if (!wheelDiv) return;

    // Clear any existing content
    wheelDiv.innerHTML = "";

    // Use the width and height from the wheelData object
    const width = data.width;
    const height = data.height;
    const radius = Math.min(width, height) / 2;

    // Create a fixed container with explicit dimensions
    const svgContainer = document.createElement("div");
    svgContainer.style.position = "relative";
    svgContainer.style.width = width + "px";
    svgContainer.style.height = height + "px";
    svgContainer.style.margin = "0 auto"; // Center the container
    wheelDiv.appendChild(svgContainer);

    // Create SVG with fixed viewBox
    const svg = d3
      .select(svgContainer)
      .append("svg")
      .attr("class", "wheel-svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`);

    // Create a static (non-rotating) group for the wheel outline
    const staticGroup = svg
      .append("g")
      .attr("class", "wheel-static")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    // Add an outline circle
    staticGroup
      .append("circle")
      .attr("r", radius - 5)
      .attr("fill", "none")
      .attr("stroke", "#ddd")
      .attr("stroke-width", 2);

    // Create a group for the spinning content
    const spinGroup = svg
      .append("g")
      .attr("class", "wheel-spin")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    // Define piece-specific colors with the new color scheme
    const pieceColors = {
      pawn: "#66BB6A", // Green
      knight: "#00BCD4", // Cyan
      bishop: "#03A9F4", // Light Blue
      rook: "#FFEB3B", // Yellow
      queen: "#FF9800", // Orange
      king: "#F44336", // Red
      joker: "url(#rainbow-gradient)", // Rainbow gradient for joker
    };

    // Create a rainbow gradient definition for the joker
    const defs = svg.append("defs");
    const gradient = defs
      .append("linearGradient")
      .attr("id", `rainbow-gradient-${side}`)
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "100%");

    // Define the rainbow colors
    const rainbowColors = [
      "#FF0000",
      "#FF7F00",
      "#FFFF00",
      "#00FF00",
      "#0000FF",
      "#4B0082",
      "#8B00FF",
    ];
    rainbowColors.forEach((color, i) => {
      gradient
        .append("stop")
        .attr("offset", `${(i * 100) / (rainbowColors.length - 1)}%`)
        .attr("stop-color", color);
    });

    // Create pie layout
    const pie = d3
      .pie()
      .sort(null) // No sorting to preserve random order
      .value(() => 1);

    // Create arc generator
    const arc = d3
      .arc()
      .innerRadius(0)
      .outerRadius(radius - 10);

    // Prepare the data with fixed color mapping
    const pieData = data.pieces.map((piece) => ({
      piece: piece,
      color:
        piece === "joker"
          ? `url(#rainbow-gradient-${side})`
          : pieceColors[piece], // Special handling for joker
    }));

    // Create arc paths
    const arcs = spinGroup
      .selectAll("g.slice")
      .data(pie(pieData))
      .enter()
      .append("g")
      .attr("class", "slice");

    arcs
      .append("path")
      .attr("d", arc)
      .attr("fill", (d) => d.data.color)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1);

    // Add text labels with larger font size (3x bigger)
    arcs
      .append("text")
      .attr("transform", (d) => {
        const _d = arc.centroid(d);
        // Apply consistent positioning for all pieces including joker
        _d[0] *= 1.5;
        _d[1] *= 1.5;
        return `translate(${_d})`;
      })
      .attr("dy", ".35em")
      .attr("text-anchor", "middle")
      .attr(
        "class",
        (d) => `wheel-text ${d.data.piece === "joker" ? "joker-text" : ""}`
      )
      .attr("fill", (d) =>
        d.data.piece === "joker"
          ? "#fff"
          : data.color === "white"
          ? "#fff"
          : "#444"
      )
      .attr("stroke", (d) =>
        d.data.piece === "joker"
          ? "#000"
          : data.color === "white"
          ? "#000"
          : "#fff"
      )
      .attr("stroke-width", (d) => (d.data.piece === "joker" ? "1px" : "0.5px"))
      .style("font-size", (d) => (d.data.piece === "joker" ? "44px" : "48px")) // Slightly smaller for joker
      .text((d) => {
        // Fix reversed colors - use the actual wheel's color, not the data color
        // This ensures white player gets white pieces and black player gets black pieces
        return window.pieceNameToSymbol(d.data.piece, data.color);
      });

    // Add pointer on the right side with margin
    const pointer = document.createElement("div");
    pointer.className = "wheel-pointer";
    pointer.style.position = "absolute";
    pointer.style.right = "-35px"; // Changed to right with negative margin
    pointer.style.top = "50%";
    pointer.style.transform = "translateY(-50%)"; // Removed rotation
    svgContainer.appendChild(pointer);

    // Add spin button
    const spinButton = document.createElement("button");
    spinButton.className = "spin-button";
    spinButton.textContent = "Spin";
    spinButton.disabled = data.currentlySpinning;
    wheelDiv.appendChild(spinButton);

    // Add result display
    const spinResult = document.createElement("div");
    spinResult.className = "spin-result";
    wheelDiv.appendChild(spinResult);

    // Add spin event handler - IMPORTANT: we're targeting ONLY the spin group now, not the whole wheel
    spinButton.addEventListener("click", function () {
      spinD3Wheel(side, spinGroup.node(), spinResult, spinButton);
    });
  }

  // Spin the D3 wheel - the wheel element is now just the spinning group
  function spinD3Wheel(side, spinGroupElement, resultElement, spinButton) {
    const data = wheelData[side];

    // Prevent spinning if already spinning
    if (data.currentlySpinning) return;

    data.currentlySpinning = true;
    spinButton.disabled = true;
    resultElement.textContent = "";

    // Save the current timestamp to identify this particular spin
    const spinId = Date.now();
    data.currentSpinId = spinId;

    // Determine rotation amount (between 5 and 10 full rotations plus random angle)
    const spinAngle = 1800 + Math.random() * 1800;
    const oldRotation = data.rotation || 0;
    const newRotation = oldRotation + spinAngle;
    data.rotation = newRotation % 360;

    // Use width and height from the data object
    const width = data.width;
    const height = data.height;

    // Get pointer reference for highlighting
    const pointer = data.container.querySelector(".wheel-pointer");
    if (pointer) pointer.classList.add("pointer-selecting");

    // Only animate the spinning group, not the whole wheel
    d3.select(spinGroupElement)
      .transition()
      .duration(2000) // Changed from 3000 to 2000 (2 seconds)
      .ease(d3.easeQuadInOut)
      .attrTween("transform", function () {
        const startRotation = `rotate(${oldRotation})`;
        const endRotation = `rotate(${newRotation})`;
        return d3.interpolateString(
          `translate(${width / 2}, ${height / 2}) ${startRotation}`,
          `translate(${width / 2}, ${height / 2}) ${endRotation}`
        );
      })
      .on("end", function () {
        // Check if this spin has been superseded by new data
        if (data.currentSpinId !== spinId) {
          console.log("Spin aborted because new data arrived");
          return; // Exit early if a new spin has been started
        }

        // Calculate which piece is at the BOTTOM position (180 degrees)
        const totalPieces = data.pieces.length;
        const degreesPerSlice = 360 / totalPieces;

        // Normalize the rotation angle
        const normalizedRotation = ((data.rotation % 360) + 360) % 360;

        // Find index of piece at bottom (180 degrees)
        // Calculate offset from 180 degrees and find the closest piece
        let indexAt180Degrees =
          Math.round((normalizedRotation + 180) / degreesPerSlice) %
          totalPieces;

        // Adjust for the orientation in the data array
        indexAt180Degrees = (totalPieces - indexAt180Degrees) % totalPieces;
        // Get the selected piece
        const selectedPiece = data.pieces[indexAt180Degrees];

        // Store only the last selected piece
        data.selectedPieces = [selectedPiece];

        // Remove highlighting from pointer after a delay
        setTimeout(() => {
          // Double-check the spin ID hasn't changed before removing highlight
          if (data.currentSpinId === spinId && pointer) {
            pointer.classList.remove("pointer-selecting");
          }
        }, 1000);

        // Display result with Turkish piece name
        const pieceName = window.getPieceName(selectedPiece);
        const pieceSymbol = window.pieceNameToSymbol(selectedPiece, data.color);
        resultElement.innerHTML = `<span style="font-size: 2.5rem">${pieceSymbol}</span> ${pieceName}`;

        // Re-enable spinning
        data.currentlySpinning = false;
        spinButton.disabled = false;

        // We no longer shuffle the pieces array after spinning
        // Instead we just update the wheel display with the same order
        updateWheelDisplay(side);
      });
  }

  // A new function to update just the wheel display without recreating the entire wheel
  function updateWheelDisplay(side) {
    const data = wheelData[side];
    const container = data.container;
    if (!container) return;

    const wheelDiv = container.querySelector(".wheel-container");
    if (!wheelDiv) return;

    const svg = wheelDiv.querySelector("svg");
    if (!svg) return;

    const spinGroup = svg.querySelector(".wheel-spin");
    if (!spinGroup) return;

    // Calculate positions for each piece
    const width = data.width;
    const height = data.height;
    const radius = Math.min(width, height) / 2;

    // Define piece-specific colors
    const pieceColors = {
      pawn: "#66BB6A",
      knight: "#00BCD4",
      bishop: "#03A9F4",
      rook: "#FFEB3B",
      queen: "#FF9800",
      king: "#F44336",
      joker: `url(#rainbow-gradient-${side})`,
    };

    // Create pie layout and arc for the updated data
    const pie = d3
      .pie()
      .sort(null)
      .value(() => 1);
    const arc = d3
      .arc()
      .innerRadius(0)
      .outerRadius(radius - 10);

    // Prepare the data with fixed color mapping
    const pieData = data.pieces.map((piece) => ({
      piece: piece,
      color:
        piece === "joker"
          ? `url(#rainbow-gradient-${side})`
          : pieceColors[piece],
    }));

    // Reset the rotation
    d3.select(spinGroup).attr(
      "transform",
      `translate(${width / 2}, ${height / 2}) rotate(0)`
    );
    data.rotation = 0;

    // Recreate the wheel slices with the new order
    d3.select(spinGroup).selectAll("*").remove();

    const arcs = d3
      .select(spinGroup)
      .selectAll("g.slice")
      .data(pie(pieData))
      .enter()
      .append("g")
      .attr("class", "slice");

    arcs
      .append("path")
      .attr("d", arc)
      .attr("fill", (d) => d.data.color)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1);

    arcs
      .append("text")
      .attr("transform", (d) => {
        const _d = arc.centroid(d);
        // Apply consistent positioning for all pieces including joker
        _d[0] *= 1.5;
        _d[1] *= 1.5;
        return `translate(${_d})`;
      })
      .attr("dy", ".35em")
      .attr("text-anchor", "middle")
      .attr(
        "class",
        (d) => `wheel-text ${d.data.piece === "joker" ? "joker-text" : ""}`
      )
      .attr("fill", (d) =>
        d.data.piece === "joker"
          ? "#fff"
          : data.color === "white"
          ? "#fff"
          : "#444"
      )
      .attr("stroke", (d) =>
        d.data.piece === "joker"
          ? "#000"
          : data.color === "white"
          ? "#000"
          : "#fff"
      )
      .attr("stroke-width", (d) => (d.data.piece === "joker" ? "1px" : "0.5px"))
      .style("font-size", (d) => (d.data.piece === "joker" ? "44px" : "48px")) // Slightly smaller for joker
      .text((d) => {
        return window.pieceNameToSymbol(d.data.piece, data.color);
      });
  }

  // Function to reset active spinners when new data comes in
  function resetActiveSpinners() {
    ["left", "right"].forEach((side) => {
      if (wheelData[side].currentlySpinning) {
        const spinGroup =
          wheelData[side].container?.querySelector(".wheel-spin");
        const spinButton =
          wheelData[side].container?.querySelector(".spin-button");
        const pointer =
          wheelData[side].container?.querySelector(".wheel-pointer");

        if (spinGroup) {
          // Cancel any ongoing transitions
          d3.select(spinGroup).interrupt();

          // Reset transform to starting position
          d3.select(spinGroup).attr(
            "transform",
            `translate(${wheelData[side].width / 2}, ${
              wheelData[side].height / 2
            }) rotate(0)`
          );

          // Reset rotation state
          wheelData[side].rotation = 0;
        }

        // Reset UI elements
        if (pointer) pointer.classList.remove("pointer-selecting");
        if (spinButton) spinButton.disabled = false;

        // Reset spinning state
        wheelData[side].currentlySpinning = false;

        console.log(`Spinner reset for ${side} side due to new data`);
      }
    });
  }
});
