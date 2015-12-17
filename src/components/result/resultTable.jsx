import React, { PropTypes } from 'react'
import { DataTable } from 'react-mdl'

const styles = {
  datatable: {
   width: '100%',
 },
}

const ResultTable = (props) => {
  const { results } = props

  return(
    <DataTable
      style={styles.datatable}
      columns={[
          {name: 'mnemomicImage', label: 'Figurkod'},
          {name: 'time', label: 'Tid', numeric: true},
      ]}
      data={results.map((item, key) => (
        {mnemomicImage: item[0], time: !isNaN(item[1]) ? item[1] + ' sek' : item[1]}
      ))}
    />
  )
}

ResultTable.propTypes = {
    results: PropTypes.array,
}

export default ResultTable
