'use strict'

$(document).foundation()

var ipData = (window.location.href.match('localhost') !== null) ? 'localhost' : '192.168.0.18';
var socket = io.connect('http://'+ ipData +':3005', { 'forceNew': true });

//	Mostrando la modal inicial
$('#initialModal').foundation('open')

//	Cerrando modal cuando el usuario presione aceptar, falta validar longitud del nombre
$('#buttonAccept').on('click', function (e) {
	//	Cierro la modal
	$('#initialModal').foundation('close')
	var userName = $('#userName').val()

	//	Envio los valores al servidor por medio de sockets
	socket.on('user-connected', function (data) {
		console.log(data);
	});
	socket.emit('user-connected', { myName: userName });
})

$('#assignValue').on('click', function () {
	var data = $.getJSON('/test', function () {})

	data.done(function (response) {
		console.log(response)
	})
	data.fail(function (err) {
		console.error(err)
	})
})

$('#releaseValue').on('click', function () {
	var data = $.getJSON('/release', function () {})

	data.done(function (response) {
		console.log(response)
	})
	data.fail(function (err) {
		console.error(err)
	})
})
