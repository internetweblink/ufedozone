const mysql = require("mysql2/promise");

console.log("Database configuration:");

console.log("DB_HOST:", process.env.DB_HOST || "localhost");

console.log("DB_USER:", process.env.DB_USER || "root");

console.log("DB_NAME:", process.env.DB_NAME || "ufedozone");

console.log("DB_PORT:", process.env.DB_PORT || "3306");

const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",

    user: process.env.DB_USER || "root",

    password: process.env.DB_PASSWORD || "Milstemarpra$2k",

    database: process.env.DB_NAME || "ufedozone",

    port: Number(process.env.DB_PORT) || 3306,

    waitForConnections: true,

    connectionLimit: 10,

    queueLimit: 0
});

module.exports = pool;