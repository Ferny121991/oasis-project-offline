import { GoogleGenAI, Type } from "@google/genai";
import { Slide, PresentationItem } from "../types";
import { DEFAULT_THEME } from "../constants";
import rv1960Data from '../data/bibles/es_rvr.json';
import nviData from '../data/bibles/es_nvi.json';
import lblaData from '../data/bibles/es_lbla.json';
import ntvData from '../data/bibles/es_ntv.json';
import nivEnglishData from '../data/bibles/en_niv.json';
import kjvData from '../data/bibles/en_kjv.json';
import nkjvData from '../data/bibles/en_nkjv.json';

const BIBLE_DATA_MAP: Record<string, any> = {
  'Reina Valera 1960': rv1960Data,
  'Nueva Versión Internacional': nviData,
  'Nueva Traducción Viviente': ntvData,
  'La Biblia de las Américas': lblaData,
  'New International Version': nivEnglishData,
  'King James Version': kjvData,
  'New King James Version': nkjvData
};

// Safety check for environment variable
const apiKey = "AIzaSyAGOmu0CL4VFuz82Jd-jCfIrKj4j9kMAfg";

const ai = new GoogleGenAI({ apiKey });

// Helper to create a unique ID
const generateId = () => Math.random().toString(36).substr(2, 9);

export type DensityMode = 'impact' | 'classic' | 'strophe' | 'reading';

export interface SongSearchResult {
  title: string;
  artist: string;
  album?: string;
  snippet?: string;
}

const getDensityInstruction = (mode: DensityMode): string => {
  switch (mode) {
    case 'impact': return "REGLA DE ORO: MÁXIMO 2 líneas cortas por diapositiva. La letra debe ser GIGANTE. Divide el texto en fragmentos muy pequeños.";
    case 'classic': return "REGLA DE ORO: MÁXIMO 4 líneas por diapositiva. Formato estándar para himnos y coros.";
    case 'strophe': return "REGLA DE ORO: Cada diapositiva DEBE contener una estrofa completa o un coro completo. No cortes las estrofas a la mitad.";
    case 'reading': return "REGLA DE ORO: Agrupa mucho texto (8-12 líneas) por diapositiva para lectura bíblica o anuncios largos.";
    default: return "MÁXIMO 4 líneas por diapositiva.";
  }
};

// Helper for manual grouping (Fallback when AI fails or is not available)
const manualGroupText = (text: string, density: DensityMode): Slide[] => {
  const slides: Slide[] = [];
  const textNormalized = text.replace(/\r\n/g, '\n').trim();

  if (density === 'strophe' || density === 'reading') {
    // Try paragraph-based splitting for stanza/dense
    const paragraphs = textNormalized.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);

    if (paragraphs.length > 1) {
      const pPerSlide = density === 'strophe' ? 1 : 3;
      for (let i = 0; i < paragraphs.length; i += pPerSlide) {
        const chunk = paragraphs.slice(i, i + pPerSlide);
        slides.push({
          id: generateId(),
          type: 'text',
          content: chunk.join('\n\n'),
          label: density === 'strophe' ? `Estrofa ${Math.floor(i / pPerSlide) + 1}` : `Bloque ${Math.floor(i / pPerSlide) + 1}`
        });
      }
      return slides;
    }
  }

  // Fallback to line-based splitting for impact, classic, or single-block stanza/dense
  const allLines = textNormalized.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const maxLines = {
    'impact': 2,
    'classic': 4,
    'strophe': 8,
    'reading': 14
  }[density] || 4;

  for (let i = 0; i < allLines.length; i += maxLines) {
    const chunk = allLines.slice(i, i + maxLines);
    slides.push({
      id: generateId(),
      type: 'text',
      content: chunk.join('\n'),
      label: `Líneas ${i + 1}-${i + chunk.length}`
    });
  }

  return slides;
};

// --- API-FREE BIBLE LOGIC ---
// ... (rest of the code remains the same until processManualText)

// --- API-FREE BIBLE LOGIC ---

// Dictionary uses normalized keys (lowercase, no accents, simple numbers)
const SPANISH_TO_ENGLISH_BOOKS: Record<string, string> = {
  "genesis": "Genesis", "exodo": "Exodus", "levitico": "Leviticus",
  "numeros": "Numbers", "deuteronomio": "Deuteronomy", "josue": "Joshua",
  "jueces": "Judges", "rut": "Ruth", "1 samuel": "1 Samuel", "2 samuel": "2 Samuel",
  "1 reyes": "1 Kings", "2 reyes": "2 Kings", "1 cronicas": "1 Chronicles",
  "2 cronicas": "2 Chronicles", "esdras": "Ezra", "nehemias": "Nehemiah",
  "ester": "Esther", "job": "Job", "salmos": "Psalms", "salmo": "Psalms",
  "proverbios": "Proverbs", "eclesiastes": "Ecclesiastes", "cantares": "Song of Solomon",
  "isaias": "Isaiah", "jeremias": "Jeremiah", "lamentaciones": "Lamentations",
  "ezequiel": "Ezekiel", "daniel": "Daniel", "oseas": "Hosea", "joel": "Joel",
  "amos": "Amos", "abdias": "Obadiah", "jonas": "Jonah", "miqueas": "Micah",
  "nahum": "Nahum", "habacuc": "Habakkuk", "sofonias": "Zephaniah", "hageo": "Haggai",
  "zacarias": "Zechariah", "malaquias": "Malachi", "mateo": "Matthew", "marcos": "Mark",
  "lucas": "Luke", "juan": "John", "hechos": "Acts", "hechos de los apostoles": "Acts",
  "romanos": "Romans", "1 corintios": "1 Corinthians", "2 corintios": "2 Corinthians",
  "galatas": "Galatians", "efesios": "Ephesians", "filipenses": "Philippians",
  "colosenses": "Colossians", "1 tesalonicenses": "1 Thessalonians",
  "2 tesalonicenses": "2 Thessalonians", "1 timoteo": "1 Timothy", "2 timoteo": "2 Timothy",
  "tito": "Titus", "filemon": "Philemon", "hebreos": "Hebrews", "santiago": "James",
  "1 pedro": "1 Peter", "2 pedro": "2 Peter", "1 juan": "1 John", "2 juan": "2 John",
  "3 juan": "3 John", "judas": "Jude", "apocalipsis": "Revelation"
};

const BIBLE_BOOKS_ORDER = [
  "genesis", "exodo", "levitico", "numeros", "deuteronomio", "josue", "jueces", "rut",
  "1 samuel", "2 samuel", "1 reyes", "2 reyes", "1 cronicas", "2 cronicas", "esdras",
  "nehemias", "ester", "job", "salmos", "proverbios", "eclesiastes", "cantares",
  "isaias", "jeremias", "lamentaciones", "ezequiel", "daniel", "oseas", "joel",
  "amos", "abdias", "jonas", "miqueas", "nahum", "habacuc", "sofonias", "hageo",
  "zacarias", "malaquias", "mateo", "marcos", "lucas", "juan", "hechos", "romanos",
  "1 corintios", "2 corintios", "galatas", "efesios", "filipenses", "colosenses",
  "1 tesalonicenses", "2 tesalonicenses", "1 timoteo", "2 timoteo", "tito", "filemon",
  "hebreos", "santiago", "1 pedro", "2 pedro", "1 juan", "2 juan", "3 juan", "judas",
  "apocalipsis"
];

// Mapeo de libros para API pública (biblia-api.com)
const mapVersionToApiCode = (versionName: string) => {
  if (versionName.includes("New King James")) return "kjv"; // bible-api doesn't have nkjv, fallback to kjv
  if (versionName.includes("King James")) return "kjv";
  if (versionName.includes("International Version")) return "niv";
  if (versionName.includes("Reina Valera")) return "rvr";
  if (versionName.includes("Internacional")) return "rvr";
  if (versionName.includes("Américas")) return "rvr";
  return "rvr";
};

// Mapeo de nombres oficiales para visualización (incluye abreviaciones)
const OFFICIAL_SPANISH_BOOKS: Record<string, string> = {
  // Antiguo Testamento
  "genesis": "Génesis", "gen": "Génesis", "gn": "Génesis",
  "exodo": "Éxodo", "ex": "Éxodo", "exo": "Éxodo",
  "levitico": "Levítico", "lev": "Levítico",
  "numeros": "Números", "num": "Números",
  "deuteronomio": "Deuteronomio", "deut": "Deuteronomio", "dt": "Deuteronomio",
  "josue": "Josué", "jos": "Josué",
  "jueces": "Jueces", "jue": "Jueces",
  "rut": "Rut",
  "1samuel": "1 Samuel", "1sam": "1 Samuel", "1 samuel": "1 Samuel",
  "2samuel": "2 Samuel", "2sam": "2 Samuel", "2 samuel": "2 Samuel",
  "1reyes": "1 Reyes", "1rey": "1 Reyes", "1 reyes": "1 Reyes",
  "2reyes": "2 Reyes", "2rey": "2 Reyes", "2 reyes": "2 Reyes",
  "1cronicas": "1 Crónicas", "1cro": "1 Crónicas", "1 cronicas": "1 Crónicas",
  "2cronicas": "2 Crónicas", "2cro": "2 Crónicas", "2 cronicas": "2 Crónicas",
  "esdras": "Esdras", "esd": "Esdras",
  "nehemias": "Nehemías", "neh": "Nehemías",
  "ester": "Ester", "est": "Ester",
  "job": "Job",
  "salmos": "Salmos", "sal": "Salmos", "salmo": "Salmos",
  "proverbios": "Proverbios", "prov": "Proverbios", "proverbio": "Proverbios",
  "eclesiastes": "Eclesiastés", "ecl": "Eclesiastés",
  "cantares": "Cantares", "cant": "Cantares", "cantar": "Cantares",
  "isaias": "Isaías", "isa": "Isaías",
  "jeremias": "Jeremías", "jer": "Jeremías",
  "lamentaciones": "Lamentaciones", "lam": "Lamentaciones",
  "ezequiel": "Ezequiel", "eze": "Ezequiel", "ez": "Ezequiel",
  "daniel": "Daniel", "dan": "Daniel",
  "oseas": "Oseas", "ose": "Oseas",
  "joel": "Joel",
  "amos": "Amós", "am": "Amós",
  "abdias": "Abdías", "abd": "Abdías",
  "jonas": "Jonás", "jon": "Jonás",
  "miqueas": "Miqueas", "miq": "Miqueas",
  "nahum": "Nahum", "nah": "Nahum",
  "habacuc": "Habacuc", "hab": "Habacuc",
  "sofonias": "Sofonías", "sof": "Sofonías",
  "hageo": "Hageo", "hag": "Hageo",
  "zacarias": "Zacarías", "zac": "Zacarías",
  "malaquias": "Malaquías", "mal": "Malaquías",
  // Nuevo Testamento
  "mateo": "Mateo", "mat": "Mateo", "mt": "Mateo",
  "marcos": "Marcos", "mar": "Marcos", "mc": "Marcos",
  "lucas": "Lucas", "luc": "Lucas", "lc": "Lucas",
  "juan": "Juan", "jn": "Juan", "jua": "Juan",
  "hechos": "Hechos", "hch": "Hechos", "hec": "Hechos",
  "romanos": "Romanos", "rom": "Romanos", "ro": "Romanos",
  "1corintios": "1 Corintios", "1cor": "1 Corintios", "1 corintios": "1 Corintios",
  "2corintios": "2 Corintios", "2cor": "2 Corintios", "2 corintios": "2 Corintios",
  "galatas": "Gálatas", "gal": "Gálatas",
  "efesios": "Efesios", "efe": "Efesios", "ef": "Efesios",
  "filipenses": "Filipenses", "fil": "Filipenses", "flp": "Filipenses",
  "colosenses": "Colosenses", "col": "Colosenses",
  "1tesalonicenses": "1 Tesalonicenses", "1tes": "1 Tesalonicenses", "1 tesalonicenses": "1 Tesalonicenses",
  "2tesalonicenses": "2 Tesalonicenses", "2tes": "2 Tesalonicenses", "2 tesalonicenses": "2 Tesalonicenses",
  "1timoteo": "1 Timoteo", "1tim": "1 Timoteo", "1 timoteo": "1 Timoteo",
  "2timoteo": "2 Timoteo", "2tim": "2 Timoteo", "2 timoteo": "2 Timoteo",
  "tito": "Tito", "tit": "Tito",
  "filemon": "Filemón", "flm": "Filemón",
  "hebreos": "Hebreos", "heb": "Hebreos",
  "santiago": "Santiago", "sant": "Santiago", "stg": "Santiago",
  "1pedro": "1 Pedro", "1ped": "1 Pedro", "1 pedro": "1 Pedro",
  "2pedro": "2 Pedro", "2ped": "2 Pedro", "2 pedro": "2 Pedro",
  "1juan": "1 Juan", "1jn": "1 Juan", "1 juan": "1 Juan",
  "2juan": "2 Juan", "2jn": "2 Juan", "2 juan": "2 Juan",
  "3juan": "3 Juan", "3jn": "3 Juan", "3 juan": "3 Juan",
  "judas": "Judas", "jud": "Judas",
  "apocalipsis": "Apocalipsis", "apoc": "Apocalipsis", "ap": "Apocalipsis", "revelacion": "Apocalipsis"
};

// Mapeo de libros para Bolls API (incluye variaciones comunes)
const BOOK_NAME_TO_ID: Record<string, number> = {
  // Antiguo Testamento
  "genesis": 1, "gen": 1, "gn": 1,
  "exodo": 2, "ex": 2, "exo": 2,
  "levitico": 3, "lev": 3, "lv": 3,
  "numeros": 4, "num": 4, "nm": 4,
  "deuteronomio": 5, "deut": 5, "dt": 5,
  "josue": 6, "jos": 6,
  "jueces": 7, "jue": 7, "jc": 7,
  "rut": 8, "rt": 8,
  "1samuel": 9, "1sam": 9, "1sm": 9, "1 samuel": 9,
  "2samuel": 10, "2sam": 10, "2sm": 10, "2 samuel": 10,
  "1reyes": 11, "1rey": 11, "1re": 11, "1 reyes": 11,
  "2reyes": 12, "2rey": 12, "2re": 12, "2 reyes": 12,
  "1cronicas": 13, "1cro": 13, "1cr": 13, "1 cronicas": 13,
  "2cronicas": 14, "2cro": 14, "2cr": 14, "2 cronicas": 14,
  "esdras": 15, "esd": 15, "esr": 15,
  "nehemias": 16, "neh": 16, "ne": 16,
  "ester": 17, "est": 17,
  "job": 18, "jb": 18,
  "salmos": 19, "sal": 19, "salmo": 19, "ps": 19, "salm": 19,
  "proverbios": 20, "prov": 20, "pr": 20, "proverbio": 20,
  "eclesiastes": 21, "ecl": 21, "ec": 21, "qoh": 21,
  "cantares": 22, "cant": 22, "cantar": 22, "song": 22,
  "isaias": 23, "isa": 23, "is": 23,
  "jeremias": 24, "jer": 24, "jr": 24,
  "lamentaciones": 25, "lam": 25, "lm": 25,
  "ezequiel": 26, "eze": 26, "ez": 26,
  "daniel": 27, "dan": 27, "dn": 27,
  "oseas": 28, "ose": 28, "os": 28,
  "joel": 29, "jl": 29,
  "amos": 30, "am": 30,
  "abdias": 31, "abd": 31, "ob": 31,
  "jonas": 32, "jon": 32,
  "miqueas": 33, "miq": 33, "mi": 33,
  "nahum": 34, "nah": 34, "na": 34,
  "habacuc": 35, "hab": 35,
  "sofonias": 36, "sof": 36,
  "hageo": 37, "hag": 37,
  "zacarias": 38, "zac": 38,
  "malaquias": 39, "mal": 39,
  // Nuevo Testamento
  "mateo": 40, "mat": 40, "mt": 40,
  "marcos": 41, "mar": 41, "mc": 41, "mr": 41,
  "lucas": 42, "luc": 42, "lc": 42,
  "juan": 43, "jn": 43, "jua": 43,
  "hechos": 44, "hch": 44, "hec": 44, "hechosdelos apostoles": 44,
  "romanos": 45, "rom": 45, "ro": 45,
  "1corintios": 46, "1cor": 46, "1co": 46, "1 corintios": 46,
  "2corintios": 47, "2cor": 47, "2co": 47, "2 corintios": 47,
  "galatas": 48, "gal": 48, "ga": 48,
  "efesios": 49, "efe": 49, "ef": 49,
  "filipenses": 50, "fil": 50, "flp": 50,
  "colosenses": 51, "col": 51,
  "1tesalonicenses": 52, "1tes": 52, "1ts": 52, "1 tesalonicenses": 52,
  "2tesalonicenses": 53, "2tes": 53, "2ts": 53, "2 tesalonicenses": 53,
  "1timoteo": 54, "1tim": 54, "1ti": 54, "1 timoteo": 54,
  "2timoteo": 55, "2tim": 55, "2ti": 55, "2 timoteo": 55,
  "tito": 56, "tit": 56,
  "filemon": 57, "flm": 57,
  "hebreos": 58, "heb": 58, "he": 58,
  "santiago": 59, "sant": 59, "stg": 59,
  "1pedro": 60, "1ped": 60, "1pe": 60, "1 pedro": 60,
  "2pedro": 61, "2ped": 61, "2pe": 61, "2 pedro": 61,
  "1juan": 62, "1jn": 62, "1 juan": 62,
  "2juan": 63, "2jn": 63, "2 juan": 63,
  "3juan": 64, "3jn": 64, "3 juan": 64,
  "judas": 65, "jud": 65,
  "apocalipsis": 66, "apoc": 66, "ap": 66, "revelacion": 66
};

// Map version to bolls.life translation code
const getBollsCode = (v: string): string => {
  if (v.includes("Internacional") && !v.includes("New")) return "NVI"; // Spanish NVI
  if (v.includes("New International")) return "NIV"; // English NIV
  if (v.includes("Reina")) return "RV1960";
  if (v.includes("Américas")) return "LBLA";
  if (v.includes("Traducción Viviente") || v === "NTV") return "NTV";
  if (v.includes("New King James")) return "NKJV";
  if (v.includes("King James")) return "KJV";
  return "NVI";
};

// Versículos famosos "Hardcoded" para funcionar TOTALMENTE OFFLINE (sin fetch)
const LOCAL_BIBLE_CACHE: Record<string, any> = {
  "Juan 3:16": {
    text: "Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito, para que todo aquel que en él cree, no se pierda, mas tenga vida eterna.",
    ref: "Juan 3:16"
  },
  "Salmos 23:1": { text: "Jehová es mi pastor; nada me faltará.", ref: "Salmos 23:1" },
  "Génesis 1:1": { text: "En el principio creó Dios los cielos y la tierra.", ref: "Génesis 1:1" },
  "Filipenses 4:13": { text: "Todo lo puedo en Cristo que me fortalece.", ref: "Filipenses 4:13" },
  "John 3:16": { text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.", ref: "John 3:16" }
};

const normalizeBookKey = (book: string): string => {
  // First, check for common misspellings
  const COMMON_MISSPELLINGS: Record<string, string> = {
    "felipense": "filipenses", "felipenses": "filipenses", "filipence": "filipenses",
    "genesi": "genesis", "jenesis": "genesis",
    "esodo": "exodo",
    "salmo": "salmos", "salm": "salmos", "salmon": "salmos",
    "proverbio": "proverbios",
    "eclesiastes": "eclesiastes",
    "isais": "isaias",
    "jeremia": "jeremias",
    "ezequie": "ezequiel",
    "osea": "oseas",
    "matteo": "mateo",
    "marco": "marcos",
    "luca": "lucas",
    "jua": "juan",
    "hecho": "hechos", "echos": "hechos",
    "romano": "romanos",
    "corintio": "corintios",
    "galata": "galatas",
    "efesio": "efesios",
    "colosense": "colosenses",
    "tesalonicense": "tesalonicenses",
    "timote": "timoteo",
    "hebreo": "hebreos",
    "santago": "santiago",
    "pedr": "pedro",
    "apocalipsi": "apocalipsis", "revelacion": "apocalipsis",
  };

  let normalized = book.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/\./g, "") // Remove dots
    .replace(/\b(san|santo|santa)\b/g, "") // Remove common prefixes
    .replace(/\b(primera|primer|1ra|1er|1a|i)\b/g, "1")
    .replace(/\b(segunda|segundo|2da|2do|2a|ii)\b/g, "2")
    .replace(/\b(tercera|tercer|3ra|3er|3a|iii)\b/g, "3")
    .replace(/\s+/g, " ")
    .trim();

  // Check if the normalized book matches any misspelling
  for (const [misspelling, correct] of Object.entries(COMMON_MISSPELLINGS)) {
    if (normalized.includes(misspelling)) {
      normalized = normalized.replace(misspelling, correct);
      break;
    }
  }

  return normalized;
};

const translateReference = (reference: string, targetLanguage: 'en' | 'es' = 'en'): string => {
  const match = reference.trim().match(/^(.+?)\s+(\d+.*)$/);
  if (match) {
    const rawBook = match[1];
    const rest = match[2];
    const normalizedBook = normalizeBookKey(rawBook);

    if (targetLanguage === 'en') {
      if (SPANISH_TO_ENGLISH_BOOKS[normalizedBook]) {
        return `${SPANISH_TO_ENGLISH_BOOKS[normalizedBook]} ${rest}`;
      }
      const withoutDe = normalizedBook.replace(/\bde\b/g, "").replace(/\s+/g, " ").trim();
      if (SPANISH_TO_ENGLISH_BOOKS[withoutDe]) {
        return `${SPANISH_TO_ENGLISH_BOOKS[withoutDe]} ${rest}`;
      }
    } else {
      // Logic for English to Spanish if needed
    }
  }
  return reference;
};

export const fetchBiblePassage = async (reference: string, version: string = 'Reina Valera 1960', density: DensityMode = 'classic'): Promise<PresentationItem> => {
  const getVersesPerSlide = (mode: DensityMode) => {
    switch (mode) {
      case 'impact': return 1;
      case 'strophe': return 4;
      case 'reading': return 10;
      case 'classic': default: return 2;
    }
  };

  const groupVerses = (verses: { text: string, ref: string }[], mode: DensityMode, officialBook?: string, chapter?: number): Slide[] => {
    const vPerSlide = getVersesPerSlide(mode);
    const slides: Slide[] = [];
    for (let i = 0; i < verses.length; i += vPerSlide) {
      const chunk = verses.slice(i, i + vPerSlide);
      const combinedText = chunk.map(v => v.text).join('\n\n');

      let label = "";
      if (chunk.length > 1) {
        const startParts = chunk[0].ref.split(':');
        const lastParts = chunk[chunk.length - 1].ref.split(':');
        const startV = startParts[startParts.length - 1];
        const endV = lastParts[lastParts.length - 1];

        if (officialBook && chapter) {
          label = `${officialBook} ${chapter}:${startV}-${endV}`;
        } else {
          label = `${chunk[0].ref.split(':')[0]}:${startV}-${endV}`;
        }
      } else {
        label = chunk[0].ref;
      }

      slides.push({
        id: generateId(),
        type: 'text',
        content: combinedText,
        label: label.toUpperCase()
      });
    }
    return slides;
  };

  // 1. Pre-normalize reference
  let cleanRef = reference.trim()
    .replace(/[.·,]/g, ':')
    .replace(/\s+(\d+)\s+(\d+)/, ' $1:$2')
    .replace(/\s+/g, ' ');

  const bibleRegex = /^(.+?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/;
  const match = cleanRef.match(bibleRegex);

  if (match) {
    const rawBookName = match[1];
    const bookName = normalizeBookKey(rawBookName);
    const chapter = parseInt(match[2]);
    const verseStart = match[3] ? parseInt(match[3]) : 1;
    const verseEnd = match[4] ? parseInt(match[4]) : (match[3] ? verseStart : 999);

    const officialBookName = OFFICIAL_SPANISH_BOOKS[bookName] ||
      (bookName.charAt(0).toUpperCase() + bookName.slice(1));

    const formattedRef = verseEnd !== 999 && verseEnd !== verseStart
      ? `${officialBookName} ${chapter}:${verseStart}-${verseEnd}`
      : `${officialBookName} ${chapter}${match[3] ? ':' + verseStart : ''}`;

    // 2. Check Local Cache (Famous verses) - Only for Reina Valera
    const cacheKey = `${officialBookName} ${chapter}:${verseStart}`;
    if (LOCAL_BIBLE_CACHE[cacheKey] && version.includes("Reina")) {
      const cached = LOCAL_BIBLE_CACHE[cacheKey];
      return {
        id: generateId(),
        title: `${cached.ref} (${version})`,
        type: 'scripture',
        slides: [{ id: generateId(), type: 'text', content: cached.text, label: cached.ref.toUpperCase() }],
        theme: { ...DEFAULT_THEME }
      };
    }

    // 3. OFFLINE JSON SEARCH (Local Data)
    // Prioritized because it is faster and offline-capable.
    const offlineData = BIBLE_DATA_MAP[version];
    if (offlineData) {
      try {
        const bookIndex = BIBLE_BOOKS_ORDER.findIndex(b =>
          b === bookName || normalizeBookKey(b) === bookName
        );

        if (bookIndex !== -1 && (offlineData as any)[bookIndex]) {
          const bookData = (offlineData as any)[bookIndex];
          if (bookData.chapters && bookData.chapters[chapter - 1]) {
            const chapterVerses = bookData.chapters[chapter - 1];
            const rawVerses: { text: string, ref: string }[] = [];
            const actualEnd = verseEnd === 999 ? chapterVerses.length : Math.min(verseEnd, chapterVerses.length);

            for (let i = verseStart; i <= actualEnd; i++) {
              if (chapterVerses[i - 1]) {
                rawVerses.push({ text: chapterVerses[i - 1].trim(), ref: `${officialBookName} ${chapter}:${i}` });
              }
            }

            const slides = groupVerses(rawVerses, density, officialBookName, chapter);
            if (slides.length > 0) {
              return {
                id: generateId(),
                title: `${formattedRef} (${version})`,
                type: 'scripture',
                slides,
                theme: { ...DEFAULT_THEME }
              };
            }
          }
        }
      } catch (e) {
        console.warn(`Offline search failed for ${version}`, e);
      }
    }

    // 4. Use bolls.life API (Supports NVI, LBLA, KJV)
    try {
      // Try multiple variations to find book ID
      const bookIdLookup = bookName.replace(/\s+/g, '');
      let bookId = BOOK_NAME_TO_ID[bookIdLookup] ||
        BOOK_NAME_TO_ID[bookName] ||
        BOOK_NAME_TO_ID[rawBookName.toLowerCase().replace(/\s+/g, '')] ||
        BOOK_NAME_TO_ID[rawBookName.toLowerCase()];

      if (bookId) {
        const bollsCode = getBollsCode(version);
        const rawVerses: { text: string, ref: string }[] = [];

        if (verseEnd === 999) {
          const url = `https://bolls.life/get-chapter/${bollsCode}/${bookId}/${chapter}/`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
              data.forEach((v: any) => {
                rawVerses.push({
                  text: v.text.replace(/<[^>]*>/g, '').replace(/^['"]|['"]$/g, '').trim(),
                  ref: `${officialBookName} ${chapter}:${v.verse}`
                });
              });
            }
          }
        } else {
          for (let v = verseStart; v <= Math.min(verseEnd, verseStart + 50); v++) {
            const url = `https://bolls.life/get-verse/${bollsCode}/${bookId}/${chapter}/${v}/`;
            const res = await fetch(url);
            if (res.ok) {
              const data = await res.json();
              if (data.text) {
                rawVerses.push({
                  text: data.text.replace(/<[^>]*>/g, '').replace(/^['"]|['"]$/g, '').trim(),
                  ref: `${officialBookName} ${chapter}:${v}`
                });
              }
            } else { break; }
          }
        }

        const slides = groupVerses(rawVerses, density, officialBookName, chapter);
        if (slides.length > 0) {
          return {
            id: generateId(),
            title: `${formattedRef} (${version})`,
            type: 'scripture',
            slides,
            theme: { ...DEFAULT_THEME }
          };
        }
      }
    } catch (e) {
      console.error("bolls.life error", e);
    }
  }

  // 5. Fallback FINAL: Use bible-api.com
  try {
    const apiReference = translateReference(cleanRef);
    const apiVersion = mapVersionToApiCode(version);
    const url = `https://bible-api.com/${encodeURIComponent(apiReference)}?translation=${apiVersion}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.verses && data.verses.length > 0) {
        const rawVerses = data.verses.map((v: any) => ({
          text: v.text.trim(),
          ref: `${data.reference.split(':')[0]}:${v.verse}`
        }));

        return {
          id: generateId(),
          title: `${cleanRef} (${version})`,
          type: 'scripture',
          slides: groupVerses(rawVerses, density),
          theme: { ...DEFAULT_THEME }
        };
      }
    }
  } catch (e) {
    console.error("Final fallback error", e);
  }


  throw new Error(`Pasaje no encontrado: "${reference}". Revisa que el nombre del libro sea correcto.`);
};

// --- SONG & OTHER FUNCTIONS ---

export const searchSongs = async (query: string): Promise<SongSearchResult[]> => {
  if (!apiKey) return [];
  const model = ai.models;

  const prompt = `
    Actúa como un bibliotecario musical cristiano experto.
    El usuario busca: "${query}".
    Devuelve una lista de las 5 mejores coincidencias de canciones cristianas.
    FORMATO JSON.
  `;

  try {
    const response = await model.generateContent({
      model: 'gemini-3-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              artist: { type: Type.STRING },
              album: { type: Type.STRING, nullable: true },
              snippet: { type: Type.STRING }
            }
          }
        }
      }
    });

    const data = JSON.parse(response.text || '[]');
    return data;
  } catch (error) {
    console.error("Error searching songs:", error);
    return [];
  }
};

export const fetchSongLyrics = async (songQuery: string, density: DensityMode = 'classic'): Promise<PresentationItem> => {
  if (!apiKey) throw new Error("Se requiere API Key para generar canciones con IA. Usa el modo 'Manual'.");

  const model = ai.models;
  const densityRule = getDensityInstruction(density);

  const prompt = `
    Busca letra cristiana: "${songQuery}".
    CONFIG: ${densityRule}
    ESTRUCTURA: Separa Versos, Coros.
    IMPORTANTE: Si no encuentras la canción exactamente, devuelve la letra de una similar o común.
    FORMATO JSON.
  `;

  try {
    const response = await model.generateContent({
      model: 'gemini-3-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            author: { type: Type.STRING },
            slides: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  lines: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    const data = JSON.parse(response.text || '{}');

    const slides: Slide[] = data.slides.map((s: any) => ({
      id: generateId(),
      type: 'text',
      content: s.lines,
      label: s.label
    }));

    return {
      id: generateId(),
      title: data.title || songQuery,
      type: 'song',
      slides: slides,
      theme: { ...DEFAULT_THEME }
    };

  } catch (error) {
    console.error("AI Lyrics Error:", error);
    throw new Error("No se pudo obtener la letra con IA. Inténtalo pegando el texto en modo 'Manual'.");
  }
};

export const processManualText = async (text: string, density: DensityMode = 'classic'): Promise<PresentationItem> => {
  // Check if text is actually a base64 image
  if (text.trim().startsWith('data:image/')) {
    return {
      id: generateId(),
      title: "Imagen Pegada",
      type: 'custom',
      slides: [{
        id: generateId(),
        type: 'image',
        content: '',
        mediaUrl: text.trim(),
        label: 'IMAGEN'
      }],
      theme: { ...DEFAULT_THEME }
    };
  }

  if (!apiKey) {
    return {
      id: generateId(),
      title: "Texto Manual",
      type: 'custom',
      slides: manualGroupText(text, density),
      theme: { ...DEFAULT_THEME }
    };
  }

  const model = ai.models;
  const densityRule = getDensityInstruction(density);

  const prompt = `
    Formatea este texto en diapositivas.
    TEXTO: "${text}"
    CONFIG: ${densityRule}
    IMPORTANTE: Cada bloque resultante en el JSON debe ser una diapositiva.
    FORMATO JSON.
  `;

  try {
    const response = await model.generateContent({
      model: 'gemini-3-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            slides: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  lines: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    const data = JSON.parse(response.text || '{}');
    const slides: Slide[] = data.slides.map((s: any) => ({
      id: generateId(),
      type: 'text',
      content: s.lines,
      label: s.label
    }));

    return {
      id: generateId(),
      title: data.title || "Texto Manual",
      type: 'custom',
      slides: slides.length > 0 ? slides : manualGroupText(text, density),
      theme: { ...DEFAULT_THEME }
    };

  } catch (error) {
    console.warn("AI Process Error, falling back to manual density:", error);
    return {
      id: generateId(),
      title: "Texto Manual",
      type: 'custom',
      slides: manualGroupText(text, density),
      theme: { ...DEFAULT_THEME }
    };
  }
};
