const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

async function run() {
  if (!process.env.DB_URL) {
    console.error("DB_URL is missing.");
    process.exit(1);
  }

  const sql = postgres(process.env.DB_URL);
  try {
    const seedSql = fs.readFileSync(path.join(__dirname, 'supabase', 'demo_seed.sql'), 'utf8');
    
    console.log("Applying demo seed...");
    await sql.unsafe(seedSql);
    
    console.log("Demo seed applied successfully!");
    
    // Verify inserts
    const profileCount = await sql`SELECT count(*) FROM profiles`;
    const jobCount = await sql`SELECT count(*) FROM jobs`;
    const attestationCount = await sql`SELECT count(*) FROM customer_attestations`;
    
    console.log(`Verification:`);
    console.log(`- Profiles total: ${profileCount[0].count}`);
    console.log(`- Jobs total: ${jobCount[0].count}`);
    console.log(`- Attestations total: ${attestationCount[0].count}`);
    
  } catch (err) {
    console.error("Error applying seed:", err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}
run();
