'use strict'

$(document).foundation()

var ipData = (window.location.href.match('localhost') !== null) ? 'localhost' : '192.168.0.18';
var socket = io.connect('http://'+ ipData +':3005', { 'forceNew': true });

//	Mostrando la modal inicial
$('#initialModal').foundation('open')

//	Obteniendo los valores del servidor en caso recarguen la página del cliente
socket.on('user-connected', function (data) {
	console.log(data)
	var selector = $('#connected-users')

	//	Para limpiar los valores
	selector.html('')

	data.some(function (element, index, arr) {
		selector.append('<p>'+ element.myName +'</p>')
	})
});

//	Cerrando modal cuando el usuario presione aceptar, falta validar longitud del nombre
$('#buttonAccept').on('click', function (e) {
	//	Cierro la modal
	$('#initialModal').foundation('close')
	var userName = $('#userName').val()

	//	Escucho los valores que manda el servidor web
	socket.on('user-connected', function (data) {
		var selector = $('#connected-users')

		//	Para limpiar los valores
		selector.html('')

		data.some(function (element, index, arr) {
			selector.append('<p>'+ element.myName +'</p>')
		})
	});
	//	Envio los valores al servidor por medio de sockets
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
