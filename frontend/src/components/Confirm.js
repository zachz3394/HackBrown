import React, { useState, useRef, useEffect } from 'react';
import { css } from 'emotion';

const Confirm = (props) => {
  const [confirmed, setConfirmed] = useState(false);
  const {searching, setSearching} = props;
  const [matched, setMatched] = useState(props.matched);

  const dotsRef = useRef();
  useEffect(() => {
    window.setInterval(() => {
      if (searching && dotsRef.current) {
        const wait = dotsRef.current;
        if (wait.innerHTML.length >= 3)
          wait.innerHTML = "";
        else
          wait.innerHTML += ".";
      }
    }, 500);
  }, [searching]);
  
  if (matched) {
    const Overlay = css`
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: rgba(0,0,0,0.5);
      display: ${matched ? 'flex' : 'none'};
      align-items: center;
      justify-content: center;
    `;
    const Box = css`
      font-size: 16px;
      border-radius: 4px;
      padding: 10px;
      width: 400px;
      background-color:  #34495e;
    `;
    const Button = css`
      border-radius: 2px;
      width: 100px;
      cursor: pointer;
    `;
    const green = css`
      background-color: green;
    `;
    const red = css`
      background-color: red;
    `;
    const Wrap = css`
      margin-top: 10px;
      display: flex;
      justify-content: space-around;
    `;
    const clickConfirm = (event) => {
      setConfirmed(true);
      setMatched(false);
      setSearching(false);
      alert("Success!");
    }
    const clickCancel = (event) => {
      setMatched(false);
      setSearching(false);  
      alert("Trade cancelled");
    }

    return (
      <div className={Overlay}> 
        <div className={Box}>  
          Match found! Confirm to drop course {props.reg} and register for course {props.des}: 
          <div className={Wrap}> 
            <div className={css(Button, green)} onClick={clickConfirm}> Trade! </div>
            <div className={css(Button, red)} onClick={clickCancel}> Cancel </div>
          </div>
        </div>
      </div>
    );
  } 
  else {
    if (searching) {
      return (
        <div> Waiting for a match<span ref={dotsRef}>.</span></div>
      );
    }
    else {
      return null;
    }
  }

}

export default Confirm;