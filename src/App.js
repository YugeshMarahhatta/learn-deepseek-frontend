// src/App.js
import { ReadableStream } from 'web-streams-polyfill';
global.ReadableStream = ReadableStream;

import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  // Upload document handler
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('document', file);

    try {
      setUploadStatus('Uploading...');
      const response = await axios.post('http://localhost:8020/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      console.log("Response", response);

      getDocument()
      setDocuments([...documents, response.data.documentId]);
      setUploadStatus('Upload successful!');
      setTimeout(() => setUploadStatus(''), 2000);
    } catch (error) {
      setUploadStatus('Upload failed');
      console.error(error);
    }
  };

  // Ask question handler with streaming
    const handleAsk = async (e) => {
        e.preventDefault();
        if (!selectedDoc || !question) return;

        setIsLoading(true);
        setAnswer('');

        try {
            const response = await fetch(
                `http://localhost:8020/api/ask/${selectedDoc}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ question }),
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            setAnswer(data.answer); // Assuming the response has an "answer" field
            setIsLoading(false);
        } catch (error) {
            console.error("Fetch Error:", error);
            setAnswer(`Error: ${error.message}`);
            setIsLoading(false);
        }
    };


  // Fetch documents on mount
  const  getDocument= () => {
    console.log("Herererer");
        axios.get('http://localhost:8020/api/documents')
      .then(response => setDocuments(response.data.documents))
      .catch(error => console.error(error));
  }
  React.useEffect(() => {
getDocument()
  }, []);
console.log("Documents", documents);
  return (
    <div className="app">
      <h1>Document Q&A with DeepSeek</h1>
      
      {/* Upload Section */}
      <div className="section">
        <h2>Upload Document</h2>
        <form onSubmit={handleUpload}>
          <input type="file" onChange={(e) => setFile(e.target.files[0])} />
          <button type="submit">Upload</button>
        </form>
        {uploadStatus && <p className="status">{uploadStatus}</p>}
      </div>

      {/* Document Selection */}
      <div className="section">
        <h2>Select Document</h2>
        <select onChange={(e) => setSelectedDoc(e.target.value)} value={selectedDoc}>
          <option value="">Select a document</option>
          {documents.map(doc => (
            <option key={doc.documentId} value={doc.documentId}>
              {doc.documentId}
            </option>
          ))}
        </select>
      </div>

      {/* Question Input */}
      <div className="section">
        <h2>Ask Question</h2>
        <form onSubmit={handleAsk}>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Enter your question"
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Asking...' : 'Ask'}
          </button>
        </form>
      </div>
      {/* Answer Display */}
      <div className="section answer-section">
        <h2>Answer</h2>
        {isLoading && <div className="thinking-indicator">DeepSeek is thinking...</div>}
        <div className="answer-content">
          {answer.split('\n').map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
