self.addEventListener('message', function(event) {
    var audiodata = event.data;
    var sampleRate = 44100;

    //audiodata = downsampleBuffer(audiodata, 8000);
    audiodata = convertFloat32ToInt16(audiodata);
    self.postMessage(audiodata.buffer);
});

function ab2str(buf) {
  return String.fromCharCode.apply(null, new Uint16Array(buf));
};

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
    var buf = new Int16Array(length);
    while(length--) {
	buf[length] = buffer[length] * 0xFFFF;
    }
    return buf;
};
