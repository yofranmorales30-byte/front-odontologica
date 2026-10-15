import React from 'react';
import ReactDOM from 'react-dom/client';
// Fonts are served by the app itself instead of Google Fonts, whose stylesheet held back the first paint.
// Only the latin subset (covers Spanish) and the weights in use.
import '@fontsource/poppins/latin-400.css';
import '@fontsource/poppins/latin-500.css';
import '@fontsource/poppins/latin-600.css';
import '@fontsource/poppins/latin-700.css';
import '@fontsource/poppins/latin-800.css';
import '@fontsource/dancing-script/latin-400.css';
import '@fontsource/dancing-script/latin-600.css';
import '@fontsource/dancing-script/latin-700.css';
import './styles/global.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />)
