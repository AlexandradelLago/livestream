var cp = require('child_process');
var spawn = cp.spawn;
var exec = cp.exec;
var static = require('node-static');
var httpFile = new static.Server();
var fs = require('fs');
var wav = require('wav');
var os = require('os');

var http = require('http').createServer(function(req, res) {
    httpFile.serve(req, res);
}).listen(9000, '0.0.0.0');

var io = require("socket.io")(http);
var sender, receiver;
var ffmpeg = spawn('ffmpeg', ['-f', 's16le', '-ar', '8000', '-ac', '1', '-i', 'pipe:0', '-acodec', 'wav', 'pipe:1']);

io.on('connection', function(socket) {
    var self = this;
    var rawAudioFile = undefined;
    var rawWavFile = undefined;
    var rawAudioName = 'data/' + socket.id + '.pcm';

    console.log('new user connected.');
    
    socket.on('register', function(msg) {
	if (msg.type === 'sender') {
	    console.log('register sender');
	    sender = socket;
	} else {
	    console.log('register receiver');
	    receiver = socket;
	}
    });
    
    socket.on('error', function(e) {
	console.log(e.stack);
    });

    ffmpeg.stdout.on('data', function(data) {
	// if (receiver) {
	//     console.log('send data');
	//     receiver.emit('data', { audio: data });
	// }
	console.log(data);
	rawWavFile.write(data);
    });
    
    socket.on('stream', function(msg) {
	if (!rawWavFile) {
	    console.log('create raw wav file');
	    rawWavFile = fs.createWriteStream("data/raw.wav");
	}
//	if (receiver) {
	    ffmpeg.stdin.write(msg.audio);
//	}

	
	if (!rawAudioFile) {
	    console.log('create pcm file');	    
	    rawAudioFile = fs.createWriteStream(rawAudioName);
	}
	console.log('streaming');
	rawAudioFile.write(msg.audio);
    });

    socket.on('end', function() {
	console.log('end');
	if (rawAudioFile) rawAudioFile.end();
	if (rawWavFile) rawWavFile.end();
	//exec('ffmpeg -f f32le -ar 44100 -ac 1 -i ' + rawAudioName + ' data/' + socket.id + '.wav',
	exec('ffmpeg -f s16le -ar 8000 -ac 1 -i ' + rawAudioName + ' data/' + socket.id + '.wav',
	     function(err, stdout, stderr) {
		 if (err) {
		     console.log(err);
		     return;
		 } else {
		     console.log('convert end');
		 }
	     });
    });
});		
