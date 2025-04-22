import "../styles/Footer.css";
import { Link } from "react-router-dom";

const Footer = () =>
{
    return(
        <div className="footer">
            <h4>Footer</h4>
            <Link to="/help">Help</Link>
        </div>
    )
}

export default Footer;