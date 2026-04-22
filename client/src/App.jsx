import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ReturnFlow from './pages/ReturnFlow';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/return" element={<ReturnFlow />} />
      </Routes>
    </BrowserRouter>
  );
}
