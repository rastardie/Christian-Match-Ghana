
/**
 * CMG - Christian Match Ghana
 * Entry point for the React application.
 * Handles DOM mounting and StrictMode wrapping for development safety.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Initialize the root element from index.html
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to. Ensure <div id='root'> exists in index.html");
}

// Create React root and render the main App component
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
