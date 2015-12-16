import React, { PropTypes } from 'react';
import { Button, Grid, Cell, Icon, FABButton } from 'react-mdl';
import Presentation from './components/presentation';

const styles = {
  div: {
    main: {
        padding: '10px 10px 0 10px',
      },
    nested: {
        paddingTop: '5px',
        display: 'flex',
        flexWrap: 'nowrap',
        justifyContent: 'space-around'
      }
  }
};

const Playground = React.createClass({
  show(){
    console.log("Show!");
  },

  next(){
    console.log("Next!");
  },

  render(){
    return(
      <div style={styles.div.main}>
        <Presentation value={this.props.mnemomicImage} />
        <Presentation value={isNaN(this.props.countdown) ? this.props.countdown : this.props.countdown + '...'} />
        <div style={styles.div.nested}>
          <Button onClick={this.show} ripple raised>Visa <Icon name="done" /></Button>
          <Button onClick={this.next} ripple raised>Nästa <Icon name="skip_next" /></Button>
        </div>
      </div>
    );
  }
});

export default Playground;
