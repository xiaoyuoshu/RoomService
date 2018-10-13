var express = require('express');
var router = express.Router();
var Database = require('./mySQL_connect');

/* GET home page. */
router.get('/', function(req, res, next) {
    new Database().queryApp(req, res);
});

router.post('/getExited', function(req, res, next) {
    new Database().getExitedApp(req.body.email, res);
});

module.exports = router;
