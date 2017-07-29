const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const reCAPTCHA = require('recaptcha2');
const bodyParser = require('body-parser');
const EventEmitter = require('events');
const engine = require('./engine');
const emitter = new EventEmitter();
const morgan = require('morgan');
const requests = {};

recaptcha = new reCAPTCHA({
    siteKey: '6Lc7-CoUAAAAAOGihZtfNHOTxxPaw_brhN0IHcgW',
    secretKey: '6Lc7-CoUAAAAADwzgCJkqT9o1Nb6KA75RWeiNBh5'
});

server.listen(8000);
app.use(morgan('combined'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public'));
app.get('/', (req, res) => {
    res.sendfile(__dirname + '/index.html');
});
app.get('/requests', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(requests));
});
app.get('/requests/:id', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(requests[req.params.id]));
});
app.post('/search', (req, res) => {
    if (!req.body) return res.sendStatus(400);
    recaptcha.validate(req.body.recaptcha).then(() => {
        const id = engine(req.body.search, emitter);
        requests[id] = {id, status: 'started', term: req.body.search, result: []};
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(requests[id]));
    }).catch((errorCodes) => {
        console.log(recaptcha.translateErrors(errorCodes));
        res.sendStatus(400);
    });
});
io.on('connection', (socket) => {
});
emitter.on('done', (result) => {
    requests[result.id] = Object.assign(requests[result.id], {
        id: result.id, status: (result.error) ? 'error' : 'done'
    });
    io.emit('status', requests[result.id]);
    io.emit(result.id, {status: requests[result.id].status});
});
emitter.on('directory', (result) => io.emit(result.id, {directory: result.directory}));
emitter.on('file', (result) => io.emit(result.id, {file: result.file}));
emitter.on('match', (result) => {
    requests[result.id].result.push(result.file);
    io.emit(result.id, {files: requests[result.id].result});
});
