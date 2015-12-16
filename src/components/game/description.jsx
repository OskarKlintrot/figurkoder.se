import React, { PropTypes } from 'react';

const styles = {
  div: {
      padding: '0 10px 0 10px'
    }
};

const Description = (props) => {
  const { description } = props;

  return(
    <div style={styles.div}>
      { description }
    </div>

  );
};

Description.propTypes = {
    description: PropTypes.string.isRequired
};

export default Description;
