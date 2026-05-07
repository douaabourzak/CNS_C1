import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://spccazagwlvrwdmpgmgt.supabase.co',
  'sb_secret_L59UnN-pjnB4qeqsqoUuCA_rBKG5JMt',
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
