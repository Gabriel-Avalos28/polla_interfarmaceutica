const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kfjsmtbpaokiqxzhfelo.supabase.co';
const supabaseKey = 'sb_publishable_pQ6exFlg8QipuJv04KEY7g_-8vIu6pX';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('partidos').select('*');
  console.log('Error:', error);
  console.log('Data (first 2):', data ? data.slice(0, 2) : null);
}
check();
