import { Link } from "react-router-dom";
import "../styles/Nav.css"; // Optional: if you want to style it

const Nav = () => {
  return (
    <div className="nav-bar">
      <nav className="nav-links">
        <h1>Nav</h1>
        <Link to="/">Home</Link>
        <Link to="/help">Help</Link>
      </nav>
    </div>
  );
};

export default Nav;
