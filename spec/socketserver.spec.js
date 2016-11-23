var EventEmitter = require('events').EventEmitter;
var SocketServer = require('../lib/socketserver.js');

describe('socket server', function() {
	var server;

	var net, fs, path = '/tmp/fasdfasd', level = 'lll', netSocket, netServer;

	beforeEach(function() {
		net = stub('connect', 'createServer');
		fs = stub('unlink');

		netSocket = stub(true);
		netServer = stub('listen');

		net.createServer.andReturn(netServer);
		net.connect.andReturn(netSocket);

		server = new SocketServer({
			level: level,
			path: path,
			net: net,
			fs: fs
		});
	});

	it('does not remove the socket if anyone is listening', function() {
		expect(net.connect.mostRecentCall.args[0]).toEqual(path);
		net.connect.mostRecentCall.args[1]();

		expect(net.createServer).toHaveBeenCalled();
		expect(netServer.listen).toHaveBeenCalledWith(path);

		expect(fs.unlink).not.toHaveBeenCalled();
	});

	it('removes socket on connection error', function() {
		expect(net.connect.mostRecentCall.args[0]).toEqual(path);
		netSocket.emit('error');

		expect(fs.unlink.mostRecentCall.args[0]).toEqual(path);
		fs.unlink.mostRecentCall.args[1]('error? whatever');

		expect(net.createServer).toHaveBeenCalled();
	});

	it('supports other types of socket servers', function() {
		var tcpSocketConfig = {
			host: 'localhost',
			port: 80
		};

		net = stub('connect', 'createServer');
		fs = stub('unlink');

		netSocket = stub(true);
		netServer = stub('listen');

		net.createServer.andReturn(netServer);
		net.connect.andReturn(netSocket);

		server = new SocketServer({
			level: level,
			listen: tcpSocketConfig,
			net: net,
			fs: fs
		});

		expect(net.connect.mostRecentCall.args[0]).toEqual(tcpSocketConfig);
		net.connect.mostRecentCall.args[1]();

		expect(net.createServer).toHaveBeenCalled();
		expect(netServer.listen).toHaveBeenCalledWith(tcpSocketConfig);

		netSocket.emit('error', 123);
		expect(fs.unlink).not.toHaveBeenCalled();
	});

	it('logs to sockets', function() {
		net.connect.mostRecentCall.args[1]();

		var socket1 = stub(true, 'write');
		var socket2 = stub(true, 'write');

		net.createServer.mostRecentCall.args[0](socket1);
		net.createServer.mostRecentCall.args[0](socket2);

		var loggedCb = jasmine.createSpy();
		var emittedCb = jasmine.createSpy();
		server.log('debug', 'message', {a: 123}, loggedCb);
		server.on('logged', emittedCb);

		expect(socket1.write.mostRecentCall.args[0]).toEqual('debug: message. { a: 123 }\n');
		expect(socket2.write.mostRecentCall.args[0]).toEqual('debug: message. { a: 123 }\n');

		expect(emittedCb).not.toHaveBeenCalled();
		expect(loggedCb).not.toHaveBeenCalled();

		socket1.write.mostRecentCall.args[2]();
		socket2.write.mostRecentCall.args[2]();

		expect(loggedCb).toHaveBeenCalled();
		expect(emittedCb).toHaveBeenCalled();

		socket1.emit('error', 123);
		socket1.emit('close');

		server.log('debug', 'message 2', { 'window starts':
			[ '1361527710',
				'1361527720',
				'1361527730',
				'1361527740'] }, loggedCb);

		var expected = "debug: message 2. { 'window starts':  [ '1361527710', '1361527720', '1361527730', '1361527740', [length]: 4 ] }\n";
		expect(socket2.write.mostRecentCall.args[0]).toEqual(expected);

		expect(socket1.write.callCount).toEqual(1);

		socket2.write.mostRecentCall.args[2]();
		expect(loggedCb.callCount).toEqual(2);
	});

	it('logs with timestamp', function() {
		net = stub('connect', 'createServer');
		fs = stub('unlink');

		netSocket = stub(true);
		netServer = stub('listen');

		net.createServer.andReturn(netServer);
		net.connect.andReturn(netSocket);

		server = new SocketServer({
			level: level,
			path: path,
			timestamp: true,
			net: net,
			fs: fs
		});

		net.connect.mostRecentCall.args[1]();

		var socket = stub(true, 'write');

		net.createServer.mostRecentCall.args[0](socket);

		var loggedCb = jasmine.createSpy();
		var emittedCb = jasmine.createSpy();
		server.log('debug', 'message', {a: 123}, loggedCb);
		server.on('logged', emittedCb);

		var now = new Date().toISOString();

		expect(emittedCb).not.toHaveBeenCalled();
		expect(loggedCb).not.toHaveBeenCalled();

		socket.write.mostRecentCall.args[2]();

		expect(loggedCb).toHaveBeenCalled();
		expect(emittedCb).toHaveBeenCalled();

		server.log('debug', 'message 2', {}, loggedCb);

		var expected = now + " debug: message 2. {}\n";
		expect(socket.write.mostRecentCall.args[0]).toEqual(expected);

		socket.write.mostRecentCall.args[2]();
		expect(loggedCb.callCount).toEqual(2);
	});
});

function stub() {
	var emitterRequested = false;

	if (typeof arguments[0] == 'boolean') {
		emitterRequested = arguments[0];
		delete arguments[0];
	}

	var object = emitterRequested ? new EventEmitter() : {};

	for (var i in arguments) {
		var method = arguments[i];
		object[method] = function() {};
		spyOn(object, method);
	}

	return object;
}