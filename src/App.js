import React from 'react';
// import logo from './logo.svg';
import easter_egg from './easter_egg.png';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={easter_egg} className="App-logo" alt="logo" />
        <p>
          Congratulations, you have found the magic egg.
        </p>
        <p> Now you should <a className="App-link" href="https://www.geocent.com/careers/openings/" target="_blank" rel="noopener noreferrer" >apply for a job at Geocent</a>.
        </p>
      </header>
    </div>
  );
}

export default App;
