'use strict'

$(document).foundation()

//var ipData = (window.location.href.match('localhost') !== null) ? 'localhost' : '192.168.0.18';
var ipData = (window.location.href.match('localhost') !== null) ? 'localhost' : '159.203.5.118';
var socket = io.connect('http://'+ ipData +':3005', { 'forceNew': true });

// http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

socket.on('shared-memory', function (data) {
	console.log(data)
	var text 	= 'Valor de la variable: ' + data

	var selector = $('#variable-status')
	selector.html(text)
})

//	Obteniendo los valores del servidor en caso recarguen la página del cliente
socket.on('user-connected', function (data) {
	console.log(data)
	var selector = $('#connected-users')

	//	Para limpiar los valores
	selector.html('')

	data.some(function (element, index, arr) {
		selector.append('<p class="connected-users">'+ element.myName.myName +'</p>')
	})
})

var saveUserName = function (evt) {
	evt.preventDefault()

	var userName = document.querySelector('#userName').value

	//	Validación del valor del campo de texto
    if (/^\s*$/.test(userName)) return false

    var uuid = guid()

	window.sessionStorage.setItem('userName', userName)
	window.sessionStorage.setItem('userId', uuid)

	//	Escucho los valores que manda el servidor web
	socket.on('user-connected', function (data) {
		var selector = $('#connected-users')

		//	Para limpiar los valores
		selector.html('')

		data.some(function (element, index, arr) {
			selector.append('<p>'+ element.myName.myName +'</p>')
		})
	});
	//	Envio los valores al servidor por medio de sockets
	socket.emit('user-connected', { myName: userName, appName: uuid })

	//	Cierro la modal
	$('#initialModal').foundation('close')
	setTitleUserName()
}

//	Cerrando modal cuando el usuario presione aceptar, falta validar longitud del nombre
$('#buttonAccept').on('click', function (e) {
	saveUserName(e)
})
$('#userName').on('keypress', function (e) {
	var code = e.keyCode || e.charCode

	if (code === 13) saveUserName(e)
})

$('#assignValue').on('click', function () {
	var data = $.getJSON('/test/' 
		+ window.sessionStorage.getItem('userId') + '/'
		+ window.sessionStorage.getItem('userName'), 
		{}, function () {})

	data.done(function (response) {
		if (response.message === 'ok') {
			showGeneralModal('Información', 'Acabas de utilizar la variable')
		} else if (response.message === 'fail') {
			showGeneralModal('Información', 'Variable en uso, no puedes utilizarla hasta que se libere')
		}
	})
	data.fail(function (err) {
		console.log(err)
	})
})

$('#releaseValue').on('click', function () {
	var data = $.getJSON('/release/' 
		+ window.sessionStorage.getItem('userId') + '/' 
		+ window.sessionStorage.getItem('userName'), 
		{}, function () {})

	data.done(function (response) {
		var r = response
		if (r.message === 'ok') {
			showGeneralModal('Liberación de variable', r.info)
		} else 
		if (r.message === 'fail') {
			showGeneralModal('Liberación de variable', r.info)
		} else {}
		//var selector = $('#variable-status')
		//var text = 'Valor de la variable: ' + response.info.memoryInfo.test.test + ' utilizada por ' + response.info.memoryInfo.myName.myName
		//selector.html(text)
		console.log(r)
	})
	data.fail(function (err) {
		console.log(err)
	})
})

var setTitleUserName = function () {
	$('.welcome').html('Bienvenido ' + window.sessionStorage.getItem('userName'))
}

var showGeneralModal = function (modalTitle, modalText) {
	$('#generalModal').foundation('open')

	var title 	= modalTitle || 'Información', 
		text 	= modalText || ''

	$('#generalModal .title').html(title)
	$('#generalModal .content').html(text)
}

//	Funciones de inicio
document.addEventListener('DOMContentLoaded', function () {
	//	Verificación si el usuario ya tiene una sesión
	if (window.sessionStorage.getItem('userName') === null) {
		//	Mostrando la modal inicial
		$('#initialModal').foundation('open')
		$('#userName').focus()
	} else {
		setTitleUserName()
	}
})
