var cp = require('child_process');
var spawn = cp.spawn;
var exec = cp.exec;
var static = require('node-static');
var httpFile = new static.Server();
var fs = require('fs');
var os = require('os');

var http = require('http').createServer(function(req, res) {
    httpFile.serve(req, res);
}).listen(9001, '0.0.0.0');

var io = require("socket.io")(http);
var sender, receiver;

io.on('connection', function(socket) {
    var self = this;
    var rawAudioFile = undefined;
    var rawAudioName = 'data/' + socket.id + '.pcm';

    console.log('new user connected.');
    
    socket.on('register', function(msg) {
	if (msg && msg.type && msg.type === 'sender') {
	    console.log('register sender');
	    sender = socket;
	} else {
	    console.log('register receiver');
	    receiver = socket;
	}
    });
    
    socket.on('error', function(e) {
	console.log(e);
    });

    socket.on('disconnect', function(e) {
	console.log('disconnect');
    });
    
    socket.on('stream', function(msg) {
	console.log('stream');
	if (receiver) {
	    if (msg.audio) {
		receiver.emit('data', { type: 'audio', audio: msg.audio });
	    } else {
		receiver.emit('data', { type: 'video', video: msg.video });
	    }
	}

	if (!rawAudioFile) {
	    console.log('create pcm file');	    
	    rawAudioFile = fs.createWriteStream(rawAudioName);
	}
	if (msg.audio)
	    rawAudioFile.write(msg.audio);
    });

    socket.on('end', function() {
	console.log('end');
	if (socket === receiver) receiver = undefined;
	
	if (rawAudioFile){
	    rawAudioFile.end();
	    exec('ffmpeg -f s16le -ar 44100 -ac 1 -i ' + rawAudioName + ' data/' + socket.id + '.wav',
		 function(err, stdout, stderr) {
		     if (err) {
			 console.log(err);
			 return;
		     } else {
			 console.log('convert end');
		     }
		 });
	}
    });
});		
