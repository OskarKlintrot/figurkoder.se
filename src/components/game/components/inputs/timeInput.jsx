import React from 'react';
import { Textfield } from 'react-mdl';

const styles = {
  Textfield: {
    paddingBottom: '10px'
  }
};

const TimeInput = React.createClass({
getInitialState(){
    return {
      time: 6
    };
  },

  onTimeChange(e){
    this.setState({time: e.target.value});
  },

  render(){
    return (
    <Textfield
      type="number"
      onChange={this.onTimeChange}
      pattern="-?[0-9]*(\.[0-9]+)?"
      error="Input is not a number!"
      label="Tid (sekunder):"
      floatingLabel
      value={this.state.time}
      style={styles.Textfield}
      />
    );
  }
});

export default TimeInput;
