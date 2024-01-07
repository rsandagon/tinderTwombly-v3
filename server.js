/**
 * server.js
 * This handles the proxy to chat and image generation services
 *
 *
 * @license https://github.com/rsandagon/tinderTwombly-v3/blob/main/LICENSE
 * @version 0.1
 * @author  Rsandagon, https://github.com/rsandagon
 * @updated 2024-01-07
 * @link    https://github.com/rsandagon/tinderTwombly-v3
 *
 *
 */

const http = require('http');
const httpProxy = require('http-proxy');
const express = require('express');
const path = require('path');
const ngrok = require('@ngrok/ngrok');

const app = express();
const port = 3000;
const server = require('http').createServer(app);
const arguments = process.argv ;
require('dotenv').config()

const NGROK_AUTHTOKEN = process.env.NGROK_AUTHTOKEN;
const USER = process.env.USER;
const PASSWORD = process.env.PASSWORD;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const isTunneling = arguments[2]=='tunnel';

// Proxy for WebSocket server
const proxy = httpProxy.createProxyServer({
  ws: true,
  target: 'http://127.0.0.1:8188',
  changeOrigin: true,
  secure: isTunneling ? true : false, // Adjust if the WebSocket server uses HTTPS
  xfwd: true
});

// Proxy for audio
// e.g. http://127.0.0.1:7860//file/extensions/coqui_tts/outputs/api/Liza.wav?random=123
const audioProxy = httpProxy.createProxyServer({
  target: 'http://127.0.0.1:7860/file/extensions/coqui_tts/outputs/',
  changeOrigin: true,
  secure: isTunneling ? true : false, // Adjust if the HTTP server uses HTTPS
});

// Proxy for chat
const chatProxy = httpProxy.createProxyServer({
    target: 'http://127.0.0.1:5000/v1/chat/',
    changeOrigin: true,
    secure: isTunneling ? true : false, // Adjust if the HTTP server uses HTTPS
  });

// Proxy for OpenAI Chat format
const openAIProxy = httpProxy.createProxyServer({
  target: 'http://127.0.0.1:5000/v1/chat/',
  headers: {
    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
    "Content-Type": "application/json"
  },
  changeOrigin: true,
  secure: isTunneling ? true : false, // Adjust if the HTTP server uses HTTPS
});

const completionsProxy = httpProxy.createProxyServer({
    target: 'http://127.0.0.1:5000/v1/completions/',
    changeOrigin: true,
    secure: isTunneling ? true : false, // Adjust if the HTTP server uses HTTPS
  });

// Route requests to appropriate proxies
app.use('/completions', (req, res) => {
  completionsProxy.web(req, res, () => {
        console.log('HTTP request proxied to Chat server');
    });
});

app.use('/chat', (req, res) => {
  if(OPENROUTER_API_KEY){
    openAIProxy.web(req, res, () => {
      console.log('HTTP request proxied to OpenAI server');
    });
  }else{
    chatProxy.web(req, res, () => {
      console.log('HTTP request proxied to Chat server');
    });
  }

});


app.use('/snd', (req, res) => {
    audioProxy.web(req, res, () => {
        console.log('HTTP request proxied to Sound server');
    });
});
  
app.use('/sd', (req, res) => {
    proxy.web(req, res, () => {
        console.log('HTTP request proxied to SD server');
    });
});

server.on('upgrade', function (req, socket, head) {
    console.log("proxying upgrade request", req.url);
    proxy.ws(req, socket, head);
  });



// --AUTHENTICATION
function authentication(req, res, next) {
  const authheader = req.headers.authorization;
  console.log(req.headers);

  if (!authheader) {
      let err = new Error('You are not authenticated!');
      res.setHeader('WWW-Authenticate', 'Basic');
      err.status = 401;
      return next(err)
  }

  const auth = new Buffer.from(authheader.split(' ')[1],
      'base64').toString().split(':');
  const user = auth[0];
  const pass = auth[1];

  if (user == USER && pass == PASSWORD) {
      // If Authorized user
      next();
  } else {
      let err = new Error('You are not authenticated!');
      res.setHeader('WWW-Authenticate', 'Basic');
      err.status = 401;
      return next(err);
  }
}

app.use(authentication);

// --TUNNELING via ngrok --
async function create_listener() {
  console.log('token:', NGROK_AUTHTOKEN);
  console.log((await ngrok.forward({addr: 3000, authtoken: NGROK_AUTHTOKEN})).url());
}

if(isTunneling){
  console.log('start tunneling');
  create_listener();
}

// Serve static website
app.use(express.static(path.join(__dirname, 'public')))
  
// Start the server
server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});