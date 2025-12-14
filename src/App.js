/* global chrome */
import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [text, setText] = useState('');
  const [recentTexts, setRecentTexts] = useState([]);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadRecentTexts();
  }, []);

  const loadRecentTexts = () => {
    chrome.runtime.sendMessage({ type: 'GET_RECENT_TEXTS' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Popup Error:', chrome.runtime.lastError);
      } else if (response && response.recentTexts) {
        setRecentTexts(response.recentTexts);
      }
    });
  };

  useEffect(() => {
    if (status.message) {
      const timer = setTimeout(() => {
        setStatus({ type: '', message: '' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleAskGemini = () => {
    if (!text.trim()) {
      setStatus({ type: 'error', message: 'Please enter some text' });
      return;
    }

    setIsLoading(true);
    setStatus({ type: 'info', message: 'Opening Gemini...' });

    chrome.runtime.sendMessage(
      { 
        type: 'ASK_GEMINI', 
        text: text.trim(),
        source: 'popup'
      },
      (response) => {
        setIsLoading(false);
        
        if (chrome.runtime.lastError) {
          setStatus({ type: 'error', message: `Error: ${chrome.runtime.lastError.message}` });
        } else {
          setStatus({ type: 'success', message: 'Gemini opened successfully!' });
          setText('');
          loadRecentTexts();
          
          setTimeout(() => window.close(), 1500);
        }
      }
    );
  };

  const handlePaste = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText.trim()) {
        setText(clipboardText.trim());
        setStatus({ type: 'info', message: 'Pasted from clipboard' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Could not read from clipboard' });
    }
  };

  const handleCopy = () => {
    if (!text.trim()) return;
    
    navigator.clipboard.writeText(text.trim())
      .then(() => {
        setStatus({ type: 'success', message: 'Copied!' });
      })
      .catch(() => {
        setStatus({ type: 'error', message: 'Copy failed' });
      });
  };

  const handleSelectRecent = (recentText) => {
    setText(recentText);
  };

  const handleGetSelection = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { type: 'GET_SELECTION' },
          (response) => {
            if (chrome.runtime.lastError) {
              setStatus({ 
                type: 'error', 
                message: 'Select text on the page or type here. Alternatively: Select text on the page, right-click and use "Ask Gemini" option.' 
              });
            } else if (response && response.selection) {
              setText(response.selection);
              setStatus({ type: 'info', message: 'Selected text retrieved' });
            } else {
              setStatus({ type: 'info', message: 'No text selected on the page' });
            }
          }
        );
      }
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleAskGemini();
    }
  };

  const quickActions = [
    { text: "Summarize this text", emoji: "📝" },
    { text: "Translate this to Turkish", emoji: "🌍" },
    { text: "Explain this", emoji: "💡" },
    { text: "Correct this", emoji: "✏️" }
  ];

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">
          <span className="gemini-icon">✨</span>
          Ask Gemini
        </h1>
        <p className="app-subtitle">Turn text selection into Gemini queries, fast and easy.</p>
      </header>

      {status.message && (
        <div className={`status-message status-${status.type}`}>
          {status.message}
        </div>
      )}

      <div className="input-section">
        <div className="textarea-container">
          <textarea
            className="text-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type text here or click 'Get Selection' button..."
            rows="4"
            disabled={isLoading}
          />
          <div className="char-count">
            {text.length} characters
          </div>
        </div>

        <div className="button-group">
          <button
            className="btn btn-primary"
            onClick={handleAskGemini}
            disabled={isLoading || !text.trim()}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Opening...
              </>
            ) : (
              '✨ Ask Gemini'
            )}
          </button>
          
          <div className="secondary-buttons">
            <button
              className="btn btn-secondary"
              onClick={handleGetSelection}
              disabled={isLoading}
              title="Get selected text from active tab"
            >
              🔍 Get Selection
            </button>
            <button
              className="btn btn-secondary"
              onClick={handlePaste}
              disabled={isLoading}
              title="Paste from clipboard (Ctrl+V)"
            >
              📋 Paste
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleCopy}
              disabled={isLoading || !text.trim()}
              title="Copy to clipboard (Ctrl+C)"
            >
              📄 Copy
            </button>
          </div>
        </div>

        <div className="quick-actions">
          <h4>Quick Actions:</h4>
          <div className="quick-buttons">
            {quickActions.map((action, index) => (
              <button
                key={index}
                className="btn btn-quick"
                onClick={() => setText(action.text)}
                title={`Add "${action.text}" command`}
              >
                <span className="quick-emoji">{action.emoji}</span>
                <span className="quick-text">{action.text}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {recentTexts.length > 0 && (
        <div className="recent-section">
          <h3 className="recent-title">Recent Questions:</h3>
          <div className="recent-list">
            {recentTexts.slice(0, 5).map((recentText, index) => (
              <div
                key={index}
                className="recent-item"
                onClick={() => handleSelectRecent(recentText)}
                title={recentText}
              >
                <span className="recent-icon">📝</span>
                <span className="recent-text">
                  {recentText.length > 40
                    ? recentText.substring(0, 40) + '...'
                    : recentText}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <footer className="app-footer">
        <p>This extension is being developed by <a href='https://github.com/eknvarli' target='_blank'>@eknvarli</a>.</p>
        <p className="footer-note">Select text, right-click, ask Gemini!</p>
      </footer>
    </div>
  );
}

export default App;