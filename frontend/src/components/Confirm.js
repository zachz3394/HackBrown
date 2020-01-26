import React, { createRef } from 'react';
import { css } from 'emotion';

class Confirm extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      username: '',
      password: '',
      advisingPin: '',
      promptCreds: false,
    }
    
    this.dotsRef = createRef();
  }

  componentDidMount() {
    window.setInterval(() => {
      if (this.dotsRef.current) {
        const wait = this.dotsRef.current;
        if (wait.innerHTML.length >= 3)
          wait.innerHTML = "";
        else
          wait.innerHTML += ".";
      }
    }, 500);
  }

  clickConfirm = () => {
    if (this.state.promptCreds) {
      this.props.setConfirm(true, this.state.username, this.state.password, this.state.advisingPin);
      this.props.closeDialog();
    } else {
      this.setState({ promptCreds: true })
    }
  };

  clickCancel = () => {
    this.props.setConfirm(false);
    this.props.closeDialog();
  };

  onChange = (event) => {
    this.setState({ [event.target.name]: event.target.value });
  }

  render() {
    const { searching, matched, trading, confirmed, complete, cancel } = this.props;

    const Overlay = css`
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: rgba(0,0,0,0.5);
      display: flex;
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

    if (matched) {
      return (
        <div className={Overlay}>
          <div className={Box}>
            {cancel ? 'Your last matched cancelled but we found another match! ' : 'Match found! '}
            Confirm to drop course {this.props.reg} and register for course {this.props.des}:

            { this.state.promptCreds ? (
              <div className={Wrap}>
                Please sign in to complete your trade.
                <form onSubmit={this.clickConfirm}>
                  <input type="text" name="username" placeholder="Username" value={this.state.username} onChange={this.onChange} />
                  <input type="password" name="password" placeholder="Password" value={this.state.password} onChange={this.onChange} />
                  <input type="text" name="advisingPin" placeholder="Advising Pin" value={this.state.advisingPin} onChange={this.onChange} />
                  <input type="submit" value="Submit" style={{ visibility: 'hidden' }} />
                </form>
              </div>
            ) : null }

            <div className={Wrap}>
              <div className={css(Button, green)} onClick={this.clickConfirm}>
                {this.state.promptCreds ? 'Trade!' : 'Log in!'}
              </div>
              <div className={css(Button, red)} onClick={this.clickCancel}> Cancel </div>
            </div>
          </div>
        </div>
      );
    } else if (cancel) {
      return (
        <div className={Overlay}>
          <div className={Box}>
            Sorry, the person you matched with decided to cancel. We'll try to find you another match.

            <div className={Wrap}>
              <div className={css(Button, red)} onClick={this.props.closeDialog}> Okay. </div>
            </div>
          </div>
        </div>
      );
    } else if (trading) {
      return (
        <React.Fragment>
          <div> Trading<span ref={this.dotsRef}>.</span></div>
          <div style={{ fontSize: 12 }}>Please accept the Duo prompt when you receive it.</div>
        </React.Fragment>
      );
    } else if (confirmed) {
      return (
        <div> Waiting for partner to confirm<span ref={this.dotsRef}>.</span></div>
      );
    } else if (complete) {
      return (
        <div className={Overlay}>
          <div className={Box}>
            Trade complete! Please check your account to make sure the trade went smoothly.

            <div className={Wrap}>
              <div className={css(Button, green)} onClick={this.props.closeDialog}> Okay! </div>
            </div>
          </div>
        </div>
      );
    } else if (searching) {
      return (
        <div> Waiting for a match<span ref={this.dotsRef}>.</span></div>
      );
    }

    return null;
  }

}

export default Confirm;