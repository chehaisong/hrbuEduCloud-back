const express = require('express');
const router = express.Router();
const mysql = require("mysql");

const config = require("../config/config")

//登录接口 /api/system/user/login
router.post("/login", (req, res) => {

    console.log(req.body);
    const params = req.body
    //链接数据库匹配用户名和密码
    const db = mysql.createPool(config);
    const sql = `select username from user where username=? and password=?;`;
    console.log(sql);
    //查询用户表
    db.query(sql,[params.username,params.password], (err, results) => {
        if (err) return console.log(err.message);
        console.log(results)
        if (results.length) {
            return res.send({
                state: 1,//管理端登录
                message: "登陆成功"
            })
        } else {
            // 查询学生表
            const sql1 = `select id from student where code=?and password=?;`;
            console.log(sql1);
            db.query(sql1,[params.username,params.password],(err, results) => {
                if (err) return console.log(err.message);
                console.log(results)
                if (results.length) {
                    return res.send({
                        state: 2,//学生端登陆
                        message: "登陆成功"
                    })
                }else{
                    return res.send({
                        state:0,
                        message:"登陆失败"
                    })
                }

            })
        }
    })



})






module.exports = router
