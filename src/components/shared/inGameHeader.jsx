import React, { PropTypes } from 'react';
import { Header, Layout } from 'react-mdl';
import BackArrowButton from './backArrowButton';

const styles = {
  div:{
      // backgroundColor: '#3f51b5',
      display: 'flex',
      // color: '#ddd'
      color: '#000'
    },
  h3: {
      margin: '10px auto 5px auto',
    }
};

const InGameHeader = (props) => {
  const { title } = props;

  return(
    <div style={styles.div}>
      <BackArrowButton />
      <h3 style={styles.h3}>
        { title }
      </h3>
    </div>
  );
};

InGameHeader.propTypes = {
    title: PropTypes.string.isRequired
};

export default InGameHeader;
