import React from 'react';
import { createRoot } from 'react-dom/client';

import Home from './components/Home';
import songs from './songs.json';

import "./styles.css";

const container = document.getElementById('app');
const root = createRoot(container); // createRoot(container!) if you use TypeScript
root.render(<Home songs={songs} />);
