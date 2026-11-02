# Traducción de «Mi reforma» con la IA de Claude

Los textos de la obra (presupuesto, plan de pagos, extras, avances, pagos, desperfectos, selecciones y
planos) se escriben en español y se muestran traducidos al idioma de cada cliente, con el aviso de que el
original en español es el que vale y el botón «Ver original».

Mientras la IA de Claude no esté configurada, traduce Google. Para pasar a Claude (mejor con el vocabulario
de obra):

1. **Cuenta en Anthropic.** Entre en https://console.anthropic.com con el correo de la empresa.
   En **Billing** añada saldo (por ejemplo 20 $) y, si quiere, un aviso o límite de gasto mensual.
   Coste orientativo: unos céntimos por presupuesto y por idioma; solo se traduce lo nuevo.
2. **Crear la clave.** En **API keys → Create key**, nombre «CJ Club». Cópiela (solo se ve una vez).
   No la pegue en el chat ni en el código.
3. **Guardarla en Google Cloud (Secret Manager)**, igual que la del correo:
   - Abra https://console.cloud.google.com/security/secret-manager?project=cj-club
   - **Crear secreto** → Nombre: `ANTHROPIC_API_KEY` (exactamente así) → Valor: pegue la clave → Crear.
4. **Avisar a Claude** (el asistente que programa la app): pondrá `REFORM_TRANSLATOR=claude` en
   `functions/.env` y publicará. Hágalo **solo después** del paso 3: si el secreto no existe, la
   publicación de las funciones falla.

Al cambiar de Google a Claude, cada reforma se vuelve a traducir entera con Claude la próxima vez que el
cliente la abra.

## Detalles técnicos
- Función `translateReform` (`functions/src/projectTranslate.ts`): la llaman las partes del contrato al abrir
  una reforma en un idioma distinto del español. Comprueba que quien llama es el cliente de esa casa, el
  profesional del contrato o CJ. Tope: 300 peticiones por persona y día.
- Resultado en `projects/{id}/translations/{idioma}` (lectura: solo las partes del contrato; escritura: solo
  el servidor). Si cambia un texto, se traduce el nuevo; lo borrado se quita.
- Modelo `claude-opus-5-5` con esfuerzo bajo, respuesta en JSON y el modelo alternativo de Anthropic si el
  principal rechazara un texto.
- En el Firebase de pruebas local, con `REFORM_TRANSLATOR=claude` en `functions/.env.local` y
  `ANTHROPIC_API_KEY=test` en `functions/.secret.local`, la traducción se simula con «[sv·IA] texto».
