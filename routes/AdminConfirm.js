var express = require('express');
var router = express.Router();
var Database = require('./mySQL_connect');

/* GET home page. */
router.get('/', function(req, res, next) {
    new Database().adminConfirm(req, res);
});

module.exports = router;