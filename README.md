# Flor Naciente — diagnóstico visual con IA

Aplicación web agrícola con análisis visual preliminar de fotografías mediante Gemini y Netlify Functions.

## Qué se agregó
- Análisis visual de fotografías de hojas, tallos, frutos y zonas afectadas.
- Gemini presenta señales observadas, hasta tres posibles causas, nivel de confianza cualitativo, comprobaciones de campo y medidas prudentes.
- La imagen se reduce en el navegador antes de enviarse.
- La clave API se guarda como variable privada en Netlify; nunca se incluye en `app.js` ni en el navegador.
- El backend no almacena la imagen ni la respuesta; envía la imagen a Gemini para analizarla.

## Configurar la clave API en Netlify
1. Entra a tu sitio en Netlify.
2. Abre **Project configuration / Site configuration → Environment variables** (el nombre puede variar ligeramente).
3. Crea una variable:
   - **Key:** `GEMINI_API_KEY`
   - **Value:** pega tu clave API de Google AI Studio.
4. Guarda el cambio. No pongas la clave en `index.html`, `app.js`, `netlify.toml` ni en ningún archivo público.
5. Opcional: agrega `GEMINI_MODEL` si deseas cambiar el modelo. Por defecto se usa `gemini-3.8-flash`, que admite entrada de imágenes según la documentación de Gemini.

## Publicar correctamente (incluye la función del servidor)
**Importante:** esta versión ya no es solo una página estática. Necesita que Netlify publique también `netlify/functions/diagnose.mjs`. Subir únicamente los archivos arrastrando la carpeta a Deploys no suele publicar las funciones.

Tienes dos caminos:

### Opción A — conectar un repositorio Git
1. Sube el contenido de esta carpeta `flor_naciente_web` a un repositorio privado de GitHub.
2. En Netlify, conecta el sitio a ese repositorio.
3. En la configuración de build, deja el directorio de publicación como `.`. El archivo `netlify.toml` ya configura la carpeta de funciones.
4. Inicia un nuevo deploy después de guardar `GEMINI_API_KEY`.

### Opción B — publicar con Netlify CLI
Con Node.js instalado, abre una terminal dentro de esta carpeta y ejecuta:

```bash
npx netlify-cli login
npx netlify-cli link
npx netlify-cli deploy --prod
```

Al ejecutar `link`, selecciona el sitio existente de Flor Naciente. El archivo `netlify.toml` indica a Netlify dónde están los archivos y la función.

## Publicar desde Windows (si el sitio se creó con Netlify Drop)
Netlify Drop publica archivos estáticos, pero no basta para desplegar esta función de servidor. Para conservar el mismo sitio y publicar también la función, usa Netlify CLI:

1. Instala Node.js LTS desde https://nodejs.org/ y reinicia la terminal.
2. Descomprime este ZIP. Abre la carpeta `flor_naciente_web`.
3. En el Explorador de archivos, haz clic en la barra de dirección, escribe `powershell` y pulsa Enter.
4. En PowerShell ejecuta, una por una:

```powershell
npx netlify-cli login
npx netlify-cli link
npx netlify-cli deploy --prod
```

5. En `netlify-cli link`, elige **Use existing site** y selecciona el sitio de Flor Naciente (`harmonious-brigadeiros-00fe9a`).
6. Espera a que termine el despliegue. No compartas tokens ni claves que aparezcan en la terminal.

El archivo `netlify.toml` ya indica que la carpeta publicada es `.` y que las funciones están en `netlify/functions`.

## Comprobar que la función está publicada
Abre esta dirección en el navegador, sustituyendo el dominio por el de tu sitio:

`https://harmonious-brigadeiros-00fe9a.netlify.app/.netlify/functions/diagnose`

Debe mostrar un pequeño JSON con `"status":"ok"` y `"geminiConfigured":true`. Esta comprobación no revela la clave. Si devuelve 404, la función todavía no se publicó.

## Probar el diagnóstico visual
1. Abre el sitio publicado mediante HTTPS.
2. Entra en **Diagnóstico**.
3. Sube una foto clara y cercana, indica el cultivo y describe lo que observas.
4. Pulsa **Analizar fotografía con IA**.

Si aparece un error, revisa que `GEMINI_API_KEY` esté guardada en las variables de entorno de ese sitio y que el último deploy incluya la función.

## Límites y uso responsable
- El análisis es una orientación inicial, no una confirmación científica ni un diagnóstico de laboratorio.
- La IA puede equivocarse, especialmente con fotos borrosas, síntomas parecidos o cultivos poco representados.
- No recomienda marcas, dosis ni aplicaciones químicas. Confirma las causas y medidas con un técnico o fuentes oficiales como INIA y SENASA.
- El servicio de Gemini puede tener límites de uso, disponibilidad y condiciones de facturación según la cuenta y el modelo. Revisa tu panel de Google AI Studio.
- Las fotos se envían a Google Gemini para el análisis; no se guardan en una base de datos de Flor Naciente en esta versión.

## Ejecutar la página localmente
Para probar también la función del servidor, usa Netlify CLI desde esta carpeta:

```bash
npx netlify-cli dev
```

La variable `GEMINI_API_KEY` debe estar disponible en el entorno local o configurada en Netlify para desarrollo.
