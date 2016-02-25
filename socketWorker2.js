self.importScripts('/socket.io/socket.io.js');

self.sampleRate = 44100;

var socket = io.connect().on('connect', function() {
    socket.emit('message', 'hello I am socket worker');
    socket.emit('register', { type: 'sender' });
});

self.addEventListener('message', function(event) {
    var data = event.data.data;
    var type = event.data.type;
    
    if (type === 'video') {
	socket.emit('video', data);
    } else if (type === 'audio') {
	data = convertFloat32ToInt16(data);
	socket.emit('audio', data.buffer);
//	socket.emit('audio', data);
    }else if (type === 'end') {
	socket.emit('end');
    }
});

function downsampleBuffer(buffer, rate) {
    var sampleRate = self.sampleRate;
    if (rate == sampleRate) {
	return buffer;
    }
    if (rate > sampleRate) {
	throw "downsampling rate show be smaller than original sample rate";
    }
    var sampleRateRatio = sampleRate / rate;
    var newLength = Math.round(buffer.length / sampleRateRatio);
    var result = new Float32Array(newLength);
    var offsetResult = 0;
    var offsetBuffer = 0;
    while (offsetResult < result.length) {
	var nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
	var accum = 0, count = 0;
	for (var i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
	    accum += buffer[i];
	    count++;
	}
	result[offsetResult] = accum / count;
	offsetResult++;
	offsetBuffer = nextOffsetBuffer;
    }
    return result;
};

function convertFloat32ToInt16(buffer) {
    var length = buffer.length;
    //var buf = new Int16Array(length);
    var buf = new Float32Array(length);
    //while(length--) {
//	buf[length] = buffer[length] * 0xFFFF;
  //  }
    buf.forEach(function(item, i) {
	buf[i] = buffer[i];
    });
    
    return buf;
};
