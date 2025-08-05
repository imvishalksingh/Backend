require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // required for Render
  },
});
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });


module.exports = pool;

// const { Pool } = require('pg');
// const dns = require('dns');
// require('dotenv').config();

// (async () => {
//   const host = 'db.lltlqduyngqtvflcbjsi.supabase.co'; // Your Supabase DB host
//   const addresses = await dns.promises.resolve4(host); // Only IPv4

//   const pool = new Pool({
//     host: addresses[0],
//     port: 5432,
//     user: 'postgres',
//     password: process.env.DB_PASSWORD, // or extract from DATABASE_URL
//     database: 'postgres',
//     ssl: { rejectUnauthorized: false }
//   });

//   module.exports = pool;
// })();

