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

//获取班级信息接口 /api/classmanage/classinfo
router.get("/classinfo", (req, res) => {
    const params = req.query
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
    if (query.classState && query.classState != "2") {
        condition += `state = ${query.classState} AND `;
    }
    if (query.major) {
        condition += `major = "${query.major}" AND `;
    }
    if (query.searchInput) {
        condition += `classname LIKE "%${query.searchInput}%" AND `;
    }
    // 将拼接的条件后的 “AND ” 删除
    condition = condition.split(" ")
    condition.splice(condition.length - 2,);
    condition = condition.join(" ");
    //查询班级表
    const sql = `SELECT id,num,classname,school,major,studentnum,state FROM class ${condition} order by num asc LIMIT ${(query.pageNum - 1) * query.pageSize}, ${query.pageSize};`;
    console.log(sql);
    db.query(sql, [params.code, params.password], (err, results) => {
        if (err) return console.log(err.message);
        console.log(results)
        if (results.length) {
            //对数据进行加工
            results.map((item) => {
                //使1 2变为对应文字
                item.state = item.state == 1 ? "激活" : "结课";
            });
            const sql = `SELECT COUNT(id) AS total FROM class ${condition}`;
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

// 班级结课/激活接口/api/classmanage/disableOrActivatedUser
router.post("/disableOrActivatedUser", (req, res) => {
    const params = req.body;
    console.log(params);
    // 如果前台传递的数据为空
    if (!params.classIds.length) {
        return res.send({
            state: 0,
            message: "全部是禁用/激活用户，无法二次禁用/激活！"
        })
    }
    // 勾选多个，能同时禁用/激活
    let when = ``;
    let price = ""
    params.classIds.forEach((item, index) => {
        when += `WHEN ? THEN ${params.state} `;
        price += "?,";
        if (index === params.classIds.length - 1) {
            price = price.split("")
            price.pop();
            price = price.join("");
        }
    })
    const sql = `UPDATE class SET  
        state = CASE id ${when}
        END WHERE id IN (${price});`;

    console.log(when, price);

    // 连接数据库，匹配用户名与密码
    const db = mysql.createPool(config)
    console.log(sql);
    db.query(sql, [...params.classIds, ...params.classIds], (err, results) => {
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

// 新增班级接口 /api/classmanage/addclass
router.post("/addclass", (req, res) => {
    const params = req.body;
    // 连接数据库
    const db = mysql.createPool(config);

    params.id = uuid.v1().replaceAll("-", "");

    const sql = `insert into class(id,classname,school,major,state,level) values('${params.id}','${params.classname}','${params.school}','${params.major}','1','${params.level}');`;
    console.log(sql)
    db.query(sql, (err, results) => {
        if (err) return console.log(err.message);
        console.log(results);
        if (results.affectedRows) {
            return res.send({
                state: 1,
                message: "新增班级成功",
            });

        } else {
            res.send({
                state: 0,
                message: "新增班级失败",
            });
        }
    });
});

// 查询某个班级信息接口 /api/classmanage/classcheck
router.get("/classcheck", (req, res) => {
    // 连接数据库
    const db = mysql.createPool(config);

    const query = req.query;
    // console.log(query);

    //查询某个班级信息
    const sql = `SELECT * FROM class WHERE id = "${query.id}";`;
    console.log(sql);

    db.query(sql, (err, results) => {
        if (err) return console.log(err.message);
        if (results.length) {
            results.map((item) => {
                //格式化时间
                item.ts = FormatTime(item.ts);
                item.state = item.state === 1 ? "激活" : "结课";
            });
            return res.send({
                state: 1,
                message: "查询班级信息成功",
                data: {
                    results,
                }
            });
        } else {
            res.send({
                state: 0,
                message: "查询班级信息失败",
                data: {
                    results,
                }
            });
        }
    });
});

// 编辑班级信息 /api/classmanage/classedit
router.post("/classedit", (req, res) => {
    const params = req.body;
    // 连接数据库
    const db = mysql.createPool(config);
    console.log(params)
    const sql = `UPDATE class SET major="${params.major}" ,classname = "${params.classname}" WHERE id ="${params.id}"`;
    console.log(sql)
    db.query(sql, (err, results) => {
      if (err) return console.log(err.message);
      console.log(results);
      if (results.affectedRows) {
        return res.send({
          state: 1,
          message: "编辑班级成功",
        });
      } else {
        res.send({
          state: 0,
          message: "编辑班级失败",
        });
      }
    });
  });





module.exports = router