import React from 'react';
import Tile from './tile';
import { Grid, Cell } from 'react-mdl';

const Tiles = React.createClass({
  render(){
    let tiles = [];

    let games = [
      ['00', '99', 'Siffror'],
      ['000', '999', 'Siffror'],
      ['A', 'Ö', 'Bokstäver'],
      ['Måndag', 'Söndag', 'Veckodagar'],
      ['Anna', 'Jessica', 'Kvinnonamn'],
      ['Lars', 'Filip', 'Mansnamn']
    ];

    games.map((item) => {
      tiles.push(
        <Cell col={2} tablet={2} phone={2}>
          <Tile description={[item[0], item[1]]} game={item[2]} />
        </Cell>
      );
    });

    return(
        <Grid>
          {tiles}
        </Grid>
    );
  }
});

export default Tiles;
