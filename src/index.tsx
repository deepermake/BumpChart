import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import LoadApp from './components/LoadApp';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    <LoadApp>
      <App />
    </LoadApp>
  </React.StrictMode>
);
