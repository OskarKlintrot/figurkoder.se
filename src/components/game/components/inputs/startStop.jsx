import React from 'react';
import { Icon, FABButton } from 'react-mdl';

const styles = {
  div: {
      display: 'flex',
      flexWrap: 'nowrap',
      justifyContent: 'space-around',
      paddingBottom: '10px'
    },
  FABButton: {
    height: '40px',
    width: '40px',
    minWidth: '40px'
  }
};

const StartStop = React.createClass({
  start(){
    console.log("Start!");
  },

  pause(){
    console.log("Pause!");
  },

  stop(){
    console.log("Stop!");
  },

  render(){
    return(
        <div style={styles.div}>
          <FABButton ripple onClick={this.start}
            style={styles.FABButton}>
            <Icon name="play_arrow" />
          </FABButton>
          <FABButton ripple onClick={this.pause}
            style={styles.FABButton}>
            <Icon name="pause" />
          </FABButton>
          <FABButton ripple onClick={this.stop}
            style={styles.FABButton}>
            <Icon name="stop" />
          </FABButton>
        </div>
    );
  }
});

export default StartStop;
