import { supabase } from '../../../supabaseConfig';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function randomCode() {
  let code = '#PLS-';
  // Use crypto for unpredictable IDs, 4 chars = 36^4 = ~1.6M combinations
  const len = 4;
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    for (let i = 0; i < len; i++) code += CHARS[arr[i] % CHARS.length];
  } else {
    for (let i = 0; i < len; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
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
