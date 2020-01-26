import React from 'react';
import './App.css';
import { css } from 'emotion';

import Confirm from './components/Confirm';
import TradeForm from './components/TradeForm';

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      id: undefined,
      ws: undefined,
      reg: '',
      des: '',
      search: false,
      handlers: {
        id: (data) => {
          this.setState({ id: data });
        },
      },
    };
  }
  setSearching = (bool) => {
    this.setState({search: bool});
  }
  componentDidMount() {
    const ws = new WebSocket('ws://localhost:5000/');

    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({ type: 'connect' }));
    });

    ws.addEventListener('message', (e) => {
      const data = JSON.parse(e.data);
      const defaultHandler = () => { };

      (this.state.handlers[data.type] || defaultHandler)(data.data);
    });

    this.setState({ ws });
  }

  request = (reg, des, search) => {
    this.setState({reg, des, search});
    this.state.ws.send(JSON.stringify({ type: 'request', data: { reg, des } }));
  };

  render() {
    const Logo = css`
      font-size: 72px;
    `;
    const Title = css`
      font-size: 32px;
    `;
    const Body = css`
      margin-top: 42px;
      font-size: 14px;
      width: 600px;
    `;
    return (
      <div className="App">
        <div className="App-header">
          {this.state.id}
          <div className={Title}> Brown University </div>
          <div className={Logo}> Course Trader </div>
          <TradeForm request={this.request} />
          <Confirm setSearching={this.setSearching} searching={this.state.search} matched={true} reg={'1234'} des={'5678'}/>
          <div className={Body}> This website is designed to allow Brown University students to register for the capped classes they are interested in, or swapping sections within a class to fit their schedule. <br /> <br /> Enter the Course Registration Number (CRN) for a capped section you would like to drop and a capped section you would like to register for. Course Trader will then check to see whether there are other students interested in swapping classes with you. </div>
        </div>
      </div>
    );
  }
}

export default App;
