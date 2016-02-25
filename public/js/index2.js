require.config({
    BaseUrl: './public/js',
    paths: {
	jquery: 'http://cdn.staticfile.org/jquery/2.1.4/jquery',
	socketio: '/socket.io/socket.io.js'
    },
    shim: {
	socketio: {
	    exports: 'io'
	}
    }
});

require(['jquery', 'talk'], function($, talk) {
    var talk = new talk('remote_video', 'local_video');

    talk.addMsgListener(function(data) {
	$('.message_region').append($('<li/>').text(data.nickname + ':' + data.msg).addClass('other_msg'));
    });
	
    $('.join').click(function() {
	talk.join($('.room').val(), $('.name').val());
    });
    $('.send').click(function() {
	var msg = $('.message').val();
	talk.send(msg);

	$('.message_region').append($('<li/>').text('me:' + msg).addClass('self_msg'));
    });
});
