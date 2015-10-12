var cp = require('child_process');
var spawn = cp.spawn;
var exec = cp.exec;
var static = require('node-static');
var httpFile = new static.Server();
var fs = require('fs');
var os = require('os');

var http = require('http').createServer(function(req, res) {
    httpFile.serve(req, res);
}).listen(9000, '0.0.0.0');

var io = require("socket.io")(http);
var sender, receiver;
var video_num = 0;

io.on('connection', function(socket) {
    var self = this;
    var rawAudioFile = undefined;
    var rawAudioName = undefined;
    var rawVideoFileName = undefined;
    
    console.log('new user connected.');

    socket.on('message', function(msg) {
	console.log(msg);
    });
    
    socket.on('register', function(msg) {
	if (msg && msg.type && msg.type === 'sender') {
	    console.log('register sender');
	    sender = socket;
	    video_num = 0;
	    rawAudioName = 'data/' + socket.id + '.pcm';
	    rawVideoFileName = 'data/' + socket.id + '_';
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

    socket.on('video', function(msg) {
	console.log('videoing');
	if (receiver) receiver.emit('video', msg);

	fs.writeFile(rawVideoFileName + (video_num++) + '.jpeg', msg.replace(/^data:image\/jpeg;base64,/, ''), 'base64', function(err) {
	    if (err) {
		console.log(err);
	    }
	});
    });
    
    socket.on('audio', function(msg) {
	console.log('audioing');
	if (receiver) receiver.emit('audio', msg);
	
	if (!rawAudioFile) {
	    console.log('create pcm file');	    
	    rawAudioFile = fs.createWriteStream(rawAudioName);
	}

	rawAudioFile.write(msg);	
    });
    
    socket.on('end', function() {
	console.log('end');
	if (socket === receiver) {
	    console.log('receiver exit');
	    receiver = undefined;
	} else if (socket === sender) {
	    console.log('sender exit');
	    sender = undefined;
	}
	
	if (rawAudioFile){
	    rawAudioFile.end();
	    var command = 'ffmpeg -f image2 -i ' + rawVideoFileName + '%d.jpeg -f s16le -ar 44100 -ac 1 -i ' + rawAudioName + ' ' + rawVideoFileName + '.mp4';
	    console.log(command);
	    exec(command,
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

function str2ab(str) {
    var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
    var bufView = new Uint16Array(buf);
    for (var i=0, strLen=str.length; i<strLen; i++) {
	bufView[i] = str.charCodeAt(i);
    }
    return buf;
}
