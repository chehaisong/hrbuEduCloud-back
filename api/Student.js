const express = require('express');
const router = express.Router();
const mysql = require("mysql");
const config = require("../config/config")
const dayjs = require("dayjs");
const uuid = require("uuid");

//格式化时间
const FormatTime = (ts) => {
    return dayjs(ts).format("YYYY-MM-DD HH:mm:ss");
}


//获取学生信息接口 /api/student/studentinfo
router.get("/studentinfo", (req, res) => {
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
    if (query.studentState && query.studentState != "2") {
        //  console.log("2222222")
        condition += `state = ${query.studentState} AND `;
    }
    if (query.major) {
        condition += `major = "${query.major}" AND `;
    }
    if (query.searchInput) {
        condition += `code LIKE "%${query.searchInput}%" AND `;
    }

    // 将拼接的条件后的 “AND ” 删除
    condition = condition.split(" ")
    condition.splice(condition.length - 2,);
    condition = condition.join(" ");
    //查询学生表
    // const sql = `SELECT id,code,name,gender,class,major,school,email,state FROM student ${condition} ORDER BY ts DESC LIMIT ${(query.pageNum-1)*query.pageSize}, ${query.pageSize};`;
    const sql = `SELECT id,num,code,name,gender,studentclass,major,school,email,state FROM student ${condition} order by num asc;`;
    console.log(sql);
    db.query(sql, [params.code, params.password], (err, results) => {
        if (err) return console.log(err.message);
        console.log(results)
        if (results.length) {
            //对数据进行加工
            results.map((item) => {
                //使1 2变为对应文字
                item.gender = item.gender == 1 ? "男" : "女";
                item.state = item.state == 1 ? "激活" : "结课";
            });
            const sql = `SELECT COUNT(id) AS total FROM student ${condition}`;
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

// 重置学生密码接口/api/student/resetpassword
router.post("/resetpassword", (req, res) => {
    const params = req.body;
    if (!params.userIds.length) {
        return res.send({
            state: 0,
            message: "学生已结课，无法重置密码！"
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
    const sql = `UPDATE student SET  
        PASSWORD = CASE id ${when}
        END WHERE id IN (${price});`;
    // 重置密码为qwe
    // const sql = `UPDATE users SET  
    //     PASSWORD = CASE id ${when}
    //     END WHERE id IN (${price});`;
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

// 学生结课/激活接口/api/student/disableOrActivatedUser
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
    const sql = `UPDATE student SET  
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


//添加学生信息接口/api/student/addstudent
router.post("/addstudent", (req, res) => {
    const params = req.body;
    // 连接数据库
    const db = mysql.createPool(config);
    params.id = uuid.v1().replaceAll("-", "");
    // const sql = `insert into student(code,name,gender,email,phone,idcard,school,major,studentclass,state,password) values('','${params.code}','${params.name}','${params.gender}','${params.email}','${params.phone}','${params.idcard}','${params.school}','${params.major}','${params.studentclass}','1','e10adc3949ba59abbe56e057f20f883e');`;
    const sql = `insert into student(id,code,name,gender,email,phone,idcard,school,major,studentclass,state,password) values('${params.id}','${params.code}','${params.name}','${params.gender}','${params.email}','${params.phone}','${params.idcard}','${params.school}','${params.major}','${params.studentclass}','1','e10adc3949ba59abbe56e057f20f883e');`;
    console.log(sql);
    // const sql2 = `UPDATE class SET studentnum = studentnum+1 WHERE classname = '${params.studentclass}';`
    // console.log(sql2);
    db.query(sql,(err, results) => {
        if (err) return console.log(err.message);
        console.log(results);
        if (results.affectedRows) {
            return res.send({
                state: 1,
                message: "新增学生成功",
            });
 
        } else {
            res.send({
                state: 0,
                message: "新增学生失败",
            });
        }

    });
});

// 查询某个学生信息接口 /api/student/studentcheck
router.get("/studentcheck", (req, res) => {
    // 连接数据库
    const db = mysql.createPool(config);
  
    const query = req.query;
    // console.log(query);
    
    //查询某个学生信息
    // const sql = `SELECT id,stuname,school,major,stuclass,code,gender,email,indent,introduction,state,ts FROM students WHERE id = "${query.id}";`;
    const sql = `SELECT id,name,school,major,studentclass,code,gender,email,idcard,state,ts FROM student WHERE id = "${query.id}";`;
    // console.log(sql);
  
    db.query(sql, (err, results) => {
      if (err) return console.log(err.message);
      if (results.length) {
          results.map((item) => {
            item.ts = FormatTime(item.ts);
            item.gender = item.gender == 1 ? "男" : "女";
            item.state = item.state === 1 ? "激活" : "结课";        
          });
        return res.send({
          state: 1,
          message: "查询学生信息成功",
          data:{
            results,
          }
        });
      } else {
        res.send({
          state: 0,
          message: "查询学生信息失败",
          data:{
            results,
          }
        });
      }
    });
  });

// 编辑学生信息 /api/student/studentedit
router.post("/studentedit", (req, res) => {
    const params = req.body;
    // 连接数据库
    const db = mysql.createPool(config);
    console.log(params);
    params.gender = params.gender === "男" ? 1 : 0;
    // const sql =`UPDATE student SET school="${params.school}",major="${params.major}",stuclass = "${params.stuclass}",stuname="${params.stuname}",code="${params.code}",gender="${params.gender}",email="${params.email}",indent="${params.indent}",introduction="${params.introduction}" WHERE id ="${params.id}"`;
    const sql =`UPDATE student SET school="${params.school}",major="${params.major}",studentclass = "${params.studentclass}",name="${params.name}",code="${params.code}",gender="${params.gender}",email="${params.email}",idcard="${params.idcard}" WHERE id ="${params.id}"`;
    console.log(sql)
    db.query(sql, (err, results) => {
      if (err) return console.log(err.message);
      console.log(results);
      if (results.affectedRows) {
        return res.send({
          state: 1,
          message: "编辑学生成功",
        });
      } else {
        res.send({
          state: 0,
          message: "编辑学生失败",
        });
      }
    });
  });



module.exports = router