const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kfjsmtbpaokiqxzhfelo.supabase.co';
const supabaseKey = 'sb_publishable_pQ6exFlg8QipuJv04KEY7g_-8vIu6pX';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('partidos').insert([
    {
      jornada: 2,
      equipo_local: 'TestLocal',
      equipo_vis: 'TestVis',
      fecha_inicio: '2026-08-15T10:00:00+00:00'
    }
  ]).select();
  console.log('Insert Error:', error);
  console.log('Inserted Data:', data);
  if (data) {
    await supabase.from('partidos').delete().eq('id', data[0].id);
  }
}
check();
