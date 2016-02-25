self.importScripts('/socket.io/socket.io.js');

self.defaultSampleRate = 44100;

self.addEventListener('message', function(event) {
    var data = event.data.data;
    var type = event.data.type;
    
    if (type === 'video') {
	self.socket.emit('video', data);
    } else if (type === 'audio') {
	data = convertFloat32ToInt16(data);
	self.socket.emit('audio', data.buffer);
    } else if (type === 'message') {
	self.socket.emit('message', data);
    } else if (type === 'join') {
	if (self.socket) {
	    self.socket.disconnect();
	}
	
	self.socket = io.connect().on('connect', function() {
	    self.socket.on('syncSetting', function(setting) {
		self.postMessage({ type: 'setting', data: setting });
	    });

	    self.socket.on('message', function(data) {
		self.postMessage({ type: 'message', data: data });
	    });

	    self.socket.on('video', function(video) {
		self.postMessage({ type: 'video', data: video});
	    });

	    self.socket.on('audio', function(audio) {
		self.postMessage({ type: 'audio', data: audio});
	    });

	    self.socket.emit('join', data);
	});
    } else if (type === 'end') {
	socket.emit('end');
    }
});

function downsampleBuffer(buffer, rate) {
    var sampleRate = self.defaultSampleRate;
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
    var buf = new Int16Array(length);
    while(length--) {
	buf[length] = buffer[length] * 0xFFFF;
    }
    return buf;
};
