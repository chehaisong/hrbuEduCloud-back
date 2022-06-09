const express = require('express');
const router = express.Router();
const mysql = require("mysql");
const dayjs = require("dayjs");
const config = require("../config/config")
const uuid = require("uuid");

//格式化时间
const FormatTime = (ts) => {
    return dayjs(ts).format("YYYY-MM-DD HH:mm:ss");
}

//获取教师信息接口 /api/teacher/userinfo
router.get("/userinfo", (req, res) => {
    // console.log(req.body);
    const params = req.query
    // console.log(params);
    //链接数据库匹配用户名和密码
    const db = mysql.createPool(config);
    console.log(req.query);
    const query = req.query;
    let condition = "";
    console.log(query);
    // 判断是否含有参数
    if (Object.keys(query).length) {
        condition += "where ";
    }
    // 参数中包含用户状态
    if (query.userState && query.userState != "2") {
        //  console.log("2222222")
        condition += `state = ${query.userState} AND `;
    }
    if (query.startTime) {
        condition += `ts BETWEEN "${query.startTime}" AND "${query.endTime}" AND `;
    }
    if (query.searchInput) {
        condition += `username LIKE "%${query.searchInput}%" AND `;
    }

    // 将拼接的条件后的 “AND ” 删除
    condition = condition.split(" ")
    condition.splice(condition.length - 2,);
    condition = condition.join(" ");



    //查询用户表
    const sql = `SELECT id,username,name,major,class,email,gender,state,ts FROM USER ${condition} ORDER BY ts DESC LIMIT ${(query.pageNum - 1) * query.pageSize}, ${query.pageSize};`;
    console.log(sql);
    db.query(sql, [params.username, params.password], (err, results) => {
        if (err) return console.log(err.message);
        console.log(results)
        if (results.length) {
            //对数据进行加工
            results.map((item) => {
                //格式化时间
                item.ts = FormatTime(item.ts);
                //使1 2变为对应文字
                item.gender = item.gender == 1 ? "男" : "女";
                item.state = item.state == 1 ? "有效" : "禁用";
            });
            const sql = `SELECT COUNT(id) AS total FROM user ${condition}`;
            let total;
            db.query(sql, (err, results1) => {
                console.log(results1[0].total);
                console.log(total);
                total = results1[0].total
                res.send({
                    state: 1, // 查询成功
                    message: "查询成功",
                    data: {
                        results,
                        total
                    }
                })
            });
        } else {
            res.send({
                state: 0,//查询失败
                message: "查询失败",
            })

        }
    })
})

// 重置教师密码接口/api/teacher/resetpassword
router.post("/resetpassword", (req, res) => {
    const params = req.body;
    if (!params.userIds.length) {
        return res.send({
            state: 0,
            message: "包含禁用用户，无法重置密码！"
        })
    }

    // 勾选多个，能同时更改密码
    let when = ``;
    let price = ""
    params.userIds.forEach((item, index) => {
        console.log("@@@@", item);
        when += `WHEN ? THEN "466bd066eaea252f4853611938852cfc" `;
        price += "?,";
        if (index === params.userIds.length - 1) {
            price = price.split("")
            price.pop();
            price = price.join("");
        }
    })
    // 重置密码为qwe
    const sql = `UPDATE user SET  
        PASSWORD = CASE id ${when}
        END WHERE id IN (${price});`;

    console.log(when, price);

    // 连接数据库，匹配用户名与密码
    const db = mysql.createPool(config)
    console.log(sql);
    db.query(sql, [...params.userIds, ...params.userIds], (err, results) => {
        if (err) return console.log(err.message);
        console.log(results);
        if (results.affectedRows) {

            // 邮件通知用户，密码已被修改
            const Mail = require("../public/Mail");
            // console.log(Mail);
            console.log(params.emailList.join(","));
            // 只发送一个邮箱
            // Mail("2412160533@qq.com")
            // 发送多个邮箱
            Mail(params.emailList.join(","))

            res.send({
                state: 1,
                message: "重置密码成功"
            })
        } else {
            res.send({
                state: 0,
                message: "重置密码失败"
            })
        }
    })
})

// 教师禁用/激活接口/api/teacher/disableOrActivatedUser
router.post("/disableOrActivatedUser", (req, res) => {
    const params = req.body;
    console.log(params);
    // 如果前台传递的数据为空
    if (!params.userIds.length) {
        return res.send({
            state: 0,
            message: "全部是禁用/激活用户，无法二次禁用/激活！"
        })
    }
    // 勾选多个，能同时禁用/激活
    let when = ``;
    let price = ""
    params.userIds.forEach((item, index) => {
        when += `WHEN ? THEN ${params.state} `;
        price += "?,";
        if (index === params.userIds.length - 1) {
            price = price.split("")
            price.pop();
            price = price.join("");
        }
    })
    const sql = `UPDATE user SET  
        state = CASE id ${when}
        END WHERE id IN (${price});`;

    console.log(when, price);

    // 连接数据库，匹配用户名与密码
    const db = mysql.createPool(config)
    console.log(sql);
    db.query(sql, [...params.userIds, ...params.userIds], (err, results) => {
        if (err) return console.log(err.message);
        console.log(results);
        if (results.affectedRows) {
            if (params.state === 1) {
                res.send({
                    state: 1,
                    message: "激活成功"
                })
            } else {
                res.send({
                    state: 1,
                    message: "禁用成功"
                })
            }
        } else {
            res.send({
                state: 0,
                message: "禁用/激活失败"
            })
        }
    })
})

// 查询某个教师信息接口 /api/teacher/teachercheck
router.get("/teachercheck", (req, res) => {
    // 连接数据库
    const db = mysql.createPool(config);

    const query = req.query;
    // console.log(query);

    //查询某个班级信息
    const sql = `SELECT * FROM user WHERE id = "${query.id}";`;
    console.log(sql);

    db.query(sql, (err, results) => {
        if (err) return console.log(err.message);
        if (results.length) {
            results.map((item) => {
                //格式化时间
                item.ts = FormatTime(item.ts);
                item.gender = item.gender == 1 ? "男" : "女";
                item.state = item.state === 1 ? "激活" : "结课";
            });
            return res.send({
                state: 1,
                message: "查询教师信息成功",
                data: {
                    results,
                }
            });
        } else {
            res.send({
                state: 0,
                message: "查询教师信息失败",
                data: {
                    results,
                }
            });
        }
    });
});

// 新增教师接口 /api/teacher/addteach
router.post("/addteach", (req, res) => {
    const params = req.body;
    console.log("params",params)
    // 连接数据库
    const db = mysql.createPool(config);
  
    params.id = uuid.v1().replaceAll("-", "");
  
    // const sql = `insert into users(id,code,stuname,gender,email,phone,indent,school,major,stuclass,state,password) values('${params.id}','${params.code}','${params.stuname}','${params.gender}','${params.email}','${params.phone}','${params.indent}','${params.school}','${params.major}','${params.stuclass}','1','e10adc3949ba59abbe56e057f20f883e');`;
    const sql = `insert into user(id,username,name,school,major,class,gender,email,state,password) 
    values('${params.id}','${params.username}','${params.name}','${params.school}','${params.major}','${params.class}','${params.gender}','${params.email}','1','e10adc3949ba59abbe56e057f20f883e');`;
    console.log(sql)
    db.query(sql, (err, results) => {
      if (err) return console.log(err.message);
      console.log(results);
      if (results.affectedRows) {
        return res.send({
          state: 1,
          message: "新增教师成功",
        });
      } else {
        res.send({
          state: 0,
          message: "新增教师失败",
        });
      }
    });
  });

// 编辑教师信息 /api/teacher/teacheredit
router.post("/teacheredit", (req, res) => {
    const params = req.body;
    // 连接数据库
    const db = mysql.createPool(config);
    console.log(params);
    params.gender = params.gender === "男" ? 1 : 0;
    // const sql =`UPDATE user SET school="${params.school}",major="${params.major}",class = "${params.class}",username="${params.username}",name="${params.name}",gender="${params.gender}",email="${params.email}",introduction="${params.introduction}" WHERE id ="${params.id}"`;
    const sql =`UPDATE user SET school="${params.school}",major="${params.major}",class = "${params.class}",username="${params.username}",name="${params.name}",gender="${params.gender}",email="${params.email}" WHERE id ="${params.id}"`;
    console.log(sql)
    db.query(sql, (err, results) => {
      if (err) return console.log(err.message);
      console.log(results);
      if (results.affectedRows) {
        return res.send({
          state: 1,
          message: "编辑教师成功",
        });
      } else {
        res.send({
          state: 0,
          message: "编辑教师失败",
        });
      }
    });
  });



module.exports = router