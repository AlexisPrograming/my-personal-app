// Supabase Edge Function: scan-food
// Securely calls Anthropic Claude Vision to identify food from an image.
// Deploy: supabase functions deploy scan-food
// Secrets: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//          supabase secrets set ALLOWED_ORIGIN=https://your-app.vercel.app

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Restrict CORS to the configured origin — no wildcard fallback
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Persistent rate limiter using DB (survives edge function restarts)
const RATE_LIMIT  = 20;
const RATE_WINDOW = 3600; // 1 hour in seconds

async function checkRateLimit(userId: string, serviceClient: ReturnType<typeof createClient>): Promise<boolean> {
  const { data, error } = await serviceClient.rpc('check_rate_limit', {
    p_user_id: userId,
    p_action: 'scan-food',
    p_max_calls: RATE_LIMIT,
    p_window_seconds: RATE_WINDOW,
  });
  if (error) {
    console.error('[scan-food] rate limit check failed:', error.message);
    // Fail open — allow the request if rate limit check itself fails
    return true;
  }
  return data === true;
}

function clamp(value: unknown, min: number, max: number): number {
  const n = Number(value);
  if (!isFinite(n) || n < min) return 0;
  return Math.min(Math.round(n * 10) / 10, max);
}

// Max base64 size: ~4 MB of raw data → ~5.5 MB base64 string
const MAX_BASE64_LENGTH = 5.5 * 1024 * 1024;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Body size guard: read raw body first to enforce limit regardless of headers
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return new Response(JSON.stringify({ error: 'Error reading request.' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (rawBody.length > 6 * 1024 * 1024) {
    return new Response(JSON.stringify({ error: 'Image too large. Maximum 5 MB.' }), {
      status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')      ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    // Service-role client for rate limiting (bypasses RLS on rate_limits table)
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')              ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')  ?? '',
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Rate limit (persistent, DB-backed) ───────────────────────────────────
    if (!await checkRateLimit(user.id, serviceClient)) {
      return new Response(JSON.stringify({ error: 'Rate limit reached. Maximum 20 scans per hour.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Validate body ─────────────────────────────────────────────────────────
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { imageBase64, mediaType = 'image/jpeg', lang = 'en' } = body as { imageBase64?: unknown; mediaType?: unknown; lang?: unknown };
    const isEs = String(lang) === 'es';

    if (!imageBase64 || typeof imageBase64 !== 'string' || imageBase64.length < 100) {
      return new Response(JSON.stringify({ error: isEs ? 'imageBase64 requerido' : 'imageBase64 required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // M-3: enforce upper bound on base64 payload
    if (imageBase64.length > MAX_BASE64_LENGTH) {
      return new Response(JSON.stringify({ error: isEs ? 'Imagen demasiado grande. Máximo 4 MB.' : 'Image too large. Maximum 4 MB.' }), {
        status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
    type ValidMediaType = typeof validTypes[number];
    if (!validTypes.includes(mediaType as ValidMediaType)) {
      return new Response(JSON.stringify({ error: isEs ? 'Tipo de imagen no válido' : 'Invalid image type' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Call Claude Vision ────────────────────────────────────────────────────
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      console.error('[scan-food] ANTHROPIC_API_KEY not set');
      return new Response(JSON.stringify({ error: 'Error de configuración del servidor.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const promptEs = `Analiza esta imagen de comida. Tu tarea es SEGMENTAR todos los componentes/ingredientes visibles individualmente.

Responde ÚNICAMENTE con un objeto JSON sin markdown ni explicación. Estructura:
{
  "foods": [
    {
      "name": "nombre del ingrediente/componente en español",
      "confidence": "high|medium|low",
      "per100g": {
        "calories": número,
        "protein": número,
        "carbs": número,
        "fat": número,
        "fiber": número
      },
      "note": "nota breve, máx 10 palabras",
      "container": "cup|bowl|plate|glass|bottle|can|null"
    }
  ]
}

REGLAS IMPORTANTES:
1. SEGMENTA cada ingrediente por separado (ej: café + leche + hielo, NO "café con leche")
2. Detecta el tipo de contenedor si es visible (taza, vaso, plato, bowl, etc.)
3. Si ves salsas, aderezos o extras, inclúyelos como ingredientes separados
4. Hielo tiene 0 calorías pero inclúyelo para que el usuario vea el volumen
5. Usa valores nutricionales promedio realistas por cada 100g
6. Si no puedes identificar algo con certeza, pon confidence "low"
7. Máximo 10 ingredientes por imagen
8. Todos los nombres DEBEN estar en español`;

    const promptEn = `Analyze this food image. Your task is to SEGMENT all visible components/ingredients individually.

Respond ONLY with a JSON object, no markdown or explanation. Structure:
{
  "foods": [
    {
      "name": "ingredient/component name in English",
      "confidence": "high|medium|low",
      "per100g": {
        "calories": number,
        "protein": number,
        "carbs": number,
        "fat": number,
        "fiber": number
      },
      "note": "brief note, max 10 words",
      "container": "cup|bowl|plate|glass|bottle|can|null"
    }
  ]
}

IMPORTANT RULES:
1. SEGMENT each ingredient separately (e.g.: coffee + milk + ice, NOT "coffee with milk")
2. Detect the container type if visible (cup, glass, plate, bowl, etc.)
3. If you see sauces, dressings, or extras, include them as separate ingredients
4. Ice has 0 calories but include it so the user can see volume
5. Use realistic average nutritional values per 100g
6. If you cannot identify something with certainty, set confidence to "low"
7. Maximum 10 ingredients per image
8. All names MUST be in English`;

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType as ValidMediaType, data: imageBase64 },
            },
            {
              type: 'text',
              text: isEs ? promptEs : promptEn,
            },
          ],
        }],
      }),
    });

    if (!claudeRes.ok) {
      const errBody = await claudeRes.text();
      console.error('[scan-food] Anthropic API error', claudeRes.status, errBody);
      let userError = isEs ? 'Error al contactar el servicio de IA.' : 'Error contacting AI service.';
      try {
        const errJson = JSON.parse(errBody);
        const msg = errJson?.error?.message ?? '';
        if (msg.toLowerCase().includes('credit') || msg.toLowerCase().includes('balance')) {
          userError = isEs ? 'El servicio de escaneo no está disponible temporalmente. Intenta más tarde.' : 'Scanning service temporarily unavailable. Try again later.';
        }
      } catch { /* ignore */ }
      return new Response(JSON.stringify({ error: userError }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const claudeData = await claudeRes.json();

    // ── Parse response ────────────────────────────────────────────────────────
    const rawText = claudeData.content?.[0]?.type === 'text' ? claudeData.content[0].text.trim() : '';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);

    const errNoFood = isEs
      ? 'No pude identificar el alimento. Intenta con otra foto más clara.'
      : 'Could not identify the food. Try a clearer photo.';

    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ error: errNoFood }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return new Response(
        JSON.stringify({ error: isEs ? 'Respuesta inválida. Intenta de nuevo.' : 'Invalid response. Try again.' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Sanitize & return ─────────────────────────────────────────────────────
    const rawFoods = Array.isArray(parsed.foods) ? parsed.foods : [];
    if (rawFoods.length === 0) {
      return new Response(
        JSON.stringify({ error: errNoFood }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const validContainers = ['cup', 'bowl', 'plate', 'glass', 'bottle', 'can'];
    const sanitizeFood = (item: Record<string, unknown>) => {
      const p = (item.per100g as Record<string, unknown>) ?? {};
      const rawContainer = String(item.container ?? '').toLowerCase();
      return {
        name:       String(item.name ?? (isEs ? 'Alimento desconocido' : 'Unknown food')).slice(0, 100),
        confidence: ['high', 'medium', 'low'].includes(String(item.confidence))
          ? String(item.confidence)
          : 'low',
        per100g: {
          calories: clamp(p.calories, 0, 900),
          protein:  clamp(p.protein,  0, 100),
          carbs:    clamp(p.carbs,    0, 100),
          fat:      clamp(p.fat,      0, 100),
          fiber:    clamp(p.fiber,    0, 100),
        },
        note: String(item.note ?? '').slice(0, 120),
        container: validContainers.includes(rawContainer) ? rawContainer : null,
      };
    };

    const result = { foods: rawFoods.slice(0, 10).map(f => sanitizeFood(f as Record<string, unknown>)) };

    return new Response(JSON.stringify(result), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[scan-food]', err);
    return new Response(JSON.stringify({ error: 'Internal server error.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
