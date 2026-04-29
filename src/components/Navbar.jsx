import { Link } from "react-router-dom";

function Navbar() {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      padding: "15px 20px",
      background: "#eee",
      alignItems: "center"
    }}>
      
      <h2>Marketlence Jobs</h2>

      <div>
        <Link to="/" style={{ marginRight: "10px" }}>Home</Link>
        <Link to="/login" style={{ marginRight: "10px" }}>Login</Link>
        <Link to="/signup">Signup</Link>
      </div>

    </div>
  );
}

export default Navbar;