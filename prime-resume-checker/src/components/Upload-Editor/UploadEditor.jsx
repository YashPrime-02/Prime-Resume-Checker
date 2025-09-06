import React, { useState } from "react";
import "./UploadEditor.css";

function UploadEditor({ onResumeChange }) {
  const [resumeText, setResumeText] = useState("");

  const handleInputChange = (e) => {
    setResumeText(e.target.value);
    onResumeChange(e.target.value); // pass value up to parent (Scorecard etc)
  };

  const handleFileUpload = (e) => {
    const file = e.target.files;
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setResumeText(event.target.result);
      onResumeChange(event.target.result);
    };
    reader.readAsText(file);
  };

  return (
    <div className="upload-editor">
      <h2>Upload or Paste Your Resume</h2>
      <textarea
        placeholder="Paste your resume text here..."
        value={resumeText}
        onChange={handleInputChange}
        rows={12}
      />
      <div className="file-input">
        <label>
          <input type="file" accept=".txt,.pdf,.doc,.docx" onChange={handleFileUpload} />
          Upload Resume File
        </label>
      </div>
    </div>
  );
}

export default UploadEditor;
