import React, { useState } from "react";
import "./Navbar.css";
import logo from "../../assets/Logos/Prime-Resume-Logo.png";
import { Link } from "react-router-dom";
function Navbar() {
  const [open, setOpen] = useState(false);

  const toggleMenu = () => {
    setOpen((prev) => !prev);
  };

  const handleLinkClick = () => {
    setOpen(false); // close menu on link click
  };

  return (
    <nav className="navbar">
      {/* Logo */}
     <div className="logo">
  <Link to="/">
    <img src={logo} alt="LOGO" />
  </Link>
</div>
      {/* Hamburger */}
      <div
        className={`hamburger${open ? " open" : ""}`}
        onClick={toggleMenu}
        role="button"
        aria-label="Toggle menu"
        tabIndex={0}
      >
        <span></span>
        <span></span>
        <span></span>
      </div>

      {/* Navigation Links */}
      <ul className={`nav-links${open ? " open" : ""}`}>
        <li><a href="#about" onClick={handleLinkClick}>About</a></li>
        <li><a href="/upload" onClick={handleLinkClick}>Upload</a></li>
        <li><a href="#features" onClick={handleLinkClick}>Features</a></li>
        <li><a href="#testimonials" onClick={handleLinkClick}>Testimonials</a></li>
        <li><a href="#contact" onClick={handleLinkClick}>Contact</a></li>
      </ul>

      {/* Background Overlay */}
      {open && <div className="overlay" onClick={toggleMenu}></div>}
    </nav>
  );
}

export default Navbar;
