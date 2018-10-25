'use strict';

const EventEmitter = require('events').EventEmitter;
const net = require('net');

let TelnetConnectionInstances = {};

class TelnetConnection extends EventEmitter {
    constructor(log, host, port, username, password, prompt, handlers) {
        super();

        this.log = log;
        this.host = host;
        this.port = port;
        this.username = username;
        this.password = password;
        this.prompt = prompt;
        this.handlers = handlers

        this.sentUsername = (this.username.length == 0);
        this.sentPassword = (this.password.length == 0);

        this.sendQueue = [];

        this.socket;

        this.connect();
    }

    static getInstance(log, host, port, username, password, prompt, handlers) {
        let instanceKey = host + '-' + port + '-' + username + '-' + new Buffer(password).toString('base64');

        if (!TelnetConnectionInstances[instanceKey]) {
            log.warn("CREATE CONNECTION>>" + instanceKey + "<<");
            let instance = new TelnetConnection(log, host, port, username, password, prompt, handlers);
            TelnetConnectionInstances[instanceKey] = instance;
        } else log.warn("REUSED CONNECTION>>" + instanceKey + "<<");

        return TelnetConnectionInstances[instanceKey];
    }

    connect() {
        this.socket = net.connect(this.port, this.host);
        this.socket.on('data', (data)  => {
            this.log.debug('TERM RCVD>>' + data + '<<');
            this.incomingData(this.handlers, data);
        }).on('connect', () => {
            this.log.warn("TERM CONN");
        }).on('end', () => {
            this.log.warn('TERM DISC');
            this.connect();
        });
    }

    incomingData(handlers, data) {
        if (data.indexOf('login:') >= 0) {
            this.send(this.username);
            return;
        } else if (data.indexOf('password:') >= 0) {
            this.send(this.password);
            return;
        }

        let sections = data.toString().split(this.prompt);
        sections.forEach((section) => {
          let lines = section.split(/\r\n|[\n\v\f\r\x85\u2028\u2029]/);
          lines.forEach((line) => {
            line = line.trim();

            if ( line.length > 0 ) {
                this.log.debug('TERM LINE>>'+line+'<<');

                Object.keys(handlers).forEach((key) => { 
                    if (0 === line.indexOf(key)) {
                        this.log.debug("TERM HNDL>>"+key+"::"+line+"<<")

                        var toEmit = handlers[key].bind(this)(line);
                        if ( toEmit )  {
                            Object.keys(toEmit).forEach((emitCode) => {
                                this.log.debug('EMITTING>>'+emitCode+'::' + toEmit[emitCode] + '<<');
                                this.emit(emitCode, ...toEmit[emitCode]);
                            });
                        };
                    }
                });
            }
          });
        });
    }

    send(command) {
        if (command == this.username && !this.sentUsername) {
            this.sentUsername = true;
            this.log.warn('TERM>>USERNAME');
            this.socket.write(command + "\r\n");
        } else if (command == this.password && !this.sentPassword) {
            this.sentPassword = true;
            this.log.warn('TERM>>PASSWORD');
            this.socket.write(command + "\r\n"); 
        } else {
            this.log.warn('TERM QUEUEING>>' + command + '<<');
            this.sendQueue.push(command);

            if ( !this.sentUsername || !this.sentPassword )
                return;

            while ( this.sendQueue.length > 0 ) {
                command = this.sendQueue.shift();                 
                this.log.warn('TERM SENT>>' + command + '<<');

 
                if (!/\r\n$/.test(command)) command += "\r\n";
                this.socket.write(command);
            }
        }
    }
}

module.exports = TelnetConnection;
