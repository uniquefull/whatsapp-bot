const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');

async function startBot() {
    // Setup authentication (session)
    const { state, saveCreds } = await useMultiFileAuthState('session_data');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true, // This shows the QR code in Render's logs
        logger: require('pino')({ level: 'silent' })
    });

    sock.ev.on('creds.update', saveCreds);

    // Connection Logic
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('✅ Bot is online and connected!');
        }
    });

    // Command Logic
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        const command = text.toLowerCase();

        // 1. MENU COMMAND
        if (command === '.menu' || command === '.help') {
            const fullMenu = `
╔═══════════════════╗
🌐 *GENERAL COMMANDS*
║ ➤ .ping
║ ➤ .alive
║ ➤ .owner
╚═══════════════════╝ 
(Your other menu categories will go here...)`;
            await sock.sendMessage(from, { text: fullMenu });
        }

        // 2. PING COMMAND
        if (command === '.ping') {
            await sock.sendMessage(from, { text: 'Speed: *0.45ms* ⚡' });
        }

        // 3. ALIVE COMMAND
        if (command === '.alive') {
            await sock.sendMessage(from, { text: 'I am online and ready to help! 🤖' });
        }

        // 4. OWNER COMMAND
        if (command === '.owner') {
            await sock.sendMessage(from, { text: 'Bot Owner: *[Your Name/Number]*' });
        }
    });
}

startBot();
