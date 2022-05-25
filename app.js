const express = require('express')
const app = express()
const port = 3000

//权限 全局接口 /api/system/user/login 登录权限接口 /api/***/user/login
//表模块化

const systemuser = require("./api/SystemUserPost.js")
const user = require("./api/User.js")
// 生成uuid
// const uuid = require("uuid");

//对post请求的表单数据进行接收
app.use(express.urlencoded({extended:false}))
//对post请求的JSON数据进行接收
app.use(express.json())

app.use("/system/user",systemuser)
app.use("/user",user)


// app.get('/aaa', (req, res) => {
//     res.send({
//         state:1,
//         message:"登陆成功"
//     })
// })


app.listen(port, () => {
    console.log(`服务启动成功，端口号为${port}`);
})