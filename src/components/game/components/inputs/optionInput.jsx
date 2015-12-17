import React from 'react'
import { Switch } from 'react-mdl'

class OptionInput extends React.Component {
  onSwitch(e) {
    if (e.target.checked) {
      console.log("Practice!")
    }
    else {
      console.log("Training!")
    }
  }

  render() {
    return (
        <Switch
          ripple
          id="practice"
          onChange={this.onSwitch}
          >Inlärning?</Switch>
    )
  }
}

export default OptionInput
