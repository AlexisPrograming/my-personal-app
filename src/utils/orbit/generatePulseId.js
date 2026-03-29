import { supabase } from '../../../supabaseConfig';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function randomCode() {
  let code = '#PLS-';
  for (let i = 0; i < 4; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

export async function generatePulseId() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('pulse_id', code)
      .maybeSingle();
    if (!data) return code;
  }
  throw new Error('Could not generate unique pulse_id after 5 attempts');
}

export async function ensurePulseId(userId) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('pulse_id')
    .eq('id', userId)
    .maybeSingle();
  if (profile?.pulse_id) return profile.pulse_id;
  const pulseId = await generatePulseId();
  await supabase.from('profiles').update({ pulse_id: pulseId }).eq('id', userId);
  return pulseId;
}
