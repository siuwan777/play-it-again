export type ListingSpecs = Record<string, string>;

export type SpecField = {
  key: string;
  label: string;
  required?: boolean;
  options?: string[];
  dependsOn?: { key: string; value: string };
  placeholder?: string;
};

export const LISTING_CONDITIONS = [
  { id: 'brand_new', label: '全新' },
  { id: 'mint', label: '近全新' },
  { id: 'excellent', label: '極佳' },
  { id: 'very_good', label: '非常良好' },
  { id: 'good', label: '良好' },
  { id: 'fair', label: '一般' },
  { id: 'poor', label: '欠佳' },
  { id: 'non_functioning', label: '無法正常運作' },
];

export const YEAR_OPTIONS = [
  '2026',
  '2025',
  '2024',
  '2023',
  '2022',
  '2021',
  '2020',
  '2019',
  '2018',
  '2017',
  '2016',
  '2015',
  '2010-2014',
  '2000-2009',
  '1990-1999',
  '1980-1989',
  '1970-1979',
  '1960-1969',
  '更早',
  '不確定',
];

const OTHER = '其他';

export function getOtherOptionLabel(): string {
  return OTHER;
}

export function getCustomFieldKey(fieldKey: string): string {
  return `custom${fieldKey.charAt(0).toUpperCase()}${fieldKey.slice(1)}`;
}

export function fieldHasOtherOption(field: SpecField): boolean {
  return Boolean(field.options?.includes(OTHER));
}

export function fieldSupportsOther(field: SpecField): boolean {
  if (isTextInputField(field)) return false;
  return field.key === 'model' || fieldHasOtherOption(field);
}

export function isTextInputField(field: SpecField): boolean {
  return Boolean(field.placeholder && !field.options?.length);
}

const GUITAR_BRANDS = [
  'Fender',
  'Gibson',
  'Epiphone',
  'Squier',
  'Yamaha',
  'Ibanez',
  'PRS',
  'Gretsch',
  'Music Man',
  'Schecter',
  'Jackson',
  'Charvel',
  'G&L',
  'Rickenbacker',
  'Cort',
  'Eastman',
  OTHER,
];

const ACOUSTIC_BRANDS = [
  'Taylor',
  'Martin',
  'Yamaha',
  'Fender',
  'Gibson',
  'Epiphone',
  'Sigma',
  'Cort',
  'Eastman',
  'Takamine',
  'Ibanez',
  OTHER,
];

const BASS_BRANDS = [
  'Fender',
  'Music Man',
  'Ibanez',
  'Yamaha',
  'Squier',
  'Gibson',
  'Epiphone',
  'Schecter',
  'Rickenbacker',
  'Warwick',
  'Sandberg',
  OTHER,
];

const EFFECT_BRANDS = [
  'Boss',
  'Strymon',
  'MXR',
  'Electro-Harmonix',
  'Ibanez',
  'Walrus Audio',
  'EarthQuaker',
  'Line 6',
  'Eventide',
  'TC Electronic',
  'Chase Bliss',
  OTHER,
];

const AMP_BRANDS = [
  'Fender',
  'Marshall',
  'Vox',
  'Orange',
  'Boss',
  'Blackstar',
  'Mesa Boogie',
  'Roland',
  'Yamaha',
  'Line 6',
  'Positive Grid',
  OTHER,
];

const DRUM_BRANDS = [
  'Pearl',
  'Yamaha',
  'Tama',
  'DW',
  'Ludwig',
  'Gretsch',
  'Sonor',
  'Mapex',
  'Zildjian',
  'Sabian',
  'Meinl',
  OTHER,
];

const KEYBOARD_BRANDS = [
  'Yamaha',
  'Roland',
  'Korg',
  'Nord',
  'Casio',
  'Kawai',
  'Arturia',
  'NUX',
  'Studiologic',
  'Native Instruments',
  OTHER,
];

const UKULELE_BRANDS = [
  'Kala',
  'Martin',
  'Cordoba',
  'Kamaka',
  'Enya',
  'ANueNue',
  'Fender',
  'Ohana',
  OTHER,
];

const WIND_BRANDS = [
  'Yamaha',
  'Selmer',
  'Yanagisawa',
  'Jupiter',
  'Buffet',
  'Bach',
  'Conn',
  'Muramatsu',
  OTHER,
];

const STRING_BRANDS = [
  'Yamaha',
  'Stentor',
  'Scott Cao',
  'Eastman',
  'Hofner',
  'Carlo Giordano',
  'Suzuki',
  OTHER,
];

const MIC_BRANDS = [
  'Shure',
  'Sennheiser',
  'Audio-Technica',
  'AKG',
  'Rode',
  'Blue',
  'Focusrite',
  'Universal Audio',
  'PreSonus',
  'Beyerdynamic',
  OTHER,
];

const DJ_BRANDS = [
  'Pioneer DJ',
  'Denon DJ',
  'Native Instruments',
  'Numark',
  'Allen & Heath',
  'Rane',
  'Technics',
  OTHER,
];

const BRAND_MODELS: Record<string, string[]> = {
  Fender: ['Stratocaster', 'Telecaster', 'Jazzmaster', 'Jaguar', 'Mustang', 'Precision Bass', 'Jazz Bass', 'Player Series', OTHER],
  Gibson: ['Les Paul', 'SG', 'ES-335', 'Flying V', 'Explorer', 'J-45', 'Hummingbird', OTHER],
  Epiphone: ['Les Paul', 'SG', 'Casino', 'Dot', 'Sheraton', 'DR-100', OTHER],
  Squier: ['Stratocaster', 'Telecaster', 'Jazz Bass', 'Precision Bass', 'Classic Vibe', OTHER],
  Yamaha: ['P-125', 'P-225', 'CP88', 'MODX', 'Pacifica', 'FG Series', 'LL Series', 'TRBX', 'Stage Custom', 'YAS-280', OTHER],
  Ibanez: ['RG', 'AZ', 'Artcore', 'SR Bass', 'Tube Screamer', OTHER],
  PRS: ['SE Custom', 'SE Standard', 'CE', 'Silver Sky', OTHER],
  Taylor: ['114ce', '214ce', '314ce', '414ce', '814ce', OTHER],
  Martin: ['D-28', 'D-18', '000-15', 'OM-28', OTHER],
  Boss: ['DS-1', 'SD-1', 'DD-3', 'RV-6', 'Katana', OTHER],
  Strymon: ['BigSky', 'Timeline', 'Mobius', 'Iridium', OTHER],
  Marshall: ['DSL', 'Origin', 'Code', 'Silver Jubilee', OTHER],
  Vox: ['AC15', 'AC30', 'Cambridge', OTHER],
  Orange: ['Tiny Terror', 'Rockerverb', 'Crush', OTHER],
  Pearl: ['Export', 'Session', 'Reference', 'Sensitone', OTHER],
  Roland: ['FP-30X', 'FP-60X', 'Fantom', 'Juno', 'RD-88', OTHER],
  Korg: ['SV-2', 'Kronos', 'Minilogue', 'Pa Series', OTHER],
  Kala: ['KA-15', 'KA-C', 'KA-T', 'Solid Spruce', OTHER],
};

const DEFAULT_MODELS = ['Standard', 'Custom Shop', 'Signature', OTHER];

const FINISH_OPTIONS = ['Sunburst', 'Black', 'White', 'Natural', 'Red', 'Blue', 'Green', 'Gold', OTHER];
const HANDEDNESS_OPTIONS = ['右手', '左手'];
const INCLUDES_OPTIONS = ['Hardcase', 'Gig Bag', '原裝盒', '火牛', '不附送'];

const GUITAR_BODY_TYPES = ['Stratocaster', 'Telecaster', 'Les Paul', 'SG', 'Superstrat', 'Hollow Body', 'Semi-Hollow', OTHER];
const GUITAR_PICKUPS = ['SSS', 'HSS', 'HH', 'HS', 'P90', 'FilterTron', OTHER];
const FREBOARD_OPTIONS = ['楓木', '玫瑰木', '黐木', '黒檀木', OTHER];

const ACOUSTIC_BODY_SHAPES = ['Dreadnought', 'OM', 'Grand Auditorium', 'Classical', 'Parlor', 'Jumbo', OTHER];
const ACOUSTIC_TOP_WOODS = ['Sitka Spruce', 'Cedar', 'Mahogany', OTHER];
const ACOUSTIC_PICKUP = ['無', '壓電式', '內建前級', OTHER];

const BASS_BODY_TYPES = ['Precision', 'Jazz', 'Modern', 'Short Scale', 'Hollow', OTHER];
const BASS_PICKUPS = ['Split', 'Jazz', 'Soapbar', 'MM Style', 'Passive', 'Active', OTHER];

const EFFECT_TYPES = ['Overdrive', 'Distortion', 'Delay', 'Reverb', 'Modulation', 'Compressor', 'Multi-Effects', 'Preamp', OTHER];
const POWER_OPTIONS = ['9V', '18V', '內建電源', '不適用'];

const AMP_TYPES = ['Combo', 'Head', 'Cabinet', 'Preamp', 'Pedal Amp', OTHER];
const AMP_WATTAGE = ['5W 以下', '5-15W', '15-30W', '30-50W', '50-100W', '100W 以上', '不適用'];
const AMP_TECH = ['Tube', 'Solid State', 'Hybrid', 'Digital', '不適用'];

const DRUM_TYPES = ['套鼓', '小鼓', 'Crash', 'Ride', 'Hi-Hat', '硬件', '電子鼓', OTHER];
const SHELL_MATERIALS = ['Maple', 'Birch', 'Mahogany', 'Poplar', '混合', '不適用'];

const KEY_TYPES = ['舞台琴', '電鋼琴', '合成器', 'MIDI Controller', '編曲鍵盤', '風琴', OTHER];
const KEY_COUNTS = ['25 鍵', '37 鍵', '49 鍵', '61 鍵', '76 鍵', '88 鍵', OTHER];
const KEY_ACTIONS = ['加重琴鍵', '半加重', '無加重', '不適用', OTHER];

const UKULELE_SIZES = ['Soprano', 'Concert', 'Tenor', 'Baritone', OTHER];
const UKULELE_MATERIALS = ['全單板', '面單板', '合板', OTHER];

const WIND_TYPES = [
  'Alto Sax 中音色士風',
  'Tenor Sax 次中音色士風',
  'Soprano Sax 高音色士風',
  '長笛',
  '小號',
  '單簧管',
  '雙簧管',
  '長號',
  '直笛',
  OTHER,
];
const WIND_MATERIALS = ['黃銅', '鍍銀', '木質', '樹脂', '不適用', OTHER];

const STRING_TYPES = ['小提琴', '中提琴', '大提琴', '低音提琴', OTHER];
const STRING_SIZES = ['4/4', '3/4', '1/2', '1/4', '1/8', OTHER];

const MIC_GEAR_TYPES = ['動圈咪高峰', '电容咪高峰', '录音介面', '监听耳机', '监听音箱', '其他錄音', OTHER];
const MIC_CONNECTIONS = ['XLR', 'USB', '3.5mm', '不適用', OTHER];

const DJ_GEAR_TYPES = ['DJ Controller', 'Turntable 唱盤', 'CDJ / Media Player', 'Mixer 混音台', OTHER];
const DJ_CHANNELS = ['2 通道', '4 通道', '不適用', OTHER];

function modelField(): SpecField {
  return { key: 'model', label: '型號', required: true, options: [] };
}

function modelTextField(placeholder = '例如：BigSky、Timeline、DS-1'): SpecField {
  return {
    key: 'model',
    label: '型號',
    required: true,
    placeholder,
  };
}

function brandField(brands: string[]): SpecField {
  return { key: 'brand', label: '品牌', required: true, options: brands };
}

function yearField(): SpecField {
  return { key: 'year', label: '年份', required: true, options: YEAR_OPTIONS };
}

const CATEGORY_FIELDS: Record<string, SpecField[]> = {
  eguitar: [
    brandField(GUITAR_BRANDS),
    modelField(),
    yearField(),
    { key: 'bodyType', label: '琴身類型', options: GUITAR_BODY_TYPES },
    { key: 'pickups', label: '拾音器配置', options: GUITAR_PICKUPS },
    { key: 'fretboard', label: '指板材質', options: FREBOARD_OPTIONS },
    { key: 'finish', label: '顏色 / 漆面', options: FINISH_OPTIONS },
    { key: 'handedness', label: '左右手', options: HANDEDNESS_OPTIONS },
    { key: 'includes', label: '附送配件', options: INCLUDES_OPTIONS },
  ],
  aguitar: [
    brandField(ACOUSTIC_BRANDS),
    modelField(),
    yearField(),
    { key: 'bodyShape', label: '琴身形狀', options: ACOUSTIC_BODY_SHAPES },
    { key: 'topWood', label: '面板木材', options: ACOUSTIC_TOP_WOODS },
    { key: 'pickup', label: '拾音系統', options: ACOUSTIC_PICKUP },
    { key: 'finish', label: '顏色 / 漆面', options: FINISH_OPTIONS },
    { key: 'includes', label: '附送配件', options: INCLUDES_OPTIONS },
  ],
  bass: [
    brandField(BASS_BRANDS),
    modelField(),
    yearField(),
    { key: 'bodyType', label: '琴身類型', options: BASS_BODY_TYPES },
    { key: 'pickups', label: '拾音器配置', options: BASS_PICKUPS },
    { key: 'fretboard', label: '指板材質', options: FREBOARD_OPTIONS },
    { key: 'finish', label: '顏色 / 漆面', options: FINISH_OPTIONS },
    { key: 'handedness', label: '左右手', options: HANDEDNESS_OPTIONS },
    { key: 'includes', label: '附送配件', options: INCLUDES_OPTIONS },
  ],
  ukulele: [
    brandField(UKULELE_BRANDS),
    modelTextField('例如：KA-15S、TOM-100'),
    yearField(),
    { key: 'size', label: '尺寸', required: true, options: UKULELE_SIZES },
    { key: 'material', label: '木材', options: UKULELE_MATERIALS },
    { key: 'finish', label: '顏色 / 漆面', options: FINISH_OPTIONS },
    { key: 'includes', label: '附送配件', options: INCLUDES_OPTIONS },
  ],
  keyboard: [
    { key: 'keyType', label: '鍵盤類型', required: true, options: KEY_TYPES },
    brandField(KEYBOARD_BRANDS),
    modelTextField('例如：FP-30X、P-125、Minilogue'),
    yearField(),
    { key: 'keys', label: '鍵數', options: KEY_COUNTS },
    { key: 'keyAction', label: '鍵盤手感', options: KEY_ACTIONS },
    { key: 'includes', label: '附送配件', options: INCLUDES_OPTIONS },
  ],
  winds: [
    { key: 'windType', label: '樂器種類', required: true, options: WIND_TYPES },
    brandField(WIND_BRANDS),
    modelTextField('例如：YAS-280、YFL-222'),
    yearField(),
    { key: 'windMaterial', label: '材質', options: WIND_MATERIALS },
    { key: 'includes', label: '附送配件', options: INCLUDES_OPTIONS },
  ],
  strings: [
    { key: 'stringType', label: '樂器種類', required: true, options: STRING_TYPES },
    brandField(STRING_BRANDS),
    modelTextField('例如：V-5、VC100'),
    yearField(),
    { key: 'stringSize', label: '尺寸', options: STRING_SIZES },
    { key: 'includes', label: '附送配件', options: INCLUDES_OPTIONS },
  ],
  effects: [
    brandField(EFFECT_BRANDS),
    modelTextField('例如：BigSky、Timeline、DS-1'),
    yearField(),
    { key: 'effectType', label: '效果類型', required: true, options: EFFECT_TYPES },
    { key: 'power', label: '供電規格', options: POWER_OPTIONS },
    { key: 'includes', label: '附送配件', options: INCLUDES_OPTIONS },
  ],
  amps: [
    brandField(AMP_BRANDS),
    modelField(),
    yearField(),
    { key: 'ampType', label: 'Amp 類型', required: true, options: AMP_TYPES },
    { key: 'wattage', label: '功率', options: AMP_WATTAGE },
    { key: 'ampTech', label: '電路類型', options: AMP_TECH },
    { key: 'includes', label: '附送配件', options: INCLUDES_OPTIONS },
  ],
  drums: [
    brandField(DRUM_BRANDS),
    modelField(),
    yearField(),
    { key: 'drumType', label: '鼓件類型', required: true, options: DRUM_TYPES },
    { key: 'shellMaterial', label: '鼓腔材質', options: SHELL_MATERIALS },
    { key: 'includes', label: '附送配件', options: INCLUDES_OPTIONS },
  ],
  mic: [
    { key: 'gearType', label: '器材類型', required: true, options: MIC_GEAR_TYPES },
    brandField(MIC_BRANDS),
    modelTextField('例如：SM58、AT2020、Scarlett 2i2'),
    yearField(),
    { key: 'connection', label: '連接方式', options: MIC_CONNECTIONS },
    { key: 'includes', label: '附送配件', options: INCLUDES_OPTIONS },
  ],
  dj: [
    { key: 'djType', label: '器材類型', required: true, options: DJ_GEAR_TYPES },
    brandField(DJ_BRANDS),
    modelTextField('例如：DDJ-FLX4、XDJ-XZ、SL1200'),
    yearField(),
    { key: 'channels', label: '通道數', options: DJ_CHANNELS },
    { key: 'includes', label: '附送配件', options: INCLUDES_OPTIONS },
  ],
  other: [
    {
      key: 'instrumentType',
      label: '樂器種類',
      required: true,
      placeholder: '例如：口琴、口風琴、電子鼓 pad',
    },
    {
      key: 'brand',
      label: '品牌',
      required: true,
      placeholder: '例如：Hohner、Roland',
    },
    {
      key: 'model',
      label: '型號',
      required: true,
      placeholder: '例如：Special 20、SPD-SX',
    },
    {
      key: 'year',
      label: '年份',
      required: true,
      placeholder: '例如：2022、2010-2014',
    },
    {
      key: 'size',
      label: '尺寸',
      placeholder: '例如：4/4、88 鍵、不適用',
    },
    {
      key: 'includes',
      label: '附送配件',
      placeholder: '例如：Hardcase、拾音器、無',
    },
  ],
};

export function getSpecFields(categoryId: string): SpecField[] {
  return CATEGORY_FIELDS[categoryId] || CATEGORY_FIELDS.eguitar;
}

export function getModelOptions(brand?: string): string[] {
  if (!brand || brand === OTHER) return DEFAULT_MODELS;
  return BRAND_MODELS[brand] || DEFAULT_MODELS;
}

export function createEmptySpecs(categoryId: string): ListingSpecs {
  const specs: ListingSpecs = {};
  getSpecFields(categoryId).forEach((field) => {
    if (field.options?.length || isTextInputField(field)) {
      specs[field.key] = '';
    }
  });
  return specs;
}

export function resolveSpecValue(specs: ListingSpecs, key: string): string {
  const value = specs[key]?.trim();
  if (!value) return '';

  if (value === OTHER) {
    return specs[getCustomFieldKey(key)]?.trim() || '';
  }

  return value;
}

const TYPE_FIRST_CATEGORIES: Record<string, string> = {
  keyboard: 'keyType',
  winds: 'windType',
  strings: 'stringType',
  mic: 'gearType',
  dj: 'djType',
  other: 'instrumentType',
};

export function buildListingTitle(categoryId: string, specs: ListingSpecs): string {
  const brand = resolveSpecValue(specs, 'brand');
  const model = resolveSpecValue(specs, 'model');
  const year = specs.year?.trim();
  const yearPart = year === '不確定' ? '' : year;

  const categoryExtras: Record<string, string[]> = {
    eguitar: [resolveSpecValue(specs, 'finish')],
    aguitar: [resolveSpecValue(specs, 'finish')],
    bass: [resolveSpecValue(specs, 'finish')],
    ukulele: [resolveSpecValue(specs, 'size')],
    keyboard: [resolveSpecValue(specs, 'keys')],
    winds: [resolveSpecValue(specs, 'windMaterial')],
    strings: [resolveSpecValue(specs, 'stringSize')],
    mic: [resolveSpecValue(specs, 'connection')],
    dj: [resolveSpecValue(specs, 'channels')],
    effects: [resolveSpecValue(specs, 'effectType')],
    amps: [resolveSpecValue(specs, 'ampType')],
    drums: [resolveSpecValue(specs, 'drumType')],
    other: [resolveSpecValue(specs, 'size')],
  };

  const typeFieldKey = TYPE_FIRST_CATEGORIES[categoryId];
  if (typeFieldKey) {
    const typeLabel = resolveSpecValue(specs, typeFieldKey);
    const parts = [typeLabel, brand, model, yearPart, ...(categoryExtras[categoryId] || [])].filter(Boolean);
    return parts.join(' ');
  }

  const parts = [brand, model, yearPart, ...(categoryExtras[categoryId] || [])].filter(Boolean);
  return parts.join(' ');
}

export function getConditionLabel(conditionId?: string | null, fallback?: string): string {
  if (conditionId) {
    const match = LISTING_CONDITIONS.find((item) => item.id === conditionId);
    if (match) return match.label;
  }
  return fallback || '';
}

export function validateListingForm(params: {
  categoryId: string;
  specs: ListingSpecs;
  conditionId: string;
  price: string;
  description: string;
  imagesCount: number;
}): string | null {
  if (params.imagesCount < 1) return '請至少選 1 張照片';
  if (!params.categoryId) return '請選擇商品分類';
  if (!params.conditionId) return '請選擇新舊程度';
  if (!params.price.trim()) return '請輸入售價';
  if (!params.description.trim()) return '請填寫補充描述';

  for (const field of getSpecFields(params.categoryId)) {
    if (!field.options?.length && !isTextInputField(field)) continue;

    const value = params.specs[field.key]?.trim();

    if (field.required && !value) {
      if (isTextInputField(field)) return `請填寫${field.label}`;
      return field.key === 'model' ? '請選擇型號' : `請選擇${field.label}`;
    }

    if (value === OTHER && fieldSupportsOther(field)) {
      const customValue = params.specs[getCustomFieldKey(field.key)]?.trim();
      if (!customValue) return `請填寫${field.label}（其他）`;
    }
  }

  if (!buildListingTitle(params.categoryId, params.specs)) {
    return '請至少選擇品牌與型號';
  }

  return null;
}

export function getSpecDisplayRows(categoryId: string, specs: ListingSpecs): { label: string; value: string }[] {
  return getSpecFields(categoryId)
    .filter((field) => field.options?.length || isTextInputField(field))
    .map((field) => ({
      label: field.label,
      value: resolveSpecValue(specs, field.key),
    }))
    .filter((row) => row.value);
}

export function normalizeSpecsFromFirestore(
  categoryId: string,
  raw?: ListingSpecs | null
): ListingSpecs {
  const specs = createEmptySpecs(categoryId);
  if (!raw) return specs;

  Object.entries(raw).forEach(([key, value]) => {
    if (typeof value === 'string') specs[key] = value;
  });

  return specs;
}

export function resolveConditionId(data: { conditionId?: string; condition?: string }): string {
  if (data.conditionId) return data.conditionId;
  const match = LISTING_CONDITIONS.find((item) => item.label === data.condition);
  return match?.id || '';
}

export function serializeSpecs(specs: ListingSpecs): ListingSpecs {
  const cleaned: ListingSpecs = {};
  Object.entries(specs).forEach(([key, value]) => {
    const trimmed = value?.trim();
    if (trimmed) cleaned[key] = trimmed;
  });
  return cleaned;
}
