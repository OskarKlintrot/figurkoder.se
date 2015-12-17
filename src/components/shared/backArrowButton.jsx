import React, { PropTypes } from 'react'
import { IconButton } from 'react-mdl'
import { Link } from 'react-router'

const styles = {
  iconbutton: {
      alignSelf: 'flex-end',
      marginBottom: '5px',
    },
}

const BackArrowButton = (props) => {
  const { url } = props
  if(url) {
    return(
      <Link to={'/' + url}>
        <IconButton name="arrow_back" style={styles.iconbutton}/>
      </Link>
    )
  }
  else {
    return(
      <Link to={'/'}>
        <IconButton name="arrow_back" style={styles.iconbutton}/>
      </Link>
    )
  }
}

BackArrowButton.propTypes = {
    url: PropTypes.string,
}

export default BackArrowButton
