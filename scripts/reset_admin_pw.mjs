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

const { data: usersData } = await supabase.auth.admin.listUsers({ perPage: 50 });
const user = usersData?.users?.find(u => u.email === 'nour.zamiche@gmail.com');

if (!user) { console.log('User not found'); process.exit(1); }

const { error } = await supabase.auth.admin.updateUserById(user.id, {
  password: 'Ensia2026!',
});

if (error) console.log('Error:', error.message);
else console.log('Password reset to Ensia2026! for', user.email);
