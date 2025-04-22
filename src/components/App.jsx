import "../styles/App.css";
import { Routes, Route } from "react-router-dom";

import Nav from "./Nav";

import Home from "../pages/Home";
import Help from "../pages/Help";
import Footer from "./Footer";
import Lobby from "../pages/Lobby";

const App = () =>
{
    return (
      <div className="page-container">
        <Nav />
        <div className="page-content">
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/help" element={<Help />} />

            </Routes>
        </div>
        <Footer />
      </div>  
    );
}

export default App;