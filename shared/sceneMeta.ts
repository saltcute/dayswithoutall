// Titles/subtitles for each day. Used by the Worker (page <title>, og: tags)
// and by the client (title card). Scene implementations live in src/scenes/.

export interface SceneMeta {
  title: string;
  subtitle: string;
}

export const SCENE_META: Record<number, SceneMeta> = {
  1: { title: "The Arrival", subtitle: "They came to play. The cabinets had other plans." },
  2: { title: "The Pact", subtitle: "No credits shall be inserted until the server returns." },
  3: { title: "Phantom Limbs", subtitle: "The hands remember what the heart cannot forget." },
  4: { title: "Rationing", subtitle: "Every coin is counted. Twice. By candlelight." },
  5: { title: "The Mirage", subtitle: "Out in the wastes, something glows ONLINE." },
  6: { title: "The Prophet", subtitle: "The maintenance is eternal. Repent." },
  7: { title: "The Great Schism", subtitle: "One coin. One slot. One very big fight." },
  8: { title: "Tribes", subtitle: "Circles, sliders, levers. Pick a side." },
  9: { title: "Fortress Arcade", subtitle: "Board the windows. Guard the cabinets." },
  10: { title: "The Radio", subtitle: "Rumors crackle through the static." },
  11: { title: "Campfire Legends", subtitle: "Tell us again about the All Perfect, grandpa." },
  12: { title: "The Shambling", subtitle: "Raaatiiing…" },
  13: { title: "Cardboard Cabinet", subtitle: "If the server won't come to us, we'll build our own." },
  14: { title: "SOS", subtitle: "Spelled out in arcade cards for the sky to see." },
  15: { title: "The Worship", subtitle: "Hear us, o gods of the arcade." },
  16: { title: "The Offering", subtitle: "The gods demand coins. Obviously." },
  17: { title: "Market Crash", subtitle: "Arcade card futures hit rock bottom." },
  18: { title: "Exodus", subtitle: "A pilgrimage to The Server." },
  19: { title: "The Gate", subtitle: "Knock, knock. Who's there? Maintenance." },
  20: { title: "Reclamation", subtitle: "Nature has started playing instead." },
  21: { title: "The Heretic", subtitle: "Caught playing guest mode. The tribes must judge." },
  22: { title: "Cave Paintings", subtitle: "Teaching the young what 'notes' were." },
  23: { title: "The Elder's Farewell", subtitle: "Remember… the… slide…" },
  24: { title: "First Contact", subtitle: "They came from the stars for one thing." },
  25: { title: "Wasteland Games", subtitle: "Competitive air-rhythm. Judged by vibes." },
  26: { title: "The Archive", subtitle: "For future generations: proof that we once had ratings." },
  27: { title: "False Dawn", subtitle: "IT'S BACK! (It is not back.)" },
  28: { title: "Kaiju", subtitle: "From the landfill of expired cards, it rises." },
  29: { title: "Nuclear Winter", subtitle: "The power supplies are the only warmth left." },
  30: { title: "The Flicker", subtitle: "The screens awaken. Is this… it?" },
};

export const GENERIC_META: SceneMeta = {
  title: "Still Down",
  subtitle: "The chroniclers have run out of ink.",
};

export const SCENE_COUNT = 30;

export function metaFor(day: number): SceneMeta {
  return SCENE_META[day] ?? GENERIC_META;
}
