import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

const accounts = [
  { email: 'karim.lounis@ensia.edu.dz', password: 'Ensia2026!', full_name: 'Karim Lounis',  role: 'lecturer' },
  { email: 'nour.zamiche@gmail.com',     password: 'Ensia2026!', full_name: 'Nour Zamiche',   role: 'admin'    },
];

for (const acc of accounts) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: acc.email,
    password: acc.password,
    email_confirm: true,
    user_metadata: { full_name: acc.full_name },
  });
  if (error) {
    console.log(`SKIP  ${acc.email}: ${error.message}`);
    continue;
  }
  console.log(`OK    ${acc.email}  id=${data.user.id}`);

  // Set role in teachers table
  const { error: roleErr } = await supabase
    .from('teachers')
    .update({ role: acc.role })
    .eq('id', data.user.id);
  if (roleErr) console.log(`      role update failed: ${roleErr.message}`);
  else         console.log(`      role → ${acc.role}`);
}

// Also ensure nour.zamiche@ensia.edu.dz is teacher (already exists — just confirm)
const { data: existing } = await supabase
  .from('teachers')
  .select('id, full_name, role')
  .limit(10);
console.log('\nAll teachers:', JSON.stringify(existing, null, 2));
