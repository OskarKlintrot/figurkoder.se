import React from 'react';
import { Grid, Cell, Textfield } from 'react-mdl';

import TimeInput from './components/inputs/timeInput';
import OptionInput from './components/inputs/optionInput';
import StartStop from './components/inputs/startStop';
import DropdownInput from './components/inputs/dropdownInput';
import GameOptionCell from './components/gameOptionCell';

import GlobalStyles from '../shared/globalStyles';

const GameOptions = React.createClass({
  render(){
    return(
      <div style={GlobalStyles.game.div}>
        <Grid style={GlobalStyles.game.grid}>
          <GameOptionCell>
            <DropdownInput
              description="Första bokstaven"
              options={["A", "B"]} />
          </GameOptionCell>
          <GameOptionCell>
            <DropdownInput
              description="Andra bokstaven"
              options={["A", "B", "C"]} />
          </GameOptionCell>
          <GameOptionCell>
            <TimeInput />
          </GameOptionCell>
          <GameOptionCell>
            <OptionInput />
          </GameOptionCell>
        </Grid>
        <StartStop />
      </div>
    );
  }
});

export default GameOptions;
