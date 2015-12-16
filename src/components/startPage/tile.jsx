import React from 'react';
import { Button, Card, CardTitle, CardActions, Icon } from 'react-mdl';

import m from '../../scripts/m';
import InteractionAwareMixin from '../../scripts/interactionAwareMixin.js';

const styles = {
  card: {
    width: '140px',
    minHeight: '140px',
    maxHeight: '140px',
    height: '140px',
    display: 'inline-flex',
    cursor: 'pointer'
  },
  cardTitle: {
    alignItems: 'flex-start',
    color: '#fff',
    background: '#ff4081'
  },
  cardActions: {
    // borderColor: 'rgba(255, 255, 255, 0.2)',
    display: 'flex',
    boxSizing: 'border-box',
    alignItems: 'center',
    color: '#fff',
    background: '#f786ac',
    height: '30px'
  },
  span: {
    fontSize: '16px',
    margin: '0 auto 2px auto'
  },
  h4: {
    marginTop: '0',
    marginBottom: '0'
  }
};

const Tile = (props) =>{
  let {description, game} = props;

  let onClickEvent = function() {
    console.log("Tea time!");
  };

  return(
    <Card shadow={0} onClick={onClickEvent} onTouchTap={onClickEvent}
      style={styles.card}>
      <CardTitle expand
        style={styles.cardTitle}>
        <h4
          style={styles.h4}>
            { description[0] + ' - ' + description[1] }
        </h4>
      </CardTitle>
      <CardActions border
        style={styles.cardActions}>
          <span style={styles.span}>{game}</span>
      </CardActions>
    </Card>
  );
};

export default Tile;
