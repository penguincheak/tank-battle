const express = require('express');
const cors = require('cors');
const path = require('path');
const database = require('./database');

const app = express();
const PORT = 3000;

// 初始化数据库
(async () => {
    await database.initDatabase();

    // 启动服务器
    app.listen(PORT, () => {
        console.log(`坦克大战服务器运行在 http://localhost:${PORT}`);
    });
})();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API: 注册
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.json({ success: false, message: '用户名和密码不能为空' });
    }

    if (username.length < 3 || username.length > 20) {
        return res.json({ success: false, message: '用户名长度3-20字符' });
    }

    if (password.length < 6) {
        return res.json({ success: false, message: '密码至少6位' });
    }

    const result = database.registerUser(username, password);
    res.json(result);
});

// API: 登录 - 直接返回用户信息（包括当前关卡）
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.json({ success: false, message: '用户名和密码不能为空' });
    }

    const result = database.verifyLogin(username, password);
    res.json(result);
});

// API: 保存进度
app.post('/api/progress', (req, res) => {
    const { userId, level, score } = req.body;

    if (!userId || !level || level < 1 || level > 12) {
        return res.json({ success: false, message: '无效的参数' });
    }

    const result = database.saveProgress(userId, level, score || 0);
    res.json(result);
});

// 默认路由：返回游戏页面
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'tank-battle.html'));
});