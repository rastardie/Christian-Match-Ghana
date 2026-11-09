/**
 * CMG Admin Console entry point. Desktop-first and separate from the public app,
 * so admin code is never loaded by the consumer app.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import AdminConsole from './AdminConsole';

const rootElement = document.getElementById('admin-root');
if (!rootElement) {
  throw new Error("Could not find #admin-root. Check admin.html.");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <AdminConsole />
  </React.StrictMode>
);
