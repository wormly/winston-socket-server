
var util = require('util');
var winston = require('winston');
var async = require('async');

util.inherits(SocketServer, winston.Transport);

module.exports = SocketServer;
winston.transports.SocketServer = SocketServer;

function SocketServer(options) {
	options = options || {};

	this.level = options.level || 'silly';
	this.path = options.path || '/tmp/winston.sock';
	this.name = options.name || 'socket server';

	this.net = options.net || require('net');
	this.fs = options.fs || require('fs');

	this._socketId = 1;
	this._sockets = {};

	this._onSocket = this._onSocket.bind(this);
	this._makeServer = this._makeServer.bind(this);

	this._connect();
}

SocketServer.prototype._makeServer = function() {
	this._server = this.net.createServer(this._onSocket);
	this._server.listen(this.path);
};

/**
 * If anyone is listening, will not delete socket, try to create a server and crash
 * If no one is listening, will delete the file and then bind
 * @private
 */
SocketServer.prototype._connect = function() {
	this.net.connect(this.path, this._makeServer).on('error', function() {
		if(typeof this.path == 'object')
			return this._makeServer();
	
		this.fs.unlink(this.path, function() { // we don't care if there was an error
			this._makeServer();
		}.bind(this));
	}.bind(this));
};

SocketServer.prototype._onSocket = function(socket) {
	var id = this._socketId;
	this._socketId++;

	this._sockets[id] = socket;

	socket.on('error', function() {
		// nothing
	});

	socket.on('close', function() {
		delete this._sockets[id];
	}.bind(this));
};

/**
 * @param level {string} Level at which to log the message
 * @param msg {string} Message to log
 * @param meta {Object} **Optional** Additional metadata to attach
 * @param callback {function} Continuation to respond to when complete.
 */
SocketServer.prototype.log = function (level, msg, meta, callback) {
	var metaString = (meta ? util.inspect(meta, true, 5): "");
	metaString = metaString.replace(/\n\s*/g, ' ');
	var message = level + ": "+msg+". "+metaString+"\n";

	var sockets = [];

	for (var i in this._sockets) {
		sockets.push(this._sockets[i]);
	}

	async.each(sockets, function(socket, cb) {
		socket.write(message, 'utf-8', cb);
	}, function(err) {
		this.emit('logged');

		callback(null, ! err);
	}.bind(this));
};