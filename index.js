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
const express = require("express");
const app = express();

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
const palabrasProhibidas = ["homosexual", "nigga", "cod points", "caldo de pollo", "hitler", "cp", "cepesito", "nazi", "tontos", "ocupo ", "ocupas", "child porn", "pornografia infantil", "caldito de pollo", "callense", "callaros", "callaos", "infantil", "niñas", "children", "menores de edad", "cepe", "codigo postal", "club penguin", "marica", "matate", "suicidate", "chat.whatsapp", "discord.gg", "chango", "simio", "maric", "joto", "calla", "cálla"];
client.on('message', async message => {
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
    if (mensajeLowerCase === '!delete') {
        if (message.hasQuotedMsg) {
            const quotedMsg = await message.getQuotedMessage();
            if (quotedMsg) {
                quotedMsg.delete(true);
            } else {
                // Manejar el caso en el que no se pudo obtener el mensaje citado
                message.reply('No se pudo obtener el mensaje citado para eliminar.');
            }
        } else {
            // Manejar el caso en el que no hay un mensaje citado
            message.reply('No hay un mensaje citado para eliminar.');
        }
    }
    if (mensajeLowerCase === "!momo" || mensajeLowerCase === "!meme" || messageCounter === 100) {
        const folderPath = 'Freddy69704123/template-nodejs/momos';
    
        // Obtener la lista de archivos en la carpeta "momos"
        const files = fs.readdirSync(folderPath);
    
        // Función para seleccionar una imagen aleatoria
        function getRandomImage() {
            const randomIndex = Math.floor(Math.random() * files.length);
            const randomImageName = files[randomIndex];
            return path.join(folderPath, randomImageName);
        }
    
        // Obtener el ID del chat
        const chatId = message.from;
    
        // Crear un mensaje de respuesta
        const response = `Reacciona con "✈" o "🏢"!`;
        
        // Obtener una imagen aleatoria
        const media = MessageMedia.fromFilePath(getRandomImage());
    
        // Enviar el mensaje con la imagen al chat
        await client.sendMessage(chatId, response, { media });
    }
    // Verificar si el mensaje contiene alguna palabra prohibida
    for (const palabraProhibida of palabrasProhibidas) {
        if (mensajeLowerCase.includes(palabraProhibida.toLowerCase())) {
            // Eliminar el mensaje que contiene una palabra prohibida
            message.delete(true);
            message.reply('Tu mensaje ha sido eliminado por favor evita este tipo de conductas si no quieres ser eliminado.');
            // También puedes tomar otras acciones aquí, como notificar al usuario o registrar el evento.
            break; // Salir del bucle una vez que se elimine el mensaje
        }
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
            const folderPathfuck = 'Freddy69704123/template-nodejs/cum';

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
            const folderPathfuck = 'Freddy69704123/template-nodejs/fuck';

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
            const folderPathfuck = 'Freddy69704123/template-nodejs/hug';
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
                const media = MessageMedia.fromFilePath('Freddy69704123/template-nodejs/autohug.jpg');
                await message.reply('Te estas... \nAutoabrazando?');
            }

            // Envía media fuera del bloque if
            await client.sendMessage(message.from, media, { sendMediaAsSticker: true });
        } else if (message.body.startsWith('!blowjob')) {
            const folderPathfuck = 'Freddy69704123/template-nodejs/blowjob';
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
                media = MessageMedia.fromFilePath('Freddy69704123/template-nodejs/mamaste.jpg');
                await message.reply('Jaja, te mamas.');
            }

            // Envía media fuera del bloque if
            await client.sendMessage(message.from, media, { sendMediaAsSticker: true });
        } else if (message.body.startsWith('!kill')) {
            const folderPathfuck = 'Freddy69704123/template-nodejs/kill';
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
                media = MessageMedia.fromFilePath('Freddy69704123/template-nodejs/autokill.jpg');
                await message.reply('Jaja, te mataste.');
            }

            // Envía media fuera del bloque if
            await client.sendMessage(message.from, media, { sendMediaAsSticker: true });
        } else if (message.body.startsWith('!ofrecerme a')) {
            const folderPathfuck = 'Freddy69704123/template-nodejs/ofrecerse';
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
                media = MessageMedia.fromFilePath('Freddy69704123/template-nodejs/masturbando.jpg');
                await message.reply('Nadie te quiere hacer el sin respeto asi que te estas tocando solo...');
            }

            // Envía media fuera del bloque if
            await client.sendMessage(message.from, media, { sendMediaAsSticker: true });
        } else if (message.body.startsWith('!rape')) {
            // Ruta a la carpeta "F" (asegúrate de que la ruta sea correcta)
            const folderPathfuck = 'Freddy69704123/template-nodejs/rape';

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
            const folderPathfuck = 'Freddy69704123/template-nodejs/Kema-Bot\\kiss';

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
            const folderPathfuck = 'Freddy69704123/template-nodejs/punch';

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
                const media = MessageMedia.fromFilePath('Freddy69704123/template-nodejs/autopunch.jpg');
                await message.reply('jaja que putaso se dio ese kbron.');
                await client.sendMessage(message.from, media, { sendMediaAsSticker: true });
            }
        } else if (message.body.startsWith('!ignorar')) {
            // Ruta a la carpeta "F" (asegúrate de que la ruta sea correcta)
            const folderPathfuck = 'Freddy69704123/template-nodejs/ignorar';

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
            const media = MessageMedia.fromFilePath('Freddy69704123/template-nodejs/grasa.mp3');
            await message.reply('deberia llamarse "himno a la grasa".');
            client.sendMessage(message.from, media);
        } else if (message.body.startsWith("!admin")) {
            const media = MessageMedia.fromFilePath('Freddy69704123/template-nodejs/admin.jpg');
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

            const media = MessageMedia.fromFilePath('Freddy69704123/template-nodejs/imagen2.jpg');
            client.sendMessage(message.from, media);
        } else if (messageContent.includes("calor")) {
            // Si el mensaje es en un chat de grupo, utilizamos la mención del remitente
            if (message.isGroupMsg) {
                await client.sendMessage(chatId, `${chatId} Hey, hace mucho calor y pensé en escribirte.\nEs que quiero refrescarme con el frío de tu indiferencia.`);
            } else {
                // Si el mensaje es en un chat directo con el bot, podemos usar simplemente el número del remitente
                await client.sendMessage(chatId, `Hey, hace mucho calor y pensé en escribirte.\nEs que quiero refrescarme con el frío de tu indiferencia.`);
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
