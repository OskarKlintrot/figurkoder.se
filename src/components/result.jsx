import React, { PropTypes } from 'react';
import Master from './shared/master';
import InGameHeader from './shared/inGameHeader';
import ResultTable from './result/resultTable';

const Result = () => {
  let results = [
                ['02', 1.2],
                ['01', "Näsa"],
                ['04', 2.3],
                ['03', 0.5]
              ];

  return(
    <Master>
      <InGameHeader title="Siffror" />
      <ResultTable results={results} />
    </Master>
  );
};

export default Result;
