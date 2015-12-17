import React, { PropTypes } from 'react'
import { Card, CardTitle } from 'react-mdl'

const styles = {
  card: {
      width: 'auto',
      height: '45px',
      minHeight: '45px',
      margin: 'auto auto 10px auto',
      display: 'flex',
    },
  cardTitle: {
      padding: '10px',
      color: '#000',
      alignSelf: 'center',
    },
}

const Presentation = (props) => {
  const { value } = props

  return (
      <Card shadow={0} style={styles.card}>
          <CardTitle expand style={styles.cardTitle}>{value}</CardTitle>
      </Card>
  )
}

Presentation.propTypes = {
    value: PropTypes.string.isRequired,
}

export default Presentation
