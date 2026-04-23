require("dotenv").config();
const { app } = require("@azure/functions");
const mysql = require("mysql2/promise");
const ExcelJS = require("exceljs");
const initDatabase = require("../../db/init");

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT) || 3306,
  ssl: { rejectUnauthorized: false }
};

app.http("importSongs", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    try {
      await initDatabase(dbConfig);
      const pool = mysql.createPool(dbConfig);

      // Parse multipart form data
      const formData = await request.formData();
      const file = formData.get("file");

      if (!file) {
        return { status: 400, body: JSON.stringify({ error: "No file provided" }) };
      }

      // Read Excel
      const buffer = Buffer.from(await file.arrayBuffer());
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.worksheets[0];
      let inserted = 0;
      let skipped = 0;

      // Skip header row (row 1), iterate from row 2
      for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
        const row = worksheet.getRow(rowIndex);

        const title      = row.getCell(1).value?.toString().trim();
        const artist     = row.getCell(2).value?.toString().trim();
        const album      = row.getCell(3).value?.toString().trim();
        const genre      = row.getCell(4).value?.toString().trim();
        const year       = parseInt(row.getCell(5).value);
        const durationMs = parseInt(row.getCell(6).value);
        const popularity = parseInt(row.getCell(7).value);

        if (!title || !artist) continue;

        try {
          await pool.query(
            `INSERT INTO songs (title, artist, album, genre, year, duration_ms, popularity)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [title, artist, album, genre, year, durationMs, popularity]
          );
          inserted++;
        } catch (err) {
          // Duplicate entry error code
          if (err.code === "ER_DUP_ENTRY") {
            skipped++;
          } else {
            throw err;
          }
        }
      }

      return {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inserted, skipped, message: "Import complete" })
      };

    } catch (error) {
      context.error("Import failed:", error);
      return { status: 500, body: JSON.stringify({ error: "Internal server error" }) };
    }
  }
});
