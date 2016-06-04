var cp = require('child_process');
var spawn = cp.spawn;
var exec = cp.exec;
var static = require('node-static');
var httpFile = new static.Server({ cache: false, serverInfo: 'livestream' });
var fs = require('fs');
var os = require('os');

var http = require('http').createServer(function(req, res) {
    httpFile.serve(req, res);
}).listen(9000, '0.0.0.0');

var io = require("socket.io")(http);

io.on('connection', function(socket) {
    console.log('new user connected.');

    socket.on('join', function(data) {
	if (socket.room) {
	    socket.leave(socket.room);
	}
	socket.userId = socket.id;
	socket.userName = data.userName;
	socket.room = data.room;
	if (!socket.video_num) {
	    socket.video_num = 1;
	    socket.data_dict = 'data/' + socket.room + '/';
	    fs.mkdir(socket.data_dict, function(err, path) {
		if (err) console.log(socket.data_dict + " is exists!");
	    });
	}
	console.log("data_dict:" + socket.data_dict + " and userId:" + socket.userId);
	socket.join(socket.room);
	socket.broadcast.to(socket.room).emit('user join', { id: socket.userId, name: socket.userName });
	console.log(socket.userName + " has join the " + socket.room);
    });
    
    socket.on('message', function(msg) {
	if (socket.room) {
	    socket.broadcast.to(socket.room).emit('message', { from: socket.userId, msg: msg, nickname: socket.userName });
	    console.log(socket.userName + ' has send a message:' + msg + ' in room:' + socket.room);
	} else {
	    socket.emit('error', { code: 502, error: 'no join a room'});
	}
    });
    
    socket.on('error', function(e) {
	console.log(e);
    });

    socket.on('disconnect', function(e) {
	console.log(socket.userName + ' has disconnected.');
	socket.leave(socket.room);
    });

    socket.on('video', function(data) {
	if (socket.room) {
	    socket.broadcast.to(socket.room).emit('video', data);
//	    console.log(socket.userName + " is sending video.");
	    fs.writeFile(socket.data_dict + socket.userName  + (socket.video_num++) + '.jpeg', data.replace(/^data:image\/jpeg;base64,/, ''), 'base64', function(err, fp) {
		if (err) {
	 	    console.log(err);
		}
	    });
	}
    });
    
    socket.on('audio', function(data) {
	if (socket.room) {
	    socket.broadcast.to(socket.room).emit('audio', data);
//	    console.log(socket.userName + " is sending audio.");
	}
	
	// if (!rawAudioFile) {
	//     console.log('create pcm file');	    
	//     rawAudioFile = fs.createWriteStream(rawAudioName);
	// }

	// rawAudioFile.write(msg);	
    });
    
    socket.on('end', function() {
	// console.log('end');
	// if (socket === receiver) {
	//     console.log('receiver exit');
	//     receiver = undefined;
	// } else if (socket === sender) {
	//     console.log('sender exit');
	//     sender = undefined;
	// }
	
	// if (rawAudioFile){
	//     rawAudioFile.end();
	//     var command = 'ffmpeg -f image2 -i ' + rawVideoFileName + '%d.jpeg -f s16le -ar 44100 -ac 1 -i ' + rawAudioName + ' ' + rawVideoFileName + '.mp4';
	//     console.log(command);
	//     exec(command,
	// 	 function(err, stdout, stderr) {
	// 	     if (err) {
	// 		 console.log(err);
	// 		 return;
	// 	     } else {
	// 		 console.log('convert end');
	// 	     }
	// 	 });
	// }
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
