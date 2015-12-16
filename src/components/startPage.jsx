import React from 'react';
import Master from './shared/master';

import Tiles from './startPage/tiles';

const StartPage = React.createClass({
  render(){
    return(
      <Master>
        <Tiles />
      </Master>
    );
  }
});

export default StartPage;
