const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'tank.db');
let db = null;

// 初始化数据库
async function initDatabase() {
    const SQL = await initSqlJs();

    // 尝试加载现有数据库
    if (fs.existsSync(dbPath)) {
        const buffer = fs.readFileSync(dbPath);
        db = new SQL.Database(buffer);
    } else {
        db = new SQL.Database();
    }

    // 创建表
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            currentLevel INTEGER DEFAULT 1,
            maxLevel INTEGER DEFAULT 0,
            totalScore INTEGER DEFAULT 0,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    saveDatabase();
    console.log('数据库初始化完成');
    return db;
}

// 保存数据库到文件
function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
    }
}

// 注册用户
function registerUser(username, password) {
    try {
        const hashedPassword = bcrypt.hashSync(password, 10);
        db.run('INSERT INTO users (username, password, currentLevel) VALUES (?, ?, 1)', [username, hashedPassword]);
        saveDatabase();
        return { success: true, message: '注册成功' };
    } catch (error) {
        if (error.message.includes('UNIQUE')) {
            return { success: false, message: '用户名已存在' };
        }
        return { success: false, message: '注册失败: ' + error.message };
    }
}

// 登录验证
function verifyLogin(username, password) {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    stmt.bind([username]);

    if (stmt.step()) {
        const user = stmt.getAsObject();
        stmt.free();

        if (!bcrypt.compareSync(password, user.password)) {
            return { success: false, message: '密码错误' };
        }

        return {
            success: true,
            user: {
                id: user.id,
                username: user.username,
                currentLevel: user.currentLevel,
                maxLevel: user.maxLevel,
                totalScore: user.totalScore
            }
        };
    }

    stmt.free();
    return { success: false, message: '用户不存在' };
}

// 获取用户进度
function getProgress(userId) {
    const stmt = db.prepare('SELECT currentLevel, maxLevel, totalScore FROM users WHERE id = ?');
    stmt.bind([userId]);

    if (stmt.step()) {
        const user = stmt.getAsObject();
        stmt.free();
        return {
            currentLevel: user.currentLevel,
            maxLevel: user.maxLevel,
            totalScore: user.totalScore
        };
    }

    stmt.free();
    return null;
}

// 保存用户进度
function saveProgress(userId, level, score) {
    const stmt = db.prepare('SELECT maxLevel FROM users WHERE id = ?');
    stmt.bind([userId]);

    let newMaxLevel = 0;
    if (stmt.step()) {
        const user = stmt.getAsObject();
        newMaxLevel = user.maxLevel > level ? user.maxLevel : level;
    }
    stmt.free();

    db.run('UPDATE users SET currentLevel = ?, maxLevel = ?, totalScore = totalScore + ? WHERE id = ?', [level, newMaxLevel, score || 0, userId]);
    saveDatabase();

    return { success: true };
}

module.exports = {
    initDatabase,
    registerUser,
    verifyLogin,
    getProgress,
    saveProgress
};