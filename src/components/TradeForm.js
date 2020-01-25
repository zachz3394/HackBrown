import React, { useState } from 'react';
import { css } from 'emotion';

const TradeForm = () => {
  const inputLabel = css`
    font-size: 16px;
  `;

  const spacer = css`
    display: inline-block;
    width: 10px;
  `;

  return (
    <form>
    <label className={inputLabel}>
      Course:
      <div className={spacer}></div>
      <input type="text" name="name" placeholder = "CRN" />
    </label>
      <input type="submit" value="Submit" />
    </form>
  );
};

export default TradeForm;