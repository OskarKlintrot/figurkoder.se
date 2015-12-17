import React, { PropTypes } from 'react'
import InGameHeader from './shared/inGameHeader'
import ResultTable from './result/resultTable'

const Result = (props) => {
  let { url } = props

  let results = [
                ['02', 1.2],
                ['01', "Näsa"],
                ['04', 2.3],
                ['03', 0.5],
              ]

  return(
    <div>
      <InGameHeader title="Siffror" url={url} />
      <ResultTable results={results} />
    </div>
  )
}

Result.propTypes = {
    url: PropTypes.string.isRequired,
}

export default Result
