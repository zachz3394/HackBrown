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
import WebSocket from 'ws';

enum Status {
  WAITING,
  CONFIRMING,
  CONFIRMED,
  COMPLETE,
}

enum Action {
  REGISTER,
  DROP,
}

const clients = new Map<string, any>();
const statuses = new Map<string, any>();
const pairs = new Map<string, string[]>();
const browsers = new Map<string, puppeteer.Browser>();

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

const elementExists = async (page: puppeteer.Page, selector: string) => {
  try {
    await page.waitForSelector(selector, { timeout: 500, visible: true });
    return true;
  } catch (e) {
    return false;
  }
}

const login = async (username: string, password: string) => {
  const browser = await puppeteer.launch(process.env.NODE_ENV === 'production' ? {} : { headless: true, args: ['--disable-gpu'] });
  const newPagePromise = () => new Promise<puppeteer.Page>(resolve =>
    browser.once('targetcreated', (target: any) =>
      resolve(target.page()))); 
  const closePagePromise = () => new Promise<puppeteer.Page>(resolve =>
    browser.once('targetdestroyed', () => resolve())); 

  // create the page
  const page = await browser.newPage();
  await page.goto('https://cab.brown.edu', { waitUntil: 'networkidle0' });

  // open login window
  let waiter = newPagePromise();
  await page.click('a[data-action=login]');
  const popup = await waiter;

  // login
  await popup.waitForSelector('#username');
  await popup.type('#username', username, { delay: 20 });
  await popup.type('#password', password, { delay: 20 });
  await delay(500);
  await popup.click('button[type=submit]', { delay: 500 });

  // duo auth
  await popup.waitForSelector('#duo_iframe');
  await delay(5000);
  waiter = closePagePromise();
  await popup.mouse.click(545, 270)
  await waiter;

  await page.close();

  return browser;
}

const register = async (browser: puppeteer.Browser, action: Action, crn: string, advisingPin: string) => {
  const page = await browser.newPage();
  await page.goto('https://cab.brown.edu', { waitUntil: 'networkidle0' });

  await page.waitForSelector('#primary-cart-button');
  await page.click('#primary-cart-button');
  await page.waitForSelector('.button-bar button');
  await delay(1000);
  await elementExists(page, '.button-bar button');

  let pages;
  const startPages = (pages = await browser.pages()).length;
  do {
    await page.click('.button-bar button')
    await delay(1000);
  } while (startPages === (pages = await browser.pages()).length);

  const register = pages[pages.length - 1];

  await delay(1000);
  do {
    if (await elementExists(register, 'input[name=raltpin]')) {
      await register.waitForSelector('input[name=raltpin]');
      await register.type('input[name=raltpin]', advisingPin, { delay: 20 });
      await register.click('.rp_button');
    }
    await delay(500);
  } while (!await elementExists(register, '#REG_BTN')); // #REG_BTN will be disabled if advising pin hasn't been entered

  do {
    await register.click('input[value="DROP COURSES / CHANGE OPTIONS"]')
    await delay(1000);
  } while (await elementExists(register, 'input[value="DROP COURSES / CHANGE OPTIONS"]'));

  await delay(1000);
  await register.waitForSelector('#crn_id1');
  await register.click('input[value="Reset"]');
  await delay(1000);

  await register.waitForSelector('#crn_id1');
  if (action === Action.REGISTER) {
    await register.type('#crn_id1', crn, { delay: 20 });
    await register.click('input[value="Submit Changes"]');
  } else {
    await register.evaluate(() => {
      document.querySelectorAll('.datadisplaytable tbody tr').forEach((node, i) => {
        if (i === 0) return;
        if (node.querySelector('td:nth-of-type(3)').textContent === '24956')
          node.querySelector('td:nth-of-type(2) select').selectedIndex = 1;
      });
    });
    await register.click('input[value="Submit Changes"]');
  }
  await delay(1000);

  await register.close();
  await page.close();
};

app.ws('/', (ws, req) => {
  ws.on('message', async (msg: string) => {
    const data = JSON.parse(msg) as any;
    console.log('receive', data.type);
    switch (data.type) {
      case 'connect': {
        const id = shortId.generate();
        ws.send(JSON.stringify({ type: 'id', data: id }))
        clients.set(id, ws);
        return;
      }
      case 'request': {
        const { id, reg, des } = data.data;

        for (let matchingId of (pairs.get(`${des}-${reg}`) || [])) {
          if (statuses.get(matchingId).status !== Status.WAITING) {
            continue;
          }
          const matchingClient = clients.get(matchingId);
          if (matchingClient.readyState !== WebSocket.OPEN) {
            statuses.set(matchingId, { status: Status.COMPLETE });
            continue;
          }

          ws.send(JSON.stringify({ type: 'matched' }))
          matchingClient.send(JSON.stringify({ type: 'matched' }))

          statuses.set(id, { status: Status.CONFIRMING, match: matchingId });
          statuses.set(matchingId, { status: Status.CONFIRMING, match: id });
          return;
        }

        statuses.set(id, { status: Status.WAITING });
        pairs.set(`${reg}-${des}`, [...(pairs.get(`${reg}-${des}`) || []), id]);
        return;
      }
      case 'confirm': {
        const { id, reg, des, username, password, advisingPin } = data.data;

        const status = statuses.get(id);
        const { match } = status;
        const matchingStatus = statuses.get(match);

        if (status.status !== Status.CONFIRMING) return;
        if (matchingStatus.match !== id) return;

        if (matchingStatus.status === Status.CONFIRMED) {
          const matchingClient = clients.get(match);
          matchingClient.send(JSON.stringify({ type: 'trading' }))
          ws.send(JSON.stringify({ type: 'trading' }))

          // TODO: trade
          const browser = await login(username, password);
          const matchBrowser = browsers.get(match);
          const matchPin = matchingStatus.advisingPin;

          await Promise.all([
            register(browser, Action.DROP, reg, advisingPin),
            register(matchBrowser, Action.DROP, des, matchPin),
          ]);

          await Promise.all([
            register(browser, Action.REGISTER, des, advisingPin),
            register(matchBrowser, Action.REGISTER, reg, matchPin),
          ]);

          await browser.close();
          await matchBrowser.close();

          matchingClient.send(JSON.stringify({ type: 'complete' }))
          ws.send(JSON.stringify({ type: 'complete' }))
          statuses.set(id, { status: Status.COMPLETE });
          statuses.set(match, { status: Status.COMPLETE });
          browsers.delete(match);
          return;
        }

        statuses.set(id, Object.assign({}, status, { status: Status.CONFIRMED, advisingPin }))
        browsers.set(id, await login(username, password));
        return;
      }
      case 'cancel': {
        const { id, reg, des } = data.data;

        const status = statuses.get(id);
        const { match } = status;
        const matchingStatus = statuses.get(match);

        if (status.status !== Status.CONFIRMING) return;
        if (matchingStatus.match !== id) return;

        statuses.set(id, { status: Status.COMPLETE });

        const matchingClient = clients.get(match);
        if (browsers.has(match)) {
          await browsers.get(match).close();
          browsers.delete(match);
        }

        if (matchingClient.readyState !== WebSocket.OPEN) {
          statuses.set(match, { status: Status.COMPLETE });
          return;
        }

        for (let newMatch of (pairs.get(`${reg}-${des}`) || [])) {
          if (statuses.get(newMatch).status !== Status.WAITING) {
            continue;
          }
          const newMatchingClient = clients.get(newMatch);

          matchingClient.send(JSON.stringify({ type: 'new_matched' }))
          newMatchingClient.send(JSON.stringify({ type: 'matched' }))

          statuses.set(match, { status: Status.CONFIRMING, match: newMatch });
          statuses.set(newMatch, { status: Status.CONFIRMING, match });
          return;
        }

        matchingClient.send(JSON.stringify({ type: 'cancel' }))
        statuses.set(match, { status: Status.WAITING });
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
