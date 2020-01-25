import React from 'react';
import logo from './logo.svg';
import './App.css';

import TradeForm from './components/TradeForm';
import CabHandler from './components/CabHandler';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />

        <CabHandler />
        <TradeForm />
      </header>
    </div>
  );
}

export default App;
