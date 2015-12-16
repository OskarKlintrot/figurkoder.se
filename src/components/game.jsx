import React from 'react';
import Master from './shared/master';
import InGameHeader from './shared/inGameHeader';
import Description from './game/description';
import GameOptions from './game/gameOptions3';
import Playground from './game/playground';

const Game = React.createClass({
  render(){
    return(
      <Master>
        <InGameHeader title="Bokstäver" />
        <Description description="Låt oss öva på lite bokstäver vetja! It be fun, they said..." />
        <Playground mnemomicImage='C' countdown={'Chokladtårta'} />
        <GameOptions />
      </Master>
    );
  }
});

export default Game;
