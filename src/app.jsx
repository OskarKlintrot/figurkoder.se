<<<<<<< HEAD:src/app.jsx
import React from 'react';
import ReactDOM from 'react-dom';
import injectTapEventPlugin from 'react-tap-event-plugin';
import Main from './components/main'; // Our custom react component

import StartPage from './components/startPage';
import Game from './components/game';
import Result from './components/result';
=======
import React from 'react'
import ReactDOM from 'react-dom'
import injectTapEventPlugin from 'react-tap-event-plugin'

import {Router} from 'react-router'
import routes from './routes'
>>>>>>> 094acf190820a23e5bdc391f59d0c8efb477402c:src/app/app.jsx

//Needed for React Developer Tools
window.React = React

//Needed for onTouchTap
//Can go away when react 1.0 release
//Check this repo:
//https://github.com/zilverline/react-tap-event-plugin
injectTapEventPlugin()

// Render the main app react component into the app div.
// For more details see: https://facebook.github.io/react/docs/top-level-api.html#react.render
ReactDOM.render(
  <Router routes={routes} />, document.getElementById('app'))
