import React from 'react'
import Tile from './tile'
import { Grid, Cell } from 'react-mdl'
import Games from '../../games'

const style = {
  display: 'flex',
  justifyContent: 'space-around',
}

class Tiles extends React.Component{
  render() {
    let tiles = []

    for (let game in Games) {
      tiles.push(
        <Cell col={5} tablet={4} phone={2} style={style}>
          <Tile description={[Games[game].start, Games[game].stop]} game={Games[game].title} url={game}/>
        </Cell>
      )
    }

    return (
        <Grid style={style}>
          {tiles}
        </Grid>
    )
  }
}

export default Tiles
