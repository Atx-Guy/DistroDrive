#!/usr/bin/env tsx
/**
 * Test script to verify Neon database connection
 * 
 * Usage:
 *   DATABASE_URL="postgresql://..." tsx scripts/test-db-connection.ts
 */

import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

async function testConnection() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("❌ DATABASE_URL environment variable is not set");
    console.error("\nPlease set it using:");
    console.error('  export DATABASE_URL="postgresql://neondb_owner:npg_umRb9oMK2FYH@ep-solitary-mouse-afo1uhwe.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require"');
    process.exit(1);
  }

  console.log("🔍 Testing Neon database connection...\n");

  try {
    // Parse connection string
    const dbUrl = new URL(databaseUrl);
    const password = decodeURIComponent(dbUrl.password);

    const connectionConfig: pg.PoolConfig = {
      host: dbUrl.hostname,
      port: parseInt(dbUrl.port || "5432", 10),
      database: dbUrl.pathname.slice(1),
      user: dbUrl.username,
      password: password,
      ssl: {
        rejectUnauthorized: false,
      },
    };

    console.log("📋 Connection details:");
    console.log(`   Host: ${connectionConfig.host}`);
    console.log(`   Port: ${connectionConfig.port}`);
    console.log(`   Database: ${connectionConfig.database}`);
    console.log(`   User: ${connectionConfig.user}`);
    console.log(`   SSL: Enabled\n`);

    // Create pool and test connection
    const pool = new Pool(connectionConfig);
    
    console.log("🔌 Attempting to connect...");
    const client = await pool.connect();
    
    console.log("✅ Successfully connected to Neon database!\n");

    // Test a simple query
    console.log("🧪 Running test query...");
    const result = await client.query("SELECT version(), current_database(), current_user");
    
    console.log("✅ Query executed successfully!\n");
    console.log("📊 Database information:");
    console.log(`   PostgreSQL Version: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);
    console.log(`   Current Database: ${result.rows[0].current_database}`);
    console.log(`   Current User: ${result.rows[0].current_user}\n`);

    // Check if tables exist
    console.log("📋 Checking for tables...");
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    if (tablesResult.rows.length > 0) {
      console.log(`✅ Found ${tablesResult.rows.length} table(s):`);
      tablesResult.rows.forEach((row) => {
        console.log(`   - ${row.table_name}`);
      });
    } else {
      console.log("⚠️  No tables found in the database");
    }

    client.release();
    await pool.end();

    console.log("\n✅ Database connection test completed successfully!");
    console.log("🎉 Your Neon database is properly configured and ready to use!");

  } catch (error: any) {
    console.error("\n❌ Database connection failed!");
    console.error(`\nError: ${error.message}`);
    
    if (error.code) {
      console.error(`Error code: ${error.code}`);
    }

    if (error.message.includes("password authentication failed")) {
      console.error("\n💡 Tip: Check that your password is correct in the DATABASE_URL");
    } else if (error.message.includes("getaddrinfo ENOTFOUND")) {
      console.error("\n💡 Tip: Check that the hostname is correct");
    } else if (error.message.includes("timeout")) {
      console.error("\n💡 Tip: Check your network connection and firewall settings");
    }

    process.exit(1);
  }
}

testConnection();

