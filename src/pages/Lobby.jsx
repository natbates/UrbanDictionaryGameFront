import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

const socket = io(process.env.REACT_APP_BACKEND_URL);

console.log("🔌 Socket connected:", socket.id, " on port ", process.env.REACT_APP_BACKEND_URL);

const Lobby = () => {
  const [name, setName] = useState("");
  const [lobbyCode, setLobbyCode] = useState("");
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState("");
  const [isLobbyJoined, setIsLobbyJoined] = useState(false);
  const [mode, setMode] = useState(null); // "create" or "join"
  const [isLobbyFound, setIsLobbyFound] = useState(false);

  const [gameStarted, setGameStarted] = useState(false);
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState(0);
  const [wordOptions, setWordOptions] = useState([]);
  const [selectedWord, setSelectedWord] = useState(null);

  useEffect(() => {
    console.log("📡 Setting up socket listeners");

    socket.on("update-players", (playerList) => {
        console.log("✅ Received updated player list:", playerList);
        setPlayers(playerList);
      
        const isInList = playerList.some((p) => p.id === socket.id);
        setIsLobbyJoined(isInList);
    });

    socket.on("lobby-not-found", (res) => {
      console.log("❌ Lobby not found:", res.message);
      setError(res.message);
      setIsLobbyFound(false);
    });

    socket.on("lobby-join-failed", (res) => {
        console.log("❌ Failed to join lobby:", res.message);
        setError(res.message);
    });

    socket.on("lobby-found", (res) => {
        console.log("✅ Lobby exists:", res.message);
        setError("");
        setIsLobbyFound(true);
    });

    socket.on("game-started", (gameState) => {
        console.log("🎮 Game started with state:", gameState);
        // Set round and phase
        setRound(gameState.round);
        setPhase(gameState.phase);
        setGameStarted(true);
        // Display word options
        setWordOptions(gameState.wordOptions);
    });

    return () => {
      console.log("❌ Cleaning up socket listeners");
      socket.off("update-players");
      socket.off("lobby-not-found");
      socket.off("lobby-found");
      socket.off("game-started");
      socket.off("lobby-join-failed");
    };
  }, []);

  const handleLeaveLobby = () => {
    console.log("🚪 Leaving lobby:", lobbyCode);
    socket.emit("leave-lobby", { lobbyId: lobbyCode, playerId: socket.id }); // Notify the backend
    setPlayers([]); // Clear the player list
    setLobbyCode(""); // Reset the lobby code
    setIsLobbyJoined(false); // Mark the user as not in a lobby
    setMode(null); // Reset the mode
    setIsLobbyFound(false); // Reset lobby found status
  };

  // --- CREATE ---
  const handleCreateLobby = () => {
    if (!name) {
      console.warn("⚠️ No name entered for creation");
      return setError("Please enter your name");
    }

    const newCode = uuidv4().slice(0, 6).toUpperCase();
    setLobbyCode(newCode);

    console.log(`🛠️ Attempting to create lobby: ${newCode} with name: ${name}`);

    socket.emit("create-lobby", { lobbyId: newCode, name }, (res) => {
      if (res.success) {
        console.log("✅ Lobby created:", newCode);
        setIsLobbyJoined(true);
        setError("");
      } else {
        console.error("❌ Failed to create lobby:", res.message);
        setError("Error creating lobby. Try again.");
      }
    });
  };

  // --- JOIN STEP 1: Check if exists ---
  const handleCheckLobby = () => {
    if (!lobbyCode) {
      console.warn("⚠️ No lobby code entered for join check");
      return setError("Enter a lobby code");
    }
  
    console.log(`🔍 Probing lobby existence: ${lobbyCode}`);
    setError("");
    setIsLobbyFound(false);
  
    let didRespond = false;
  
    const timeout = setTimeout(() => {
      if (!didRespond) {
        console.error("⏰ No response from server. Assuming lobby not found.");
        setError("Lobby not found or server did not respond.");
        setIsLobbyFound(false);
      }
    }, 3000); // 3 second fallback
  
    socket.emit("join-lobby", { lobbyId: lobbyCode, name: null });
  
    // These listeners will run if server responds
    const handleFound = (res) => {
      console.log("✅ Lobby exists:", res.message);
      clearTimeout(timeout);
      didRespond = true;
      setError("");
      setIsLobbyFound(true);
    };
  
    const handleNotFound = (res) => {
      console.log("❌ Lobby not found:", res.message);
      clearTimeout(timeout);
      didRespond = true;
      setError(res.message);
      setIsLobbyFound(false);
    };
  
    socket.once("lobby-found", handleFound);
    socket.once("lobby-not-found", handleNotFound);
  };
  
  // --- JOIN STEP 2: Confirm with name ---
  const handleJoinLobby = () => {
    if (!name) {
      console.warn("⚠️ No name entered to join");
      return setError("Enter your name");
    }

    console.log(`🔗 Joining lobby: ${lobbyCode} as ${name}`);
    setError("");
    socket.emit("join-lobby", { lobbyId: lobbyCode, name });
  };

  const handleStartGame = () => {
    console.log("🚀 Starting the game...");
    setGameStarted(true);
    // Emit start game event with the current lobby code
    socket.emit("start-game", lobbyCode);
  };

  const handleWordSelection = (word) => {
    console.log("🎯 Word selected:", word);
    setSelectedWord(word);
    // You can then emit this to the server to store the selected word for this player
    socket.emit('word-selected', { lobbyId: lobbyCode, word });
  };

  // --- IN LOBBY ---
  if (isLobbyJoined) {
    console.log("🎉 User is in the lobby");
    if (gameStarted) {
      console.log("🎮 Game is in progress");
      return (
        <div className="game-container">
          <h2>Game in Progress</h2>
          <h3>Round: {round}</h3>
          <h3>Phase: {phase}</h3>
          <h3>Word Options:</h3>
          <ul>
            {wordOptions.map((word, index) => (
              <li key={index} onClick={() => handleWordSelection(word)}>{word}</li>
            ))}
          </ul>
          {selectedWord && <p>You selected: {selectedWord}</p>}
        </div>
      );
    } else {
    return (
      <div className="lobby-container">
        <h2>Lobby: {lobbyCode}</h2>
        <h3>Players:</h3>
        <ul>
          {players?.map((p) => (
            <li key={p.id}>{p.name}</li>
          ))}
        </ul>
        <button onClick={handleLeaveLobby}>Leave Lobby</button> {/* Add this button */}
        {players.length > 1 && <button onClick={handleStartGame}>Start Game</button>}
      </div>
    );}
  }

  // --- UI BEFORE JOIN ---
  return (
    <div className="lobby-container">
      <h2>{mode === "create" ? "Create a Lobby" : "Join a Lobby"}</h2>

      {!mode && (
        <div>
          <button onClick={() => { console.log("🆕 Switching to create mode"); setMode("create"); }}>Create Lobby</button>
          <button onClick={() => { console.log("🔑 Switching to join mode"); setMode("join"); }}>Join Lobby</button>
        </div>
      )}

      {mode === "create" && (
        <div>
          <input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button onClick={handleCreateLobby}>Create</button>
          <button onClick={() => {setMode(null); setError(null)}}>Back</button> 
        </div>
      )}

      {mode === "join" && !isLobbyFound && (
        <div>
          <input
            type="text"
            placeholder="Enter Lobby Code"
            value={lobbyCode}
            onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
          />
          <button onClick={handleCheckLobby}>Check Lobby</button>
          <button onClick={() => {setMode(null); setError(null)}}>Back</button> 
        </div>
      )}

      {mode === "join" && lobbyCode && !isLobbyJoined && isLobbyFound && !error && (
        <div>
          <input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button onClick={handleJoinLobby}>Join Lobby</button>
          <button onClick={() => {setLobbyCode(null)}}>Back</button> 
        </div>
      )}

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};

export default Lobby;
