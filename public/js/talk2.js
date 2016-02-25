define(['jquery', 'socketio', 'webMedia', 'talkConfig'], function($, socketio, webMedia, config) {

    var talk = function(remote, local) {
	var self = {};

	self.remote = document.getElementById(remote);
	self.local = document.getElementById(local);
	self.canvas = document.createElement('canvas');
	self.canvasContext = self.canvas.getContext('2d');
	self.webMedia = webMedia;
	self.talkConfig = config;
	self.audioContext = new webMedia.getAudioContext();
	
	self.socket = new Worker('/public/js/socketWorker.js');
	self.socket.onmessage = function(event) {
	    var type = event.data.type;
	    var data = event.data.data;
	    if (type === 'config') {
		self.talkConfig = event.data.data;
		self.canvas.setAttribute('width', self.talkConfig.videoWidth);
		self.canvas.setAttribute('height', self.talkConfig.videoHeight);
	    } else if (type === 'message' && self.msgListener) {
		self.msgListener(data);
	    } else if (type === 'video') {
		if (self.remote) self.remote.src = data;
		if (self.videoListener) self.videoListener(data);
	    } else if (type === 'audio') {
		if (self.audioListener) self.audioListener(data);
	    }
	};

	self.join = function(room, userName) {
	    self.socket.postMessage({ type: 'join', data: { room : room, userName: userName }});
	    self.webMedia.getUserMedia({ audio: true, video: true },
				       function(stream) {
					   self.localStream = stream;
					   self.local.src = URL.createObjectURL(stream);
					   self.local.oncanplaythrough = function() {
					       self._startTalking();
					   };
				       },
				       function(error) {
					   self.socket.postMessage({ type: 'error', data: error.name });
				       });
	};

	self.send = function(msg) {
	    self.socket.postMessage({ type: 'message', data: msg });
	}

	self.addMsgListener = function(listener) {
	    self.msgListener = listener;
	}

	self.addVideoListener = function(listener) {
	    self.videoListener = listener;
	}

	self.addAudioListener = function(listener) {
	    self.audioListener = listener;
	}
	
	self._startTalking = function() {
	    self._startVideoRecoding();
	    self._startAudioRecording();
	};

	self._startVideoRecoding = function() {
	    var width = self.talkConfig.videoWidth, height = self.talkConfig.videoHeight;
	    var quality = self.talkConfig.videoQuality;
	    var imageType = self.talkConfig.imageType;
		self.canvas.setAttribute('width', self.talkConfig.videoWidth);
		self.canvas.setAttribute('height', self.talkConfig.videoHeight);
	    self.videoRecodingId = setInterval(function() {
		self.canvasContext.drawImage(self.local, 0, 0, width, height);
		self.socket.postMessage({ type: 'video', data: self.canvas.toDataURL(imageType, quality) });
	    }, self.talkConfig.videoRate);
	};

	self._startAudioRecording = function() {
	    self.audioInput = self.audioContext.createMediaStreamSource(self.localStream);
	    self.audioGain = self.audioContext.createGain();
	    self.audioGain.gain.value = 0;
	    self.recorder = self.audioContext.createScriptProcessor(self.talkConfig.audioBufferLength, 1, 1);
	    self.recorder.onaudioprocess = function(event) {
		self.socket.postMessage({ type: 'audio', data: event.inputBuffer.getChannelData(0) });
	    }
	    self.audioInput.connect(self.recorder);
	    self.recorder.connect(self.audioGain);
	    self.audioGain.connect(self.audioContext.destination);
	};

	self.hangup = function() {
	    
	};
	
	return self;
    };

    return talk;
});


