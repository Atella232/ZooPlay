/** Original vector characters, shared by the catalogue and the game renderer. */
const faces: Record<string, [string, string, string]> = {
  '🐧': ['penguin', '#293c55', '#f3b947'], '🦔': ['hedgehog', '#ae7957', '#674834'],
  '🐒': ['monkey', '#9e6550', '#e7b58a'], '🪰': ['dragonfly', '#4ca9bb', '#a8e7eb'],
  '🐸': ['frog', '#73ba55', '#d6eb8c'], '🦗': ['cricket', '#81ac52', '#d4e9a0'],
  '🐔': ['chicken', '#fff1cf', '#f47455'], '🦇': ['bat', '#756395', '#b9a1d0'],
  '🐆': ['cheetah', '#efb746', '#75462e'], '🐦': ['bird', '#6caec5', '#f4c66a'],
  '🐝': ['bee', '#f2c84e', '#474047'], '🦭': ['seal', '#80aeb8', '#d5ebed'],
  '🦫': ['beaver', '#a17150', '#dfb58a'], '🐇': ['rabbit', '#ecdfcd', '#eaacb6'],
  '🐺': ['wolf', '#8396ab', '#d5e0ea'], '🐼': ['panda', '#f3f0e8', '#354454'],
  '🦎': ['gecko', '#77b55e', '#cae985'], '🐍': ['snake', '#71b97d', '#ebd377'],
  '🦩': ['flamingo', '#f38bab', '#fbc6d0'], '🕷️': ['spider', '#79598f', '#c59edd'],
  '🦜': ['parrot', '#52b58d', '#f3b757'], '🦘': ['kangaroo', '#c68b5f', '#ecd2aa'],
  '🐜': ['ant', '#b86855', '#edab7a'], '🦅': ['eagle', '#7e624d', '#f7edce'],
  '🪼': ['jellyfish', '#b89dde', '#e0d0f4'], '🐓': ['rooster', '#edac53', '#e76351'],
  '🐿️': ['squirrel', '#c78548', '#f1c989'], '🦒': ['giraffe', '#edc45c', '#9d663d'],
  '🕊️': ['dove', '#d2deeb', '#fff6da'], '🦦': ['otter', '#a67e64', '#e4ccaa'],
  '🪲': ['beetle', '#659d91', '#c2db97'], '🐕': ['dog', '#cf946a', '#f5d8aa'],
  '🐹': ['hamster', '#e3ac71', '#fff0d0'], '🐭': ['mouse', '#a2abc7', '#efc1c5'],
  '🦉': ['owl', '#ba9269', '#f7e0b3'], '🦊': ['fox', '#ec9351', '#fff0cc'],
  '🦝': ['raccoon', '#9aa5b3', '#3f4c63'], '🐦‍⬛': ['crow', '#45546b', '#8b9bad'],
  '🐘': ['elephant', '#95aec3', '#e5bcc5'], '🐌': ['snail', '#a6bc7c', '#cf9167'],
  '🐙': ['octopus', '#da8db5', '#f4c8d8'], '🫏': ['donkey', '#9aa1b0', '#ddd3c3'],
  '🐑': ['sheep', '#fff4db', '#8d817b'], '🦏': ['rhino', '#92a4b5', '#dae4e3'],
  '🦑': ['squid', '#ebaa91', '#fce0ca'], '✨': ['firefly', '#96b365', '#ffe87c'],
  '🦋': ['butterfly', '#8383d2', '#edb3df'], '🐈': ['cat', '#eeb968', '#fff0cf'],
  '🦀': ['crab', '#df7861', '#fac596'],
  '🐻': ['bear', '#a67a56', '#e7c79b'], '🪶': ['woodpecker', '#6d9c84', '#e9745e'],
};

export function animalKey(emoji: string): string | undefined {
  const animal = faces[emoji];
  return animal ? `animal-${animal[0]}` : undefined;
}

const birdTypes = new Set(['penguin', 'bird', 'parrot', 'chicken', 'rooster', 'eagle', 'dove', 'crow', 'woodpecker', 'owl', 'flamingo']);
const bugTypes = new Set(['bee', 'dragonfly', 'cricket', 'spider', 'ant', 'beetle', 'firefly', 'butterfly']);
const circle = (x: number, y: number, r: number, fill: string) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const ellipse = (x: number, y: number, rx: number, ry: number, fill: string, extra = '') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
const path = (d: string, fill: string, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;

export function animalSvg(emoji: string): string {
  const [kind, color, accent] = faces[emoji] ?? faces['🐦'];
  let art = '';
  if (birdTypes.has(kind)) {
    art += ellipse(52, 68, 11, 5, '#e4a65d') + ellipse(78, 68, 11, 5, '#e4a65d');
    art += ellipse(64, 59, 35, 39, 'url(#body)');
    art += ellipse(64, 67, 22, 24, kind === 'penguin' ? '#fff8e4' : accent);
    art += ellipse(34, 57, 10, 23, color, 'transform="rotate(24 34 57)"') + ellipse(93, 57, 10, 23, color, 'transform="rotate(-24 93 57)"');
    if (kind === 'owl') art += circle(49, 45, 18, '#fff5dc') + circle(79, 45, 18, '#fff5dc');
    if (['chicken', 'rooster', 'woodpecker'].includes(kind)) art += path('M48 23 Q43 6 56 12 Q62 0 69 13 Q83 8 81 25Z', '#ed6755');
    if (kind === 'parrot') art += path('M53 21 Q46 7 61 11 L75 20Z', '#df7056');
    art += path('M56 54 Q65 47 76 55 L64 65Z', '#efb348');
    if (kind === 'flamingo') art += path('M81 60 Q109 57 98 74 L82 72Z', '#354454');
  } else if (bugTypes.has(kind)) {
    if (['bee', 'dragonfly', 'firefly'].includes(kind)) art += ellipse(36, 42, 20, 30, '#dcf7ef', 'transform="rotate(-35 36 42)" stroke="#9ad2d4" stroke-width="3"') + ellipse(92, 42, 20, 30, '#dcf7ef', 'transform="rotate(35 92 42)" stroke="#9ad2d4" stroke-width="3"');
    if (kind === 'butterfly') art += path('M61 53 C15 0 1 51 33 69 C5 108 60 112 63 76 M67 53 C113 0 127 51 95 69 C123 108 68 112 65 76', accent, 'stroke="#7475bd" stroke-width="5"');
    if (['spider', 'ant', 'cricket', 'beetle'].includes(kind)) {
      for (let i = 0; i < 3; i++) art += path(`M46 ${52 + i * 12} L21 ${35 + i * 21} L12 ${48 + i * 21} M82 ${52 + i * 12} L107 ${35 + i * 21} L116 ${48 + i * 21}`, 'none', `stroke="${color}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"`);
    }
    art += ellipse(64, 70, kind === 'dragonfly' ? 17 : 27, 31, 'url(#body)');
    if (kind === 'bee') art += path('M40 65 H88 V76 H40Z M45 86 H83 V96 H45Z', '#474047');
    if (kind === 'beetle') art += path('M64 49V97', 'none', 'stroke="#c2db97" stroke-width="4"');
    if (kind === 'firefly') art += ellipse(64, 89, 22, 17, accent);
    art += circle(64, 40, 25, color) + path('M51 23 Q39 7 35 16 M77 23 Q89 7 93 16', 'none', 'stroke="#475c52" stroke-width="4" stroke-linecap="round"');
  } else if (['jellyfish', 'octopus', 'squid'].includes(kind)) {
    for (let i = 0; i < 5; i++) art += path(`M${35 + i * 14} 69 Q${22 + i * 18} 96 ${31 + i * 15} 103`, 'none', `stroke="${color}" stroke-width="11" stroke-linecap="round"`);
    art += path('M26 69 C20 9 107 9 102 69 Q83 83 64 74 Q44 83 26 69Z', 'url(#body)');
    art += ellipse(44, 36, 12, 7, '#ffffff66');
  } else if (kind === 'giraffe') {
    art += ellipse(64,91,29,16,color) + path('M52 93 L49 52 L78 52 L76 93Z','url(#body)');
    art += ellipse(32,30,15,8,color,'transform="rotate(25 32 30)"') + ellipse(96,30,15,8,color,'transform="rotate(-25 96 30)"');
    art += path('M49 26V12 M79 26V12','none',`stroke="${color}" stroke-width="6" stroke-linecap="round"`) + circle(49,11,5,accent) + circle(79,11,5,accent);
    art += ellipse(64,45,30,25,'url(#body)') + ellipse(64,65,25,14,'#f5dda0');
    for(const [x,y] of [[55,78],[71,87],[47,91],[82,93],[37,43],[89,38]]) art += circle(x,y,4,accent);
    art += ellipse(54,65,2.5,3,accent) + ellipse(74,65,2.5,3,accent) + ellipse(46,107,7,5,accent) + ellipse(82,107,7,5,accent);
  } else if (kind === 'frog') {
    art += ellipse(32,90,24,13,color) + ellipse(96,90,24,13,color) + ellipse(64,75,36,27,'url(#body)');
    art += ellipse(64,57,43,29,color) + circle(44,35,18,color) + circle(84,35,18,color);
    art += ellipse(64,78,25,17,accent) + path('M46 65 Q64 78 82 65','none','stroke="#426d3a" stroke-width="3" stroke-linecap="round"');
    art += ellipse(44,36,9,11,'#fff9e5') + ellipse(84,36,9,11,'#fff9e5') + circle(44,36,5,'#263246') + circle(84,36,5,'#263246');
  } else if (kind === 'seal') {
    art += path('M55 84 Q14 107 17 87 Q6 80 25 75 L44 67Z',color) + ellipse(67,77,40,22,'url(#body)');
    art += circle(74,48,30,color) + ellipse(69,89,18,9,color,'transform="rotate(20 69 89)"') + ellipse(75,61,22,13,accent);
    art += circle(70,57,5,'#263246') + path('M53 61 L34 57 M53 66 L34 67 M91 61 L109 57 M91 66 L111 68','none','stroke="#416b77" stroke-width="2"');
    art += circle(60,44,4,'#263246') + circle(84,44,4,'#263246');
  } else if (kind === 'crab') {
    for(let i=0;i<3;i++) art += path(`M38 ${61+i*9} L17 ${64+i*12} M90 ${61+i*9} L111 ${64+i*12}`,'none',`stroke="${color}" stroke-width="7" stroke-linecap="round"`);
    art += ellipse(64,69,35,24,color) + path('M39 62 L20 40 M89 62 L108 40','none',`stroke="${color}" stroke-width="9"`);
    art += path('M21 47 Q0 29 16 20 L23 33 L30 17 Q43 33 21 47 M107 47 Q128 29 112 20 L105 33 L98 17 Q85 33 107 47',color);
    art += path('M47 55V40 M81 55V40','none',`stroke="${color}" stroke-width="8"`) + circle(47,40,7,'#fff4dc') + circle(81,40,7,'#fff4dc');
    art += circle(47,40,4,'#263246') + circle(81,40,4,'#263246') + path('M54 74 Q64 83 74 74','none','stroke="#a94d48" stroke-width="3"');
  } else if (kind === 'snake' || kind === 'gecko') {
    art += path('M31 88 C102 118 112 68 83 63 C53 58 24 80 31 88', 'none', `stroke="${color}" stroke-width="21" stroke-linecap="round"`);
    art += ellipse(62, 48, 34, 30, 'url(#body)');
    if (kind === 'gecko') art += path('M36 62 L20 75 M86 62 L105 75 M23 72 L14 68 M23 72 L17 82 M102 72 L115 66 M102 72 L112 85', 'none', `stroke="${color}" stroke-width="7" stroke-linecap="round"`);
    art += path('M62 69 L62 82 M62 82 L54 89 M62 82 L70 89', 'none', 'stroke="#e57173" stroke-width="3"');
  } else if (kind === 'snail') {
    art += ellipse(62, 91, 45, 12, color) + circle(72, 58, 34, accent);
    art += path('M88 51 C85 26 44 35 52 63 C59 81 88 69 75 53 Q63 46 62 59', 'none', 'stroke="#8a6555" stroke-width="5" stroke-linecap="round"');
    art += ellipse(34, 65, 16, 27, color) + path('M26 45V28 M42 45V28', 'none', `stroke="${color}" stroke-width="7" stroke-linecap="round"`);
    art += circle(25, 28, 5, '#354454') + circle(42, 28, 5, '#354454');
  } else {
    if (kind === 'hedgehog') art += path('M16 76 L9 54 L24 53 L19 30 L37 34 L42 12 L59 25 L71 10 L82 27 L104 21 L102 43 L119 48 L107 70Z', accent);
    if (kind === 'squirrel') art += path('M83 81 C131 84 127 17 97 21 C77 24 84 51 98 46 C92 74 85 68 83 81', accent);
    if (kind === 'rabbit' || kind === 'donkey' || kind === 'kangaroo') art += ellipse(44, 28, 12, 27, color, 'transform="rotate(-15 44 28)"') + ellipse(84, 28, 12, 27, color, 'transform="rotate(15 84 28)"') + ellipse(44, 23, 6, 18, accent) + ellipse(84, 23, 6, 18, accent);
    else if (['cat', 'fox', 'wolf'].includes(kind)) art += path('M24 44 L26 10 L51 30 M77 30 L102 10 L104 44', color) + path('M31 31 L33 20 L42 33 M86 33 L95 20 L97 32', accent);
    else art += circle(34, 33, 17, kind === 'panda' ? accent : color) + circle(94, 33, 17, kind === 'panda' ? accent : color) + circle(34, 33, 9, accent) + circle(94, 33, 9, accent);
    art += ellipse(64, 74, 33, 29, 'url(#body)') + ellipse(64, 51, 41, 35, 'url(#body)');
    art += ellipse(64, 71, 23, 17, ['raccoon', 'panda'].includes(kind) ? '#fff4df' : accent);
    if (kind === 'panda' || kind === 'raccoon') art += ellipse(47, 48, 13, 14, accent, 'transform="rotate(18 47 48)"') + ellipse(81, 48, 13, 14, accent, 'transform="rotate(-18 81 48)"');
    if (kind === 'elephant') art += path('M55 61 Q51 111 76 100 Q88 94 78 83 Q72 93 68 85 L72 61Z', color) + ellipse(25, 52, 15, 26, accent) + ellipse(103, 52, 15, 26, accent);
    else art += path('M56 65 Q64 60 72 65 Q72 72 64 73 Q56 72 56 65Z', '#3c4050');
    if (kind === 'rhino') art += path('M65 59 L74 35 L82 61Z', '#faf0d6');
    if (kind === 'beaver') art += path('M57 76H71V88H57Z', '#fff9e8') + path('M64 77V87', 'none', 'stroke="#aa957d" stroke-width="2"');
    if (kind === 'giraffe' || kind === 'cheetah') for (const [x, y] of [[30,53],[95,59],[47,27],[79,27],[52,90],[79,90]]) art += circle(x, y, 4, accent);
    if (kind === 'giraffe') art += path('M46 21V8 M82 21V8', 'none', `stroke="${accent}" stroke-width="7" stroke-linecap="round"`);
    if (kind === 'sheep') for(let i=0;i<7;i++) art += circle(30 + i * 11, 24 + Math.sin(i) * 6, 12, '#fff9e7');
    if (kind === 'bat') art = path('M41 50 L10 30 L8 76 L28 66 L38 85 M87 50 L118 30 L120 76 L100 66 L90 85', accent) + art;
    art += ellipse(43, 98, 12, 6, color) + ellipse(85, 98, 12, 6, color);
  }
  if(!['snail','frog','seal','crab'].includes(kind)) art += ellipse(47, 48, 5, 7, '#263246') + ellipse(81, 48, 5, 7, '#263246') + circle(45.5, 45.5, 2, '#fff') + circle(79.5, 45.5, 2, '#fff') + ellipse(36, 62, 7, 4, '#ed9a9966') + ellipse(92, 62, 7, 4, '#ed9a9966');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><linearGradient id="body" x1="0" y1="0" x2="0.7" y2="1"><stop stop-color="${color}"/><stop offset="1" stop-color="${color}" stop-opacity=".82"/></linearGradient></defs>${ellipse(64,112,36,7,'#25395522')}<g stroke="#263246" stroke-opacity=".12" stroke-width="1.5" stroke-linejoin="round">${art}</g></svg>`;
}

const urls = new Map<string, string>();
export function animalArtUrl(emoji: string): string {
  if (!urls.has(emoji)) urls.set(emoji, `data:image/svg+xml;base64,${btoa(animalSvg(emoji))}`);
  return urls.get(emoji)!;
}
export const animalEmojis = Object.keys(faces);
