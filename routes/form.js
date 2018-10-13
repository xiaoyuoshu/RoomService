var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
    var deviceAgent = req.headers["user-agent"];
    if(deviceAgent == undefined){
        console.log('未知设备访问，给予移动端页面');
        res.render('mobileForm', { title: '公用房预约' });
    }
    else {
        var deviceAgentLow = deviceAgent.toLowerCase();
        var agentID = deviceAgentLow.match(/(iphone|ipod|ipad|android)/);
        if(agentID){
            console.log('移动端访问');
            res.render('mobileForm', { title: '公用房预约' });
        }else{
            console.log('pc端访问');
            res.render('form', { title: '公用房预约' });
        }
    }
});

module.exports = router;