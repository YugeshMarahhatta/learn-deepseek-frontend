import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSpinner, 
  faCheckCircle, 
  faUser, 
  faRobot,
  faPaperPlane 
} from '@fortawesome/free-solid-svg-icons';
import { library } from '@fortawesome/fontawesome-svg-core';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

library.add(faCheckCircle, faUser, faRobot);

function App() {
  const [file, setFile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState('');
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState([]);
  const [dots, setDots] = useState('');
  const thinkingIntervalRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isThinking) {
      thinkingIntervalRef.current = setInterval(() => {
        setDots(prevDots => (prevDots.length < 3 ? prevDots + '.' : ''));
      }, 500);
    } else {
      clearInterval(thinkingIntervalRef.current);
      setDots('');
    }
    return () => clearInterval(thinkingIntervalRef.current);
  }, [isThinking]);

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
      getDocument();
      setDocuments([...documents, response.data.documentId]);
      setUploadStatus('Upload successful!');
      // Add system message for successful upload
      setMessages(prev => [...prev, {
        type: 'system',
        content: `Document uploaded successfully: ${file.name}`,
        timestamp: new Date().toISOString()
      }]);
      setTimeout(() => setUploadStatus(''), 2000);
    } catch (error) {
      setUploadStatus('Upload failed');
      setMessages(prev => [...prev, {
        type: 'system',
        content: `Upload failed: ${error.message}`,
        timestamp: new Date().toISOString(),
        isError: true
      }]);
      console.error(error);
    }
  };

  const parseAnswer = (text) => {
    let parsedText = text;
    parsedText = parsedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    parsedText = parsedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
    return parsedText;
  };

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!selectedDoc || !question.trim()) return;
    // Add user message
    setMessages(prev => [...prev, {
      type: 'user',
      content: question,
      timestamp: new Date().toISOString()
    }]);
    setIsLoading(true);
    setIsThinking(true);
    try {
      const response = await fetch(
        `http://localhost:8020/api/ask/${selectedDoc}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ question })
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const thinkContent = data.answer.match(/<think>(.*?)<\/think>/s);
      let finalAnswer = data.answer;
      if (thinkContent && thinkContent.length > 1) {
        finalAnswer = data.answer.replace(/<think>(.*?)<\/think>/s, '').trim();
        finalAnswer = parseAnswer(finalAnswer);
        setTimeout(() => {
          setMessages(prev => [...prev, {
            type: 'assistant',
            content: finalAnswer,
            timestamp: new Date().toISOString()
          }]);
          setIsThinking(false);
          setIsLoading(false);
        }, 2000);
      } else {
        finalAnswer = parseAnswer(data.answer);
        setMessages(prev => [...prev, {
          type: 'assistant',
          content: finalAnswer,
          timestamp: new Date().toISOString()
        }]);
        setIsThinking(false);
        setIsLoading(false);
      }
      setQuestion('');
    } catch (error) {
      console.error("Fetch Error:", error);
      setMessages(prev => [...prev, {
        type: 'system',
        content: `Error: ${error.message}`,
        timestamp: new Date().toISOString(),
        isError: true
      }]);
      setIsLoading(false);
      setIsThinking(false);
    }
  };

  const getDocument = () => {
    axios.get('http://localhost:8020/api/documents')
      .then(response => setDocuments(response.data.documents))
      .catch(error => console.error(error));
  };

  useEffect(() => {
    getDocument();
  }, []);

  // Utility to strip HTML tags for plain text
  const stripHTML = (html) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  // Copy text to clipboard when user clicks the answer
  const handleAnswerClick = (text) => {
    const plainText = stripHTML(text);
    navigator.clipboard.writeText(plainText)
      .then(() => toast("Answer Copied to Clipboard!"))
      .catch(err => alert('Failed to copy text: ', err));
  };

  return (
    <div className="app-container">
      <header className="chat-header">
        <h1>Document Q&A with DeepSeek</h1>
      </header>
      <div className="content">
        <aside className="sidebar">
          {/* Upload Section */}
          <div className="upload-section card">
            <h2>Upload Document</h2>
            <form onSubmit={handleUpload}>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files[0])}
                className="file-input"
              />
              <button type="submit" className="btn primary">Upload</button>
            </form>
            {uploadStatus && <p className="status-message">{uploadStatus}</p>}
          </div>
          {/* Document Selection */}
          <div className="document-section card">
            <h2>Select Document</h2>
            <select
              onChange={(e) => setSelectedDoc(e.target.value)}
              value={selectedDoc}
              className="doc-select"
            >
              <option value="">Select a document</option>
              {documents.map(doc => {
                // Extract file name after the first dash, if it exists
                const displayName = doc?.documentId?.includes('-')
                  ? doc.documentId.substring(doc.documentId.indexOf('-') + 1)
                  : doc.documentId;
                return (
                  <option key={doc.documentId} value={doc.documentId}>
                    {displayName}
                  </option>
                );
              })}
            </select>
          </div>
        </aside>
        <main className="chat-container card">
          <div className="chat-messages">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`message ${message.type} ${message.type === 'user' ? 'message-user' : ''}`}
              >
                <div className="message-icon">
                  <FontAwesomeIcon
                    icon={
                      message.type === 'user' ? faUser :
                      message.type === 'assistant' ? faRobot : faCheckCircle
                    }
                  />
                </div>
                <div 
                  className="message-content"
                  onClick={() => message.type === 'assistant' && handleAnswerClick(message.content)}
                  style={{ cursor: message.type === 'assistant' ? 'pointer' : 'default' }}
                >
                  <div 
                    className="message-text"
                    dangerouslySetInnerHTML={{ __html: message.content }} 
                  />
                  <span className="timestamp">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
            {isThinking && (
              <div className="message assistant message-thinking">
                <div className="message-icon">
                  <FontAwesomeIcon icon={faRobot} />
                </div>
                <div className="message-content">
                  <div className="thinking-dots">
                    <div className="dot" />
                    <div className="dot" style={{ animationDelay: '0.2s' }} />
                    <div className="dot" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-input">
            <form onSubmit={handleAsk} className="input-form">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question..."
                disabled={isLoading || !selectedDoc}
                className="text-input"
              />
              <button
                type="submit"
                disabled={isLoading || !selectedDoc || !question.trim()}
                className="btn send-btn"
              >
                {isLoading ? (
                  <FontAwesomeIcon icon={faSpinner} spin />
                ) : (
                  <FontAwesomeIcon icon={faPaperPlane} />
                )}
              </button>
            </form>
          </div>
        </main>
      </div>
      <ToastContainer hideProgressBar autoClose={1000} />
    </div>
  );
}

export default App;
