export const categories = [
  'Habilidad y arcade',
  'Precisión y timing',
  'Velocidad contra reloj',
  'Memoria y lógica',
  'Rapidez y multitarea',
] as const;

export type Category = (typeof categories)[number];
export type Direction = 'higher' | 'lower';
export type Confidence = 'Oficial' | 'Vídeo' | 'Vídeo + análisis' | 'Sin confirmar';
export type Mechanic =
  | 'target' | 'dodge' | 'timing' | 'balance' | 'sequence' | 'count' | 'color'
  | 'typing' | 'maze' | 'race' | 'aim' | 'stack' | 'sort' | 'tiles' | 'rhythm'
  | 'sokoban' | 'flap' | 'swing' | 'catch' | 'swerve' | 'bingo' | 'basket' | 'draw';

export interface GameManifest {
  id: string;
  name: string;
  category: Category;
  instructions: string;
  metric: string;
  unit: string;
  direction: Direction;
  benchmark: string;
  durationSec: number;
  mechanic: Mechanic;
  confidence: Confidence;
  emoji: string;
}

type Row = [
  name: string, category: Category, instructions: string, metric: string, unit: string,
  direction: Direction, benchmark: string, durationSec: number, mechanic: Mechanic,
  confidence: Confidence, emoji: string,
];

const rows: Row[] = [
  ['Pingüino Escalador','Habilidad y arcade','Toca en el momento justo para girar alrededor del piolet y aterrizar en la zona verde. Un perfecto suma 10 m.','Distancia','m','higher','163,9 m',60,'timing','Oficial','🐧'],
  ['Púas de Puercoespín','Habilidad y arcade','Dispara una púa móvil por un hueco libre sin chocar con las púas clavadas.','Puntos','puntos','higher','26',60,'aim','Vídeo','🦔'],
  ['Lémur Giratorio','Habilidad y arcade','Engánchate en la zona roja de la curva y suelta cuando apuntes recto al tramo siguiente.','Puntos','puntos','higher','114',60,'swing','Vídeo + análisis','🐒'],
  ['Libélula Espacial','Habilidad y arcade','Guía la libélula entre asteroides sin chocar.','Puntos','puntos','higher','61',60,'dodge','Vídeo','🪰'],
  ['Armadillo en Picado','Habilidad y arcade','Mantén para bajar por la torre en espiral y da toques suaves para girar.','Puntos','puntos','higher','462',60,'swerve','Vídeo','🦔'],
  ['Rana Saltarina','Habilidad y arcade','Salta siguiendo la trayectoria marcada y cae sobre la siguiente plataforma.','Puntos','puntos','higher','554',60,'flap','Vídeo','🐸'],
  ['Pulga Botadora','Habilidad y arcade','Dibuja una línea bajo la pulga para rebotar; encadena combos antes de caer en los pinchos.','Puntos','puntos','higher','69',60,'draw','Vídeo + análisis','🦗'],
  ['Gallina Aleteadora','Habilidad y arcade','Aletea a izquierda o derecha para subir por un desfiladero estrecho con viento.','Distancia','m','higher','190 m',60,'flap','Oficial','🐔'],
  ['Murciélago entre Pinchos','Habilidad y arcade','Toca para esquivar pinchos laterales mientras el murciélago rebota entre paredes.','Puntos','puntos','higher','42',60,'dodge','Vídeo','🦇'],
  ['Guepardo Derrapante','Habilidad y arcade','Toca en cada curva para seguir el camino en zigzag sin salirte.','Puntos','puntos','higher','143',60,'swerve','Vídeo','🐆'],
  ['Gorrión Aleteador','Habilidad y arcade','Cada toque impulsa al gorrión hacia arriba; pasa por los huecos entre columnas.','Puntos','puntos','higher','30',60,'flap','Vídeo','🐦'],
  ['Abejorro Propulsado','Habilidad y arcade','Sube esquivando rayos láser; mantenerte centrado te deja margen para reaccionar.','Distancia','m','higher','264 m',60,'dodge','Vídeo + análisis','🐝'],
  ['Erizo Cruzacalles','Habilidad y arcade','Desliza en cuatro direcciones para cruzar carriles con coches durante unos 40 segundos.','Puntos','puntos','higher','124',40,'dodge','Oficial','🦔'],
  ['Foca Malabarista','Habilidad y arcade','Mantén y arrastra para que la pelota no caiga; cada toque suma.','Puntos','puntos','higher','41',60,'catch','Oficial','🦭'],
  ['Castor Lanzador','Habilidad y arcade','Lanza dientes al tronco giratorio sin tocar los que ya están clavados.','Puntos','puntos','higher','54',60,'aim','Vídeo','🦫'],
  ['Liebre en la Autopista','Habilidad y arcade','Cambia de carril para esquivar el tráfico mientras aumenta la velocidad.','Distancia','m','higher','1.026 m',60,'dodge','Vídeo','🐇'],
  ['Lobo Lunar','Habilidad y arcade','Lanza al lobo aprovechando la curva de las montañas; un buen ángulo congela el reloj.','Distancia','m','higher','91,76 m',60,'aim','Vídeo + análisis','🐺'],
  ['Panda Leñador','Habilidad y arcade','Cambia de lado para cortar bambú y esquivar las ramas antes de que se vacíe el tiempo.','Puntos','puntos','higher','130',60,'swerve','Vídeo','🐼'],
  ['Gecko Trepador','Habilidad y arcade','Salta de pared a pared evitando los pinchos; puntúa la distancia.','Distancia','m','higher','76,8 m',60,'flap','Vídeo','🦎'],
  ['Anguila Eléctrica','Habilidad y arcade','Toca para cambiar de dirección entre barras de neón y recoger puntos amarillos.','Puntos','puntos','higher','113',60,'swerve','Oficial','🐍'],
  ['Mantis Cortadora','Habilidad y arcade','Mantén para cortar cubos seguidos y suelta antes de los prohibidos; tienes tres vidas.','Puntos','puntos','higher','306',60,'tiles','Vídeo + análisis','🦗'],
  ['Serpiente Glotona','Habilidad y arcade','Desliza para dirigir la serpiente; come, crece y esquiva obstáculos.','Puntos','puntos','higher','25',60,'swerve','Oficial','🐍'],
  ['Flamenco Equilibrista','Habilidad y arcade','Equilibra una espada moviendo el dedo a los lados y aguanta todo lo posible.','Supervivencia','s','higher','33,59 s',60,'balance','Oficial','🦩'],
  ['Araña Tejedora','Habilidad y arcade','Usa un control para girar y otro para crecer; avanza de nodo en nodo sin romper el hilo.','Puntos','puntos','higher','163',60,'swing','Vídeo + análisis','🕷️'],
  ['Tucán Balancín','Habilidad y arcade','Mantén una bola sobre la balanza; centrarla activa el multiplicador perfecto.','Supervivencia','s','higher','63,87 s',60,'balance','Vídeo','🦜'],
  ['Camaleón Columpio','Habilidad y arcade','Mantén para engancharte con la lengua y suelta para volar entre columnas.','Puntos','puntos','higher','310',60,'swing','Oficial','🦎'],
  ['Canguro Trampolín','Habilidad y arcade','Rebota de plataforma en plataforma subiendo sin caerte.','Puntos','puntos','higher','176',60,'flap','Vídeo','🦘'],
  ['Hormiga Zigzag','Habilidad y arcade','Toca para cambiar de dirección y mantenerte sobre el camino en zigzag.','Puntos','puntos','higher','201',60,'swerve','Oficial','🐜'],

  ['Ojo de Halcón','Precisión y timing','Toca cuando la aguja recorra el centro de la barra de colores; son cinco rondas.','Precisión media','%','higher','97,89 %',60,'timing','Oficial','🦅'],
  ['Medusa a Partes Iguales','Precisión y timing','Arrastra el dedo para cortar la medusa primero por la mitad, luego en tercios y cuartos.','Precisión','%','higher','99 %',60,'draw','Oficial','🪼'],
  ['Gallo Puntual','Precisión y timing','Detén el contador justo en el tiempo objetivo de cada ronda.','Desviación','s','lower','0 s',60,'timing','Oficial','🐓'],
  ['Grillo Rítmico','Precisión y timing','Sigue el pulso de luz y repite el mismo tempo cuando la luz desaparezca.','Precisión','%','higher','98,4 %',60,'rhythm','Oficial','🦗'],
  ['Marmota Cronómetro','Precisión y timing','Toca justo cuando termine de vaciarse la barra.','Desviación','s','lower','0,06 s',60,'timing','Oficial','🐿️'],
  ['Jirafa Apiladora','Precisión y timing','Toca para soltar cada bloque móvil; el sobrante se corta y la torre acelera.','Bloques','bloques','higher','173',40,'stack','Oficial','🦒'],
  ['Paloma Mensajera','Precisión y timing','Sella las cartas bajo el matasellos; el centrado suma extra y algunas cartas no se sellan.','Puntos','puntos','higher','78',60,'timing','Vídeo','🕊️'],
  ['Nutria Lanzadora','Precisión y timing','Lanza la bola a los flotadores ajustando el tiro a la dirección del viento.','Puntos','puntos','higher','950',60,'aim','Vídeo','🦦'],

  ['Escarabajo Pelotero','Velocidad contra reloj','Guía la bola por un circuito con joystick; juega dos rondas y conserva el mejor tiempo.','Tiempo','s','lower','8,80 s',60,'maze','Oficial','🪲'],
  ['Carrera de Galgos','Velocidad contra reloj','Completa dos vueltas por el circuito lo más rápido posible.','Tiempo','s','lower','19,06 s',60,'race','Vídeo','🐕'],
  ['Correcaminos','Velocidad contra reloj','Corre dos vueltas con dirección y freno por una pista de perspectiva 2.5D.','Tiempo','s','lower','10,76 s',60,'race','Vídeo','🐦'],
  ['Hámster al Volante','Velocidad contra reloj','Acelera y frena durante tres vueltas; si entras muy rápido en curva, te sales.','Tiempo','s','lower','15,25 s',60,'race','Vídeo','🐹'],
  ['Topo Golfista','Velocidad contra reloj','Arrastra desde la bola para apuntar y elegir potencia; puedes golpear mientras rueda.','Tiempo','s','lower','4,56 s',47,'aim','Oficial','🐹'],
  ['Topo Golfista 2','Velocidad contra reloj','Juega al minigolf con apuntado y potencia en un campo de perspectiva 2.5D.','Tiempo','s','lower','5,78 s',47,'aim','Vídeo','🐹'],
  ['Suricatas del Minigolf','Velocidad contra reloj','Emboca tantos hoyos como puedas en treinta segundos.','Hoyos','hoyos','higher','12,8',30,'aim','Oficial','🦦'],
  ['Ratón de Laberinto','Velocidad contra reloj','Inclina el laberinto con el joystick, llega a tres metas y evita los agujeros.','Tiempo','s','lower','12,69 s',60,'maze','Oficial','🐭'],
  ['Búho Calculador','Velocidad contra reloj','Resuelve cinco operaciones eligiendo entre cuatro respuestas.','Tiempo','s','lower','4,72 s',60,'count','Vídeo','🦉'],
  ['Zorro de los Dados','Velocidad contra reloj','Suma los cuatro dados que aparecen en cada una de tres rondas.','Tiempo','s','lower','3,46 s',60,'count','Vídeo','🦊'],
  ['Ardilla Contadora','Velocidad contra reloj','Toca los números del 1 al 16 en orden sobre una cuadrícula mezclada.','Tiempo','s','lower','2,29 s',60,'tiles','Vídeo','🐿️'],
  ['Cotorra Telefonista','Velocidad contra reloj','Memoriza ocho dígitos y márcalos en el teclado de colores.','Tiempo','s','lower','4,5 s',60,'typing','Oficial','🦜'],
  ['Colibrí Reflejos','Velocidad contra reloj','Toca la casilla iluminada de una cuadrícula 3×3; cuenta la media de tres rondas.','Tiempo medio','s','lower','0,288 s',15,'target','Oficial','🐦'],

  ['Trile del Mapache','Memoria y lógica','Sigue la bola mientras se mezclan tres vasos y elige dónde quedó.','Niveles','niveles','higher','13',60,'sequence','Oficial','🦝'],
  ['Cuervo Contacajas','Memoria y lógica','Cuenta las cajas que aparecen brevemente y responde con los controles más y menos.','Niveles','niveles','higher','19',60,'count','Oficial','🐦‍⬛'],
  ['Chimpancé Memorión','Memoria y lógica','Memoriza los números y tócalos en orden antes de que se acabe el tiempo.','Puntos','puntos','higher','100',60,'sequence','Oficial','🐒'],
  ['Elefante Memorioso','Memoria y lógica','Observa la secuencia de flechas y repítela con la cruceta.','Puntos','puntos','higher','100',60,'sequence','Oficial','🐘'],
  ['Panal de la Abeja','Memoria y lógica','Reproduce el patrón de celdas iluminadas; la cuadrícula crece con cada nivel.','Puntos','puntos','higher','148',60,'sequence','Vídeo','🐝'],
  ['Rastro del Caracol','Memoria y lógica','Observa un recorrido entre puntos y trázalo de memoria.','Puntos','puntos','higher','98',60,'draw','Vídeo','🐌'],
  ['Pulpo Camuflaje','Memoria y lógica','Recuerda un color y recréalo ajustando tono, saturación y brillo.','Parecido','%','higher','99,18 %',60,'color','Oficial','🐙'],
  ['Loro Dictado','Memoria y lógica','Teclea los dígitos antes de que desaparezcan.','Puntos','puntos','higher','55',60,'typing','Oficial','🦜'],
  ['Burro de Carga','Memoria y lógica','Empuja las cajas hasta los objetivos sin dejarlas atrapadas.','Puntos','puntos','higher','41',60,'sokoban','Oficial','🫏'],
  ['Pitón Pi','Memoria y lógica','Teclea en orden los decimales del número π; regla provisional inferida del nombre.','Puntos','puntos','higher','Sin dato',60,'typing','Sin confirmar','🐍'],

  ['Bingo de la Oveja','Rapidez y multitarea','Marca en el cartón 2×2 los números que salen; tocar uno que no ha salido resta una vida.','Puntos','puntos','higher','221',60,'bingo','Vídeo','🐑'],
  ['Rinoceronte Rompemuros','Rapidez y multitarea','Apunta y dispara bolas para romper ladrillos numerados antes de que bajen.','Puntos','puntos','higher','59',60,'aim','Vídeo','🦏'],
  ['Sepia Reflejos','Rapidez y multitarea','Espera al cambio de color del fondo y toca rápido; tocar antes penaliza.','Puntos','puntos','higher','16',27,'timing','Oficial','🦑'],
  ['Jardín de Luciérnagas','Rapidez y multitarea','Guía cada luciérnaga a la flor de su color girando el haz de luz.','Puntos','puntos','higher','129',60,'sort','Vídeo + análisis','✨'],
  ['Mariposa Pintora','Rapidez y multitarea','Iguala el color de la izquierda con el de la derecha ajustando tono y brillo.','Colores igualados','colores','higher','32',60,'color','Oficial','🦋'],
  ['Cigüeña Repartidora','Rapidez y multitarea','Envía cada paquete al contenedor de su color con izquierda, arriba o derecha.','Puntos','puntos','higher','86',60,'sort','Vídeo','🕊️'],
  ['Gato Pianista','Rapidez y multitarea','Toca las teclas que bajan sin pulsar los espacios vacíos.','Puntos','puntos','higher','157',60,'tiles','Vídeo','🐈'],
  ['Oso Encestador','Rapidez y multitarea','Tira a canasta; el primer acierto inicia el reloj y cada tiro se acelera.','Canastas','canastas','higher','33',60,'basket','Oficial','🐻'],
  ['Pájaro Carpintero','Rapidez y multitarea','Toca el tronco tantas veces como puedas durante el tiempo de juego.','Toques','toques','higher','139',60,'target','Oficial','🪶'],
  ['Vencejo Veloz','Rapidez y multitarea','Desliza en la dirección de las flechas antes de que se vacíe la barra.','Puntos','puntos','higher','71',60,'sort','Vídeo','🐦'],
  ['Golondrina Cazadora','Rapidez y multitarea','Toca los objetivos antes de que desaparezcan; tienes tres vidas.','Puntos','puntos','higher','731',60,'target','Oficial','🐦'],
  ['Cangrejo Interruptor','Rapidez y multitarea','Activa los interruptores que aparecen antes de que termine el tiempo.','Puntos','puntos','higher','73',60,'tiles','Vídeo','🦀'],
];

export function slugify(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export const games: GameManifest[] = rows.map(([name, category, instructions, metric, unit, direction, benchmark, durationSec, mechanic, confidence, emoji]) => ({
  id: slugify(name), name, category, instructions, metric, unit, direction, benchmark, durationSec, mechanic, confidence, emoji,
}));

export const gameById = new Map(games.map((game) => [game.id, game]));
