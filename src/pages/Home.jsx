import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { io } from "socket.io-client";
import Lobby from "./Lobby";

const Home = () => {
  const [definition, setDefinition] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [name, setName] = useState("");


  useEffect(() => {
    // Fetch a random definition from Urban Dictionary
    const fetchRandomDefinition = async () => {
      try {
        const defRes = await axios.get(`https://api.urbandictionary.com/v0/define?term=dirty-elliot`);
        const defs = defRes.data?.list;

        if (defs && defs.length > 0) {
          setDefinition({
            word: defs[0].word,
            meaning: defs[0].definition,
            example: defs[0].example,
            author: defs[0].author
          });
        } else {
          setDefinition({ word: "Elliot", meaning: "No definition found." });
        }
      } catch (err) {
        console.error("Error fetching definition:", err);
        setDefinition({ word: "Error", meaning: "Unable to fetch definition." });
      } finally {
        setLoading(false);
      }
    };

    fetchRandomDefinition();
  }, []);

  return (
    <div className="home-page">
      <h1>Urban Dictionary Random Definition</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        definition && (
          <div>
            <h2>{definition.word}</h2>
            <p><strong>Definition:</strong> {definition.meaning}</p>
            {definition.example && <p><strong>Example:</strong> {definition.example}</p>}
            {definition.author && <p><em>- {definition.author}</em></p>}
          </div>
        )
      )}

      <Lobby />
    
    </div>
  );
};

export default Home;
