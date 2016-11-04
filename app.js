'use strict';

var os          = require('os'), 
    ifaces      = os.networkInterfaces(), 
    localIp     = '', 
    activeUsers = [];
//  http://stackoverflow.com/questions/3653065/get-local-ip-address-in-node-js
Object.keys(ifaces).forEach(function (ifname) {
    var alias = 0;
    ifaces[ifname].forEach(function (iface) {
        if ('IPv4' !== iface.family || iface.internal !== false) {
            // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
            return;
        }
        if (alias >= 1) {
            // this single interface has multiple ipv4 addresses
            localIp = iface.address;
        } else {
            // this interface has only one ipv4 adress
            localIp = iface.address;
        }
        ++alias;
    });
});

//  Server with express
var express = require('express');
var path    = require('path');
var app     = express();

//  Session values
var session = require("express-session")({
    secret: "SO-Semaforos",
    resave: true,
    saveUninitialized: true
});
var sharedsession   = require("express-socket.io-session");

//  Socket.io
var http    = require('http').Server(app);
var io      = require('socket.io')(http);

var requestSession;

//  Body parser
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

/********************************
Bloqueando información del servidor (headers)
********************************/
app.disable('x-powered-by');


/********************************
Motor de plantilla
********************************/

// configuración del motor de plantilla
var exphbs = require('express-handlebars');

/********************************
Middleware
********************************/
app.use(session);

app.engine('handlebars', exphbs({
    extname:        '.handlebars', 
    defaultLayout:  'main', 
    layoutsDir:     __dirname + '/views/layouts', 
    partialsDir:    __dirname + '/views/partials'
}));

app.set('views', path.join(__dirname, 'views'));
app.set('view cache', false);
app.set('view engine', 'handlebars');
app.use(express.static(path.join(__dirname, 'public')));

io.use(sharedsession(session, {
    autoSave:true
}));


/********************************
Creando el socket de conexión para tiempo real
********************************/

io.on('connection', function (socket) {
    console.log('someone connected')
    console.log(activeUsers)

    //  Usuarios conectados
    socket.emit('user-connected', activeUsers)

    socket.on('user-connected', function(data) {
        console.log('Active users')
        console.log(socket.handshake.session.appName)
        // if (activeUsers.length >= maxClients) return false;

        if (socket.handshake.session.appName === undefined) {
            socket.handshake.session.appName     = 'SO-Semaforos';
            socket.handshake.session.date        = new Date();
            socket.handshake.session.myName      = data.myName;
        }
        let response = {
            myName: socket.handshake.session.myName || '-'
        }

        console.log('response')
        console.log(response)

        activeUsers.push(response);

        io.sockets.emit('user-connected', activeUsers);
    });

    //socket.emit('user-actions', users);
});

function createSessionForUser (request, params) {
    //  Validate if session exist
    if (request.appName === undefined) {
        request.appName     = 'SO-Semaforos';
        request.date        = new Date();
        request.myName      = purifyUserName(params.myName);
    }
}

var connectUser = function (request, params) {
    let r           = request || undefined;
    let response    = {};

    if (!userIsConnected()) {
        createSessionForUser(r, params);

        response.status     = 'OK';
        response.message    = 'Creo la sesión para el usuario';

        return response;
    }

    response.status     = 'OK';
    response.message    = 'El usuario ya existe';
    return response;
}

var sem = require('semaphore')(1)
console.log(sem)

//  Routes
var home  = require('./routes/home');
app.use('/', home);
var i = 0
app.get('/test', function (req, res) {
    console.log('Dentro de get')

    /********************************
    Memoria
    ********************************/
    if (i < 1) {
        //  Wait
        sem.take(function() {
            console.log('dentro del take ' + i)
        });
        i++
    }
    console.log(i)

    return res.json()
})

app.get('/release', function (req, res) {
    /********************************
    Memoria
    ********************************/
    //console.log(sem.current)
    if (i === 1) {
        console.log('Liberando de get')
        //  Signal
        sem.leave()
        i--;
    }
    //console.log(sem)

    return res.json()
})

//  Drone actions

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

/********************************
Creating the server
********************************/
http.listen(3005, function () {
    let host = localIp;
    let port = this.address().port;

    console.log('Servidor en ruta http://%s:%s', host, port);
});