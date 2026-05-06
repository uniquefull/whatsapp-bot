const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: Browsers.macOS("Chrome")
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('✅ Bot successfully link ho gaya hy!');
        }

        if (!sock.authState.creds.registered && connection === 'connecting') {
            const phoneNumber = "923XXXXXXXXX"; // <-- Double check this number format
            setTimeout(async () => {
                let code = await sock.requestPairingCode(phoneNumber);
                console.log(`\n✅ APKA PAIRING CODE YAHAN HY: ${code}\n`);
            }, 5000);
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").toLowerCase();

        if (text === '.ping') await sock.sendMessage(from, { text: 'Pong! ⚡' });
        if (text === '.menu') await sock.sendMessage(from, { text: '*Main Menu*\n\n.ping\n.alive' });
    });
}

startBot();


