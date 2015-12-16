import React from 'react';
import { Switch } from 'react-mdl';

const OptionInput = React.createClass({
  onSwitch(e){
    if(e.target.checked) {
      console.log("Practice!");
    }
    else {
      console.log("Training!");
    }
  },

  render(){
    return (
        <Switch
          ripple
          id="practice"
          onChange={this.onSwitch}
          >Inlärning?</Switch>
      );
    }
});

export default OptionInput;
