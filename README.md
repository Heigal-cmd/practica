# Bot de joda para WhatsApp (practica)

Bot ligero en Node.js + Baileys que **etiqueta personas al azar sin comandos**, en dos modos:

1. **Timer**: cada `X` minutos elige a `N` miembros al azar de cada grupo y les manda una frase graciosa con mención.
2. **Reacción**: cuando alguien escribe en el grupo, con poca probabilidad el bot responde citando el mensaje y etiquetando a una persona al azar.

Tú nunca escribes `@`: el bot arma el array `mentions` y el texto con los números automáticamente.

## Requisitos

- Node.js 20 o superior (en celular Android se usa Termux: `pkg install nodejs git`)
- Un **número secundario** de WhatsApp para conectar el bot (no uses tu número principal)
- No necesita FFmpeg ni librerías pesadas: solo envía texto.

## Instalación y ejecución

```bash
cd bot-joda-random
npm install
npm start        # equivalente a: node index.js
```

La primera vez aparece un código QR en la terminal. En WhatsApp del número secundario:
**Dispositivos conectados > Conectar dispositivo > escanear el QR**.
La sesión se guarda en la carpeta `auth_info` y no se vuelve a escanear en reinicios.

## Configuración rápida

Todo está al inicio de `index.js` en el objeto `CONFIG`:

| Ajuste | Para qué sirve |
|---|---|
| `intervaloMinutos` | Cada cuánto manda la mención aleatoria el timer |
| `etiquetadosPorVez` | Cuántas personas por mensaje del timer |
| `probabilidadReaccion` | Probabilidad (0 a 1) de responder cuando alguien escribe |
| `frases` | Lista de frases que el bot repite al azar |

Modo a modo: pon `modoTimer: false` o `modoReaccion: false` para apagar cualquiera.

## Cómo funciona la mención (la parte que hay que entender para practicar)

```js
await sock.sendMessage(grupo, {
  text: frase + ' ' + miembros.map(p => '@' + numeroDe(p.id)).join(' '),
  mentions: miembros.map(p => p.id),   // <-- aqui estan los @ por detras
});
```

- `mentions` es el array de JIDs que WhatsApp marca como mencionados.
- En el texto se inserta `@numero` para que la mención salga azul/azulada en el chat.
- El bot lo hace solo: el usuario humano no tipea nada.

## Repositorios de GitHub ligeros para copiar y estudiar

Ordenados de más pequeño/didáctico a algo más completo. Todos usan Baileys salvo que se indique.

### 1. vaibhavk10/Whatsapp-TagAll-Bot — el mejor punto de partida
- https://github.com/vaibhavk10/Whatsapp-TagAll-Bot
- Repo de ~67 KB, 4 dependencias, `index.js` (~3.5 KB) y `commands/tagall.js` (~1.6 KB).
- Comando `.tagall` (solo admins). El archivo `commands/tagall.js` tiene exactamente la lógica mínima: `groupMetadata()` → recorrer `participants` → `sendMessage` con `mentions`.
- Práctica sugerida: clónalo, borra la parte que exige el comando y reemplázala por el `setInterval` de este starter.

### 2. 0xtbug/whatsapp-tagall — versión mínima en TypeScript
- https://github.com/0xtbug/whatsapp-tagall
- Repo de unos pocos KB, en TypeScript, solo la funcionalidad de etiquetar. Poco popular (0 estrellas), útil para comparar estructura, no para producción.

### 3. CodeWithTayyab96/Optimus-Bot — siguiente nivel, todavía contenido
- https://github.com/CodeWithTayyab96/Optimus-Bot
- Bot de gestión de grupos en Baileys con tagall, advertencias, anti-enlaces, stickers. Repo de ~3.4 MB y mantenido recientemente.
- Bueno para ver cómo se organizan varios comandos en un solo proyecto.

### 4. WhiskeySockets/Baileys — la librería base (no es un bot)
- https://github.com/WhiskeySockets/Baileys
- Librería oficial de la API tipo WhatsApp Web que usan todos los bots de arriba (~11.7k estrellas).
- Repositorio con ejemplos y documentación en https://baileys.wiki/ — lee los ejemplos de `sendMessage` y `groupMetadata`.

### Qué evitar al principio (pesados o desactualizados)

- **250+ comandos tipo crimson-xmd-bot**: muchos plugins, dependencias de APIs, FFmpeg, bases de datos; sirven de referencia visual pero no para aprender los fundamentos.
- **guiireal/lite-bot** (https://github.com/guiireal/lite-bot): estructura simple pero archivado/abandonado; léelo como referencia, no lo ejecutes.
- **whatsapp-web.js** (https://github.com/pedroslopez/whatsapp-web.js): usa Puppeteer + Chrome; consume mucha más RAM que Baileys, mejor después.

## De bot con comando a bot random (los 2 cambios clave)

Los repos de arriba reaccionan a `.tagall`. Tu bot random quita el comando y cambia el disparador:

1. **Elimina** la condición que compara `userMessage === '.tagall'`.
2. **Cambia** el disparador por uno de estos:
   - `setInterval(...)` (timer): mira `jodaPorTimer` en `index.js`.
   - probabilidad en `messages.upsert`: mira `jodaPorReaccion`.

El resto (conexión QR, `groupMetadata`, `sendMessage` con `mentions`) queda igual.

## Advertencias importantes (léelo antes de usarlo)

- Baileys es una API **no oficial** de WhatsApp; usar bots automatizados puede violar los Términos de Servicio y la cuenta puede ser **suspendida o baneada**. Usa siempre un número secundario.
- Úsalo solo en grupos de amigos donde todos sepan que existe y estén de acuerdo. No lo uses para acosar, spamear, meter a gente que no quiere, ni en grupos grandes/frecuencia alta: eso se reporta fácilmente.
- El bot no es un comando oficial de WhatsApp; las menciones masivas repetidas disparan los filtros anti-spam.
- Este proyecto es para **aprender JavaScript, manejo de eventos y la API**, no para desplegarlo 24/7 con tu cuenta personal.