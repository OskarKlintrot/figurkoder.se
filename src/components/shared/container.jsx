import React from 'react'

const styles = {
  div: {
    width: '90%',
    maxWidth: '400px',
    margin: '15px auto 15px auto',
    backgroundColor: 'rgb(241, 241, 241)',
  },
}

const Container = (props) => {
  const { children, ...otherProps } = props

  return(
    <div {...otherProps}
      className='mdl-shadow--2dp'
      style={styles.div}>
      {children}
    </div>
  )
}

export default Container
