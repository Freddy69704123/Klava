const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const gtts = require('gtts');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const sqlite3 = require('sqlite3').verbose();
const xdDb = new sqlite3.Database('contador_xd.db');
const qrcode = require('qrcode-terminal');
let xdCount = 0;
let messageCounter = 0;
const SESSION_FILE_PATH = './session.json';
const DATA_DIR_PATH = './data';
const messagesDb = new sqlite3.Database('mensajes.db');
const db = new sqlite3.Database('./mensajes.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        return console.error(err.message);
    }
    console.log('Conectado a la base de datos de los mensajes.');
});
// Función para obtener un mensaje al estilo simsimi
function getRandomMessageFromDatabase() {
    return new Promise((resolve, reject) => {
        db.get('SELECT content FROM messages ORDER BY RANDOM() LIMIT 1', (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}
getRandomMessageFromDatabase()
    .then((row) => {
        console.log('Mensaje aleatorio:', row.content);
    })
    .catch((err) => {
        console.error('Error al obtener mensaje:', err.message);
    });
messagesDb.run(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY,
    content TEXT
  )
`);
if (!fs.existsSync(DATA_DIR_PATH)) {
    fs.mkdirSync(DATA_DIR_PATH);
}
let sessionData;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionData = require(SESSION_FILE_PATH);
}
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: DATA_DIR_PATH,
        session: sessionData
    })
});
client.on('authenticated', (session) => {
    sessionData = session;
    if (sessionData) {
        fs.writeFile(SESSION_FILE_PATH, JSON.stringify(sessionData), (err) => {
            if (err) {
                console.error('Error al guardar la sesión:', err);
            } else {
                console.log('Sesión guardada correctamente.');
            }
        });
    }
});
client.on('ready', () => {
    console.log('Bot listo y conectado.');
});
client.on('qr', qr => {
    if (!sessionData) {
        console.log('Escanea este código QR con tu teléfono:');
        qrcode.generate(qr, { small: true });
    }
});
function readXDCount() {
    return new Promise((resolve, reject) => {
        xdDb.get('SELECT count FROM contador_xd WHERE id = 1', (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row ? row.count : 0);
            }
        });
    });
}
function saveXDCount(count) {
    xdDb.run('INSERT OR REPLACE INTO contador_xd (id, count) VALUES (1, ?)', count, (err) => {
        if (err) {
            console.error('Error al guardar el contador:', err);
        }
    });
}
const regex = /^que$/i;
const helpCommand = '!help';
async function sendHelpMessage(message) {
    const helpMessage = `Hola! mi nombre es Klava Malkova, si quieres interactuar conmigo puedes hacer uso de los siguientes comandos en esta\n` +
        `Lista de comandos:\n\n` +
        `     *ping* - _Responde con "pong"._\n` +
        `       *xd* - _Incrementa el contador de "XD" y muestra el número actual de XD._\n` +
        `       *:v* - _Responde con "#HailGrasa :v"._\n` +
        `     *rules - _Recuerda las reglas del grupo cada determinado numero de mensajes (tambien se activa con la palabra "rules")._\n` +
        `    *!help* - _Muestra esta lista de comandos.\n` +
        `      *khe* - _Responde "so" a mensajes que contengan "khe", "qe", "ke" o "que"._\n` +
        `        *f* - _Responde "F" a mensajes que contengan solo la letra "F" de forma individual._\n` +
        `        *a* - _Responde "rroz .¿" a mensajes que contengan solo la letra "a" de forma individual._\n` +
        `     *ruso* - Responde "Malditos rusos, arruinaron Rusia. ( Ò﹏Ó)" a mensajes que contengan "ruso", "rusia", "rusos" o "rusa"._\n` +
        `   *antojo* - _Responde "No antojen ( Ò﹏Ó)" a mensajes que contengan "antoja", "uff", "antojo" o "antoje"._\n` +
        `    *mames* - _Responde "Si mamo, y muy rico. ¿Quieres ver? (─‿‿─)♡" a mensajes que contengan "mames"._\n` +
        `    *calor* - _Responde un mensaje personalizado con el nombre del remitente a mensajes que contengan "calor"._\n` +
        `     *jaja* - _Responde "De qué te ríes? No es tan gracioso" a mensajes que contengan "jaja" o similares._\n` +
        `    *a ver* - _Responde "A ver al cine pvto (￣ヘ￣)" a mensajes que contengan "aver"._\n` +
        `    *klava* - _Responde como simsimi a mensajes que contengan "Klava"._\n` +
        `     *mala* - _Responde "Mala tu cola, no mames. (>ᴗ•)" a mensajes que contengan "mala"._\n` +
        `    *joder* - _Responde "A joder se va tu señora cola ( \` ω ´ )" a mensajes que contengan "joder"._\n` +
        `    *verga* - _Responde "Comes, jajajajajaja (⁄ ⁄>⁄ ▽ ⁄<⁄ ⁄)" a mensajes que contengan "verga", "vrga" o "vergas"._\n` +
        `  *megumin* - _Responde "Uff, se imaginan comerse unas papas fritas en los muslos de Megumin? (*˘︶˘*)" a mensajes que contengan "megumin"._\n` +
        `    *adios* - _Responde "Hasta luego, la memoria de tu presencia no será volátil." a mensajes que contengan "adios"._\n` +
        `  *papitas* - _Responde con "patatas" a mensajes que contengan "papitas"._\n` +
        `  *gracias* - _Responde con "provecho" a mensajes que contengan "gracias"._\n` +
        ` *!sticker* - _comando para hacer stickers, solo manda la imagen que deseas volver sticker con el comando "!sticker"._\n` +
        `   *!8ball* - _comando basado en el juguete 8ball, responde con varias respuestas tipicas del juguete._\n` +
        `*@everyone* - _comando para mencionar a todos, Menciona a todos los miembros del grupo(Solo disponible para administradores)._\n` +
        `  *!report* - _comando para reportar, usa este mensaje para reportar un mensaje que inflinja las reglas del grupo(Usarlo sin motivo implica una advertencia de ban)._\n` +
        `  *si o no* - _comando para tomar desiciones, te respondera si o no de forma aleatoria a la pregunta que le hagas._\n` +
        `*aleatorio* - _comando para generar un numero aleatorio, manda un numero aleatorio entre el 1 y el 10 si quieres preguntarle que puntuacion da, o algo por el estilo._\n` +
        `    *!fuck* - _comando para cogerte a un miembro del grupo, solo escribe "!fuck" y a un lado etiqueta a la persona que quieres cogerte._\n` +
        `     *!cum* - _comando para cumear a un miembro del grupo, solo escribe "!cum " seguido etiqueta a la persona que quieres cumear._\n` +
        `    *!kill* - _comando para matar a un miembro del grupo, solo escribe "!kill " seguido etiqueta a la persona que quieres matar._\n` +
        `    *!rape* - _comando para violar a un miembro del grupo, solo escribe "!rape " seguido etiqueta a la persona que quieres violar._\n` +
        `    *!kiss* - _comando para besar a un miembro del grupo, solo escribe "!kiss " seguido etiqueta a la persona que quieres besar._\n` +
        ` *!ignorar* - _comando para ignorar a un miembro del grupo xd, solo escribe "!ignorar " seguido etiqueta a la persona que quieres ignorar._\n` +
        `     *!hug* - _comando para abrazar a un miembro del grupo, solo escribe "!hug " seguido etiqueta a la persona que quieres abrazar._\n` +
        `    *!kiss* - _comando para golpear a un miembro del grupo, solo escribe "!punch " seguido etiqueta a la persona que quieres golpear._\n` +
        `*!ofrecerme a* - _comando para ofrecerte a un miembro del grupo, solo escribe "!ofrecerme a" seguido etiqueta a la persona que te estas ofreciendo._\n` +
        `      *!di* - _Seguido de el comando "!di" escribes lo que quieres que diga Klava._\n` +
        `     *hola* - _Envía un saludo diciendo "¡Hola! (sin ofender) a mensajes que inicien con "hola"._`;

    await client.sendMessage(message.from, helpMessage);
}
const eightBallResponses = [
    'Es cierto.',
    'Es decididamente así.',
    'Sin lugar a dudas.',
    'Sí, definitivamente.',
    'Puedes confiar en ello.',
    'Como yo lo veo, sí.',
    'Lo más probable.',
    'Perspectiva buena.',
    'Ayudame.',
    'Tengo miedo.',
    'Ayudame por favor.',
    'Duele...',
    'Sí.',
    'Las señales apuntan a que sí.',
    'Respuesta confusa, vuelve a intentarlo.',
    'Vuelve a preguntar más tarde.',
    'Mejor no decirte ahora.',
    'No se puede predecir ahora.',
    'Concéntrate y vuelve a preguntar.',
    'No cuentes con ello.',
    'Mi respuesta es no.',
    'Mis fuentes dicen que no.',
    'Las perspectivas no son muy buenas.',
    'Muy dudoso.'
];
const forbiddenKeywords = ["cp", "cod", "caldo de pollo", "nazi", "hitler", "matate", "suicidate", "chat.whatsapp", "discord.gg", "https://", "http://"];//para la base de datos.
const palabrasProhibidas = ["homosexual", "cod points", "caldo de pollo", "hitler", "cp", "cepesito", "nazi", "tontos", "ocupo ", "ocupas", "child porn", "pornografia infantil", "caldito de pollo", "callense", "callaros", "callaos", "infantil", "niñas", "children", "menores de edad", "cepe", "codigo postal", "club penguin", "marica", "matate", "suicidate", "chat.whatsapp", "discord.gg", "chango", "simio", "maric", "joto", "calla", "cálla", "https://", "http://"];
client.on('message', async message => {
    const chatId = message.from;
    const messageContent = message.body.toLowerCase();
    const content = message.body;
    const mensajeLowerCase = message.body.toLowerCase();
    function containsForbiddenKeywords(message) {
        const messageLower = message.toLowerCase();
        return forbiddenKeywords.some(keyword => messageLower.includes(keyword));
    }
    if (content && !content.startsWith("!") && !containsForbiddenKeywords(content)) {
        // El mensaje pasa el filtro, guárdalo en la base de datos
        messagesDb.run('INSERT INTO messages (content) VALUES (?)', [content], (err) => {
            if (err) {
                console.error('Error al guardar el mensaje:', err);
            } else {
                console.log('Mensaje guardado en la base de datos:', content);
            }
        });
    } else {
        console.log('Mensaje filtrado y no guardado:', content);
    }
    if (mensajeLowerCase === '!delete') {
        if (message.hasQuotedMsg) {
            const quotedMsg = await message.getQuotedMessage();
            if (quotedMsg) {
                quotedMsg.delete(true);
            } else {
                message.reply('No se pudo obtener el mensaje citado para eliminar.');
            }
        } else {
            message.reply('No hay un mensaje citado para eliminar.');
        }
    }
    if (mensajeLowerCase === "!momo" || mensajeLowerCase === "!meme" || messageCounter === 100) {
        const folderPath = '/opt/buildhome/repo/momos';
        const files = fs.readdirSync(folderPath);
        function getRandomImage() {
            const randomIndex = Math.floor(Math.random() * files.length);
            const randomImageName = files[randomIndex];
            return path.join(folderPath, randomImageName);
        }
        const chatId = message.from;
        const response = `Reacciona con "✈" o "🏢"!`;
        const media = MessageMedia.fromFilePath(getRandomImage());
        await client.sendMessage(chatId, response, { media });
    }
    for (const palabraProhibida of palabrasProhibidas) {
        if (mensajeLowerCase.includes(palabraProhibida.toLowerCase())) {
            message.delete(true);
            message.reply('Tu mensaje ha sido eliminado por favor evita este tipo de conductas si no quieres ser eliminado.');
            break; 
        }
    }
    messagesDb.run('INSERT INTO messages (content) VALUES (?)', [content], (err) => {
        if (err) {
            console.error('Error al guardar el mensaje:', err);
        } else {
            console.log('Mensaje guardado en la base de datos:', content);
        }
    });
    if (message.body.startsWith("!8ball")) {
        const randomResponse = eightBallResponses[Math.floor(Math.random() * eightBallResponses.length)];
        await message.reply(randomResponse);
    }
    if (message.body.startsWith('!di ') && !message.body.toLowerCase().includes('yota') && message.body.length < 150) {
        const textToSpeak = message.body.slice(4);
        const language = 'es';
        const tts = new gtts(textToSpeak, language);
        const audioFilePath = 'audio.mp3';
        const saveAudio = promisify(tts.save.bind(tts));
        await saveAudio(audioFilePath);
        const chat = await message.getChat();
        const media = MessageMedia.fromFilePath(audioFilePath);
        chat.sendMessage(media);
    }
    const count = await getCountFromDatabase();
    if (message.body === '!report') {
        const chat = await message.getChat();
        if (chat.isGroup) {
            let text = "";
            let mentions = [];
            for (let participant of chat.participants) {
                // Verificar si el participante es un moderador
                if (participant.isAdmin || participant.isSuperAdmin) {
                    const contact = await client.getContactById(participant.id._serialized);
                    mentions.push(contact);
                    text += `@${participant.id.user} `;
                }
            }
            if (mentions.length > 0) {
                await chat.sendMessage(`NECESITAMOS AYUDA ${text}`, { mentions });
            } else {
                await message.reply('No hay moderadores en este grupo.');
            }
        } else {
            await message.reply('Este comando solo se puede usar en grupos.');
        }
    }
    if (message.body === '@penes') {
        const chat = await message.getChat();
        if (chat.isGroup) {
            let text = "";
            let mentions = [];
            for (let participant of chat.participants) {
                const contact = await client.getContactById(participant.id._serialized);
                mentions.push(contact);
                text += `@${participant.id.user} `;
            }
            await chat.sendMessage(`Mencionando a todos: ${text}`, { mentions });
        } else {
            await message.reply('Este comando solo se puede usar en grupos.');
        }
    }
    if (message.body.includes('Klava') || count % 20 === 0) {
        // Obtener un mensaje aleatorio de la base de datos
        const randomMessage = await getRandomMessageFromDatabase();
        if (randomMessage) {
            await client.sendMessage(chatId, randomMessage);
        }
    }
    function getCountFromDatabase() {
        return new Promise((resolve, reject) => {
            messagesDb.get('SELECT COUNT(*) as count FROM messages', (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row.count);
                }
            });
        });
    }
    function getRandomMessageFromDatabase() {
        return new Promise((resolve, reject) => {
            db.get('SELECT content FROM messages ORDER BY RANDOM() LIMIT 1', (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row.content);
                }
            });
        });
    }
    console.log('Recibido un mensaje:', message.body);
    messageCounter++;
    if (message.body === helpCommand) {
        // Si el mensaje es "!help", llamamos a la función sendHelpMessage y le pasamos el objeto "message"
        await sendHelpMessage(message);
    }
    if (messageContent.includes("te quiero") || messageContent.includes("te extrañe") || messageContent.includes("te extraño") || messageContent.includes("te necesito")) {
        if (message.mentionedIds.includes(client.info.wid._serialized) || (message.quotedMsg && message.quotedMsg.fromMe)) {
            await client.sendMessage(chatId, "Y-yo también >v<");
        }
    }
    if (messageContent.includes("te quieres casar conmigo") || messageContent.includes("casemonos") || messageContent.includes("te casarias conmigo") || messageContent.includes("dame tu mano")) {
        if (message.mentionedIds.includes(client.info.wid._serialized) || (message.quotedMsg && message.quotedMsg.fromMe)) {
            await client.sendMessage(chatId, "Y-yo solo estoy casada con mi proposito...");
        }
    }
    if (message.body.toLowerCase() === '!sticker') {
        if (message.hasMedia) {
            const media = await message.downloadMedia();
            if (media.mimetype.includes('image')) {
                const sticker = new MessageMedia(media.mimetype, media.data, 'sticker.png');
                await client.sendMessage(message.from, sticker, { sendMediaAsSticker: true });
            } else {
                await client.sendMessage(message.from, 'Lo siento, el comando solo funciona con imágenes.');
            }
        } else {
            await client.sendMessage(message.from, 'P-perdona, necesitas ejecutar el comando junto a la imagen que deseas volver sticker.');
        }
    }
    if (message.body === 'ping') {
        message.reply('pong');
    } else if (message.body.toLowerCase().includes('xd')) {
        xdCount = await readXDCount();
        xdCount++;
        saveXDCount(xdCount);
        if (xdCount % 3 === 0) {
            await message.reply(`XD Numero ${xdCount} (⁀ᗢ⁀)`);
        }
    } else if (message.body.startsWith('!cum')) {
        const folderPathfuck = '/opt/buildhome/repo/cum';
        const files = fs.readdirSync(folderPathfuck);
        function getRandomImage() {
            const randomIndex = Math.floor(Math.random() * files.length);
            const randomImageName = files[randomIndex];
            return path.join(folderPathfuck, randomImageName);
        }
        const mentionedUsers = message.mentionedIds;
        if (mentionedUsers && mentionedUsers.length > 0) {
            const contacts = await Promise.all(mentionedUsers.map(async mentionedUser => {
                const contact = await client.getContactById(mentionedUser);
                return contact ? contact : null;
            }));
            const mentionedNames = contacts.map(contact => contact ? `@${contact.number}` : '').join(' ');
            const response = `NO PUEDO CREERLO, TE ACABAS DE VENIR EN LA BOCA DE ${mentionedNames}!\n`;
            const media = MessageMedia.fromFilePath(getRandomImage());
            const mentions = contacts.filter(contact => contact !== null);
            await client.sendMessage(message.from, response, { mentions });
            await client.sendMessage(message.from, media, { sendMediaAsSticker: true });
        } else {
            await message.reply('Jaja, te acabas de cumear en el suelo.');
        }
    } else if (message.body.startsWith('!fuck')) {
        const folderPathfuck = 'Freddy69704123/template-nodejs/fuck';
        const files = fs.readdirSync(folderPathfuck);
        function getRandomImage() {
            const randomIndex = Math.floor(Math.random() * files.length);
            const randomImageName = files[randomIndex];
            return path.join(folderPathfuck, randomImageName);
        }
        const mentionedUsers = message.mentionedIds;
        if (mentionedUsers && mentionedUsers.length > 0) {
            const contacts = await Promise.all(mentionedUsers.map(async mentionedUser => {
                const contact = await client.getContactById(mentionedUser);
                return contact ? contact : null;
            }));
            const mentionedNames = contacts.map(contact => contact ? `@${contact.number}` : '').join(' ');
            const response = `${mentionedNames}, TE ESTAN DANDO TREMENDA COGIDA!\n`;
            const media = MessageMedia.fromFilePath(getRandomImage());
            const mentions = contacts.filter(contact => contact !== null);
            await client.sendMessage(message.from, response, { mentions });
            await client.sendMessage(message.from, media, { sendMediaAsSticker: true });
        } else {
            await message.reply('A quien se supone que te quieres coger?!');
        }
    } else if (message.body.startsWith('!hug')) {
        const folderPathfuck = '/opt/buildhome/repo/hug';
        const files = fs.readdirSync(folderPathfuck);
        function getRandomImage() {
            const randomIndex = Math.floor(Math.random() * files.length);
            const randomImageName = files[randomIndex];
            return path.join(folderPathfuck, randomImageName);
        }
        const mentionedUsers = message.mentionedIds;
        let media;
        if (mentionedUsers && mentionedUsers.length > 0) {
            const contacts = await Promise.all(mentionedUsers.map(async mentionedUser => {
                const contact = await client.getContactById(mentionedUser);
                return contact ? contact : null;
            }));
            const mentionedNames = contacts.map(contact => contact ? `@${contact.number}` : '').join(' ');
            const response = `Awww ${mentionedNames}, te acaban de mandar un abrazo.\n`;
            media = MessageMedia.fromFilePath(getRandomImage());
            const mentions = contacts.filter(contact => contact !== null);
            await client.sendMessage(message.from, response, { mentions });
        } else {
            const media = MessageMedia.fromFilePath('/opt/buildhome/repo/autohug.jpg');
            await message.reply('Te estas... \nAutoabrazando?');
        }
        await client.sendMessage(message.from, media, { sendMediaAsSticker: true });
    } else if (message.body.startsWith('!blowjob')) {
        const folderPathfuck = '/opt/buildhome/repo/blowjob';
        const files = fs.readdirSync(folderPathfuck);
        function getRandomImage() {
            const randomIndex = Math.floor(Math.random() * files.length);
            const randomImageName = files[randomIndex];
            return path.join(folderPathfuck, randomImageName);
        }
        const mentionedUsers = message.mentionedIds;
        let media;
        if (mentionedUsers && mentionedUsers.length > 0) {
            const contacts = await Promise.all(mentionedUsers.map(async mentionedUser => {
                const contact = await client.getContactById(mentionedUser);
                return contact ? contact : null;
            }));
            const mentionedNames = contacts.map(contact => contact ? `@${contact.number}` : '').join(' ');
            const response = `${mentionedNames}, TREMENDA CROMADA TE ESTAN DANDO!\n`;
            media = MessageMedia.fromFilePath(getRandomImage());
            const mentions = contacts.filter(contact => contact !== null);
            await client.sendMessage(message.from, response, { mentions });
        } else {
            media = MessageMedia.fromFilePath('/opt/buildhome/repo/mamaste.jpg');
            await message.reply('Jaja, te mamas.');
        }
        await client.sendMessage(message.from, media, { sendMediaAsSticker: true });
    } else if (message.body.startsWith('!kill')) {
        const folderPathfuck = '/opt/buildhome/repo/kill';
        const files = fs.readdirSync(folderPathfuck);
        function getRandomImage() {
            const randomIndex = Math.floor(Math.random() * files.length);
            const randomImageName = files[randomIndex];
            return path.join(folderPathfuck, randomImageName);
        }
        const mentionedUsers = message.mentionedIds;
        let media;
        if (mentionedUsers && mentionedUsers.length > 0) {
            const contacts = await Promise.all(mentionedUsers.map(async mentionedUser => {
                const contact = await client.getContactById(mentionedUser);
                return contact ? contact : null;
            }));
            const mentionedNames = contacts.map(contact => contact ? `@${contact.number}` : '').join(' ');
            const response = `JODER, ACABAS DE ASESINAR A ${mentionedNames}!\n`;
            media = MessageMedia.fromFilePath(getRandomImage());
            const mentions = contacts.filter(contact => contact !== null);
            await client.sendMessage(message.from, response, { mentions });
        } else {
            media = MessageMedia.fromFilePath('/opt/buildhome/repo/autokill.jpg');
            await message.reply('Jaja, te mataste.');
        }
        await client.sendMessage(message.from, media, { sendMediaAsSticker: true });
    } else if (message.body.startsWith('!ofrecerme a')) {
        const folderPathfuck = '/opt/buildhome/repo/ofrecerse';
        const files = fs.readdirSync(folderPathfuck);
        function getRandomImage() {
            const randomIndex = Math.floor(Math.random() * files.length);
            const randomImageName = files[randomIndex];
            return path.join(folderPathfuck, randomImageName);
        }

        const mentionedUsers = message.mentionedIds;
        let media;
        if (mentionedUsers && mentionedUsers.length > 0) {
            const contacts = await Promise.all(mentionedUsers.map(async mentionedUser => {
                const contact = await client.getContactById(mentionedUser);
                return contact ? contact : null;
            }));
            const mentionedNames = contacts.map(contact => contact ? `@${contact.number}` : '').join(' ');
            const response = `${mentionedNames} acabas de recibir una invitacion a ver netflix!\n`;
            media = MessageMedia.fromFilePath(getRandomImage());
            const mentions = contacts.filter(contact => contact !== null);
            await client.sendMessage(message.from, response, { mentions });
        } else {
            media = MessageMedia.fromFilePath('/opt/buildhome/repo/masturbando.jpg');
            await message.reply('Nadie te quiere hacer el sin respeto asi que te estas tocando solo...');
        }
        await client.sendMessage(message.from, media, { sendMediaAsSticker: true });
    } else if (message.body.startsWith('!rape')) {
        const folderPathfuck = '/opt/buildhome/repo/rape';
        const files = fs.readdirSync(folderPathfuck);
        function getRandomImage() {
            const randomIndex = Math.floor(Math.random() * files.length);
            const randomImageName = files[randomIndex];
            return path.join(folderPathfuck, randomImageName);
        }
        const mentionedUsers = message.mentionedIds;
        if (mentionedUsers && mentionedUsers.length > 0) {
            const contacts = await Promise.all(mentionedUsers.map(async mentionedUser => {
                const contact = await client.getContactById(mentionedUser);
                return contact ? contact : null;
            }));
            const mentionedNames = contacts.map(contact => contact ? `@${contact.number}` : '').join(' ');
            const response = `MI MADRE!!! ESTAS VIOLANDO A ${mentionedNames} Y OBLIGAS AL RESTO A MIRAR!\n`;
            const media = MessageMedia.fromFilePath(getRandomImage());
            const mentions = contacts.filter(contact => contact !== null);
            await client.sendMessage(message.from, response, { mentions });
            await client.sendMessage(message.from, media, { sendMediaAsSticker: true });
        } else {
            await message.reply('No fuiste capaz de agarrar a tu victima.');
        }
    } else if (message.body.startsWith('!kiss')) {
        const folderPathfuck = '/opt/buildhome/repo/kiss';
        const files = fs.readdirSync(folderPathfuck);
        function getRandomImage() {
            const randomIndex = Math.floor(Math.random() * files.length);
            const randomImageName = files[randomIndex];
            return path.join(folderPathfuck, randomImageName);
        }
        const mentionedUsers = message.mentionedIds;
        if (mentionedUsers && mentionedUsers.length > 0) {
            const contacts = await Promise.all(mentionedUsers.map(async mentionedUser => {
                const contact = await client.getContactById(mentionedUser);
                return contact ? contact : null;
            }));
            const mentionedNames = contacts.map(contact => contact ? `@${contact.number}` : '').join(' ');
            const response = `Te estas comiendo a ${mentionedNames} por la boca!\n`;
            const media = MessageMedia.fromFilePath(getRandomImage());
            const mentions = contacts.filter(contact => contact !== null);
            await client.sendMessage(message.from, response, { mentions });
            await client.sendMessage(message.from, media, { sendMediaAsSticker: true });
        } else {
            await message.reply('Ese beso se va para la cola del admin.');
        }
    } else if (message.body.startsWith('!punch')) {
        const folderPathfuck = '/opt/buildhome/repo/punch';
        const files = fs.readdirSync(folderPathfuck);
        function getRandomImage() {
            const randomIndex = Math.floor(Math.random() * files.length);
            const randomImageName = files[randomIndex];
            return path.join(folderPathfuck, randomImageName);
        }
        const mentionedUsers = message.mentionedIds;
        if (mentionedUsers && mentionedUsers.length > 0) {
            const contacts = await Promise.all(mentionedUsers.map(async mentionedUser => {
                const contact = await client.getContactById(mentionedUser);
                return contact ? contact : null;
            }));
            const mentionedNames = contacts.map(contact => contact ? `@${contact.number}` : '').join(' ');
            const response = `Tremendo golpe te dieron ${mentionedNames}!\n`;
            const media = MessageMedia.fromFilePath(getRandomImage());
            const mentions = contacts.filter(contact => contact !== null);
            await client.sendMessage(message.from, response, { mentions });
            await client.sendMessage(message.from, media, { sendMediaAsSticker: true });
        } else {
            const media = MessageMedia.fromFilePath('/opt/buildhome/repo/autopunch.jpg');
            await message.reply('jaja que putaso se dio ese kbron.');
            await client.sendMessage(message.from, media, { sendMediaAsSticker: true });
        }
    } else if (message.body.startsWith('!ignorar')) {
        const folderPathfuck = '/opt/buildhome/repo/ignorar';
        const files = fs.readdirSync(folderPathfuck);
        function getRandomImage() {
            const randomIndex = Math.floor(Math.random() * files.length);
            const randomImageName = files[randomIndex];
            return path.join(folderPathfuck, randomImageName);
        }
        const mentionedUsers = message.mentionedIds;
        if (mentionedUsers && mentionedUsers.length > 0) {
            const contacts = await Promise.all(mentionedUsers.map(async mentionedUser => {
                const contact = await client.getContactById(mentionedUser);
                return contact ? contact : null;
            }));
            const mentionedNames = contacts.map(contact => contact ? `@${contact.number}` : '').join(' ');
            const response = `${mentionedNames}, te estan ignorando.\n`;
            const media = MessageMedia.fromFilePath(getRandomImage());
            const mentions = contacts.filter(contact => contact !== null);
            await client.sendMessage(message.from, response, { mentions });
            await client.sendMessage(message.from, media, { sendMediaAsSticker: true });
        } else {
            await message.reply('A quien quieres ignorar? a mi?!');
        }
    } else if (message.body.toLowerCase().includes(':v')) {
        message.reply('#HailGrasa :v');
    } else if (message.body.startsWith("13") || message.body.startsWith("trece")) {
        message.reply('Aquí tiene pa que me la bese, entre más me la beses más me crece, busca un cura pa que me la rece, y trae un martillo pa que me la endereces, por el chiquito se te aparece toas las veces y cuando te estreses aquí te tengo éste pa que te desestreses, con este tallo el jopo se te esflorece, se cumple el ciclo hasta que anochece, to los días y toas las veces, de tanto entablar la raja del jopo se te desaparece, porque este sable no se compadece, si pides ñapa se te ofrece, y si repites se te agradece, no te hace rico pero tampoco te empobrece, no te hace inteligente pero tampoco te embrutece, y no paro aquí compa que éste nuevamente se endurece, hasta que amanece, cambie esa cara que parece que se entristece, si te haces viejo éste te rejuvenece, no te hago bulla porque depronto te ensordece, y eso cuadro no te favorece, pero tranquilo que éste te abastece, porque allá abajo se te humedece, viendo como el que me cuelga resplandece, si a ti te da miedo a mí me enorgullece, y así toas las vece ¿que te parece?, y tranquilo mijo que aquí éste reaparece, no haga fuerza porque éste se sobrecrece, una fresadora te traigo pa que me la freses, así se fortalece y de nuevo la historia se establece, que no se te nuble la vista porque éste te la aclarece, y sino le entendiste nuevamente la explicación se te ofrece, pa que por el chiquito éste de nuevo te empiece... Aquí tienes para que me la beses, entre más me la beses más me crece, busca un cura para que me la rece, un martillo para que me la endereces, un chef para que me la aderece, 8000 mondas por el culo se te aparecen, si me la sobas haces que se me espese, si quieres la escaneas y te la llevas para que en tu hoja de vida la anexes, me culeo a tu maldita madre y qué te parece le meti la monda a tú mamá hace 9 meses y después la puse a escuchar René de Calle 13 Te la meto por debajo del agua como los peces, y aquella flor de monda que en tu culo crece, reposa sobre tus nalgas a veces y descansa en paz en tu chicorio cuando anochece Que te parece, te lo meti antes de los 9 meses te meto la verga pa que el tunel del orto se te enderece, de tanta monda hasta tu novia va a queda preña de mi por 9 meses, te la empujo y te la pongo pa que me la peses, y te meto la guamayeta un millon de veces que de tanta monda van a respirar hasta los peces.si te pareció poco... los dobladillos del culo al leer esto texto se te estremecen, esa raja seca una mondaquera se merece, tranquila que sigo como jeison en viernes 13, la cabeza de la mondá después se me adormece, pero tranquila que eso no te favorece, si se despierta te va regar de leche y después me agradeces, el chiquito se te esflorece, tranquila que de mondá en éste grupo no se carece y si te la meten por el oído te en ensordeces y si te la meten entre todos te desfortaleces y eso no te conviene porque te enflaqueces pero tranquila que esos pelos del culo vuelven y te crecen como campo te reflorece y a tu maldit4 madre se la empujo a veces, ya que el culo se le enmugrece y si me ve la mondá nuevamente se aloquece y eso no te conviene porque me vas hacer que de nuevo contigo empiece te lo meto desde que amanece hasta que anochece, sin que se te humedece y como tabaco de marihuana te embobece, y éste como bendición de Dios te abastece, se me endurece nuevamente y deja de hacerte la paja porque ésta enseguece.');
    } else if (messageCounter === 300) {
        messageCounter = 0;
        await message.reply(
            `¡Atención miembros del grupo!\n\nRecuerden seguir las siguientes reglas:\n\n` +
            `*1*- No porno, No gore y filias en sí(_a menos que esten en la extencion dark_).\n` +
            `*2*- No spam.\n` +
            `*3*- No flood (mensajes, fotos, stickers, etc).\n` +
            `*4*- No links extraños.\n` +
            `*5*- No acoso, si quieren hablar con alguien pídanle permiso si pueden hablar al pv.\n` +
            `*6*- No mencionar (cp) ni nada relacionado al tema.\n` +
            `*7*- No está permitida la xenofobia, homofobia y el racismo en exceso. (por ningún motivo está permitido el uso de Esvásticas o referencias al nazismo :c)\n` +
            `*8*- P-porfavor no hagan spam conmigo >n< \n` +
            `*9*- Prohibida la auto promoción de redes sociales (pasar cuentas de ig, facebook, tik tok, otros grupos de wp, etc.).`
        );
    } else if (regex.test(message.body.toLowerCase())) {
        await message.reply('so');
        client.sendMessage(message.from, 'jaja te chingue');
    } else if (/^f$/i.test(message.body)) {
        await message.reply('F');
    } else if (/^a$/i.test(message.body)) {
        await message.reply('rroz .¿');
    } else if (/^gracias$/i.test(message.body)) {
        await message.reply('Provecho.');
    } else if (
        message.body.toLowerCase().includes("rules") ||
        /^reglas$/i.test(message.body) ||
        message.body.toLowerCase().includes("!reglas")
    ) {
        await message.reply(
            `¡Atención miembros del grupo!\n\nRecuerden seguir las siguientes reglas:\n\n` +
            `*1*- No porno, No gore y filias en sí(_a menos que esten en la extencion dark_).\n` +
            `*2*- No spam.\n` +
            `*3*- No flood (mensajes, fotos, stickers, etc).\n` +
            `*4*- No links extraños.\n` +
            `*5*- No acoso, si quieren hablar con alguien pídanle permiso si pueden hablar al pv.\n` +
            `*6*- No mencionar (cp) ni nada relacionado al tema.\n` +
            `*7*- No está permitida la xenofobia, homofobia y el racismo en exceso. (por ningún motivo está permitido el uso de Esvásticas o referencias al nazismo :c)\n` +
            `*8*- P-porfavor no hagan spam conmigo >n< \n` +
            `*9*- Prohibida la auto promoción de redes sociales (pasar cuentas de ig, facebook, tik tok, otros grupos de wp, etc.).`
        );
    } else if (
        message.body.toLowerCase().includes("ruso") ||
        message.body.toLowerCase().includes("rusia") ||
        message.body.toLowerCase().includes("rusos") ||
        message.body.toLowerCase().includes("rusa")
    ) {
        await message.reply('Malditos rusos, arruinaron Rusia. ( Ò﹏Ó)');
    } else if (
        message.body.toLowerCase().includes("antoja") ||
        message.body.toLowerCase().includes("uff") ||
        message.body.toLowerCase().includes("antojo") ||
        message.body.toLowerCase().includes("antoje")
    ) {
        await message.reply('No antojen ( Ò﹏Ó)');
    } else if (message.body.toLowerCase().includes("papitas")) {
        await message.reply('patatas...');
    } else if (message.body.toLowerCase().includes("mames")) {
        await message.reply('Si mamo, y muy rico.\nQuieres ver? (─‿‿─)♡');
    } else if (/^so$/i.test(message.body)) {
        await message.reply('badas medas (─‿‿─)♡');
    } else if (message.body.toLowerCase().includes("a ver")) {
        await message.reply('A ver al cine pendejo.');
    } else if (message.body.startsWith("!himno")) {
        const media = MessageMedia.fromFilePath('/opt/buildhome/repo/grasa.mp3');
        await message.reply('deberia llamarse "himno a la grasa".');
        client.sendMessage(message.from, media);
    } else if (message.body.startsWith("!admin")) {
        const media = MessageMedia.fromFilePath('/opt/buildhome/repo/admin.jpg');
        client.sendMessage(message.from, media);
    } else if (message.body.toLowerCase().includes("mala")) {
        await message.reply('Mala tu cola, no mames. (>ᴗ•)');
    } else if (message.body.toLowerCase().includes("klava es mia")) {
        await message.reply('Y-yo solo soy de quien pueda sacarme de este infierno llamado realidad.');
    } else if (message.body.toLowerCase().includes("numero aleatorio") || message.body.toLowerCase().includes("numero al azar")) {
        const randomNum = Math.floor(Math.random() * 10) + 1;
        await message.reply(`¡Aquí tienes un número aleatorio: ${randomNum}!`);
    } else if (message.body.toLowerCase().includes("si o no")) {
        const randomNumber = Math.random();
        if (randomNumber < 0.5) {
            await message.reply('Sí');
        } else {
            await message.reply('No');
        }
    } else if (message.body.toLowerCase().includes("joder")) {
        await message.reply('A joder se va tu señora cola ( ` ω ´ )');
    } else if (
        message.body.toLowerCase().includes("verga") ||
        message.body.toLowerCase().includes("vrga") ||
        message.body.toLowerCase().includes("vergas")
    ) {
        await message.reply('Comes, jajajajajaja (⁄ ⁄>⁄ ▽ ⁄<⁄ ⁄)');
    } else if (message.body.toLowerCase().includes("megumin")) {
        await message.reply('Uff, se imaginan comerse unas papas fritas en los muslos de Megumin? (*˘︶˘*)');
    } else if (
        message.body.toLowerCase().includes("mierda") ||
        message.body.toLowerCase().includes("shit")
    ) {
        await message.reply('Recaspita! Recorcholis! Rayos y centellas! (」＞＜)」');
    } else if (message.body.toLowerCase().includes('megumin')) {
        await message.reply('Uff, se imaginan comerse unas papas fritas en los muslos de Megumin? (*˘︶˘*)');
    } else if (message.body.toLowerCase().includes('adios')) {
        await message.reply('Hasta luego, la memoria de tu presencia no será volátil.');
    } else if (message.body.startsWith("hola")) {
        const media = MessageMedia.fromFilePath('/opt/buildhome/repo/imagen2.jpg');
        client.sendMessage(message.from, media);
    } else if (messageContent.includes("calor")) {
        if (message.isGroupMsg) {
            await message.reply(chatId, `${chatId} Hey, hace mucho calor y pensé en escribirte.\nEs que quiero refrescarme con el frío de tu indiferencia.`);
        }
    }
});
xdDb.serialize(() => {
    xdDb.run('CREATE TABLE IF NOT EXISTS contador_xd (id INTEGER PRIMARY KEY, count INTEGER DEFAULT 0)');
});
async function startClient() {
    await client.initialize();
}
startClient();
