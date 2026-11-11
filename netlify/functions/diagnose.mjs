const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export default async (request) => {
  // Comprobación sencilla para verificar que Netlify publicó la función.
  if (request.method === "GET") {
    return json({
      status: "ok",
      service: "Flor Naciente - diagnóstico visual",
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY)
    }, 200);
  }

  if (request.method !== "POST") {
    return json({ error: "Método no permitido." }, 405);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return json({ error: "La conexión con Gemini todavía no está configurada en Netlify. Agrega la variable GEMINI_API_KEY y vuelve a publicar el sitio." }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "No se pudo leer la solicitud. Vuelve a intentarlo." }, 400);
  }

  const { imageBase64, mimeType, crop = "No especificado", notes = "" } = body || {};
  if (typeof imageBase64 !== "string" || !imageBase64 || typeof mimeType !== "string" || !ALLOWED_MIME.has(mimeType)) {
    return json({ error: "Adjunta una fotografía JPG, PNG o WEBP para realizar el análisis visual." }, 400);
  }
  if (imageBase64.length > Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 100) {
    return json({ error: "La fotografía es demasiado grande. Intenta con una imagen más pequeña." }, 413);
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)) {
    return json({ error: "El archivo de imagen no tiene un formato válido." }, 400);
  }

  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const prompt = `Actúa como asistente de orientación fitosanitaria para agricultores de Perú, especialmente de la costa de Lima. Analiza visualmente la fotografía adjunta. No afirmes que identificaste una enfermedad o plaga si la imagen no permite distinguirla. Considera también causas no infecciosas (riego, nutrición, fitotoxicidad, clima o daño físico).

Datos aportados:
- Cultivo: ${String(crop).slice(0, 120)}
- Observaciones del agricultor: ${String(notes).slice(0, 1200) || "No indicó síntomas"}
- Ubicación de referencia: Végueta, Huaura, Lima, Perú (solo contexto, no prueba de diagnóstico).

Responde en español sencillo y con esta estructura:
1. QUÉ SE OBSERVA: describe únicamente señales visibles en la foto.
2. POSIBLES CAUSAS: hasta 3 hipótesis, ordenadas de más a menos compatibles. Para cada una explica qué coincide y qué falta confirmar. Si no hay evidencia suficiente, dilo claramente.
3. CONFIANZA: baja, media o alta y explica brevemente por qué. No inventes porcentajes.
4. QUÉ REVISAR EN CAMPO: 3 a 5 comprobaciones concretas para distinguir las hipótesis.
5. MEDIDAS PRUDENTES: acciones preventivas de bajo riesgo. No indiques marcas, dosis, mezclas ni aplicaciones de plaguicidas o fertilizantes.
6. CUÁNDO PEDIR AYUDA: indica cuándo consultar a un técnico, INIA o SENASA y qué fotos/datos llevar.

Reglas: una foto no basta para confirmar muchos diagnósticos. No inventes nombres de patógenos, plagas, productos ni datos técnicos. Si la imagen está borrosa, lejos, mal iluminada o no muestra síntomas, pide una nueva foto. Distingue entre observación e hipótesis. No des recomendaciones de control químico. La respuesta es orientación inicial, no diagnóstico definitivo.`;

  try {
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [
          { text: prompt },
          { inlineData: { mimeType, data: imageBase64 } }
        ] }],
        generationConfig: { maxOutputTokens: 1200 }
      })
    });

    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const message = result?.error?.message || "El servicio de análisis no pudo procesar la fotografía.";
      const status = upstream.status === 429 ? 429 : upstream.status === 400 ? 400 : 502;
      return json({ error: friendlyGoogleError(message, upstream.status) }, status);
    }

    const answer = (result?.candidates?.[0]?.content?.parts || [])
      .map(part => part.text || "")
      .join("\n")
      .trim();
    if (!answer) return json({ error: "La IA no devolvió un análisis. Prueba con una foto más clara y cercana." }, 502);
    return json({ analysis: answer, model, disclaimer: "Orientación preliminar generada por IA. Confirma la causa en campo antes de tomar decisiones." }, 200);
  } catch (error) {
    return json({ error: "No se pudo conectar con el servicio de análisis. Comprueba tu conexión e inténtalo de nuevo." }, 502);
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

function friendlyGoogleError(message, status) {
  if (status === 429) return "Se alcanzó el límite de solicitudes de Gemini. Espera un momento y vuelve a intentarlo.";
  if (/API_KEY_INVALID|invalid api key|API key not valid/i.test(message)) return "La clave API configurada en Netlify no es válida. Revísala en las variables de entorno.";
  if (/not found|not supported/i.test(message)) return "El modelo configurado no está disponible para esta clave. Revisa GEMINI_MODEL en Netlify.";
  return "Gemini no pudo analizar la imagen en este momento. Inténtalo otra vez con una foto más clara.";
}
