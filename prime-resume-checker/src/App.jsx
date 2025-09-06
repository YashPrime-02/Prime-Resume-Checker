// src/App.js
import "./App.css";

import Navbar from "./components/Navbar/Navbar";
import Hero from "./components/Hero/Hero";
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import UploadEditor from "./components/Upload-Editor/UploadEditor";


function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
<Routes>
  {/* Home page with hero */}
  <Route path="/" element={<Hero />} />

  {/* Upload page */}
  <Route path="/upload" element={<UploadEditor />} />

  {/* Optional: catch-all route */}
  <Route path="*" element={<Hero />} />
</Routes>

      </div>
    </Router>
  );
}

export default App;

