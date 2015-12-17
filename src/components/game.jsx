import React from 'react'
import InGameHeader from './shared/inGameHeader'
import Description from './game/description'
import GameOptionsTextbox from './game/gameOptionsTextbox'
import GameOptionsDropdown from './game/gameOptionsDropdown'
import Playground from './game/playground'

import Games from '../games'

class Game extends React.Component{
  constructor(props) {
    super(props)
    this.state = {
      game: Games[this.props.params.game],
    }
  }

  render() {
    return(
      <div>
        <InGameHeader title={this.state.game.title} />
        <Description description={this.state.game.description} />
        <Playground mnemomicImage='C' countdown={'Chokladtårta'} options={this.state.game.option} />
          {(() => {
          switch (this.state.game.option) {
            case "textbox":
              return <GameOptionsTextbox />
              break
              case "dropdown":
                return <GameOptionsDropdown />
                break
            default:
              return null
          }
        })()}
      </div>
    )
  }
}

export default Game
