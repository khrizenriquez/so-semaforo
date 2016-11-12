'use strict';

var os          = require('os'), 
    ifaces      = os.networkInterfaces(), 
    localIp     = '', 
    activeUsers = [], 
    activeUser  = [];
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
var express = require('express'), 
    path    = require('path'), 
    app     = express(), 
    crypto  = require('crypto')

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
app.use(session)

app.engine('handlebars', exphbs({
    extname:        '.handlebars', 
    defaultLayout:  'main', 
    layoutsDir:     __dirname + '/views/layouts', 
    partialsDir:    __dirname + '/views/partials'
}))

app.set('views', path.join(__dirname, 'views'));
app.set('view cache', false);
app.set('view engine', 'handlebars');
app.use(express.static(path.join(__dirname, 'public')));

io.use(sharedsession(session, {
    autoSave:true
}));

//  Inicialización del semaforo
var sem = require('semaphore')(1)

/********************************
Memoria compartida
********************************/
var memShm = require('mem-shm')
//  Ruta dentro de /dev/shm, nombre archivo
var mem = new memShm("so_semaforos","memoria")

var memoryId    = "test"
var key         = "test"
var val         = 1

//  Configuración inicial
mem.set(memoryId, key, val)

/********************************
Creando el socket de conexión para tiempo real
********************************/

activeUsers = []
var activeUser = {}

io.on('connection', function (socket) {
    console.log('someone connected')

    //  Usuarios conectados
    socket.emit('user-connected', activeUsers)
    socket.emit('shared-memory', mem.get().test.test)

    socket.on('user-connected', function(data) {
        console.log(data)
        // if (activeUsers.length >= maxClients) return false;

        if (socket.handshake.session.appName === undefined) {
            let date    = new Date(),
                myName  = data.myName
            socket.handshake.session.appName     = data.appName
            socket.handshake.session.date        = date
            socket.handshake.session.myName      = myName
        }
        let response = {
            myName: socket.handshake.session || '-'
        }

        activeUser = response

        activeUsers.push(response)

        io.sockets.emit('user-connected', activeUsers)
    })

    socket.on('shared-memory', function (data) {
        io.sockets.emit('shared-memory', mem.get().test.test)
    })

    //socket.emit('user-actions', users);
})

function createSessionForUser (request, params) {
    //  Validate if session exist
    if (request.appName === undefined) {
        let date    = new Date(), 
            myName  = purifyUserName(params.myName)
        request.date        = date
        request.myName      = myName
        request.appName     = params.appName
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

//  Routes
var home  = require('./routes/home');
app.use('/', home);
var i = 0
app.get('/test/:userKey/:userName', function (req, res) {
    /********************************
    Memoria
    ********************************/
    let userId      = req.params.userKey || null, 
        response    = {}, 
        userName    = req.params.userName || null
    if (i < 1) {
        //  Wait
        sem.take(function() {
            val++
            mem.set(memoryId, key, val)
            activeUser.usingMemory  = true
            activeUser.memoryInfo   = mem.get()
            activeUser.userId       = userId
            activeUser.name         = userName
        })
        i++

        response.message    = 'ok'
        response.info       = activeUser
    } else {
        activeUsers.some(function (element, index, arr) {
            console.log(element)
            console.log(userId)
            console.log('---------------')
            if (element.userId === userId) {
                activeUser.name = element.name

                return false
            }
        })
        response.message    = 'fail'
        response.info       = activeUser
    }
    //io.sockets.emit('shared-memory', mem.get().test.test)
    io.sockets.emit('shared-memory', mem.get().test.test 
        + ' (En uso por '+ activeUser.name +')')

    return res.json(response)
})

app.get('/release/:userKey/:userName', function (req, res) {
    let userKey     = req.params.userKey || null
        //userName    = req.params.userName || null

    console.log(activeUser)
    console.log(userKey)
    console.log('-----------------------')
    /********************************
    Memoria
    ********************************/
    //console.log(sem.current)
    let response = {}
    if (activeUser.userId !== userKey) {
        let userName = null
        activeUsers.some(function (element, index, arr) {
            console.log(element)
            console.log('Element')
            if (element.userId === userKey) {
                userName = element.name

                return false
            }
        })
        if (userName === null) {
            response.message    = 'fail'
            response.info       = `No se puede liberar la variable`

            return res.json(response)
        }

        response.message    = 'fail'
        response.info       = `Únicamente ${userName} puede liberar la variable`

        return res.json(response)
    } else {
        if (i === 1) {
            console.log('Liberando de get')
            //  Signal
            sem.leave()

            response.message    = 'ok'
            response.info       = 'Variable liberada'

            activeUser.usingMemory = false
            activeUser.memoryInfo = {}

            i--

            io.sockets.emit('shared-memory', mem.get().test.test)
        }

        return res.json(response)
    }
    return res.json({})
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