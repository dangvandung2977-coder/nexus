import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrate() {
  console.log('Running Database Migration...');
  
  // We use RPC if available or we can try to use the REST API to infer missing columns
  // Since we can't run arbitrary SQL easily without a custom function, we will check if columns exist
  // and if not, we'll try to use a dummy insert/update to see if it fails, 
  // but better is to just tell the user to run the SQL or use a library if available.
  
  // Actually, I can use the 'run_command' to run a node script that uses 'pg' if I knew the connection string.
  // But I don't have the DB password.
  
  // Wait! I can use 'supabase.rpc' if I define a function.
  // But I can't define a function without running SQL.
  
  // I will try to run 'npx supabase db push' if they have supabase CLI, but they probably don't have it configured.
  
  console.log('Proactively checking for missing columns in "listings" table...');
  const { data, error } = await supabase.from('listings').select('*').limit(1);
  
  if (error) {
    console.error('Error fetching listings:', error.message);
    process.exit(1);
  }

  const columns = Object.keys(data[0] || {});
  const required = ['youtube_url', 'license', 'is_open_source', 'dependencies'];
  const missing = required.filter(col => !columns.includes(col));

  if (missing.length === 0) {
    console.log('All required columns exist. No migration needed.');
  } else {
    console.log('Missing columns detected:', missing.join(', '));
    console.log('Please run the provided SQL in your Supabase dashboard to fix this.');
  }
}

migrate();
