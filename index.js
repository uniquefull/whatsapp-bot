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
        printQRInTerminal: false, // QR code disable kar diya gaya hy
        browser: Browsers.macOS("Chrome") // Pairing code ke liye browser config zarori hy
    });

    // PAIRING CODE LOGIC
    if (!sock.authState.creds.registered) {
        const phoneNumber = "923XXXXXXXXX"; // Apna phone number yahan likhen (Country code ke sath, bina + ke)
        setTimeout(async () => {
            const code = await sock.requestPairingCode(phoneNumber);
            console.log(`\n✅ APKA PAIRING CODE YAHAN HY: ${code}\n`);
            console.log("Is code ko apne WhatsApp -> Linked Devices -> Link with phone number par ja ker enter karain.");
        }, 3000);
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('✅ Bot successfully link ho gaya hy!');
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

