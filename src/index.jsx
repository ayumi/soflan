import React from 'react';
import ReactDOM from 'react-dom';
import Home from './components/Home';
import songs from './songs.json';

ReactDOM.render(
  <Home songs={songs} />,
  document.getElementById('app')
);