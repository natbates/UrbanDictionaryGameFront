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

  const [messages, setMessages] = useState([]); // Store chat messages
  const [chatInput, setChatInput] = useState(""); // Input for new messages
  const [leaderId, setLeaderId] = useState(null);

  const [hasSubmitted, setHasSubmitted] = useState(false); // Track if the player has submitted an answer
  const [allSubmitted, setAllSubmitted] = useState(false); // Track if all players have submitted answers
  const [prompt, setPrompt] = useState("");
  const [isJudge, setIsJudge] = useState(false);
  const [judgeName, setJudgeName] = useState("");
  const [submissions, setSubmissions] = useState([]);
  const [isPicking, setIsPicking] = useState(false);
  const [winner, setWinner] = useState(null);
  const [scores, setScores] = useState({});
  const [answer, setAnswer] = useState("");


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

    socket.on("chat-message", ({ sender, message }) => {
      console.log(`💬 New message from ${sender}: ${message}`);
      setMessages((prevMessages) => [...prevMessages, { sender, message }]);
    });

    socket.on("game-started", (gameState) => {
      console.log("🎮 Game started with state:", gameState);
      // Set round and phase
      setRound(gameState.round);
      setPhase(gameState.phase);
      setGameStarted(true);
      // Reset all player states
      setHasSubmitted(false); // Reset submission state for all players
      setAllSubmitted(false); // Reset all submitted status
  });

    socket.on("new-round", ({ prompt, isJudge, judgeName }) => {
      console.log(`🎲 New round started. Prompt: ${prompt}`);
      setPrompt(prompt);
      setIsJudge(isJudge);
      setJudgeName(judgeName);
      setSubmissions([]); // Clear previous submissions
      setHasSubmitted(false); // Reset submission state for this round
      setAllSubmitted(false); // Reset all submitted status
    });
  
    socket.on("judge-pick", ({ submissions }) => {
      console.log("👨‍⚖️ You are the judge. Submissions:", submissions);
      setSubmissions(submissions);
      setIsPicking(true); // Show the judge UI
    });
  
    socket.on("round-results", ({ winnerName, scores }) => {
      console.log(`🏆 ${winnerName} won the round! Scores:`, scores);
      setWinner(winnerName);
      setScores(scores);
    });

    socket.on("update-leader", ({ leaderId, leaderName }) => {
      console.log(`👑 New leader is: ${leaderName} (ID: ${leaderId})`);
      setLeaderId({ id: leaderId, name: leaderName }); // Update the leader ID in the frontend state
    });

    return () => {
      console.log("❌ Cleaning up socket listeners");
      socket.off("update-players");
      socket.off("lobby-not-found");
      socket.off("lobby-found");
      socket.off("game-started");
      socket.off("lobby-join-failed");
      socket.off("chat-message");
      socket.off("update-leader");
      socket.off("new-round");
      socket.off("judge-pick");
      socket.off("round-results");
    };
  }, []);

  const handleSubmitAnswer = () => {
    if (!answer.trim()) return;
    socket.emit("submit-answer", { lobbyId: lobbyCode, answer });
    setAnswer(""); // Clear the input
    setHasSubmitted(true); // Mark that the player has submitted
  };

  const handlePickFavorite = (playerId) => {
    console.log("👨‍⚖️ Picking favorite answer from player:", playerId);
    socket.emit("judge-pick", { lobbyId: lobbyCode, selectedPlayerId: playerId });
    setIsPicking(false); // Hide the judge UI
  };

  const handleSendMessage = () => {
    if (chatInput.trim() === "") return; // Ignore empty messages

    const message = chatInput.trim();
    socket.emit("chat-message", { lobbyId: lobbyCode, message, sender: name }); // Send message to backend
    setChatInput(""); // Clear input
};

  const handleLeaveLobby = () => {
    console.log("🚪 Leaving lobby:", lobbyCode);
    socket.emit("leave-lobby", { lobbyId: lobbyCode, playerId: socket.id }); // Notify the backend
    setPlayers([]); // Clear the player list
    setLobbyCode(""); // Reset the lobby code
    setIsLobbyJoined(false); // Mark the user as not in a lobby
    setMode(null); // Reset the mode
    setIsLobbyFound(false); // Reset lobby found status
    setChatInput(""); // Clear chat input
    setMessages([]); // Clear chat messages
  };

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

  const handleNextRound = () => {
    console.log("➡️ Moving to the next round...");
  
    // Emit an event to start the next round
    socket.emit("start-next-round", { lobbyId: lobbyCode });
  
    // Update the round and phase if you handle this on the client-side as well
    setRound(prevRound => prevRound + 1);  // Increment round number
    setPhase(0);  // Reset the phase to 0, or the appropriate starting phase
    setWinner(null); // Reset the winner for the next round
    setScores({});  // Reset the scores for the next round
    setSubmissions([]); // Reset the submissions
    setHasSubmitted(false); // Reset submission state
    setAllSubmitted(false); // Reset all players' submissions
  };

  // --- IN LOBBY ---
  useEffect(() => {
    if (players.length > 0) {
      const allPlayersSubmitted = players.every(player => player.hasSubmitted);
      setAllSubmitted(allPlayersSubmitted);
    }
  }, [players, hasSubmitted]);

  // --- IN LOBBY ---
  if (isLobbyJoined) {
    return (
      <div className="lobby-container">
        <div className="lobby-sidebar">
          <h2>Lobby: {lobbyCode}</h2>
          <div>
            Lobby Leader: {leaderId ? (leaderId.id === socket.id ? "You" : leaderId.name) : "Loading..."}
          </div>
          <h3>Players:</h3>
          <ul>
            {players.map((player, index) => (
              <li key={index}>
                {player.name}: {player.score !== undefined ? player.score : "No score"}
              </li>
            ))}
          </ul>
          <button onClick={handleLeaveLobby}>Leave Lobby</button>
          {players.length > 1 && leaderId?.id === socket?.id && <button onClick={handleStartGame}>Start Game</button>}
          <div className="chat-box">
            <h1>Chat</h1>
            <div className="chat-messages">
              {messages.map((msg, index) => (
                <div key={index}>
                  <strong>{msg.sender}:</strong> {msg.message}
                </div>
              ))}
            </div>
            <div className="chat-input">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
              />
              <button onClick={handleSendMessage}>Send</button>
            </div>
          </div>
        </div>

        <div className="game-content">
          {gameStarted && (
            <div className="game-container">
              <h2>Game in Progress</h2>
              <h3>Round: {round}</h3>
              <h3>Phase: {phase}</h3>
              <h3>Judge: {judgeName}</h3>
              {!isJudge && (
                <div className="submission-box">
                  <h3>Prompt: {prompt}</h3>
                  <input
                    type="text"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Write your answer..."
                    disabled={hasSubmitted} // Disable input after submitting
                  />
                  <button onClick={handleSubmitAnswer} disabled={hasSubmitted}>Submit</button>
                </div>
              )}
              {isPicking && isJudge && (
                <div className="judge-box">
                  <h3>Pick the funniest answer:</h3>
                  {submissions.map((sub, idx) => (
                    <div key={idx}>
                      <p>{sub.answer}</p>
                      <button onClick={() => handlePickFavorite(sub.playerId)}>Pick</button>
                    </div>
                  ))}
                </div>
              )}
              {winner && (
                <div className="winner-box">
                  <h2>🏆 {winner} won the round!</h2>
                  <h3>Scores:</h3>
                  <ul>
                  {scores.map((player, index) => (
                    <li key={index}>{player.name}: {player.score}</li>
                  ))}
                  </ul>
                  {isJudge && <button onClick={handleNextRound}>Next Round</button>}

                </div>
              )}
            </div>
          )}
          {!hasSubmitted && allSubmitted && (
            <div className="waiting-for-round">
              <h3>Waiting for the round to end...</h3>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="lobby-container">
      <h2>{mode === "create" ? "Create a Lobby" : "Join a Lobby"}</h2>
      {!mode && (
        <div>
          <button onClick={() => { setMode("create"); }}>Create Lobby</button>
          <button onClick={() => { setMode("join"); }}>Join Lobby</button>
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
          <button onClick={() => { setMode(null); setError(null) }}>Back</button> 
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
          <button onClick={() => { setMode(null); setError(null) }}>Back</button> 
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
          <button onClick={() => { setLobbyCode(null) }}>Back</button> 
        </div>
      )}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};

export default Lobby;