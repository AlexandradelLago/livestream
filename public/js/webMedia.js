function WebMedia() {
    this.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
    this.getAudioContext = window.AudioContext || window.webkitAudioContext;

    return this;
}
