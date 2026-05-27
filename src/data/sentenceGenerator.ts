const SUBJECTS = ["je", "tu", "il", "elle", "nous", "le chat", "mon ami", "la fille", "le garçon", "ma mère", "le voisin"];
const VERBS = ["regarde", "mange", "cherche", "trouve", "aime", "voit", "prend", "donne", "écoute", "achète", "prépare"];
const ARTICLES_NOUNS = ["une pomme", "le livre", "la maison", "un café", "le journal", "une fleur", "la musique", "un gâteau", "le train", "une lettre", "un oiseau"];
const ADVERBS = ["rapidement", "doucement", "souvent", "toujours", "parfois", "lentement", "vraiment", "bien", "maintenant", "ensemble"];
const PLACES = ["à la maison", "dans le jardin", "au marché", "près de la mer", "en ville", "sous la pluie", "dans la cuisine", "au parc"];

interface SentenceWords {
  subj: string;
  verb: string;
  obj: string;
  adv: string;
  place: string;
}

const TEMPLATES: Array<(w: SentenceWords) => string> = [
  (w) => `${w.subj} ${w.verb} ${w.obj}`,
  (w) => `${w.subj} ${w.verb} ${w.obj} ${w.adv}`,
  (w) => `${w.subj} ${w.verb} ${w.obj} ${w.place}`,
  (w) => `le matin, ${w.subj} ${w.verb} ${w.obj}`,
  (w) => `${w.subj} ${w.verb} ${w.obj} ${w.place} ${w.adv}`
];

export function generateSentence(complexity: number): string {
  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  const w: SentenceWords = { 
    subj: pick(SUBJECTS), 
    verb: pick(VERBS), 
    obj: pick(ARTICLES_NOUNS), 
    adv: pick(ADVERBS), 
    place: pick(PLACES) 
  };
  // Ensure we at least pick the first template if complexity <= 1, up to length
  const maxTemplate = Math.max(1, Math.min(complexity, TEMPLATES.length));
  const template = TEMPLATES[Math.floor(Math.random() * maxTemplate)];
  const s = template(w);
  return s.charAt(0).toUpperCase() + s.slice(1) + ".";
}
