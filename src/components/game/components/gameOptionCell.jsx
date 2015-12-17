import React from 'react'
import { Cell } from 'react-mdl'

const styles = {
  cell: {
      margin:'0 auto 0 auto',
      alignSelf: "center",
      padding: '10px 0 10px 0',
    },
}

const GameOptionCell = (props) => {
  const { children } = props

  return (
    <Cell col={6} tablet={4} phone={2} style={styles.cell}>
        {children}
    </Cell>
  )
}

export default GameOptionCell
