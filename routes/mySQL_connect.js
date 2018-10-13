var mysql = require('mysql');

var nodemailer = require('nodemailer')
var smtpTransport = require('nodemailer-smtp-transport');

var transporter = nodemailer.createTransport({
    service: 'QQ',
    auth: {
        user: '395506376@qq.com',
        pass: 'bntmojisukuucajg'
    }
});

var GetWeek = function(a){
    if (a == 1){
        return "周一"
    }else if (a == 2){
        return "周二"
    }else if (a == 3){
        return "周三"
    }else if (a == 4){
        return "周四"
    }else if (a == 5){
        return "周五"
    }else if (a == 6){
        return "周六"
    }else if (a == 0){
        return "周日"
    }
    else {
        return "未知"
    }
};
var Date2String = function(B,E) {
    var begin_date = new Date(B);
    var end_date = new Date(E);
    var date = (begin_date.getMonth()+1)
        + "月"
        +(begin_date.getDate()<10?('0'+begin_date.getDate()):(begin_date.getDate()))
        +"日（"
        +GetWeek(begin_date.getDay())
        +"）" +begin_date.getHours()
        +':'
        +(begin_date.getMinutes()<10?('0'+begin_date.getMinutes()):(begin_date.getMinutes()))
        +'~'+end_date.getHours()
        +':'
        +(end_date.getMinutes()<10?('0'+end_date.getMinutes()):(end_date.getMinutes()));
    return date;
};

class Database{
    constructor(){
        this.connection = mysql.createConnection({
            host:'localhost',
            user: 'root',
            password:'xiaoyuoshu',
            database: 'RoomAppointment',
            port:3306
        });
    }

    /**
     * 获取(两周前,infinity)的所有申请并分类，组装html并返回
     * @param req
     * @param res
     */
    queryApp(req, res){
        var that = this;
        var resultData = {};
        var sql = 'select * from apps where begin_time <= '+Date.now()+' and end_time >= '+Date.now()+' and state = 1 and init_time > '+(Date.now()-1209600000);
        this.connection.query(sql, function (err, result) {
            if(err){
                console.log('查询正在进行失败');
            }
            else {
                resultData.ing = result;
                sql = 'select * from apps where begin_time > '+Date.now()+' and state = 1 and init_time > '+(Date.now()-1209600000)+' order by begin_time';
                that.connection.query(sql, function (err, result) {
                    if(err){
                        console.log('查询审核成功失败');
                    }
                    else {
                        resultData.success = result;
                        sql = 'select * from apps where end_time < '+Date.now()+' and init_time > '+(Date.now()-1209600000)+' order by begin_time desc';
                        that.connection.query(sql, function (err, result) {
                            if(err){
                                console.log('查询已结束失败');
                            }
                            else {
                                resultData.isFinished = result;
                                sql = 'select * from apps where state = 2 and begin_time > '+Date.now()+' and init_time > '+(Date.now()-1209600000);
                                that.connection.query(sql,  function (err, result) {
                                   if(err){
                                       console.log('查询待审核失败');
                                   }
                                   else {
                                       resultData.waiting = result;
                                       sql = 'select * from apps where state = 0 and end_time > '+Date.now()+' and init_time > '+(Date.now()-1209600000);
                                       that.connection.query(sql,  function (err, result) {
                                           if(err){
                                               console.log('查找被占用失败');
                                           }
                                           else {
                                               resultData.Occupied = result;
                                               var deviceAgent = req.headers["user-agent"];
                                               if(deviceAgent == undefined){
                                                   console.log('未知设备访问，给予移动端页面');
                                                   res.render('mobileIndex', resultData);
                                               }
                                               else {
                                                   var deviceAgentLow = deviceAgent.toLowerCase();
                                                   var agentID = deviceAgentLow.match(/(iphone|ipod|ipad|android)/);
                                                   if(agentID){
                                                       console.log('移动端访问');
                                                       res.render('mobileIndex', resultData);
                                                   }else{
                                                       console.log('pc端访问');
                                                       res.render('index', resultData);
                                                   }
                                               }
                                           }
                                       });
                                   }
                                });
                            }
                        });
                    }
                });
            }
        });
    }

    /**
     * 接受用户提交的表单信息，验证是否冲突，并执行 （存储数据库操作 | 告知用户时间冲突）
     * 返回码：1：申请成功 | -1：申请冲突 | 0：对应邮箱存在已申请且未开始进行的申请
     * @param res
     * @param init_time
     * @param begin_time
     * @param end_time
     * @param applicant
     * @param department
     * @param reason
     * @param email
     */
    formSubmit(res,init_time,begin_time,end_time,applicant,department,reason,email){
        var that = this;
        that.connection.query('select * from apps where init_time > '+(Date.now()-1209600000), function (err,result) {
            if(err){
                console.log(err);
            }
            else{
                for(var i in result){
                    //若对应邮箱存在已申请且未开始进行的申请，则直接send 0并返回
                    if(result[i].wx_id.indexOf(email) != -1 && result[i].begin_time > Date.now()) {
                        res.send('0');
                        return 0;
                    }
                    //若对应邮箱无已申请且未开始进行的申请，则进一步检查冲突
                    //若有冲突
                    if(((begin_time > result[i].begin_time && begin_time < result[i].end_time) || (end_time > result[i].begin_time && end_time < result[i].end_time)) && result[i].state == 1) {
                        res.send('-1');
                        return -1;
                    }
                }
                //若无冲突，则存储
                that.connection.query('insert into apps set ?',{
                    init_time: init_time,
                    begin_time: begin_time,
                    end_time: end_time,
                    site: 1,
                    applicant: applicant,
                    department: department,
                    reason: reason,
                    state: 2,
                    wx_id: '\''+email+'\''
                },function (err, result) {
                    if(err){
                        console.log(err);
                    }
                    else {
                        transporter.sendMail({
                            from: '395506376@qq.com',
                            to: '1738010002@qq.com,2506017166@qq.com,1468111755@qq.com,859721390@qq.com',
                            subject: '【公用房审核通知】',
                            html: '新的预约已提交<br>申请人：'+applicant+'('+department+')\n'+'<br>理由：'+reason+'<br>时间：'+Date2String(begin_time,end_time)

                        }, function (error, response) {
                            if (error) {
                                console.log(error);
                            }
                            else {
                                console.log('发送成功')
                            }
                        });
                        res.send('1');
                    }
                });
            }
        });
    }

    /**
     * 更改已经存在的申请信息
     * @param res
     * @param init_time
     * @param begin_time
     * @param end_time
     * @param applicant
     * @param department
     * @param reason
     * @param email
     */
    changeExited(res,init_time,begin_time,end_time,applicant,department,reason,email) {
        var that = this;
        that.connection.query('select * from apps where init_time > '+(Date.now()-1209600000), function (err,result) {
            if(err){
                console.log(err);
            }
            else{
                for(var i in result){
                    //若有冲突
                    if(((begin_time > result[i].begin_time && begin_time < result[i].end_time) || (end_time > result[i].begin_time && end_time < result[i].end_time)) && result[i].state == 1) {
                        res.send('-1');
                        return -1;
                    }
                }
                //若无冲突，则检测是否有除申请时间之外的项目变更的情况（原则上不允许发生）
                that.connection.query('select * from apps where init_time = '+init_time, function (err,result) {
                    if(err){
                        console.log(err);
                    }
                    else{
                        if(result[0].wx_id != ('\''+email+'\'') || result[0].applicant != applicant || result[0].department != department || result[0].reason != reason) {
                            res.send('-2');
                            return -2;
                        } else {
                            //邮箱未变更
                            that.connection.query('update apps set begin_time='+begin_time+',end_time='+end_time+',state='+2+' where init_time='+init_time,function (err, result) {
                                if(err){
                                    console.log(err);
                                }
                                else {
                                    transporter.sendMail({
                                        from: '395506376@qq.com',
                                        to: '1738010002@qq.com,2506017166@qq.com,1468111755@qq.com,859721390@qq.com',
                                        subject: '【预约信息变更通知】',
                                        html: '预约更改！<br>申请人：'+applicant+'('+department+')<br>'+'理由：'+reason+'<br>旧时间：'+Date2String(result[0].begin_time,result[0].end_time)+'<br>新时间：'+Date2String(begin_time,end_time)

                                    }, function (error, response) {
                                        if (error) {
                                            console.log(error);
                                        }
                                        else {
                                            console.log('发送成功')
                                        }
                                    });
                                    res.send('1');
                                }
                            });
                        }
                    }
                });
            }
        });
    }

    /**
     * 获取(两周前,infinity)的所有申请
     * @param res
     */
    getAllAppList(res){
        var resultData = {};
        this.connection.query('select * from apps where init_time > '+(Date.now()-1209600000), function (err,result) {
            if(err){
                console.log(err);
            }
            else{
                resultData
                    = result;
                res.send({result: resultData});
            }
        });
    }

    /**
     * 获取邮箱对应的已有的申请
     * @param req
     * @param res
     */
    getExitedApp(email,res) {
        this.connection.query('select * from apps where init_time > '+(Date.now()-1209600000), function (err,result) {
            if(err){
                console.log(err);
            }
            else{
                console.log(result)
                for(var i in result){
                    //若对应邮箱存在已申请且未开始进行的申请，则返回
                    if(result[i].wx_id == ('\''+email+'\'') && result[i].begin_time > Date.now()) {
                        res.send({result:result[i]});
                        console.log(0);
                        return 0;
                    }
                }
                console.log(-1);
                res.send('-1');
                return -1;
            }
        });
    }

    /**
     * 管理员审核申请
     * @param req
     * @param res
     */
    adminConfirm(req, res){
        var that = this;
        var connect = this.connection;
        var appInfo = req.query;
        console.log(req.query.init_time);
        var resultData = {};
        this.connection.query('update apps set state=1 where init_time='+appInfo.init_time,function (err, result) {
            if(err){
                console.log(err);
            }
            else {
                that.connection.query('select * from apps where init_time = '+appInfo.init_time, function (err,result) {
                    if(err){
                        console.log(err);
                    }
                    else{
                        transporter.sendMail({
                            from: '395506376@qq.com',
                            to: result[0].wx_id.substring(1, result[0].wx_id.length - 1),
                            subject: '【公用房申请成功】',
                            html: '<p>您好，您申请的公用房使用已通过审核！</p>'+'<p>时间：'+Date2String(result[0].begin_time,result[0].end_time)+'</p>'+'<p>详情请查看<a href="http://119.23.218.94/" target="_blank">公用房预约系统</a></p><p>本邮件由系统自动发送，如有疑问请联系办公室负责人，联系方式：玉米提（QQ 859721390）</p>'

                        }, function (error, response) {
                            if (error) {
                                console.log(error);
                            }
                            else {
                                console.log('发送成功')
                            }
                        });
                    }
                });
                resultData = result;
                res.send({result: resultData});
            }
        })
    }

    /**
     * 添加申请项的负责人
     * @param req
     * @param res
     */
    addPrinciple(req, res){
        var connect = this.connection;
        var appInfo = req.query;
        console.log(req.query.init_time);
        var resultData = {};
        this.connection.query('update apps set principle=\''+appInfo.principle+'\' where init_time='+appInfo.init_time,function (err, result) {
            if(err){
                console.log(err);
            }
            else {
                resultData = result;
                res.send({result: resultData});
            }
        })
    }

    /**
     * 管理员拒绝申请
     * @param req
     * @param res
     */
    adminRefuse(req, res) {
        var that = this;
        var connect = this.connection;
        var appInfo = req.query;
        console.log(req.query.init_time);
        var resultData = {};
        this.connection.query('update apps set state=-1 where init_time='+appInfo.init_time,function (err, result) {
            if(err){
                console.log(err);
            }
            else {
                that.connection.query('select * from apps where init_time = '+appInfo.init_time, function (err,result) {
                    if(err){
                        console.log(err);
                    }
                    else{
                        transporter.sendMail({
                            from: '395506376@qq.com',
                            to: result[0].wx_id.substring(1, result[0].wx_id.length - 1),
                            subject: '【公用房申请失败】',
                            html: '<p>您的公用房审核未通过</p>'+'<p>时间：'+Date2String(result[0].begin_time,result[0].end_time)+'</p>'+'<p>本邮件由系统自动发送，请联系办公室负责人，联系方式：玉米提（QQ 859721390）</p>'

                        }, function (error, response) {
                            if (error) {
                                console.log(error);
                            }
                            else {
                                console.log('发送成功')
                            }
                        });
                    }
                });
                resultData = result;
                res.send({result: resultData});
            }
        })
    }

    /**
     * 管理员删除申请
     * @param req
     * @param res
     */
    adminDelete(req, res) {
        var connect = this.connection;
        var appInfo = req.query;
        console.log(req.query.init_time);
        var resultData = {};
        this.connection.query('delete from apps where init_time='+appInfo.init_time,function (err, result) {
            if(err){
                console.log(err);
            }
            else {
                resultData = result;
                res.send({result: resultData});
            }
        })
    }

    /**
     * 管理员占用申请
     * @param req
     * @param res
     */
    adminOccupy(req, res) {
        var that = this;
        var connect = this.connection;
        var appInfo = req.query;
        console.log(req.query.init_time);
        var resultData = {};
        this.connection.query('update apps set state=0 where init_time='+appInfo.init_time,function (err, result) {
            if(err){
                console.log(err);
            }
            else {
                that.connection.query('select * from apps where init_time = '+appInfo.init_time, function (err,result) {
                    if(err){
                        console.log(err);
                    }
                    else{
                        transporter.sendMail({
                            from: '395506376@qq.com',
                            to: result[0].wx_id.substring(1, result[0].wx_id.length - 1),
                            subject: '【公用房申请被临时占用】',
                            html: '<p>您申请的'+Date2String(result[0].begin_time,result[0].end_time)+'的公用房由于临时紧急事务而被取消，请您重新申请其他时间</p><p>本邮件由系统自动发送，如有疑问请联系办公室负责人，联系方式：玉米提（QQ 859721390）</p>'

                        }, function (error, response) {
                            if (error) {
                                console.log(error);
                            }
                            else {
                                console.log('发送成功')
                            }
                        });
                    }
                });
                resultData = result;
                res.send({result: resultData});
            }
        })
    }
}
module.exports = Database;