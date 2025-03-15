import pg from "pg";

const pool = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DATABASE_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const connectDB = async () => {
  try {
    const connectionInstance = await pool.connect();
    console.log(
      `Connected to PostgreSQL database ${connectionInstance.database}`
    );
  } catch (err) {
    console.error("Database connection error:", err);
    process.exit(1);
    // If the database connection fails (e.g., wrong credentials, database server down), the app should not continue running because it might depend on the database.
  }
};

export default connectDB;
export { pool };
