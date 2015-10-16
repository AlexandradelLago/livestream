function Talk(remote, local) {
    var self = this;

    self.remote = Document.getElementById(remote);
    self.local = Document.getElementById(local);
    self.local.muted = true;
    self.canvas = Document.createElement('canvas');
    self.canvasContext = self.canvas.getContext('2d');
    self.webMedia = new WebMedia();
    self.talkConfig = new TalkConfig();
    self.audioContext = new webMedia.getAudioContext();
    
    self.socket = new Worker('socketWorker.js');
    self.socket.onmessage = function(event) {
	var type = event.data.type;
	if (type === 'config') {
	    self.talkConfig = event.data.data;
	    self.canvas.setAttribute('width', self.talkConfig.videoWidth);
	    self.canvas.setAttribute('height', self.talkConfig.videoHeight);
	}
    };

    return self;
};

Talk.prototype.join = function(room) {
    var self = this;
    self.socket.postMessage({ type: 'join', data: { room : room }});
    self.webMedia.getUserMedia({ audio: true, video: true },
			       function(stream) {
				   self.localStream = stream;
				   self.local.src = URL.createObjectURL(stream);
				   self.local.oncanplaythrough = function() {
				       self.startTalking();
				   };
			       },
			       function(error) {
				   self.socket.postMessage({ type: 'error', data: error.name });
			       });
};

Talk.prototype.startTalking = function() {
    this._startVideoRecoding();
    this._startAudioRecording();
};

Talk.prototype._startVideoRecoding = function() {
    var self = this;
    var width = self.talkConfig.videoWidth, height = self.talkConfig.videoHeight;
    var quality = self.talkConfig.videoQuality;
    var imageType = self.talkConfig.imageType;
    self.videoRecodingId = setInterval(function() {
	self.canvasContext.drawImage(self.remote, 0, 0, width, height);
	self.socket.postMessage({ type: 'video', data: self.canvas.toDataURL(imageType, quality) });
    }, self.talkConfig.videoRate);
};

Talk.prototype._startAudioRecording = function() {
    var self = this;
    self.audioInput = self.audioContext.createMediaStreamSource(self.localStream);
    self.audioGain = self.audioContext.createGain();
    self.audioGrain.gain.value = 0;
    self.recorder = self.audioContext.createScriptProcessor(self.talkConfig.audioBufferLength, 1, 1);
    self.recorder.onaudioprocess = function(event) {
	self.socket.postMessage({ type: 'audio', data: event.inputBuffer.getChannelData(0) });
    }
    self.audioInput.connect(self.recorder);
    self.recorder.connect(self.audioGain);
    self.audioGain.connect(self.audioContext.destination);
};

Talk.prototype.hangup = function() {
    var self = this;
    
};
