import { SupportedLanguageCode } from '@/lib/i18n/languages';

type PantryTermTranslations = Partial<Record<SupportedLanguageCode, string>>;

const descriptorPattern = /\b(baby|fresh|organic|large|small|whole|raw|cooked|frozen|dried|chopped|sliced|ground)\b/g;

const pantryTerms: Record<string, PantryTermTranslations> = {
  apple: {
    de: 'Apfel',
    es: 'manzana',
    fr: 'pomme',
    it: 'mela',
    ja: 'りんご',
    ko: '사과',
    pt: 'maçã',
    vi: 'táo',
    zh: '苹果',
  },
  asparagus: {
    de: 'Spargel',
    es: 'espárragos',
    fr: 'asperges',
    it: 'asparagi',
    ja: 'アスパラガス',
    ko: '아스파라거스',
    pt: 'aspargo',
    vi: 'măng tây',
    zh: '芦笋',
  },
  butter: {
    de: 'Butter',
    es: 'mantequilla',
    fr: 'beurre',
    it: 'burro',
    ja: 'バター',
    ko: '버터',
    pt: 'manteiga',
    vi: 'bơ',
    zh: '黄油',
  },
  cabbage: {
    de: 'Kohl',
    es: 'repollo',
    fr: 'chou',
    it: 'cavolo',
    ja: 'キャベツ',
    ko: '양배추',
    pt: 'repolho',
    vi: 'bắp cải',
    zh: '卷心菜',
  },
  chicken: {
    de: 'Hähnchen',
    es: 'pollo',
    fr: 'poulet',
    it: 'pollo',
    ja: '鶏肉',
    ko: '닭고기',
    pt: 'frango',
    vi: 'thịt gà',
    zh: '鸡肉',
  },
  cilantro: {
    de: 'Koriander',
    es: 'cilantro',
    fr: 'coriandre',
    it: 'coriandolo',
    ja: 'パクチー',
    ko: '고수',
    pt: 'coentro',
    vi: 'ngò rí',
    zh: '香菜',
  },
  egg: {
    de: 'Ei',
    es: 'huevo',
    fr: 'œuf',
    it: 'uovo',
    ja: '卵',
    ko: '달걀',
    pt: 'ovo',
    vi: 'trứng',
    zh: '鸡蛋',
  },
  'fish cake': {
    de: 'Fischkuchen',
    es: 'pastel de pescado',
    fr: 'galette de poisson',
    it: 'polpetta di pesce',
    ja: '魚のすり身',
    ko: '어묵',
    pt: 'bolinho de peixe',
    vi: 'chả cá',
    zh: '鱼糕',
  },
  garlic: {
    de: 'Knoblauch',
    es: 'ajo',
    fr: 'ail',
    it: 'aglio',
    ja: 'にんにく',
    ko: '마늘',
    pt: 'alho',
    vi: 'tỏi',
    zh: '大蒜',
  },
  'ice cream': {
    de: 'Eiscreme',
    es: 'helado',
    fr: 'glace',
    it: 'gelato',
    ja: 'アイスクリーム',
    ko: '아이스크림',
    pt: 'sorvete',
    vi: 'kem',
    zh: '冰淇淋',
  },
  lemon: {
    de: 'Zitrone',
    es: 'limón',
    fr: 'citron',
    it: 'limone',
    ja: 'レモン',
    ko: '레몬',
    pt: 'limão',
    vi: 'chanh',
    zh: '柠檬',
  },
  milk: {
    de: 'Milch',
    es: 'leche',
    fr: 'lait',
    it: 'latte',
    ja: '牛乳',
    ko: '우유',
    pt: 'leite',
    vi: 'sữa',
    zh: '牛奶',
  },
  rice: {
    de: 'Reis',
    es: 'arroz',
    fr: 'riz',
    it: 'riso',
    ja: '米',
    ko: '쌀',
    pt: 'arroz',
    vi: 'gạo',
    zh: '米',
  },
  sausage: {
    de: 'Wurst',
    es: 'salchicha',
    fr: 'saucisse',
    it: 'salsiccia',
    ja: 'ソーセージ',
    ko: '소시지',
    pt: 'salsicha',
    vi: 'xúc xích',
    zh: '香肠',
  },
  spinach: {
    de: 'Spinat',
    es: 'espinaca',
    fr: 'épinards',
    it: 'spinaci',
    ja: 'ほうれん草',
    ko: '시금치',
    pt: 'espinafre',
    vi: 'rau bina',
    zh: '菠菜',
  },
  steak: {
    de: 'Steak',
    es: 'bistec',
    fr: 'steak',
    it: 'bistecca',
    ja: 'ステーキ',
    ko: '스테이크',
    pt: 'bife',
    vi: 'bít tết',
    zh: '牛排',
  },
};

export function getLocalPantryTermTranslation(term: string, targetLanguage: SupportedLanguageCode) {
  if (targetLanguage === 'en') {
    return null;
  }

  const normalized = normalizePantryTerm(term);

  return pantryTerms[normalized]?.[targetLanguage] ?? null;
}

export function normalizePantryTerm(term: string) {
  const normalized = term
    .trim()
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(descriptorPattern, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (pantryTerms[normalized]) {
    return normalized;
  }

  if (normalized.endsWith('ies') && pantryTerms[`${normalized.slice(0, -3)}y`]) {
    return `${normalized.slice(0, -3)}y`;
  }

  if (normalized.endsWith('es') && pantryTerms[normalized.slice(0, -2)]) {
    return normalized.slice(0, -2);
  }

  if (normalized.endsWith('s') && pantryTerms[normalized.slice(0, -1)]) {
    return normalized.slice(0, -1);
  }

  return normalized;
}
