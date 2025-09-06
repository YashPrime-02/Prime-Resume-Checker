// src/App.js
import "./App.css";

import Navbar from "./components/Navbar/Navbar";
import Hero from "./components/Hero/Hero";
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";


function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />

        <Routes>
          {/* Home page with hero */}
          <Route path="/" element={<Hero />} />
       
        

          {/* Score Page */}

          {/* Optional: catch-all route */}
          <Route path="*" element={<Hero />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

