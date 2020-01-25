import React, { useState } from 'react';

const CabHandler = () => {
  const [ step, setStep ] = useState(0);
  const [ win, setWin ] = useState(undefined);

  switch (step) {
    case 0:
      return (
        <div>
          test
        </div>
      );
  }
};

export default CabHandler;