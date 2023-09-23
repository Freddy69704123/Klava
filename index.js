const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const gtts = require('gtts');
const googleTTS = require('google-tts-api');
const tts = require('google-translate-tts');
const { Client, LocalAuth, MessageMedia, Location } = require('whatsapp-web.js');
const sqlite3 = require('sqlite3').verbose();
const xdDb = new sqlite3.Database('contador_xd.db');
const qrcode = require('qrcode-terminal');

let xdCount = 0;
let messageCounter = 0;
const dbModeracion = new sqlite3.Database('registro.db');
const SESSION_FILE_PATH = './session.json'; // Ruta para el archivo de sesión
const DATA_DIR_PATH = './data'; // Ruta de la carpeta de datos
// Conectar a la base de datos o crearla si no existe
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

// Crea la carpeta "data" si no existe
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
    // Resto de la lógica...
});

client.on('qr', qr => {
    if (!sessionData) {
        // Si no hay información de sesión, muestra el código QR
        console.log('Escanea este código QR con tu teléfono:');
        qrcode.generate(qr, { small: true });
    }
});

// Función para leer el contador de "xd" desde la base de datos
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

// Función para guardar el contador de "xd" en la base de datos
function saveXDCount(count) {
    xdDb.run('INSERT OR REPLACE INTO contador_xd (id, count) VALUES (1, ?)', count, (err) => {
        if (err) {
            console.error('Error al guardar el contador:', err);
        }
    });
}

const regex = /^que$/i;

const helpCommand = '!help';

async function sendCuriousResponse(message) {
    const chatId = message.from;
    const respuestaAleatoria = respuestasCuriosas[Math.floor(Math.random() * respuestasCuriosas.length)];
    await client.sendMessage(chatId, respuestaAleatoria);
}

// Función para enviar el mensaje de ayuda con la lista de comandos
async function sendHelpMessage(message) {
    const helpMessage = `Hola! mi nombre es Klava Malkova, si quieres interactuar conmigo puedes hacer uso de los siguientes comandos en esta\n` +
        `Lista de comandos:\n\n` +
        `⁅––––––––––––––––––––––––⁆.\n` +
        `*ping* - _Responde con "pong"._\n` +
        `*xd* - _Incrementa el contador de "XD" y muestra el número actual de XD._\n` +
        `*:v* - _Responde con "#HailGrasa :v"._\n` +
        `*rules - _Recuerda las reglas del grupo cada determinado numero de mensajes (tambien se activa con la palabra "rules")._\n` +
        `*!help* - _Muestra esta lista de comandos.\n` +
        `*khe* - _Responde "so" a mensajes que contengan "khe", "qe", "ke" o "que"._\n` +
        `*f* - _Responde "F" a mensajes que contengan solo la letra "F" de forma individual._\n` +
        `*a* - _Responde "rroz .¿" a mensajes que contengan solo la letra "a" de forma individual._\n` +
        `*ruso* - Responde "Malditos rusos, arruinaron Rusia. ( Ò﹏Ó)" a mensajes que contengan "ruso", "rusia", "rusos" o "rusa"._\n` +
        `*antojo* - _Responde "No antojen ( Ò﹏Ó)" a mensajes que contengan "antoja", "uff", "antojo" o "antoje"._\n` +
        `*mames* - _Responde "Si mamo, y muy rico. ¿Quieres ver? (─‿‿─)♡" a mensajes que contengan "mames"._\n` +
        `*calor* - _Responde un mensaje personalizado con el nombre del remitente a mensajes que contengan "calor"._\n` +
        `*jaja* - _Responde "De qué te ríes? No es tan gracioso" a mensajes que contengan "jaja" o similares._\n` +
        `*a ver* - _Responde "A ver al cine pvto (￣ヘ￣)" a mensajes que contengan "aver"._\n` +
        `*klava* - _Responde como simsimi a mensajes que contengan "Klava"._\n` +
        `*mala* - _Responde "Mala tu cola, no mames. (>ᴗ•)" a mensajes que contengan "mala"._\n` +
        `*joder* - _Responde "A joder se va tu señora cola ( \` ω ´ )" a mensajes que contengan "joder"._\n` +
        `*verga* - _Responde "Comes, jajajajajaja (⁄ ⁄>⁄ ▽ ⁄<⁄ ⁄)" a mensajes que contengan "verga", "vrga" o "vergas"._\n` +
        `*megumin* - _Responde "Uff, se imaginan comerse unas papas fritas en los muslos de Megumin? (*˘︶˘*)" a mensajes que contengan "megumin"._\n` +
        `*adios* - _Responde "Hasta luego, la memoria de tu presencia no será volátil." a mensajes que contengan "adios"._\n` +
        `*papitas* - _Responde con "patatas" a mensajes que contengan "papitas"._\n` +
        `*gracias* - _Responde con "provecho" a mensajes que contengan "gracias"._\n` +
        `*spam* - _Responde con la historia del spam a mensajes que empiezen con "Spam"._\n` +
        `*curioso* - _Responde aleatoriamente con acontecimientos importantes sucedidos en la grasa a mensajes que contengan "curioso"._\n` +
        `*!sticker* - _comando para hacer stickers, solo manda la imagen que deseas volver sticker con el comando "!sticker"._\n` +
        `*!8ball* - _comando basado en el juguete 8ball, responde con varias respuestas tipicas del juguete._\n` +
        `*@everyone* - _comando para mencionar a todos, Menciona a todos los miembros del grupo(Solo disponible para administradores)._\n` +
        `*!report* - _comando para reportar, usa este mensaje para reportar un mensaje que inflinja las reglas del grupo._\n` +
        `*si o no* - _comando para tomar desiciones, te respondera si o no de forma aleatoria a la pregunta que le hagas._\n` +
        `*numero aleatorio* - _comando para hacer stickers, manda un numero aleatorio entre el 1 y el 10 si quieres preguntarle que puntuacion da, o algo por el estilo._\n` +
        `*!fuck* - _comando para cogerte a un miembro del grupo, solo escribe "!fuck" y a un lado etiqueta a la persona que quieres cogerte._\n` +
        `*!cum* - _comando para cumear a un miembro del grupo, solo escribe "!cum" y a un lado etiqueta a la persona que quieres cumear._\n` +
        `*!kill* - _comando para matar a un miembro del grupo, solo escribe "!kill" y a un lado etiqueta a la persona que quieres matar._\n` +
        `*!rape* - _comando para violar a un miembro del grupo, solo escribe "!rape" y a un lado etiqueta a la persona que quieres violar._\n` +
        `*!kiss* - _comando para besar a un miembro del grupo, solo escribe "!kiss" y a un lado etiqueta a la persona que quieres besar._\n` +
        `*!di* - _Seguido de el comando "!di" escribes lo que quieres que diga Klava._\n` +
        `*canta "Never gonna give you up" con Klava* - _escribe una linea de la cancion y ella respondera con la linea que sigue con cualquier linea de la cancion._\n` +
        `*canta "Hazme un mundo SDLG nuevo" con Klava* - _escribe una linea de la cancion y ella respondera con la linea que sigue con cualquier linea de la cancion._\n` +
        `*canta "Amigo ven te invito una copa" con Klava* - _escribe una linea de la cancion y ella respondera con la linea que sigue con cualquier linea de la cancion._\n` +
        `*!ban* - _(comando para administradores) se debe escribir "!ban @(Miembro etiquetado) hacer spam" para eliminar un miembro._\n` +
        `*hola* - _Envía un saludo diciendo "¡Hola! (sin ofender) a mensajes que contengan "hola"._`;

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
let botActivo = true;
client.on('message', async message => {

    if (message.body.toLowerCase() === '!off' && message.from.endsWith('@c.us')) {
        botActivo = false;
        message.reply('Bot suspendido. No responderé a los mensajes.');
    }

    if (message.body.toLowerCase() === '!on' && message.from.endsWith('@c.us')) {
        botActivo = true;
        message.reply('Bot reanudado. Responderé a los mensajes.');
    }

    if (botActivo === true) {
        const chatId = message.from; 
        const messageContent = message.body.toLowerCase();
        const content = message.body;
        const userMessage = message.body.trim().toLowerCase(); // Convertir a minúsculas



        if (userMessage.includes('hazme un mundo lleno de grasa')) {
            message.reply('llena el grupo otra vez gordo');
        } else if (userMessage.includes('llena el grupo otra vez gordo')) {
            message.reply('y es que el pinche zuckaritas');
        } else if (userMessage.includes('y es que el pinche zuckaritas')) {
            message.reply('nuevamente nos tumbo');
        } else if (userMessage.includes('nuevamente nos tumbo')) {
            message.reply('de repente un extraño día');
        } else if (userMessage.includes('de repente un extraño día')) {
            message.reply('en mi inicio yo no vi momos');
        } else if (userMessage.includes('en mi inicio yo no vi momos')) {
            message.reply('solamente al miltoner');
        } else if (userMessage.includes('solamente al miltoner')) {
            message.reply('y al pendejo de ryanshow');
        } else if (userMessage.includes('y al pendejo de ryanshow')) {
            message.reply('y es que el grupo está bien bueno');
        } else if (userMessage.includes('y es que el grupo está bien bueno')) {
            message.reply('siempre encuentro un buen momo');
        } else if (userMessage.includes('siempre encuentro un buen momo')) {
            message.reply('y las elfas están chidas');
        } else if (userMessage.includes('y las elfas están chidas')) {
            message.reply('los papus cabrones son');
        } else if (userMessage.includes('los papus cabrones son')) {
            message.reply('encuentro packs para la pajita');
        } else if (userMessage.includes('encuentro packs para la pajita')) {
            message.reply('brazo derecho bien mamado');
        } else if (userMessage.includes('brazo derecho bien mamado')) {
            message.reply('son tantas las manuelas');
        } else if (userMessage.includes('son tantas las manuelas')) {
            message.reply('que por el grupo yo me he armado');
        } else if (userMessage.includes('que por el grupo yo me he armado')) {
            message.reply('picosita Nadir');
        } else if (userMessage.includes('picosita nadir')) {
            message.reply('sensualón el buen don');
        } else if (userMessage.includes('sensualón el buen don')) {
            message.reply('el esclavo frozono');
        } else if (userMessage.includes('el esclavo frozono')) {
            message.reply('y el gordo grasoso señor emperador');
        } else if (userMessage.includes('y el gordo grasoso señor emperador')) {
            message.reply('vamos abran el muro');
        } else if (userMessage.includes('vamos abran el muro')) {
            message.reply('pa sonreír');
        } else if (userMessage.includes('pa sonreir')) {
            message.reply('para darle me emperra a todos los momos sabrosos');
        } else if (userMessage.includes('para darle me emperra a todos los momos sabrosos')) {
            message.reply('que se publican en el muro');
        } else if (userMessage.includes('que se publican en el muro')) {
            message.reply('hazme un mundo sdlg nuevo');
        } else if (userMessage.includes('hazme un mundo sdlg nuevo')) {
            message.reply('pa jalarme el ganso');
        } else if (userMessage.includes('pa jalarme el ganso')) {
            message.reply('donde todos los grasosos');
        } else if (userMessage.includes('donde todos los grasosos')) {
            message.reply('la pasemos bien chingon');
        } else if (userMessage.includes('la pasemos bien chingon')) {
            message.reply('quiero hornear nuevos momos');
        } else if (userMessage.includes('quiero hornear nuevos momos')) {
            message.reply('y chingarme a unos holkeanos');
        } else if (userMessage.includes('y chingarme a unos holkeanos')) {
            message.reply('y es que la dvd');
        } else if (userMessage.includes('y es que la dvd')) {
            message.reply('los grasosos la rifamos');
        } else if (userMessage.includes('los grasosos la rifamos')) {
            message.reply('hazme un grupo aunque sea nuevo');
        } else if (userMessage.includes('hazme un grupo aunque sea nuevo')) {
            message.reply('de llenarlo me encargo yo');
        } else if (userMessage.includes('de llenarlo me encargo yo')) {
            message.reply('y es que el mark zuckervergas');
        } else if (userMessage.includes('y es que el mark zuckervergas')) {
            message.reply('nos puso el otro en revisión');
        } else if (userMessage.includes('nos puso el otro en revisión')) {
            message.reply('dale me emperra algún día');
        } else if (userMessage.includes('dale me emperra algún día')) {
            message.reply('y comparte con tus contactos');
        } else if (userMessage.includes('y comparte con tus contactos')) {
            message.reply('y las elfas a la cocina');
        } else if (userMessage.includes('y las elfas a la cocina')) {
            message.reply('a hacerme un sandwichón');
        } else if (userMessage.includes('a hacerme un sandwichón')) {
            message.reply('picosita nadir');
        } else if (userMessage.includes('picosita nadir')) {
            message.reply('sensualón el buen don');
        } else if (userMessage.includes('sensualón el buen don')) {
            message.reply('el esclavo frozono');
        } else if (userMessage.includes('el esclavo frozono')) {
            message.reply('y el gordo grasoso señor emperador');
        } else if (userMessage.includes('y el gordo grasoso señor emperador')) {
            message.reply('vamos abran el muro');
        } else if (userMessage.includes('vamos abran el muro')) {
            message.reply('pa sonreir');
        } else if (userMessage.includes('pa sonreir')) {
            message.reply('para darle me emperra a todos los momos sabrosos');
        } else if (userMessage.includes('para darle me emperra a todos los momos sabrosos')) {
            message.reply('que se publican en el muro, en el muro');
        } else if (userMessage.includes('que se publican en el muro, en el muro')) {
            message.reply('hazme un mundo SDLG nuevo');
        } else if (userMessage.includes('hazme un mundo SDLG nuevo')) {
            message.reply('pa\' jalarme el ganso');
        } else if (userMessage.includes('pa\' jalarme el ganso')) {
            message.reply('donde todos los grasosos');
        } else if (userMessage.includes('donde todos los grasosos')) {
            message.reply('la pasemos bien chingon');
        } else if (userMessage.includes('la pasemos bien chingon')) {
            message.reply('quiero hornear nuevos momos');
        } else if (userMessage.includes('quiero hornear nuevos momos')) {
            message.reply('y chingarme a unos holkeanos');
        } else if (userMessage.includes('y chingarme a unos holkeanos')) {
            message.reply('y es que la DVD');
        } else if (userMessage.includes('y es que la DVD')) {
            message.reply('los grasosos la rifamos');
        } else if (userMessage.includes('los grasosos la rifamos')) {
            message.reply('hazme un grupo aunque sea nuevo');
        } else if (userMessage.includes('hazme un grupo aunque sea nuevo')) {
            message.reply('de llenarlo me encargo yo');
        } else if (userMessage.includes('de llenarlo me encargo yo')) {
            message.reply('y es que el Mark Zuckervergas');
        } else if (userMessage.includes('y es que el Mark Zuckervergas')) {
            message.reply('nos puso el otro en revisión');
        } else if (userMessage.includes('nos puso el otro en revisión')) {
            message.reply('dale me emperra algún día');
        } else if (userMessage.includes('dale me emperra algún día')) {
            message.reply('y comparte con tus contactos');
        } else if (userMessage.includes('y comparte con tus contactos')) {
            message.reply('y las elfas a la cocina');
        } else if (userMessage.includes('y las elfas a la cocina')) {
            message.reply('a hacerme un sandwichón');
        } else if (userMessage.includes('a hacerme un sandwichón')) {
            message.reply('picosita Nadir');
        } else if (userMessage.includes('picosita Nadir')) {
            message.reply('sensualón el buen Don');
        } else if (userMessage.includes('sensualón el buen Don')) {
            message.reply('el esclavo Frozono');
        } else if (userMessage.includes('el esclavo Frozono')) {
            message.reply('y el Gordo grasoso señor emperador');
        } else if (userMessage.includes('y el Gordo grasoso señor emperador')) {
            message.reply('vamos abran el muro');
        } else if (userMessage.includes('vamos abran el muro')) {
            message.reply('pa sonreir');
        } else if (userMessage.includes('pa sonreIr')) {
            message.reply('para darle me emperra a todos los momos sabrosos');
        } else if (userMessage.includes('para darle me emperra a todos los momos sabrosos')) {
            message.reply('que se publican en el muro, en el muro');
        } else if (userMessage.includes('que se publican en el muro, en el muro')) {
            message.reply('hazme un mundo SDLG nuevo');
        } else if (userMessage.includes('hazme un mundo SDLG nuevo')) {
            message.reply('pa\' jalarme el ganso');
        } else if (userMessage.includes('pa jalarme el ganso')) {
            message.reply('donde todos los grasosos');
        } else if (userMessage.includes('donde todos los grasosos')) {
            message.reply('la pasemos bien chingon');
        } else if (userMessage.includes('la pasemos bien chingon')) {
            message.reply('quiero hornear nuevos momos');
        } else if (userMessage.includes('quiero hornear nuevos momos')) {
            message.reply('y chingarme a unos holkeanos');
        } else if (userMessage.includes('y chingarme a unos holkeanos')) {
            message.reply('y es que la DVD');
        } else if (userMessage.includes('y es que la DVD')) {
            message.reply('los grasosos la rifamos');
        } else if (userMessage.includes('los grasosos la rifamos')) {
            message.reply('hazme un grupo aunque sea nuevo');
        } else if (userMessage.includes('hazme un grupo aunque sea nuevo')) {
            message.reply('de llenarlo me encargo yo');
        } else if (userMessage.includes('de llenarlo me encargo yo')) {
            message.reply('y es que el Mark Zuckervergas');
        } else if (userMessage.includes('y es que el Mark Zuckervergas')) {
            message.reply('nos puso el otro en revisión');
        } else if (userMessage.includes('nos puso el otro en revisión')) {
            message.reply('dale me emperra algún día');
        } else if (userMessage.includes('dale me emperra algún día')) {
            message.reply('y comparte con tus contactos');
        } else if (userMessage.includes('y comparte con tus contactos')) {
            message.reply('y las elfas a la cocina');
        } else if (userMessage.includes('y las elfas a la cocina')) {
            message.reply('a hacerme un sandwichon');
        } else if (userMessage.includes('a hacerme un sandwichon')) {
            message.reply('picosita nadir');
        } else if (userMessage.includes('picosita nadir')) {
            message.reply('sensualón el buen don');
        } else if (userMessage.includes('sensualon el buen don')) {
            message.reply('el esclavo frozono');
        } else if (userMessage.includes('el esclavo frozono')) {
            message.reply('y el gordo grasoso señor emperador');
        } else if (userMessage.includes('y el gordo grasoso señor emperador')) {
            message.reply('vamos abran el muro');
        } else if (userMessage.includes('vamos abran el muro')) {
            message.reply('pa sonreir');
        } else if (userMessage.includes('pa sonreir')) {
            message.reply('para darle me emperra a todos los momos sabrosos');
        } else if (userMessage.includes('para darle me emperra a todos los momos sabrosos')) {
            message.reply('que se publican en el muro en el muro');
        } else if (userMessage.includes('que se publican en el muro en el muro')) {
            message.reply('hazme un mundo sdlg nuevo');
        } else if (userMessage.includes('hazme un mundo sdlg nuevo')) {
            message.reply('pa jalarme el ganso');
        } else if (userMessage.includes('pa jalarme el ganso')) {
            message.reply('donde todos los grasosos');
        } else if (userMessage.includes('donde todos los grasosos')) {
            message.reply('la pasemos bien chingon');
        } else if (userMessage.includes('la pasemos bien chingon')) {
            message.reply('quiero hornear nuevos momos');
        } else if (userMessage.includes('quiero hornear nuevos momos')) {
            message.reply('y chingarme a unos holkeanos');
        } else if (userMessage.includes('y chingarme a unos holkeanos')) {
            message.reply('y es que la dvd');
        } else if (userMessage.includes('y es que la dvd')) {
            message.reply('los grasosos la rifamos');
        } else if (userMessage.includes('los grasosos la rifamos')) {
            message.reply('hazme un grupo aunque sea nuevo');
        } else if (userMessage.includes('hazme un grupo aunque sea nuevo')) {
            message.reply('de llenarlo me encargo yo');
        } else if (userMessage.includes('de llenarlo me encargo yo')) {
            message.reply('y es que el Mark Zuckervergas');
        } else if (userMessage.includes('y es que el Mark Zuckervergas')) {
            message.reply('nos puso el otro en revisión');
        } else if (userMessage.includes('nos puso el otro en revisión')) {
            message.reply('dale me emperra algun dia');
        } else if (userMessage.includes('dale me emperra algun dia')) {
            message.reply('y comparte con tus contactos');
        } else if (userMessage.includes('y comparte con tus contactos')) {
            message.reply('y las elfas a la cocina');
        } else if (userMessage.includes('y las elfas a la cocina')) {
            message.reply('a hacerme un sandwichon');
        } else if (userMessage.includes('a hacerme un sandwichon')) {
            message.reply('picosita Nadir');
        } else if (userMessage.includes('picosita nadir')) {
            message.reply('sensualon el buen don');
        } else if (userMessage.includes('sensualón el buen don')) {
            message.reply('el esclavo frozono');
        } else if (userMessage.includes('el esclavo frozono')) {
            message.reply('y el gordo grasoso señor emperador');
        } else if (userMessage.includes('y el gordo grasoso señor emperador')) {
            message.reply('vamos abran el muro');
        } else if (userMessage.includes('vamos abran el muro')) {
            message.reply('pa sonreír');
        } else if (userMessage.includes('pa sonreír')) {
            message.reply('para darle me emperra a todos los momos sabrosos');
        } else if (userMessage.includes('para darle me emperra a todos los momos sabrosos')) {
            message.reply('que se publican en el muro en el muro');
        } else if (userMessage.includes('que se publican en el muro, en el muro')) {
            message.reply('hazme un mundo sdlg nuevo');
        } else if (userMessage.includes('hazme un mundo sdlg nuevo')) {
            message.reply('pa jalarme el ganso');
        } else if (userMessage.includes('pa jalarme el ganso')) {
            message.reply('donde todos los grasosos');
        } else if (userMessage.includes('donde todos los grasosos')) {
            message.reply('la pasemos bien chingon');
        } else if (userMessage.includes('la pasemos bien chingon')) {
            message.reply('quiero hornear nuevos momos');
        } else if (userMessage.includes('quiero hornear nuevos momos')) {
            message.reply('y chingarme a unos holkeanos');
        } else if (userMessage.includes('y chingarme a unos holkeanos')) {
            message.reply('y es que la dvd');
        } else if (userMessage.includes('y es que la dvd')) {
            message.reply('los grasosos la rifamos');
        } else if (userMessage.includes('los grasosos la rifamos')) {
            message.reply('hazme un grupo aunque sea nuevo');
        } else if (userMessage.includes('hazme un grupo aunque sea nuevo')) {
            message.reply('de llenarlo me encargo yo');
        } else if (userMessage.includes('de llenarlo me encargo yo')) {
            message.reply('y es que el mark zuckervergas');
        } else if (userMessage.includes('y es que el mark zuckervergas')) {
            message.reply('nos puso el otro en revision');
        } else if (userMessage.includes('nos puso el otro en revision')) {
            message.reply('dale me emperra algun dia');
        } else if (userMessage.includes('dale me emperra algun dia')) {
            message.reply('y comparte con tus contactos');
        } else if (userMessage.includes('y comparte con tus contactos')) {
            message.reply('y las elfas a la cocina');
        } else if (userMessage.includes('y las elfas a la cocina')) {
            message.reply('a hacerme un sandwichón');
        } else if (userMessage.includes('amigo ven te invito una copa')) {//amigo ven te invito una copa
            message.reply('ya no tomo gracias');
        } else if (userMessage.includes('ya no tomo gracias')) {
            message.reply('no tomas bien te invito a un cafe');
        } else if (userMessage.includes('no tomas bien te invito un cafe')) {
            message.reply('bueno');
        } else if (userMessage.includes('bueno')) {
            message.reply('que quiero recordar la epoca loca');
        } else if (userMessage.includes('que quiero recordar la epoca loca')) {
            message.reply('de ayer cuando teniamos 16');
        } else if (userMessage.includes('de ayer cuando teniamos 16')) {
            message.reply('bien dime que a pasado con tu esposa');
        } else if (userMessage.includes('bien dime que a pasado con tu esposa')) {
            message.reply('mmm nos divorciamos');
        } else if (userMessage.includes('mmm nos divorciamos')) {
            message.reply('seguro te dejo por ser infiel');
        } else if (userMessage.includes('seguro te dejo por ser infiel')) {
            message.reply('recuerdas que yo le mandaba rosas');
        } else if (userMessage.includes('recuerdas que yo le mandaba rosas')) {
            message.reply('pero la conquisto mas tu clavel');
        } else if (userMessage.includes('pero la conquisto mas tu clavel')) {
            message.reply('asi es...');
        } else if (userMessage.includes('asi es...')) {
            message.reply('llevamos juntos serenata');
        } else if (userMessage.includes('llevamos juntos serenata')) {
            message.reply('juntos hasta el balcon aquel');
        } else if (userMessage.includes('juntos hasta el balcon aquel')) {
            message.reply('tu la guitarra y yo maracas');
        } else if (userMessage.includes('tu la guitarra y yo maracas')) {
            message.reply('ella 15 y nosotros 16');
        } else if (userMessage.includes('ella 15 y nosotros 16')) {
            message.reply('solo por ser mi amigo te confieso');
        } else if (userMessage.includes('solo por ser mi amigo te confieso')) {
            message.reply('que pasa');
        } else if (userMessage.includes('que pasa')) {
            message.reply('me divorcie mas nunca la olvide');
        } else if (userMessage.includes('me divorcie mas nunca la olvide')) {
            message.reply('extrano su mirar sueno el regreso');
        } else if (userMessage.includes('extrano su mirar sueno el regreso')) {
            message.reply('le amo mas que cuando me case');
        } else if (userMessage.includes('le amo mas que cuando me case')) {
            message.reply('bien...');
        } else if (userMessage.includes('bien...')) {
            message.reply('no no tiene caso');
        } else if (userMessage.includes('no no tiene caso')) {
            message.reply('esto lo debe de saber');
        } else if (userMessage.includes('esto lo debe de saber')) {
            message.reply('conquistala amala');
        } else if (userMessage.includes('conquistala amala')) {
            message.reply('como cuando teniamos 16');
        } else if (userMessage.includes('como cuando teniamos 16')) {
            message.reply('llevemos juntos serenata');
        } else if (userMessage.includes('llevemos juntos serenata')) {
            message.reply('juntos hasta el balcon aquel');
        } else if (userMessage.includes('juntos hasta el balcon aquel')) {
            message.reply('tu la guitarra y yo maracas');
        } else if (userMessage.includes('were no strangers to love')) {//Never gonna give you up
            message.reply('you know the rules and so do i');
        } else if (userMessage.includes('you know the rules and so do i')) {
            message.reply('a full commitments what im thinking of');
        } else if (userMessage.includes('a full commitments what im thinking of')) {
            message.reply('you wouldnt get this from any other guy');
        } else if (userMessage.includes('you wouldnt get this from any other guy')) {
            message.reply('i just wanna tell you how im feeling');
        } else if (userMessage.includes('i just wanna tell you how im feeling')) {
            message.reply('gotta make you understand');
        } else if (userMessage.includes('gotta make you understand')) {
            message.reply('never gonna give you up');
        } else if (userMessage.includes('never gonna give you up')) {
            message.reply('never gonna let you down');
        } else if (userMessage.includes('never gonna let you down')) {
            message.reply('never gonna turn around and desert you');
        } else if (userMessage.includes('never gonna turn around and desert you')) {
            message.reply('never gonna make you cry');
        } else if (userMessage.includes('never gonna make you cry')) {
            message.reply('never gonna say goodbye');
        } else if (userMessage.includes('never gonna say goodbye')) {
            message.reply('never gonna tell a lie and hurt you');
        } else if (userMessage.includes('never gonna tell a lie and hurt you')) {
            message.reply('weve known each other for so long');
        } else if (userMessage.includes('weve known each other for so long')) {
            message.reply('your hearts been aching');
        } else if (userMessage.includes('your hearts been aching')) {
            message.reply('but youre too shy to say it');
        } else if (userMessage.includes('but youre too shy to say it')) {
            message.reply('inside we both know whats been going on');
        } else if (userMessage.includes('inside we both know whats been going on')) {
            message.reply('we know the game and were gonna play it');
        } else if (userMessage.includes('we know the game and were gonna play it')) {
            message.reply('and if you ask me how im feeling');
        } else if (userMessage.includes('and if you ask me how im feeling')) {
            message.reply('dont tell me youre too blind to see');
        } else if (userMessage.includes('dont tell me youre too blind to see')) {
            message.reply('never gonna give you up');
        } else if (userMessage.includes('ooh give you up')) {
            message.reply('ooh give you up');
        } else if (userMessage.includes('never gonna give never gonna give ooh give')) {
            message.reply('you up');
        } else if (userMessage.includes('you up')) {
            message.reply('never gonna give never gonna give ooh give');
        }
        // Guardar el mensaje en la base de datos
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
            const textToSpeak = message.body.slice(4); // Obtener el texto a convertir en audio

            // Configurar el idioma (por ejemplo, 'es' para español)
            const language = 'es';

            // Crear el objeto TTS
            const tts = new gtts(textToSpeak, language);

            // Generar el audio y guardarlo en un archivo
            const audioFilePath = 'audio.mp3'; // Nombre del archivo de audio
            const saveAudio = promisify(tts.save.bind(tts));
            await saveAudio(audioFilePath);

            // Enviar el archivo de audio
            const chat = await message.getChat();
            const media = MessageMedia.fromFilePath(audioFilePath);
            chat.sendMessage(media);
        }
        // Obtener el número total de mensajes guardados
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

        // Función para obtener el número total de mensajes guardados
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

        // Implementa la función para obtener un mensaje aleatorio de la base de datos
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

        //Enviar un sticker segun la imagen adjuntada al mensaje
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
            // Leer el contador actual de "xd" desde la base de datos
            xdCount = await readXDCount();

            // Incrementar el contador
            xdCount++;

            // Guardar el nuevo contador en la base de datos
            saveXDCount(xdCount);

            // Verificar si el contador es una decena
            if (xdCount % 10 === 0) {
                await message.reply(`XD Numero ${xdCount} (⁀ᗢ⁀)`);
            }
        } else if (message.body.startsWith('!cum')) {
            // Ruta a la carpeta "F" (asegúrate de que la ruta sea correcta)
            const folderPathfuck = 'C:\\Users\\Kema-Mada\\Desktop\\Kema-Bot\\cum';

            // Obtener la lista de archivos en la carpeta "F"
            const files = fs.readdirSync(folderPathfuck);

            // Función para seleccionar una imagen aleatoria
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
            // Ruta a la carpeta "F" (asegúrate de que la ruta sea correcta)
            const folderPathfuck = 'C:\\Users\\Kema-Mada\\Desktop\\Kema-Bot\\fuck';

            // Obtener la lista de archivos en la carpeta "F"
            const files = fs.readdirSync(folderPathfuck);

            // Función para seleccionar una imagen aleatoria
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
            const folderPathfuck = 'C:\\Users\\Kema-Mada\\Desktop\\Kema-Bot\\hug';
            const files = fs.readdirSync(folderPathfuck);

            function getRandomImage() {
                const randomIndex = Math.floor(Math.random() * files.length);
                const randomImageName = files[randomIndex];
                return path.join(folderPathfuck, randomImageName);
            }

            const mentionedUsers = message.mentionedIds;

            // Inicializa media fuera del bloque if
            let media;

            if (mentionedUsers && mentionedUsers.length > 0) {
                const contacts = await Promise.all(mentionedUsers.map(async mentionedUser => {
                    const contact = await client.getContactById(mentionedUser);
                    return contact ? contact : null;
                }));

                const mentionedNames = contacts.map(contact => contact ? `@${contact.number}` : '').join(' ');

                const response = `Awww ${mentionedNames}, te acaban de mandar un abrazo.\n`;

                // Asigna el valor de media dentro del bloque if
                media = MessageMedia.fromFilePath(getRandomImage());

                const mentions = contacts.filter(contact => contact !== null);

                await client.sendMessage(message.from, response, { mentions });

            } else {
                const media = MessageMedia.fromFilePath('C:\\Users\\Kema-Mada\\Desktop\\Kema-Bot\\autohug.jpg');
                await message.reply('Te estas... \nAutoabrazando?');
            }

            // Envía media fuera del bloque if
            await client.sendMessage(message.from, media, { sendMediaAsSticker: true });
        } else if (message.body.startsWith('!blowjob')) {
            const folderPathfuck = 'C:\\Users\\Kema-Mada\\Desktop\\Kema-Bot\\blowjob';
            const files = fs.readdirSync(folderPathfuck);

            function getRandomImage() {
                const randomIndex = Math.floor(Math.random() * files.length);
                const randomImageName = files[randomIndex];
                return path.join(folderPathfuck, randomImageName);
            }

            const mentionedUsers = message.mentionedIds;

            // Inicializa media fuera del bloque if
            let media;

            if (mentionedUsers && mentionedUsers.length > 0) {
                const contacts = await Promise.all(mentionedUsers.map(async mentionedUser => {
                    const contact = await client.getContactById(mentionedUser);
                    return contact ? contact : null;
                }));

                const mentionedNames = contacts.map(contact => contact ? `@${contact.number}` : '').join(' ');

                const response = `${mentionedNames}, TREMENDA CROMADA TE ESTAN DANDO!\n`;

                // Asigna el valor de media dentro del bloque if
                media = MessageMedia.fromFilePath(getRandomImage());

                const mentions = contacts.filter(contact => contact !== null);

                await client.sendMessage(message.from, response, { mentions });

            } else {
                media = MessageMedia.fromFilePath('C:\\Users\\Kema-Mada\\Desktop\\Kema-Bot\\mamaste.jpg');
                await message.reply('Jaja, te mamas.');
            }

            // Envía media fuera del bloque if
            await client.sendMessage(message.from, media, { sendMediaAsSticker: true });
        } else if (message.body.startsWith('!kill')) {
            const folderPathfuck = 'C:\\Users\\Kema-Mada\\Desktop\\Kema-Bot\\kill';
            const files = fs.readdirSync(folderPathfuck);

            function getRandomImage() {
                const randomIndex = Math.floor(Math.random() * files.length);
                const randomImageName = files[randomIndex];
                return path.join(folderPathfuck, randomImageName);
            }

            const mentionedUsers = message.mentionedIds;

            // Inicializa media fuera del bloque if
            let media;

            if (mentionedUsers && mentionedUsers.length > 0) {
                const contacts = await Promise.all(mentionedUsers.map(async mentionedUser => {
                    const contact = await client.getContactById(mentionedUser);
                    return contact ? contact : null;
                }));

                const mentionedNames = contacts.map(contact => contact ? `@${contact.number}` : '').join(' ');

                const response = `JODER, ACABAS DE ASESINAR A ${mentionedNames}!\n`;

                // Asigna el valor de media dentro del bloque if
                media = MessageMedia.fromFilePath(getRandomImage());

                const mentions = contacts.filter(contact => contact !== null);

                await client.sendMessage(message.from, response, { mentions });

            } else {
                media = MessageMedia.fromFilePath('C:\\Users\\Kema-Mada\\Desktop\\Kema-Bot\\autokill.jpg');
                await message.reply('Jaja, te mataste.');
            }

            // Envía media fuera del bloque if
            await client.sendMessage(message.from, media, { sendMediaAsSticker: true });
        } else if (message.body.startsWith('!ofrecerme a')) {
            const folderPathfuck = 'C:\\Users\\Kema-Mada\\Desktop\\Kema-Bot\\ofrecerse';
            const files = fs.readdirSync(folderPathfuck);

            function getRandomImage() {
                const randomIndex = Math.floor(Math.random() * files.length);
                const randomImageName = files[randomIndex];
                return path.join(folderPathfuck, randomImageName);
            }

            const mentionedUsers = message.mentionedIds;

            // Inicializa media fuera del bloque if
            let media;

            if (mentionedUsers && mentionedUsers.length > 0) {
                const contacts = await Promise.all(mentionedUsers.map(async mentionedUser => {
                    const contact = await client.getContactById(mentionedUser);
                    return contact ? contact : null;
                }));

                const mentionedNames = contacts.map(contact => contact ? `@${contact.number}` : '').join(' ');

                const response = `${mentionedNames} acabas de recibir una invitacion a ver netflix!\n`;

                // Asigna el valor de media dentro del bloque if
                media = MessageMedia.fromFilePath(getRandomImage());

                const mentions = contacts.filter(contact => contact !== null);

                await client.sendMessage(message.from, response, { mentions });

            } else {
                media = MessageMedia.fromFilePath('C:\\Users\\Kema-Mada\\Desktop\\Kema-Bot\\masturbando.jpg');
                await message.reply('Nadie te quiere hacer el sin respeto asi que te estas tocando solo...');
            }

            // Envía media fuera del bloque if
            await client.sendMessage(message.from, media, { sendMediaAsSticker: true });
        } else if (message.body.startsWith('!rape')) {
            // Ruta a la carpeta "F" (asegúrate de que la ruta sea correcta)
            const folderPathfuck = 'C:\\Users\\Kema-Mada\\Desktop\\Kema-Bot\\rape';

            // Obtener la lista de archivos en la carpeta "F"
            const files = fs.readdirSync(folderPathfuck);

            // Función para seleccionar una imagen aleatoria
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
            // Ruta a la carpeta "F" (asegúrate de que la ruta sea correcta)
            const folderPathfuck = 'C:\\Users\\Kema-Mada\\Desktop\\Kema-Bot\\kiss';

            // Obtener la lista de archivos en la carpeta "F"
            const files = fs.readdirSync(folderPathfuck);

            // Función para seleccionar una imagen aleatoria
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
            // Ruta a la carpeta "F" (asegúrate de que la ruta sea correcta)
            const folderPathfuck = 'C:\\Users\\Kema-Mada\\Desktop\\Kema-Bot\\punch';

            // Obtener la lista de archivos en la carpeta "F"
            const files = fs.readdirSync(folderPathfuck);

            // Función para seleccionar una imagen aleatoria
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
                const media = MessageMedia.fromFilePath('C:\\Users\\Kema-Mada\\Desktop\\Kema-Bot\\autopunch.jpg');
                await message.reply('jaja que putaso se dio ese kbron.');
                await client.sendMessage(message.from, media, { sendMediaAsSticker: true });
            }
        } else if (message.body.startsWith('!ignorar')) {
            // Ruta a la carpeta "F" (asegúrate de que la ruta sea correcta)
            const folderPathfuck = 'C:\\Users\\Kema-Mada\\Desktop\\Kema-Bot\\ignorar';

            // Obtener la lista de archivos en la carpeta "F"
            const files = fs.readdirSync(folderPathfuck);

            // Función para seleccionar una imagen aleatoria
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
            // Resetear el contador
            messageCounter = 0;

            // Enviar el mensaje recordando las reglas
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

        } else if (message.body.startsWith("!himno")) {
            const media = MessageMedia.fromFilePath('C:\\Users\\Kema-Mada\\Desktop\\Kema-Bot\\grasa.mp3');
            await message.reply('deberia llamarse "himno a la grasa".');
            client.sendMessage(message.from, media);
        } else if (message.body.startsWith("!admin")) {
            const media = MessageMedia.fromFilePath('C:\\Users\\Kema-Mada\\Desktop\\Kema-Bot\\admin.jpg');
            client.sendMessage(message.from, media);
        } else if (message.body.toLowerCase().includes("mala")) {
            await message.reply('Mala tu cola, no mames. (>ᴗ•)');
        } else if (message.body.toLowerCase().includes("klava es mia")) {
            await message.reply('Y-yo solo soy de quien pueda sacarme de este infierno llamado realidad.');
        } else if (message.body.toLowerCase().includes("numero aleatorio") || message.body.toLowerCase().includes("numero al azar")) {
            const randomNum = Math.floor(Math.random() * 10) + 1; // Generar número aleatorio del 1 al 10
            await message.reply(`¡Aquí tienes un número aleatorio: ${randomNum}!`);
        } else if (message.body.toLowerCase().includes("si o no")) {
            const randomNumber = Math.random(); // Generar un número aleatorio entre 0 y 1

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
            message.body.startsWith("spam")
        ) {
            await message.reply('sabias que el "spam" tiene origen\nen una comida en lata que llamada spam que les daban a los soldados pero debido a que siempre les llevaban lo mismo empezaron a odiar el spam.');
        }
        else if (
            message.body.toLowerCase().includes("mierda") ||
            message.body.toLowerCase().includes("shit")
        ) {
            await message.reply('Recaspita! Recorcholis! Rayos y centellas! (」＞＜)」');
        } else if (message.body.toLowerCase().includes('megumin')) {
            await message.reply('Uff, se imaginan comerse unas papas fritas en los muslos de Megumin? (*˘︶˘*)');
        } else if (message.body.toLowerCase().includes('adios')) {
            await message.reply('Hasta luego, la memoria de tu presencia no será volátil.');
        } else if (message.body.startsWith("hola")) {

            const media = MessageMedia.fromFilePath('C:\\Users\\Kema-Mada\\Desktop\\Kema-Bot\\imagen2.jpg');
            client.sendMessage(message.from, media);
        } else if (messageContent.includes("calor")) {
            // Si el mensaje es en un chat de grupo, utilizamos la mención del remitente
            if (message.isGroupMsg) {
                await client.sendMessage(chatId, `${chatId} Hey, hace mucho calor y pensé en escribirte.\nEs que quiero refrescarme con el frío de tu indiferencia.`);
            } else {
                // Si el mensaje es en un chat directo con el bot, podemos usar simplemente el número del remitente
                await client.sendMessage(chatId, `Hey, hace mucho calor y pensé en escribirte.\nEs que quiero refrescarme con el frío de tu indiferencia.`);
            }
        } else if (messageContent === 'curioso') {
            // Respuesta al comando "curioso"
            const respuestasCuriosas = [
                'Ataque a Obama (2013)\n El troleo más conocido y celebrado fue hacia el perfil de Obama el 22 de diciembre del 2013 y consistió en llenar los comentarios con la letra "ñ" en cada publicación, pues en el vocabulario inglés la "Ñ" no existe. El ataque fue reportado por noticias y Taringa. Este ataque dio paso a la creación del llamado Ataque de Denegación de Servicio, mejor conocido como DDoS. También dio origen al meme de Ñ.',
                'Maltrato Animal (2014)\n Maltrato animal en SDLG\n Mensaje de Cristian Luna\n Durante un tiempo, un idiota subía videos maltratando a sus mascotas constantemente en el grupo. Muchas personas lo criticaban y hasta lo denunciaban por violencia gráfica y maltrato animal. Este joven, cuyo nombre se hacía pasar como Cristian Luna, acostumbraba a publicar videos de él pateando a sus perros; incluso llegó a matar a uno de ellos. Sorprendentemente, eran la gran mayoría de los miembros del grupo que no veían esto con buenos ojos; tanto así que empezaron a criticarlo y odiarlo. Debido al odio que le daban, los administradores del grupo lo banearon por completo.\n Muy pocas saben esto, pero luego de un tiempo se descubrió que esta persona serviría como la pieza clave de inspiración para nada más y nada menos que el controversial joven youtuber chileno llamado Peluchín.',
                'El Tío Carlos Duty (2014)\n Durante el año 2014, año en el que el grupo comenzó a obtener relevancia, el grupo llegó a tener de miembro a un militar de origen latino. Este subía videos y fotos en el grupo mostrando a los otros miembros lo que era su trabajo, como enseñando sus armas o haciendo misiones en helicópteros.\n Zong_a_SDLG_-v\n Zong a SDLG -v\n El joven llegó a tener tanta popularidad que obtuvo el apodo de El Tío Carlos Duty por los miembros del grupo. De todas las cosas que llegó a publicar, solo se pudo encontrar un video que fue resubido el 10 de abril del 2017 por el canal de Two Random Men en YouTube.\n Después de muchas publicaciones, el joven anunció en el grupo que se iría a una misión importante y desde entonces no volvió a publicar jamás. Muchas teorías surgieron y la más aceptada es que creen que falleció en la misión que le encomendaron.',
                'Reuniones Grasosas (2014-2018)\nLa llamadas Reuniones Grasosas eran unas reuniones que hacían los miembros del grupo para conocerse en persona, socializar, hacer actividades, etc. Usualmente pasaba en toda Latinoamérica; desde México, Colombia, Perú hasta Chile y Argentina. También se hacían convenciones grasosas, que es cuando los administradores del grupo (especialmente Mr. Graso) hacían actividades para conocer a sus seguidores. Para saber que eras miembro del grupo, se hacía una especie de saludo en código o \'\'señal\'.',
                'Hackeo a Discovery Kids (2015 o 2016)\n\nEntre el 2015 o 2016, la señal de Discovery Kids sufrió un hackeo en donde transmitieron pornografía en pleno horario para los niños. Sin embargo, el hackeo duró solo unos 20 minutos y no fue transmitido en toda Latinoamérica. Luego del suceso, la compañía se disculpó en su página oficial de Facebook. Las grabaciones sobre el suceso no se pueden encontrar ya que duró muy poco el hackeo. La única evidencia de que pasó fue la disculpa de la compañía.\n\nEn un principio se culpó al grupo de Legión Holk, pero ellos negaron estos sucesos. Luego se descubrió que fueron miembros de SDLG, junto con otro grupo llamado Spiderman Cholo. El suceso terminó en algunos noticieros en Latinoamérica y Taringa.',
                'Videojuego de SDLG (2015)\nEn 2015, un chico llamado Daniel Galeana López, anunció la creación de un videojuego indie tipo Super Mario Bros en 2D llamado SDLG Adventure. Según él comentó en una publicación en Blogpost, era un reciclaje de uno de sus juegos ya extintos "Pusheen Runner". Cuando anunció esto por el grupo, muchos de los seguidores le dieron muchas idea y algunos se ofrecieron para ayudar a producirlo.\nDaniel formó un equipo, la cual llamó DGL Soft, para la producción del videojuego, tomando unas cuantas ideas de los comentarios y así fue como salió la primera versión para después publicarlo en GooglePlay.\nSe pueden encontrar algunas grabaciones del gameplay en YouTube sobre como era este juego. Actualmente, el videojuego no está disponible.',
                'Origen del meme Marcianito 100% real no fake (2015)\nEl meme de Marcianito 100% real no fake fue un meme ícono para SDLG, en especial su frase de \'\'100% real no feik\'\'. El origen de la frase inicialmente fue echa por el youtuber venezolano DrossRotzank como burla a una niña con discapacidad física en una publicación de Facebook el 18 de febrero del 2015 (actualmente borrada) promoviendo un vídeo del marcianito bailando con la canción cumbia de Nunca me Faltes del cantante argentino José Antonio Ríos.\nHay que recordar que Dross era conocido como el mayor troll del internet hispano en ese tiempo, que no tenía límites y tampoco hace falta mencionar que él poseía un humor bastante controversial. Además, Dross siempre tuvo cierto aprecio con la Grasa hasta el punto de promover algunos ataques que el grupo organizaba. Este hecho dio origen al Ataque del Fierro Locos y al incidente de Pedofilia en la Grasa.',
                'Ataque a Fierro Locos (2015)\nEl ataque a Fierro Locos se trataba de una niña con discapacidad física llamada Andrea Rodriguez. Esto se dio cuando DrossRotzank hizo una publicación de Facebook promocionando un video del Marcianito 100% real no fake. Varios miembros de SDLG que seguían a Dross, publicaron la foto de Andrea y empezaron a burlarse por su discapacidad física, llamándola Fierro Locos por sus dientes.\nAndrea también fue mofada por el grupo ya que esta también tenía un novio llamado Óscar Ávila, y que después se descubrió que este la engañaba con muchas chicas ya que supuestamente los padres de Andrea le pagaban a Óscar para que fuese su pareja. Lo curioso es que el hermano mayor de Andrea pertenecía al grupo de la Grasa y pidió que pararan con el cyber-bullying comentando que no había porque burlarse de otras personas por su apariencia física.\nDurante el mes del julio de ese año, en la página del grupo CiberAbismo (otro grupo polémico aliado con SDLG), salió una supuesta noticia hecha por la prima de Andrea llamada Fanny, que decía que ella se había suicidado por el bullying que le hacían y, a causa de esto, sus padres iban a llamar a las autoridades cibernéticas para denunciar a todos los grupos polémicos. Al recibir esta noticia, muchos miembros de CiberAbismo y SDLG celebraron el suceso. Actualmente se desconoce cuál fue su paradero y también se desconoce si de verdad murió o fue todo una mentira.',
                'Florencia Cajo (2016)\nFlorencia Cajo es una chica que perteneció al grupo desde el 2014 hasta el 2016. Su caso es bastante interesante. Ella, siendo una menor de 16 años, le había mandado unos \'\'nudes\'\' a otro chico que pertenecía al grupo y que, según la evidencia, su nombre es Julio Cézar Gomez. Aparentemente, el chico tuvo una disputa con ella lo cual su "venganza" fue difundir sus fotos privadas en todo el grupo. Te podrás preguntar: "¿Qué fue lo que hizo Florencia para merecer eso?". Simple, Florencia nunca le mandó un dibujo que el chico le había pedido.\nMuchos miembros del grupo empezaron a catalogar a Florencia como una AW (attention whore o puta de atención en español). Esto causó que recibiera acoso por parte de los miembros del grupo. Se sabe que los miembros le habían mandado sus fotos privadas a todos los contactos de Facebook que ella tenía, incluyendo su familia y su alegado novio, que terminó su relación con ella luego del incidente.\nPero el acoso no solo llegó hasta ahí, pues se sabe que los miembros del grupo la doxearon hasta más no poder, difundiendo su número de teléfono, su dirección de IP y su dirección de residencia. Después de todo lo que había ocurrido, surgió un rumor de que Florencia se había suicidado. Pero luego se descubrió que la noticia era falsa, lo cual causó que recibiera más bullying y acoso.\nEl revuelo fue tal, que se sabe que uno de los administradores del grupo, llamado Camilo Suarez, se metió en el dilema para tratar de ayudar a Florencia y calmar la situación. Pero el revuelo se volvió a escandalizar cuando Florencia lo insultó llamándolo ridículo he hipócrita, haciendo que Camilo se enojara y la empezara a insultar diciendo que ella era un estorbo y que gracias a ella, arruinaba la imagen del grupo. Esta pequeña interacción hizo que Florencia recibiera más bullying y acoso del que ya sufría, hasta que por fin decidió salirse del grupo.',
                'Policía Selfie (2016)\nDurante el mes de marzo del 2016, un miembro veterano del grupo llamado Héctor Mauro Ramos que también era policía bancario de Ciudad México, subió en el grupo un selfie en un baño público en donde se apuntaba un arma de su cabeza. También llegó a comentar que la utilizó para amenazar a su pareja para que volviera con él. La foto se hizo muy viral dentro y fuera del grupo, y también atrajo la atención de los medios.\nExactamente el 26 de marzo del 2016, muchos reportajes, periódicos, revistas y noticieros publicaron que el policía había sido dado de baja de su cargo por el Consejo de la Secretaría de Seguridad Pública de México y fue despedido de su trabajo en la agencia policial bancaria.',
                'Asalto en el Barrio Fortaleza (2016)\nEntre agosto y septiembre de 2016, un miembro del grupo llamado Checho Flores publicó que iba a asaltar a un niño que jugaba Pokémon Go en una plaza de su ciudad en el Barrio Fortaleza (Bolivia). Aprovechando que la prensa estaba a unas cuadras, escribió la frase "Alo Polisia :v?" como evidencia del suceso. El grupo tomó esto de una manera cómica, pero poco después salió un reportaje donde mostraban el lugar de los hechos.\nEl reportaje salió en el noticiero boliviano Telepaís del canal Unitel, en el que se hablaba del asalto a un niño que jugaba a altas horas de la noche en el centro de su ciudad. La grabación de la noticia se perdió y desde entonces, se ha convertido en un caso de Lost Media.\nCortesía de Lost Media en Español: Alo Polisia :v?',
                'Rateros de la Grasa (2016)\n\nEl incidente del Barrio Fortaleza inspiró a muchos miembros a crear una extensión no oficial de SDLG llamado Rateros de la Grasa. Esta extensión consistía en que los miembros publicaran los delitos que hicieran. En estos \'\'crímenes\'\', llegaban a estar desde simples robos de dulces y juguetes, hasta asaltos de mano armada y distribución de drogas.\n\nActualmente, la extensión sigue activa hoy día y los miembros se dedican a publicar credenciales robados, información personal basado en el robo de dirección de IP (doxxeo), archivos sacados de la web oscura, entre otras cosas más.\n\nUno de los casos más conocidos de esta extensión fue cuando en abril del 2016, un joven llamado Matías Gómez publicó que intentaría asaltar a un banco local Santander que le quedaba cerca de su casa. Esto llamó la atención de muchos miembros y también recibieron este comunicado con mucho apoyo. No se sabe con certeza si de verdad llegó a hacerlo.\n\nOtro caso ocurrido en esta extensión fue cuando en 2021, otro miembro de la extensión llamado Antonio Rodriguez se metió a una bodega que tenía guardado muchos artículos de tecnología y terminó robando varias tabletas modelo iPad Air. El 11 de abril de ese mismo año publicó en la extensión lo que había robado y pedía ayuda a los otros miembros para que lo ayudaran a cómo desbloquearlas.\n\nSe sabe también que muchos miembros de la extensión tienen un comercio en donde se ofrecen a vender cosas que robaron, ya sea digitalmente o físicamente. Algunos se ofrecen a conseguir información de alguna persona a cambio de dinero. Este subgrupo opera con un negocio bajo las sombras y estos ejemplos eran el tipo de comportamiento que usualmente se veían en esta extensión.\n\nAl día de hoy, la extensión sigue activa pero en un grupo privado.',
                'Saúl Leonardo y la serpiente (2017)\n\nA principio del 2017, un miembro del grupo llamado Saúl Leonardo se encontró con una serpiente venenosa en su patio. El joven publicó una foto de su patio en donde había una serpiente. Según la publicación, no era la primera vez que pasaba y que la iba a tratar de sacarla de su "territorio".\n\nEn el proceso de sacar la serpiente de su patio, la serpiente mordió a Leonardo y le inyectó un veneno que se corrió por sus venas, lo cual casi provocaba su muerte. Pocas horas después hizo una publicación en donde reveló que lo tuvieron que hospitalizar y darle tratamiento de limpieza de sangre. Luego de la publicación, muchos miembros lo utilizaron como objeto de burla y memes.',
                'SDLG: Crónicas Épicas (2016)\n\nSDLG: Crónicas Épicas, conocido por los miembros como El cómic de la Grasa, fue un proyecto abandonado hecho por el usuario TheEopSaid, que consistía en hacer un cómic sobre SDLG y los otros grupos polémicos de Facebook que existían en ese tiempo. En este cómic, hacían referencias de algunos ataques hacia otros grupos, eventos, actividades, referencia a personajes destacados, entre otras cosas más. Debido a las tantas veces que le dieron de baja al grupo, el cómic se perdió, convirtiéndose en otro caso de Lost Media.\n\nUn usuario que trabaja en la Wiki de Lost Media en Español llamado Psychodeus, se puso en contacto con el creador del cómic y le comentó que las páginas que tenía disponibles eran las primeras 8 páginas del cómic que hacían el prólogo de la historia, más un mapa que representaba cómo estaban divididos los grupos. Psychodeus anunció esto el 1 de diciembre del 2020.\n\nCortesía de Lost Media en Español: SDLG: Crónicas Épicas',
                'Doxxeo a los Administradores (2017)\n\nHubo un tiempo, en donde los administradores de SDLG fueron doxeados hasta más no poder por miembros del grupo. Los administradores que sufrieron el doxeo fueron Nadir, El Don Maguiber (co-fundador de la grasa) y Frozono. El doxeo fue tal que mucha gente llegó a descubrir sus números de celular, tarjetas de crédito, credenciales, etc.\n\nUno de los administradores que más sufrieron fue Maguiber, ya que lo doxearon a él y su familia, mandándoles mensajes de amenazas de robo, secuestros e incluso de muertes. A Nadir (la mano derecha de Mr. Graso) le llegaron a filtrar sus datos, la dirección de su casa, número de celular y sus nudes; se sabe que recibió mucho acoso y hasta llegaron a tirarle piedras fuera de su casa.',
                '#Besarelpisochallenge (2017)\n\n#Besarelpisochallenge era un reto que lanzaron los administradores del grupo en el que consistía en besar o lamer el piso y mandar una foto o video por el grupo. Se prometía que todo aquel que lo hiciera recibiría el rango de administrador. Sin embargo, a pesar de que muchos miembros participaron en el reto, como era de esperarse, no se les dio nada a cambio.\n\nSegún las teorías, este reto podría haber sido una posible venganza por parte de los administradores debido a que los miembros los habían doxxeado previamente. Se cree que el plan original de todo esto fue llevado a cabo por una persona controversial llamada Alexis Quintanilla, quien era el creador del grupo Ciber Abismo y también uno de los administradores del grupo SDLG.',
                'Productos de SDLG cancelados (2017)\n\nEn 2017, Alexis Quintanilla quiso lanzar una serie de productos al mercado que tenían imágenes del grupo SDLG.\n\nUno de los productos que intentó crear fue una línea de ropa con los diseños del grupo. Para ello, contrató a un artista para que dibujara un boceto con el personaje Pac-Man, el cual luego sería coloreado y digitalizado por computadora. Sin embargo, la línea de ropa no pudo ser vendida debido a problemas de copyright de Nintendo.\n\nEs así como estos productos de SDLG fueron cancelados antes de poder llegar al mercado.',
                'Guerras de Pixeles: SDLG vs Legión Holk, Reddit y 4chan (2017-2020)\n\nLuego del evento masivo de /r/place en Reddit, su legado continuó en Pixel Canvas.\n\nEl 13 de mayo de 2017, Legión Holk pintó su bandera y vandalizaron arte con color verde. Poco después, SDLG saboteó su bandera y el 15 de mayo la reemplazaron con la suya. Algunos (se cree que de Legión Holk) intentaron robar un emblema de Kekistan de 4chan al suroeste de lo cual causó preocupación por una posible venganza. También se saboteó con rojo el pixel art de ponis y de Pokémon, lo cual enojó a tableros de 4chan como /mlp/ y /v/. Eventualmente, Legión Holk se retiró de la batalla pero SDLG terminó robando el emblema de Kekistan.\n\nPara el 3 de junio, SDLG duplicó el tamaño de su bandera y la rodearon con banderas de países hispanos. La de México, al norte de fue la más grande, aunque recibían constantes ataques por parte de franceses. Mientras tanto, el tablero /bant/ de 4chan pintaba su bandera nazi al noroeste de y luego decidió expandirse hacia la bandera disputada por México y Francia.\n\nEl 4 de junio un bot comenzó a pintar la cara de moot (el creador de 4chan) cubriendo el campo de batalla. Aunque fue corregido por los moderadores, dejó casi todo en blanco. 4chan aprovechó para dibujar un trébol. Gente de /r/theblackvoid en Reddit se unieron para llenar el vacío con una mancha negra, mientras que SDLG buscaba recuperar su bandera. Desde ahí, se acentuó la pelea entre SDLG y Reddit.\n\nAl final, el trébol de 4chan sucumbió ante SDLG y /r/theblackvoid. SDLG reconstruyó su bandera y se declaró victorioso, pero en la segunda semana de junio, fue consumida por /r/theblackvoid y la bandera de México terminó conquistada por brasileños.\n\nEn Mayo del 2020, la tradición revivió cuando SDLG empezó a construir su logo rodeado de banderas hispanas, pero fue interceptado por Legión Holk. SDLG llegó a conservar su bandera por un buen tiempo y la batalla cesó. Al final, SDLG fue consumida por el arte de comunistas.\n\nActualmente, puedes encontrar lo único que sobrevivió de la batalla aquí:\nhttps://pixelcanvas.io/@1896,3220',
                'Pelea campal entre Legión Holk y SDLG (2017)\n\nOcurrido en México, esto fue una casualidad muy graciosa; resulta que en ambos grupos se iba a hacer una reunión grupal. Ambos grupos acordaron el mismo día, el mismo lugar y la misma hora.\n\nCuándo ambos grupos se encontraron, comenzaron a pelearse entre ellos, como resultado se vio a un joven ensangrentado porque lo golpearon hasta dejarlo en grave estado.',
                'La purga de 2018\n\nA mediados de junio de 2018, y en el contexto de las elecciones federales a realizarse en México el primero de julio, SDLG y la gran mayoría de los grupos de memes en Facebook fueron totalmente eliminados, con la intención de evitar organizaciones o de afectar la intención del voto.\n\nEn el caso de La Grasa, tanto el grupo principal (que ya había superado los 600.000 miembros) como casi todas las extensiones fueron repentinamente eliminadas, las cuentas de los administradores fueron inhabilitadas y cada grupo que se creaba con el nombre o siglas de La Grasa era eliminado de forma inmediata. Tanto Mr. Graso como Nadir y los otros administradores realizaron publicaciones al respecto en sus páginas personales, explicando la situación y comentando sobre las medidas a tomar para volver a recuperar los distintos grupos y extensiones lo antes posible.\n\nLa única extensión que no fue eliminada fue Gamers de la Grasa, lugar en el que se convocaron parte de los miembros para informarse al respecto (en la mayoría de los casos, para enterarse que no habían sido baneados individualmente en todos los grupos). En ese entonces, el único medio "oficial" donde se reunían los miembros fuera de Facebook era Google Plus, de tal manera que Mr. Graso aprovechó de promover el acercamiento a dicho medio para que la comunidad pudiera reunirse.\n\nEsta purga significó un antes y un después entre los grupos de memes en Facebook, puesto que muchos de ellos nunca más pudieron volver en su nivel anterior. En el caso de la Grasa, se percibía una especie de "persecución" directamente contra el grupo, específicamente el principal, puesto que cada vez que superaba los 100.000 miembros, el grupo era eliminado, de tal manera que las mudanzas de grupo y la existencia de grupos de respaldo se volvieron una constante por al menos un año.\n\nPor su parte, las extensiones no tuvieron problemas en volver, ya que los administradores de esta rápidamente comenzaron a crear nuevos grupos y a promover la participación entre los grasosos. Esto, además, con la ayuda de los administradores principales de la Grasa, como Mr. Graso y, en mayor medida, Nadir, para la promoción de estos grupos en sus sitios personales de Facebook e Instagram.',
                'SDLG en el Club MediaFest (2018)\n\nEl Club MediaFest es una actividad que se hace anualmente en países de Latinoamérica. En estos eventos, se reúnen a los youtubers hispanos más virales del año, cantantes de talla local (con el fin de hacerlos más conocidos) y algunos comediantes para hacer reír a la gente. A finales del año 2018, el Club MediaFest hizo su evento en Paraguay, donde el comienzo del evento fue presentado por Mr. Graso (líder y fundador de SDLG) acompañado del youtuber Tío Wolf en donde hicieron, de manera sátira, una comedia tratando a la Grasa como una religión. En la comedia, ellos estaban vestidos de obispos religiosos con imágenes del grupo.',
                'Hackeo a El Reeven (2020)\n\nEl Reeven era un youtuber que se dedicaba a hacer troleos en internet. Desde trolear a "niños ratas" en videojuegos, hasta sabotear foros y/o convenciones por internet. Su fama surgió entre finales del 2020 al 2021 cuando "troleaba" en reuniones escolares en la plataforma de Zoom con el video de la tula de town (Un video filtrado de iTownGamePlay sacudiendo la nutria), todas llenas de niños menores de edad.\n\nMuchos youtubers empezaron a hablar sobre su contenido y criticarlo, lo cual causó mucha polémica. Lo curioso de todo esto fue que varios miembros de SDLG le hackearon su cuenta de Youtube y empezaron a borrar todos sus videos y amenazaron con hackear a otros youtubers si hacían lo mismo. Unas semanas después, borraron su canal de Youtube.',
                'El surgimiento de los Panafrescos (2020)\n\nA principios del 2020, una nueva comunidad surgió con el propósito de ser los rivales principales de La Grasa. Los llamados Panafrescos o "Panas Frescos", se dedicaban a crear memes insultando a la grasa haciendo de que muchas personas dejaran al grupo para ser parte de los Panafrescos. Varias de las razones por las cuales odiaban a la grasa era porque sobre-usaban los mismos memes. Aunque La Grasa se defendía de los Panafrescos, fue disminuyendo y poco a poco fue quedando en el olvido. Muchos miembros de los Panafrescos eran antiguos miembros de SDLG que se "arrepentían" de ser parte de los "Grupos Autistas".',
                'SDLV (2021)\n\nA principios del 2021, se creó un subgrupo llamado SDLV (Seguidores de los Viejos), en la que se dedica a tratar de revivir la "Grasa Antigua", aunque no hay evidencia de que lo hallan logrado y, curiosamente, no duró mucho tiempo en las redes.\n\nEste subgrupo, provenía de una porción de los miembros que defendieron al grupo durante la controversia de los Panafrescos y querían que este volviera a los ataques y actividades que hacían antes. La idea no fue muy bien recibida en el grupo principal, así que decidieron hacer su propia extensión asociada a la Grasa con el propósito de demostrar que esta idea funcionaría.\n\nEste subgrupo fue parte de polémicas de acoso, doxxeo, y amenazas hacia otros grupos. Uno de los casos más conocidos fue en el que intentaron formar una guerra contra Grupo Pendejo para Morros Pendejos (lo cual casi lo lograron) pero fueron detenidos por otro grupo llamado Derecho al Infierno el cual había hecho un tratado de alianza con SDLG para defenderlos de ataques de otros grupos.\n\nDebido al inmenso fracaso de este subgrupo, terminó siendo catalogado como un grupo falso de SDLG, lo cual el grupo de D.A.I se encargó de eliminarlo por completo de las redes sociales.',
                'ADLG Francisco Rojas (2022)\n\nEn la extensión de SDLG llamada ADLG (Anime De La Grasa) un usuario llamado Francisco Rojas, publicaba cosplays de personajes femeninos donde se veía muy femenino al punto que hacía dudar de la sexualidad de todos en el grupo. Un día fue invitado como juez a un evento de Cosplay publicando que estaba en el evento, pero nadie lo reconoció, hasta que la cosplayer HatoJoestar publico una foto con Francisco. Mostrándose muy diferente a como se veía en sus fotos publicadas. Lo ocurrido hizo que diera un comunicado en donde había informado que se iba a tomar una foto de él sin filtros. La publicación fue en su perfil, pero muchos usuarios no tardaron en ver indicios donde si había editado su foto. Se excusó dando a entender que podía ser por la luz o el ángulo donde se tomó la misma. Varios usuarios compararon las caras de cada cosplay y se veía que los rasgos de la cara cambiaban en algunos cosplays donde se veía raro. Los memes de la polémica se dispararon y en ADLG se hizo una censura orquestada por el moderador Tute Soto eliminando cualquier meme que fuera del tema. Un usuario de Twitter hackeo su cuenta de Google, no encontró nada importante, pero si encontró la foto verdadera que publico Francisco en su perfil, donde decía que no usaba filtros. La polémica escaló tanto que llego un punto en el que Francisco puso en privado su perfil y estuvo inactivo por un tiempo. el grupo ADLG donde Francisco era moderador, gano la votación del peor moderador del año. En un post llamado ‘‘El Elitista’’ en su Edición nro. 13, en la página ‘‘vergüenza del año’’ Francisco consiguió el 5.º lugar como vergüenza del año. El 4 de enero del 2023. Francisco hizo una transmisión en su cuenta personal con Janir Gremory como invitada donde tuvieron una entrevista y unas declaraciones de parte de Francisco sobre no entender la polémica y no sentirse afectado por las críticas que se le hizo. Al día siguiente borro la transmisión del mismo, y borro todas sus redes, Y tiempo despues se confirma por Janir Gremory que quien estaba en la camara no era ella, era su hermano vestido de ella. Tras su desaparición, el Administrador de ADLG, Jherson Torres, publico un Post afirmado que habían encontrado el cuerpo de Francisco sin vida. Tiempo después, Jherson elimino el post, ya que se había descubierto que era fake news. Y que el caso no estaba relacionado con Francisco.',
                'Resurgimiento\n\nA mediados del 2020, el Shitpost Hispano evolucionó a ser un humor más estructurado (compuesto principalmente de humor sin sentido) gracias a un grupo llamado los Caballeros. Estos, empezaron a criticar a los Panafrescos por su hipocresía mientras criticaban a La Grasa por sobreexplotar sus memes cuando estos hacían lo mismo hasta tal punto que, irónicamente, terminaron siendo más odiados que SDLG. Los Panafrescos fueron llamados La Grasa 2.0 por estas razones, causando que quedaran en el olvido.\n\nEventualmente, varios grupos shitposting empezaron a usar imágenes macro de la serie de Breaking Bad y los parodiaba con comentarios a favor de la Grasa, este meme se conoció como Breaking Bad Grasa. Esto lo hacían con forma de burla pero no pasó poco para que la misma Grasa usara esos memes a su favor, así se empezó a revivir el grupo una ves más; con estos sucesos, se creó la famosa frase de La Grasa no muere, solo evoluciona.... Esto causó que muchos shitposters crearan la versión Anti-Grasa, que en vez de Breaking Bad, usaban imágenes de las películas de Men in Black.\n\nAunque no le dan el mismo odio que le daban los Panafrescos, esos grupos ha utilizado otras maneras para burlarse de la Grasa. Los ejemplos más destacados son los Memes Papus, que consiste en subir una foto de muy mala calidad y añadirle el famoso emoticón pacman.\n\nPero no fue hasta finales de julio y principios de agosto del 2021 en donde un usuario en Twitter publicó una imagen del Pato Lucas en traje de gala con la frase "Éramos más unidos en la grasa...", que básicamente criticaba, de manera irónica, el estado actual de los memes hispanos y describe que en La Grasa todos éramos más unidos, sin odio ni rivalidad. Aunque hay mucha ironía en ese meme, muchos shitposters empezaron a publicarlo en otras plataformas expandiendo el mensaje y reviviendo el apoyo de SDLG.\n\nMuchos otros memes empezaron a surgir, reviviendo poco a poco la relevancia del grupo. Un claro ejemplo de esto fue la aparición de una imagen macro, conocida como "La Papu Señal", que parodiaba de manera irónica los llamado que se hacían en el grupo, sobre todo en las reuniones grasosas.',
                'La Grasa 2 (2022)\n\nAviso de la creación de La Grasa 2\n\nPara evitar un shadowban de la plataforma Facebook, se cambió su nombre de "Seguidores de La Grasa" a simplemente "La Grasa".\n\nLa Grasa 2 en Facebook (2022)\n\nEl grupo ha tenido un segundo auge tras que en marzo de 2022 Mr. Graso anunció la creación de un nuevo grupo, junto al Streamer Late, el cual estaría más enfocado al humor en general, englobando el humor autista de toda la vida y al Shitpost.',
                'El quiebre\n\nA mediados de 2022, la Grasa sufriría un importante quiebre entre los administradores. Por un lado, Nadir reclamaría que, en realidad, Mr. Graso (que se hacía llamar públicamente el líder del grupo y actuaba como la cara visible de este), nunca realizaba publicaciones, dinámicas y no estaba realmente interesado en mantener el grupo activo, argumentando que esto lo hacían los administradores y él se llevaba el crédito, situación que no le parecía justa. Por su parte, Mr. Graso argumentaba que su elección de líder había sido decidida en los inicios del grupo, afirmando también que gracias a él el grupo aún existía, puesto que mediante sus redes sociales organizaba a los grasosos y era la cara visible del grupo.\n\nFinalmente, y luego de algunos "idas y vueltas", Nadir decidiría alejarse de Mr. Graso y crear su propio grupo "principal", en un nombre que variaría entre SDLG y/o Seguidores de la Grasa, esto en un afán de volver a las raíces y aprovechar el reconocimiento que aún tenía el nombre. Mr. Graso por su parte crearía el grupo "La Grasa :v", manteniendo la tendencia a ocultar gran parte de las siglas para evitar el baneo instantáneo de Facebook, proveniente desde la purga de 2018.\n\nEn la actualidad, el grupo principal de Nadir, «SDLG :v» cuenta con más de 113.000 miembros. Por su parte, el grupo principal de Mr. Graso, «La Grasa :v» cuenta con más de 134.000 miembros. Es importante destacar que la mayoría de los miembros no ha mostrado favoritismo por uno u otro, de tal manera que en general son parte de ambos grupos.\n\nCuriosamente, las distintas extensiones no fueron parte de dicha separación, de tal manera que es posible observar allí la convivencia entre los administradores de los dos grupos principales.',
                'Guerras de Pixeles 3 (2022)\n\nDurante Marzo de 2022, el grupo se apoderó nuevamente de PixelCanvas.io con una tercera Guerra los Píxeles. Teniendo roces con la comunidad de 4chan nuevamente, actualmente el dibujo se encuentra destruido por los cambios de coordenadas que hizo la página el 1 de Abril de 2022, dejando el PixelArt desatendido y expuesto a vandalismo.',
                'Momos\n\nLos memes de la Grasa, mejor conocidos como momos, están llenos de humor negro y jerga. Sin embargo, desde mediados del 2019, los memes pasaron del humor negro a contenido identificable e irónico mezclado con plantillas de escenas de la cultura popular. (Películas, series, videojuegos, frases de youtubers, etc...)\n\nEl Pacman\n\nOtro de los casos más icónicos del grupo fue al que se le asoció el emoticón pacman "V- Emoticon Pacman o sus siglas ":v" y lo usó como la cara del grupo. Además fue el grupo al que más se le culpó de apropiar la jerga Taringuera.\n\nMarcianito 100% real no fake\n\nEntre los memes más representativos, se destaca el Marcianito 100% real no feik; que se originó gracias al youtuber DrossRotzank y muchas personas de SDLG lo popularizaron por su uso excesivo en el grupo. Además, la frase del meme se utilizó mucho gracias a los llamados humildes aportes. Antes de que llegara a las comunidades hispanohablantes, el GIF del marciano se utilizó en Tumblr por comunidades angloparlantes.\n\n¿Quieres pene?\n\nOtro meme que se originó en SDLG fue el de ¿Quieres pene?, que fue otro troleo pero dirigido cualquier pagina de Facebook de diferentes empresas en la cual varios le enviaban sus dudas a dichas paginas y cuando el administrador le respondía, ellos le mandaban una imagen preguntando "¿Quieres pene?".\n\n"Este grupo será atacado por la grasa"\n\nCon el humor decayendo y con el auge de grupos hispanos del Shitpost, surgieron memes de Breaking Bad que parodiaban a los ataques de La Grasa, con frases como Este grupo será atacado por la grasa.";',
                '¿Otro SDLG?\n\nShandong Lingong Construction Machinery Co.\nFundado en 1972, "Shandong Lingong Construction Machinery Co." es una corporación de la República Popular China.\n\nEs uno de los fabricantes más importantes de maquinaria para construcción y minería, motores diésel y turbinas industriales de gas en China, con exportaciones hacia Brasil y África. SDLG también es una filial de la empresa de Volvo.\n\nLos colores del rojo y negro, fueron la base de inspiración para los primeros Grupos Polémicos como Secta MOA, Seguidores de la Grasa, Negroserías y Clan Mantequilla.\n\nComo La Grasa y la compañía comparten las mismas siglas, la comunidad apropió el logotipo de SDLG, aunque no se sabe cuándo ocurrió esto.\n\nDesde mediados del 2020, el grupo obtuvo un nuevo logo basado en los colores originales.',
                'Origen:\n\nPágina del Gordo Friki\nLa Grasa sirvió como grupo oficial de la página de Facebook "El Gordo Friki", creada por el paraguayo Gerardo Valdez, conocido como el "Gordo", "Mr. Graso" y muchas veces confundido como "Alexis Sánchez". En una tesis de grado publicada el 2020, se entrevista al Gordo y dice que la página "El Gordo Friki" se originó el 2010 y creó SDLG el 2013. Debido a una controversia surgida en 2022 con el grupo, Mr. Graso ha estado de que el grupo fue originalmente nombrado como "Los Seguidores de la Grasa del Gordo Friki" para luego ser renombrado a "Seguidores de la Grasa" por ser demasiado largo.\n\nPágina original de Seguidores de la Grasa\nEl grupo fue inspirado en otro grupo polémico llamado Secta MOA, cuando la página de El Gordo Friki hizo alianzas con el fundador de MOA, Jarm.\n\nEn general, grupos de este tipo se originaron por el 2012, año que ocurrió el boom de hacer páginas inspiradas en Rage Comics. Pero aquel no fue el único boom, sino también estaba de moda ser polémico y troll de Internet. Las páginas de Facebook que tenían esos fines solían llevar la etiqueta de "Humor Polémico" al final de sus nombres y algunas tenían grupos polémicos para realizar ataques a otros grupos. Todos estos grupos fueron inspirados en el padre de todos, Secta MOA.',
                'Reuniones Grasosas (2014-2018)\nReunión grasosa\nRG en Colombia (2016)\n\nLa llamadas Reuniones Grasosas eran unas reuniones que hacían los miembros del grupo para conocerse en persona, socializar, hacer actividades, etc. Usualmente pasaba en toda Latinoamérica; desde México, Colombia, Perú hasta Chile y Argentina. También se hacían convenciones grasosas, que es cuando los administradores del grupo (especialmente Mr. Graso) hacían actividades para conocer a sus seguidores. Para saber que eras miembro del grupo, se hacía una especie de saludo en código o \'\'señal\'.'
            ];

            const respuestaAleatoria = respuestasCuriosas[Math.floor(Math.random() * respuestasCuriosas.length)];
            await message.reply(respuestaAleatoria);
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