import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(() =>
  new Response(JSON.stringify({ error: "This function is retired. Use /api/paymongo on Vercel." }), {
    status: 410,
    headers: { "Content-Type": "application/json" },
  })
);
