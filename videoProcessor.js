self.addEventListener('message', function(event) {
    var width = event.data.width;
    var height = event.data.height;
    var rawData = event.data.data;
    var pic = [];
//    for (var i = 0; i < rawData.length; i++) pic.push(rawData[i]);

    self.postMessage({ width: width, height: height, data: pic });

});
