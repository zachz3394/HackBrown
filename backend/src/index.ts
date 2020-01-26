import * as bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import path from 'path';
import expressWs from 'express-ws';
import 'reflect-metadata';
import shortId from 'shortid';
import puppeteer from 'puppeteer';

const PORT = process.env.PORT || 5000;
const { app } = expressWs(express());

enum Status {
  WAITING,
  CONFIRMING,
  CONFIRMED,
  COMPLETE,
}

const clients = new Map<string, any>();
const statuses = new Map<string, any>();
const pairs = new Map<string, string[]>();

const corsOptionsDelegate = (req: any, callback: any) => {
  let corsOptions = {
    origin: false,
    credentials: true,
  };

  const whitelist = [
    process.env.URL || 'http://localhost:3000',
  ];

  if (process.env.NODE_ENV !== 'production' || whitelist.indexOf(req.header('Origin')) !== -1) {
    corsOptions.origin = true; // reflect (enable) the requested origin in the CORS response
  }
  console.log(req.header('Origin'));

  callback(null, corsOptions); // callback expects two parameters: error and options
};

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors(corsOptionsDelegate) as any);

const delay = (time: number) => {
   return new Promise(function(resolve) { 
       setTimeout(resolve, time)
   });
}

const register = async (crn: string, username: string, password: string, advisingPin: string) => {
  console.log('starting');
  const browser = await puppeteer.launch({ headless: false, args: ['--disable-gpu'] });
  const newPagePromise = () => new Promise<puppeteer.Page>(resolve =>
    browser.once('targetcreated', (target: any) =>
      resolve(target.page()))); 
  const closePagePromise = () => new Promise<puppeteer.Page>(resolve =>
    browser.once('targetdestroyed', () => resolve())); 

  // create the page
  const page = await browser.newPage();
  await page.goto('https://cab.brown.edu');

  // open login window
  let waiter = newPagePromise();
  await page.click('a[data-action=login]');
  const popup = await waiter;

  // login
  await popup.waitForSelector('#username');
  await popup.type('#username', username, { delay: 20 });
  await popup.type('#password', password, { delay: 20 });
  await popup.click('button[type=submit]');

  // duo auth
  await popup.waitForSelector('#duo_iframe');
  await delay(5000);
  waiter = closePagePromise();
  await popup.mouse.click(545, 270)
  await waiter;

  await delay(1000);
  await page.waitForSelector('.sam-wait__button--login');
  waiter = newPagePromise();
  await page.click('.sam-wait__button--login');
  const newPopup = await waiter;
  await delay(1000);
  await newPopup.waitForSelector('body');
  await delay(1000);
  await newPopup.close();
  await page.waitForSelector('.sam-wait__button--login', { hidden: true });

  await page.waitForSelector('#primary-cart-button');
  await page.click('#primary-cart-button');
  await page.waitForSelector('.button-bar button');
  waiter = newPagePromise();
  await page.click('.button-bar button');
  const register = await waiter

  await register.waitForSelector('input[name=raltpin]');
  await register.type('input[name=raltpin]', advisingPin, { delay: 20 });
  await register.click('.rp_button');
  await register.waitForSelector('#REG_BTN');
  await register.click('#REG_BTN');
  await delay(500);
  await register.waitForSelector('#REG_BTN');
  await register.click('#REG_BTN');

  await register.waitForSelector('#crn_id1');
  await register.type('#crn_id1', crn, { delay: 20 });
  await register.click('input[value="Submit Changes"]');

  // await browser.close();
};

register('', 'zzhu42', 'Werwertwer7!', '747883');

app.ws('/', (ws, req) => {
  ws.on('message', (msg: string) => {
    const data = JSON.parse(msg) as any;
    switch (data.type) {
      case 'connect': {
        const id = shortId.generate();
        ws.send(JSON.stringify({ type: 'id', data: id }))
        return;
      }
      case 'request': {
        const { id, reg, des } = data.data;

        for (let matchingId of (pairs.get(`${des}-${reg}`) || [])) {
          if (statuses.get(matchingId).status !== Status.WAITING) {
            continue;
          }
          const matchingClient = clients.get(matchingId);

          ws.send(JSON.stringify({ type: 'matched' }))
          matchingClient.send(JSON.stringify({ type: 'matched' }))

          statuses.set(id, { status: Status.CONFIRMING, match: matchingId });
          statuses.set(matchingId, { status: Status.CONFIRMING, match: id });
          return;
        }

        clients.set(id, ws);
        statuses.set(id, { status: Status.WAITING });
        pairs.set(`${reg}-${des}`, [...(pairs.get(`${reg}-${des}`) || []), id]);
        return;
      }
      case 'confirm': {
        const { id, match, reg, des, username, password, advisingPin } = data.data;

        const status = statuses.get(id);
        const matchingStatus = statuses.get(match);

        if (status.status !== Status.CONFIRMING) return;
        if (matchingStatus.match !== id) return;

        if (matchingStatus.status === Status.CONFIRMED) {
          const matchingClient = clients.get(match);
          matchingClient.send(JSON.stringify({ type: 'trading' }))
          ws.send(JSON.stringify({ type: 'trading' }))

          // TODO: trade

          matchingClient.send(JSON.stringify({ type: 'complete' }))
          ws.send(JSON.stringify({ type: 'complete' }))
          statuses.set(id, { status: Status.COMPLETE });
          statuses.set(match, { status: Status.COMPLETE });
          return;
        }

        statuses.set(id, Object.assign({}, status, { status: Status.CONFIRMED }))
        return;
      }
    }
  });
});

if (process.env.NODE_ENV === 'production') {
  const webClient = path.join(__dirname, '..', '..', 'frontend', 'build');

  app.use(express.static(webClient));

  app.get('*', (req, res) => {
    res.sendFile(path.join(webClient, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Web server listening on port ${PORT}.`);
});
