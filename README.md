Avoid having to change log level when application start misbehaving and you want to see detailed logs.

Add a socket server winston transport with a more detailed logging level like this

	winston.add(require('winston-socket-server'), { level: 'verbose', path: '/tmp/winston.sock', timestamp: true });

Then connect to the said socket file with `nc -U /tmp/winston.sock` and see all the messages (filter with `grep -v`).

Or if you want TCP sockets instead:

	winston.add(require('winston-socket-server'), { level: 'verbose', listen: { port: '9997', host: 'localhost' } });
	# nc localhost 9997


Warning:
When starting, it will try to connect to the socket file, if it fails (e.g. other instance of the same app is not
running), the file will be *deleted*.

Options:
	path: path to socket, defaults to `default`
	level: minimal logging level to send, defaults to `silly` (the most verbose)
