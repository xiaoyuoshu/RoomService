var express = require('express');
var Database = require('./mySQL_connect');
var router = express.Router();

/*
{ applicant: '张三',
  department: '科协技术部',
  reason: '部门例会',
  init_time: '1539433901592',
  begin_time: '1539518400000',
  end_time: '1539529200000',
  email: '395506376@qq.com' }
*/
router.post('/',function (req, res, next) {
    console.log(req.body);
    if(req.body.submitType == 1) {
        new Database().changeExited(res, req.body.init_time, req.body.begin_time, req.body.end_time, req.body.applicant, req.body.department, req.body.reason, req.body.email);
    } else {
        new Database().formSubmit(res, req.body.init_time, req.body.begin_time, req.body.end_time, req.body.applicant, req.body.department, req.body.reason, req.body.email);
    }
    })
module.exports = router;