import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import Admin from './screens/Admin';
import Login from './screens/Login';
import Register from './screens/Register';
import { WebAppGate } from './components/WebAppGate';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin" element={<Admin />} />
        <Route
          path="/*"
          element={
            <WebAppGate>
              <App />
            </WebAppGate>
          }
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
