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

	it('logs to sockets', function() {
		net.connect.mostRecentCall.args[1]();

		var socket1 = stub(true, 'write');
		var socket2 = stub(true, 'write');

		net.createServer.mostRecentCall.args[0](socket1);
		net.createServer.mostRecentCall.args[0](socket2);

		var loggedCb = jasmine.createSpy();
		server.log('debug', 'message', {a: 123}, loggedCb);

		expect(socket1.write.mostRecentCall.args[0]).toEqual('debug: message. { a: 123 }\n');
		expect(socket2.write.mostRecentCall.args[0]).toEqual('debug: message. { a: 123 }\n');

		expect(loggedCb).not.toHaveBeenCalled();

		socket1.write.mostRecentCall.args[2]();
		socket2.write.mostRecentCall.args[2]();

		expect(loggedCb).toHaveBeenCalled();

		socket1.emit('error', 123);
		socket1.emit('close');

		server.log('debug', 'message 2', {a: 123}, loggedCb);

		expect(socket2.write.mostRecentCall.args[0]).toEqual('debug: message 2. { a: 123 }\n');

		expect(socket1.write.callCount).toEqual(1);

		socket2.write.mostRecentCall.args[2]();
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