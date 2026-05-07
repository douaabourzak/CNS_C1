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

// List all auth users so we can find emails
const { data: usersData } = await supabase.auth.admin.listUsers({ perPage: 50 });
const users = usersData?.users ?? [];

for (const u of users) {
  const email = u.email;
  let wantedRole = null;

  if (email === 'nour.zamiche@gmail.com')    wantedRole = 'admin';
  if (email === 'nour.zamiche@ensia.edu.dz') wantedRole = 'teacher';
  if (email === 'karim.lounis@ensia.edu.dz') wantedRole = 'lecturer';

  const { data: t } = await supabase.from('teachers').select('role').eq('id', u.id).maybeSingle();
  const currentRole = t?.role ?? '(no row)';

  if (wantedRole && currentRole !== wantedRole) {
    await supabase.from('teachers').upsert({ id: u.id, full_name: u.user_metadata?.full_name ?? email.split('@')[0], role: wantedRole });
    console.log(`FIXED  ${email}: ${currentRole} → ${wantedRole}`);
  } else {
    console.log(`OK     ${email}: ${currentRole}${wantedRole ? '' : ' (not a target)'}`);
  }
}
