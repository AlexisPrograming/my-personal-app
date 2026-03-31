// Supabase Edge Function: scan-food
// Securely calls Anthropic Claude Vision to identify food from an image.
// Deploy: supabase functions deploy scan-food
// Secrets: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//          supabase secrets set ALLOWED_ORIGIN=https://your-app.vercel.app

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Restrict CORS to the configured origin (falls back to * only if unset)
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '*';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// In-memory rate limiter: 20 scans per user per hour
const _scanWindows = new Map<string, number[]>();
const RATE_LIMIT   = 20;
const RATE_WINDOW  = 60 * 60 * 1000; // 1 hour

function checkRateLimit(userId: string): boolean {
  const now  = Date.now();
  const prev = (_scanWindows.get(userId) ?? []).filter(t => now - t < RATE_WINDOW);
  if (prev.length >= RATE_LIMIT) return false;
  prev.push(now);
  _scanWindows.set(userId, prev);
  return true;
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
    return new Response(JSON.stringify({ error: 'Error leyendo la solicitud.' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (rawBody.length > 6 * 1024 * 1024) {
    return new Response(JSON.stringify({ error: 'Imagen demasiado grande. Máximo 5 MB.' }), {
      status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')      ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Rate limit ────────────────────────────────────────────────────────────
    if (!checkRateLimit(user.id)) {
      return new Response(JSON.stringify({ error: 'Límite alcanzado. Máximo 20 escaneos por hora.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Validate body ─────────────────────────────────────────────────────────
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: 'JSON inválido.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { imageBase64, mediaType = 'image/jpeg' } = body as { imageBase64?: unknown; mediaType?: unknown };

    if (!imageBase64 || typeof imageBase64 !== 'string' || imageBase64.length < 100) {
      return new Response(JSON.stringify({ error: 'imageBase64 requerido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // M-3: enforce upper bound on base64 payload
    if (imageBase64.length > MAX_BASE64_LENGTH) {
      return new Response(JSON.stringify({ error: 'Imagen demasiado grande. Máximo 4 MB.' }), {
        status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
    type ValidMediaType = typeof validTypes[number];
    if (!validTypes.includes(mediaType as ValidMediaType)) {
      return new Response(JSON.stringify({ error: 'Tipo de imagen no válido' }), {
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
              text: `Analiza esta imagen de comida. Tu tarea es SEGMENTAR todos los componentes/ingredientes visibles individualmente.

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
7. Máximo 10 ingredientes por imagen`,
            },
          ],
        }],
      }),
    });

    if (!claudeRes.ok) {
      const errBody = await claudeRes.text();
      console.error('[scan-food] Anthropic API error', claudeRes.status, errBody);
      let userError = 'Error al contactar el servicio de IA.';
      try {
        const errJson = JSON.parse(errBody);
        const msg = errJson?.error?.message ?? '';
        if (msg.toLowerCase().includes('credit') || msg.toLowerCase().includes('balance')) {
          userError = 'El servicio de escaneo no está disponible temporalmente. Intenta más tarde.';
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

    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ error: 'No pude identificar el alimento. Intenta con otra foto más clara.' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Respuesta inválida. Intenta de nuevo.' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Sanitize & return ─────────────────────────────────────────────────────
    const rawFoods = Array.isArray(parsed.foods) ? parsed.foods : [];
    if (rawFoods.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No pude identificar el alimento. Intenta con otra foto más clara.' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const validContainers = ['cup', 'bowl', 'plate', 'glass', 'bottle', 'can'];
    const sanitizeFood = (item: Record<string, unknown>) => {
      const p = (item.per100g as Record<string, unknown>) ?? {};
      const rawContainer = String(item.container ?? '').toLowerCase();
      return {
        name:       String(item.name ?? 'Alimento desconocido').slice(0, 100),
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
    return new Response(JSON.stringify({ error: 'Error interno del servidor.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
