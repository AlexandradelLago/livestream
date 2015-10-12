function Talk(remote, local) {
    var self = this;

    self.remote = Document.getElementById(remote);
    self.local = Document.getElementById(local);
    self.local.muted = true;
    self.canvas = Document.createElement('canvas');
    self.canvasContext = self.canvas.getContext('2d');
    self.webMedia = new WebMedia();
    self.talkSetting = new VideoSetting();
    
    self.socket = new Worker('socketWorker.js');
    self.socket.onmessage = function(event) {
	var type = event.data.type;
	if (type === 'setting') {
	    self.talkSetting = event.data.data;
	    self.canvas.setAttribute('width', self.talkSetting.videoWidth);
	    self.canvas.setAttribute('height', self.talkSetting.videoHeight);
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
    var width = self.talkSetting.videoWidth, height = self.talkSetting.videoHeight;
    var quality = self.talkSetting.videoQuality;
    var imageType = self.talkSetting.imageType;
    self.videoRecodingId = setInterval(function() {
	self.canvasContext.drawImage(self.remote, 0, 0, width, height);
	self.socket.postMessage({ type: 'video', data: self.canvas.toDataURL(imageType, quality) });
    }, self.talkSetting.videoRate);
};

Talk.prototype._startAudioRecording = function() {
    var context = new webMedia.getAudioContext();
    var audioInput = context.createMediaStreamSource(self.localStream);
};
