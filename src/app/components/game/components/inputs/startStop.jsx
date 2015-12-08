import React from 'react';
import { Icon, FABButton } from 'react-mdl';

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
        <div style={{
            display: 'flex',
            flexWrap: 'nowrap',
            justifyContent: 'space-around',
            paddingBottom: '10px'
          }}>
          <FABButton ripple onClick={this.start}
            style={{
              height: '40px',
              width: '40px',
              minWidth: '40px'
            }}>
            <Icon name="play_arrow" />
          </FABButton>
          <FABButton ripple onClick={this.pause}
            style={{
              height: '40px',
              width: '40px',
              minWidth: '40px'
            }}>
            <Icon name="pause" />
          </FABButton>
          <FABButton ripple onClick={this.stop}
            style={{
              height: '40px',
              width: '40px',
              minWidth: '40px'
            }}>
            <Icon name="stop" />
          </FABButton>
        </div>
    );
  }
});

export default StartStop;
