const mysql = require("mysql2/promise");

async function initDatabase(config) {
  const connection = await mysql.createConnection({
    host: config.host,
    user: config.user,
    password: config.password,
    port: config.port,
    ssl: { rejectUnauthorized: false }
  });

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\`;`);
  await connection.query(`USE \`${config.database}\`;`);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS songs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(150),
      artist VARCHAR(150),
      album VARCHAR(150),
      genre VARCHAR(100),
      year INT,
      duration_ms INT,
      popularity INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_song (title, artist)
    );
  `);

  await connection.end();
}

module.exports = initDatabase;