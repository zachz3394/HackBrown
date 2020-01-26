import React from 'react';
import './App.css';
import logo from './logo.svg';
import { css } from 'emotion';
import ReactNotifications from 'react-browser-notifications';


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
      matched: false,
      confirmed: false,
      trading: false,
      complete: false,
      cancel: false,
      handlers: {
        id: (data) => {
          this.setState({ id: data });
        },
        matched: () => {
          this.setState({ matched: true });
        },
        trading: () => {
          this.setState({ trading: true, confirmed: false });
        },
        complete: () => {
          this.setState({ complete: true });
        },
        cancel: () => {
          this.setState({ cancel: true, matched: false, trading: false, confirmed: false, complete: false });
        },
        new_matched: () => {
          this.setState({ cancel: true, matched: true, trading: false, confirmed: false, complete: false });
        },
      },
    };
  }

  setConfirm = (confirmed, username, password, advisingPin) => {
    const { id, reg, des } = this.state;
    if (confirmed) {
      this.state.ws.send(JSON.stringify({ type: 'confirm', data: { id, reg, des, username, password, advisingPin } }));
    } else {
      this.state.ws.send(JSON.stringify({ type: 'cancel', data: { id, reg, des } }));
      this.setState({ search: false });
    }
    this.setState({ confirmed });
  }

  closeDialog = () => {
    this.setState({
      matched: false,
      trading: false,
      complete: false,
      cancel: false,
    });
  };

  componentDidMount() {
    const ws = new WebSocket('ws://localhost:5000/');

    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({ type: 'connect' }));
    });

    ws.addEventListener('message', (e) => {
      const data = JSON.parse(e.data);
      const defaultHandler = () => { };

      console.log('receive', data.type);
      (this.state.handlers[data.type] || defaultHandler)(data.data);
    });

    this.setState({ ws });
  }

  request = (reg, des, search) => {
    this.setState({reg, des, search});
    this.state.ws.send(JSON.stringify({ type: 'request', data: { id: this.state.id, reg, des } }));
  };

  showNotifications = () => {
    if (this.n.supported()) this.n.show();
  };

  handleClick = (event) => {
    window.focus()
    this.n.close(event.target.tag);
  };

  componentDidUpdate(prevProps, prevState) {
    if(!prevState.matched && this.state.matched) {
      this.showNotifications();
      document.title = "Match Found!";
    }
    if(prevState.matched && !this.state.matched) {
      document.title = "Course Trader";
    }
  }

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
          <div className={Title}> Brown University </div>
          <div className={Logo}> Course Trader </div>
          <TradeForm request={this.request} />
          <Confirm
            reg={this.state.reg}
            des={this.state.des}
            searching={this.state.search}
            matched={this.state.matched}
            trading={this.state.trading}
            confirmed={this.state.confirmed}
            complete={this.state.complete}
            cancel={this.state.cancel}

            setConfirm={this.setConfirm}
            closeDialog={this.closeDialog}
          />

          <div>
            <ReactNotifications
              onRef={ref => (this.n = ref)} // Required
              title="Course Trader" // Required
              body="We found a match!"
              icon={logo}
              tag="abcdef"
              interaction = "true"
              onClick={event => this.handleClick(event)}
            />
            <br />
          </div>

          <div className={Body}> This website is designed to allow Brown University students to register for the capped classes they are interested in, or swapping sections within a class to fit their schedule. <br /> <br /> Enter the Course Registration Number (CRN) for a capped section you would like to drop and a capped section you would like to register for. Course Trader will then check to see whether there are other students interested in swapping classes with you. </div>
        </div>
      </div>
    );
  }
}

export default App;
