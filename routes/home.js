'use strict'

var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
	console.dir(req.session);
  	res.render('home/home', { 
		title: 'Conectate e inicia esta aventura'
	});
});

module.exports = router;
