import React from 'react';
import ReactDOM from 'react-dom';
import Home from './components/Home';
import data from './data.json';

ReactDOM.render(
  <Home data={data} />,
  document.getElementById('app')
);