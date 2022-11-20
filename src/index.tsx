// import React from 'react';
// import ReactDOM from 'react-dom';
// import * as serviceWorker from './serviceWorker';
import { defineCustomElements } from '@ionic/pwa-elements/loader';
// import './App.global.css';
// import { App } from './blocks/App/App';


// ReactDOM.render(<App />, document.getElementById('root'));

// // If you want your app to work offline and load faster, you can change
// // unregister() to register() below. Note this comes with some pitfalls.
// // Learn more about service workers: https://bit.ly/CRA-PWA
// serviceWorker.unregister();

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './blocks/App/App';
import './service/ws/ws';
// import reportWebVitals from './reportWebVitals';
import './App.global.css';
import Cookies from 'js-cookie';

defineCustomElements(window);

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

const sessionIdFromCookie = Cookies.get('sessionId');
if (sessionIdFromCookie) {
  localStorage.setItem('sessionId', sessionIdFromCookie);
}
const sessionIdFromStorage = localStorage.getItem('sessionId'); 
if (sessionIdFromStorage) {
    Cookies.set('sessionId', sessionIdFromStorage);
}
// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals();
