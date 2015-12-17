import React from 'react'
import { Grid, Cell, Textfield } from 'react-mdl'

import TimeInput from './components/inputs/timeInput'
import OptionInput from './components/inputs/optionInput'
import StartStop from './components/inputs/startStop'
import GameOptionCell from './components/gameOptionCell'

import GlobalStyles from '../shared/globalStyles'

const styles = {
  textfield: {
    paddingBottom: '0',
  },
}

class GameOptionsDropdown extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      start: 0,
      stop: 9,
    }
  }

  onStartChange(e) {
    this.setState({start: e.target.value})
    let temp = (+e.target.value + this.props.add) <= 99 ? +e.target.value + this.props.add : 99
    this.setState({stop: temp})
  }

  onStopChange(e) {
    this.setState({stop: e.target.value})
  }

  render() {
    return (
      <div style={GlobalStyles.game.div}>
        <Grid style={GlobalStyles.game.div}>
          <GameOptionCell>
            <Textfield
              min="0" max="99"
              autoComplete="off"
              type="number"
              onChange={this.onStartChange}
              pattern="-?[0-9]*(\.[0-9]+)?"
              error="Välj mellan 0-99!"
              label="Från:"
              floatingLabel
              value={this.state.start}
              style={styles.textfield}
            />
          </GameOptionCell>
          <GameOptionCell>
            <Textfield
              min="0" max="99"
              autoComplete="off"
              type="number"
              onChange={this.onStopChange}
              pattern="-?[0-9]*(\.[0-9]+)?"
              error="Välj mellan 0-99!"
              label="Till:"
              floatingLabel
              value={this.state.stop}
              style={styles.textfield}
            />
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
    )
  }
}

GameOptionsDropdown.propTypes = {
  add: React.PropTypes.number,
}

GameOptionsDropdown.defaultProps = {
  add: 9,
}

export default GameOptionsDropdown
