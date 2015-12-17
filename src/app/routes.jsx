import React from 'react'
import { Route, IndexRoute } from 'react-router'
import Master from './components/shared/master.jsx'

import NoMatch from './components/shared/noMatch.jsx'
import StartPage from './components/startPage.jsx'
import Game from './components/game.jsx'
import Result from './components/result.jsx'

export default (
  <Route path="/" component={Master}>
    <IndexRoute component={StartPage} />
    <Route path="/game/:game" component={Game}/>
    <Route path="/result" component={Result}/>
    <Route path="*" component={NoMatch}/>
  </Route>
)
