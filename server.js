const http = require('http');
const httpProxy = require('http-proxy');
const express = require('express');
const path = require('path');

const app = express();
const port = 3000;
const server = require('http').createServer(app);

// Proxy for WebSocket server
const proxy = httpProxy.createProxyServer({
  ws: true,
  target: 'http://127.0.0.1:8188',
  changeOrigin: true,
  secure: false, // Adjust if the WebSocket server uses HTTPS
  xfwd: true
});

// Proxy for audio
// e.g. http://127.0.0.1:7860//file/extensions/coqui_tts/outputs/api/Liza.wav?random=123
const audioProxy = httpProxy.createProxyServer({
  target: 'http://127.0.0.1:7860/file/extensions/coqui_tts/outputs/',
  changeOrigin: true,
  secure: false, // Adjust if the HTTP server uses HTTPS
});

// Proxy for chat
const chatProxy = httpProxy.createProxyServer({
    target: 'http://127.0.0.1:5000/v1/chat/',
    changeOrigin: true,
    secure: false, // Adjust if the HTTP server uses HTTPS
  });

// Route requests to appropriate proxies
app.use('/chat', (req, res) => {
    chatProxy.web(req, res, () => {
        console.log('HTTP request proxied to Chat server');
    });
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

// Serve index.html for other routes
app.use(express.static(path.join(__dirname, 'public')))
  
// Start the server
server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
