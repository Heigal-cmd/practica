 Bot de WhatsApp LIGERO para practicar: menciones aleatorias, SIN comandos.
// Uso didactico, solo en grupos de amigos con consentimiento.
// Libreria: @whiskeysockets/baileys (API no oficial de WhatsApp Web).

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const pino = require('pino');

// ============================================================
//  CONFIGURACION (ajusta estos valores a gusto)
// ============================================================
const CONFIG = {
  // Modo 1: cada X minutos el bot elige al azar a N personas y las etiqueta
  modoTimer: true,
  intervaloMinutos: 15,        // cada cuanto manda la joda (minutos)
  etiquetadosPorVez: 2,        // cuantas personas por mensaje

  // Modo 2: cuando alguien escribe, con poca probabilidad el bot responde
  // cotilleando y etiquetando a una persona al azar
  modoReaccion: true,
  probabilidadReaccion: 0.06,   // 6% de las veces que alguien escribe

  // Frases random que el bot manda (puedes agregar las tuyas)
  frases: [
    'Levanto la mano por aca, alguien se anima a hablar?',
    'Se siente la energia, pero nadie escribe. Que pasa?',
    'Oigan, no me dejen en silencio nomas.',
    'Una pregunta sin importancia: quien es el mas hablador del grupo?',
    'Buen dia/tarde/noche, gente. Suelten algo.',
    'Esto esta muy muerto, hay que revivir esto.',
    'Yo solo vengo a dejar mi huella digital.',
    'A ver, que cuente su ultimo chisme quien se atreva.',
  ],
};

// ============================================================
//  Helpers
// ============================================================
const numeroDeJid = (jid) => String(jid).split('@')[0].split(':')[0];

// Mezcla el array y devuelve los primeros n elementos al azar
function alAzar(lista, n) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia.slice(0, n);
}

const fraseRandom = () =>
  CONFIG.frases[Math.floor(Math.random() * CONFIG.frases.length)];

// Arma el texto con @numeros + el array de menciones que necesita WhatsApp
function construirMensaje(participantesElegidos, frase) {
  const mentions = participantesElegidos.map((p) => p.id);
  const texto =
    frase + ' ' + participantesElegidos.map((p) => '@' + numeroDeJid(p.id)).join(' ');
  return { text: texto, mentions };
}

// Quita al propio bot de la lista para no etiquetarse a si mismo
function participantesValidos(meta, sock) {
  const botNum = numeroDeJid(sock.user?.id || '');
  return (meta.participants || []).filter((p) => numeroDeJid(p.id) !== botNum);
}

// ============================================================
//  Logica de los dos modos
// ============================================================
async function jodaPorTimer(sock) {
  const grupos = await sock.groupFetchAllParticipating().catch(() => ({}));
  for (const [gid, meta] of Object.entries(grupos)) {
    try {
      const candidatos = participantesValidos(meta, sock);
      if (candidatos.length < 1) continue;
      const elegidos = alAzar(candidatos, CONFIG.etiquetadosPorVez);
      await sock.sendMessage(gid, construirMensaje(elegidos, fraseRandom()));
    } catch (e) {
      console.log('Timer:', e.message);
    }
  }
}

async function jodaPorReaccion(sock, msg) {
  const gid = msg.key.remoteJid;
  if (!gid.endsWith('@g.us')) return;

  const meta = await sock.groupMetadata(gid).catch(() => null);
  if (!meta) return;

  const candidatos = participantesValidos(meta, sock);
  if (candidatos.length < 1) return;

  const elegido = alAzar(candidatos, 1)[0];
  await sock.sendMessage(
    gid,
    construirMensaje([elegido], fraseRandom()),
    { quoted: msg }
  );
}

// ============================================================
//  Conexion a WhatsApp
// ============================================================
async function iniciar() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) qrcode.generate(qr, { small: true });

    if (connection === 'open') {
      console.log('Conectado a WhatsApp. El bot esta activo.');
      if (CONFIG.modoTimer) {
        setInterval(() => jodaPorTimer(sock), CONFIG.intervaloMinutos * 60 * 1000);
      }
    }

    if (connection === 'close') {
      const codigo = lastDisconnect?.error?.output?.statusCode;
      if (codigo !== DisconnectReason.loggedOut) {
        console.log('Conexion cerrada, reconectando...');
        iniciar();
      } else {
        console.log('Sesion cerrada (logged out). Borra la carpeta auth_info y vuelve a escanear.');
      }
    }
  });

  // Escucha los mensajes entrantes para el modo reaccion
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    const msg = messages[0];
    if (!msg || msg.key.fromMe) return;

    // Solo textos de grupos; ignora notas de voz, imagenes, estados, etc.
    const texto =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      '';
    if (!texto) return;

    if (CONFIG.modoReaccion && Math.random() < CONFIG.probabilidadReaccion) {
      await jodaPorReaccion(sock, msg);
    }
  });
}

iniciar();