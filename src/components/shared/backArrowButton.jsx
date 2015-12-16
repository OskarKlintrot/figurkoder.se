import React, { PropTypes } from 'react';
import { IconButton } from 'react-mdl';

const styles = {
  iconbutton: {
      alignSelf: 'flex-end',
      marginBottom: '5px'
    }
};

const BackArrowButton = (props) => {
  const { history } = props;

  return(
    <IconButton name="arrow_back" style={styles.iconbutton}/>
  );
};

BackArrowButton.propTypes = {
    history: PropTypes.string
};

export default BackArrowButton;
