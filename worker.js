const ALLOWED_ORIGIN = null;

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8",
  };
}

function clean(value, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/rsvp") {
      const origin = request.headers.get("Origin");

      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders(origin) });
      }

      if (request.method !== "POST") {
        return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
          status: 405,
          headers: corsHeaders(origin),
        });
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), {
          status: 400,
          headers: corsHeaders(origin),
        });
      }

      const name = clean(body.name, 60);
      const attendance = body.attendance === "yes" ? "Да, будет 🤍"
        : body.attendance === "no" ? "К сожалению, не сможет"
        : "";
      const dish = clean(body.dish, 500) || "Не указано";
      const alcohol = clean(body.alcohol, 300) || "Не указано";

      if (!name || !attendance) {
        return new Response(JSON.stringify({ ok: false, error: "Missing required fields" }), {
          status: 400,
          headers: corsHeaders(origin),
        });
      }

      const text =
        `💍 <b>Новый ответ на свадьбу</b>\n\n` +
        `👤 <b>Имя:</b> ${escapeHtml(name)}\n` +
        `📅 <b>Присутствие:</b> ${escapeHtml(attendance)}\n` +
        `🍽️ <b>Блюдо:</b> ${escapeHtml(dish)}\n` +
        `🍷 <b>Алкоголь:</b> ${escapeHtml(alcohol)}`;

      const telegramResponse = await fetch(
        `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({
            chat_id: env.TELEGRAM_CHAT_ID,
            text,
            parse_mode: "HTML",
            disable_web_page_preview: true,
          }),
        }
      );

      if (!telegramResponse.ok) {
        return new Response(JSON.stringify({ ok: false, error: "Telegram error" }), {
          status: 502,
          headers: corsHeaders(origin),
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: corsHeaders(origin),
      });
    }

    return env.ASSETS.fetch(request);
  },
};
