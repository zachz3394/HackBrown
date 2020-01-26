import React, { useState } from 'react';
import { css } from 'emotion';



const TradeForm = (props) => {
  const [regValue, setRegValue] = useState('');
  const [desValue, setDesValue] = useState('');

  const handleReg = (event) => {
    setRegValue(event.target.value)
  };

  const handleDes = (event) => {
    setDesValue(event.target.value)
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    props.request(regValue, desValue, true);
  }

  const wrapper = css`
    display: flex;
    flex-direction: column;
  `;

  const row = css`
    width: 300px;
    display: flex;
    margin-bottom: 10px;

    label {
      flex: 1;
      font-size: 16px;
    }
    
    input {
      flex: 1;
    }
  `;

  const submitButtonWrapper = css`
    justify-content: center;
  `;

  const submitButton = css`
    width: 50%;
    flex: 0.5!important;
  `;
  
  
  
  return (
    <form onSubmit={handleSubmit}>
      <div className={wrapper}>
        <div className={row}>
          <label for='reg'>Registered Course:</label>
          <input type='text' name='reg' placeholder='CRN' onChange={handleReg}/>
        </div>
        <div className={row}>
          <label for='des'>Desired Course:</label>
          <input type='text' name='des' placeholder='CRN' onChange={handleDes}/>
        </div>
        <div className={css(row, submitButtonWrapper)}>
          <input className={submitButton} type="submit" value="Submit"/>
        </div>
      </div>
    </form>
  );
};

export default TradeForm;