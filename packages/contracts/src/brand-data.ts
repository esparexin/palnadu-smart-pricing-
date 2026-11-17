export interface CanonicalBrand {
  name: string;
  slug: string;
  website: string;
  country: string;
  notes: string;
  aliases: readonly string[];
}

export const CANONICAL_BRANDS: readonly CanonicalBrand[] = [
  {
    name: 'Hanwha Vision',
    slug: 'hanwha-vision',
    website: 'https://www.hanwhavision.com',
    country: 'South Korea',
    notes: 'Formerly Hanwha Techwin / Samsung Techwin; Wisenet platform',
    aliases: ['hanwha vision', 'hanwha', 'hanwha techwin', 'wisenet', 'samsung techwin'],
  },
  {
    name: 'Panasonic',
    slug: 'panasonic',
    website: 'https://security.in.panasonic.com',
    country: 'Japan',
    notes: 'Legacy Panasonic surveillance division; separate from independent i-PRO',
    aliases: ['panasonic', 'panasonic security', 'panasonic corporation'],
  },
  {
    name: 'i-PRO',
    slug: 'i-pro',
    website: 'https://i-pro.com',
    country: 'Japan',
    notes: 'Independent security OEM spun out from Panasonic (i-PRO Co., Ltd.)',
    aliases: ['i-pro', 'ipro', 'i-pro sensing solutions'],
  },
  {
    name: 'Axis Communications',
    slug: 'axis',
    website: 'https://www.axis.com',
    country: 'Sweden',
    notes: 'Canon Group company; pioneer of network IP video',
    aliases: ['axis', 'axis communications', 'axis communications ab'],
  },
  {
    name: 'Honeywell',
    slug: 'honeywell',
    website: 'https://buildings.honeywell.com',
    country: 'USA',
    notes: 'Honeywell Commercial Security (35, 60, 70 series)',
    aliases: ['honeywell', 'honeywell security', 'honeywell commercial security'],
  },
  {
    name: 'Sony',
    slug: 'sony',
    website: 'https://pro.sony',
    country: 'Japan',
    notes: 'Sony Video Security and STARVIS sensor series',
    aliases: ['sony', 'sony security', 'sony corporation'],
  },
  {
    name: 'Hikvision',
    slug: 'hikvision',
    website: 'https://www.hikvision.com',
    country: 'China',
    notes: 'Hangzhou Hikvision Digital Technology Co., Ltd.',
    aliases: ['hikvision', 'hikvision digital technology', 'hik vision'],
  },
  {
    name: 'Dahua',
    slug: 'dahua',
    website: 'https://www.dahuasecurity.com',
    country: 'China',
    notes: 'Zhejiang Dahua Technology Co., Ltd.; WizSense and WizMind',
    aliases: ['dahua', 'dahua technology', 'dahua security'],
  },
  {
    name: 'Uniview',
    slug: 'uniview',
    website: 'https://www.uniview.com',
    country: 'China',
    notes: 'Zhejiang Uniview Technologies Co., Ltd. (UNV)',
    aliases: ['uniview', 'unv', 'uniview technologies', 'uniview/unv', 'uniview (unv)'],
  },
  {
    name: 'Vivotek',
    slug: 'vivotek',
    website: 'https://www.vivotek.com',
    country: 'Taiwan',
    notes: 'Delta Group Company',
    aliases: ['vivotek', 'vivotek inc'],
  },
  {
    name: 'CP PLUS',
    slug: 'cp-plus',
    website: 'https://www.cpplusworld.com',
    country: 'India',
    notes: 'Aditya Infotech Ltd.; leading Indian volume surveillance brand',
    aliases: ['cp plus', 'cpplus', 'cp-plus', 'cp plus world'],
  },
  {
    name: 'Hi-Focus',
    slug: 'hi-focus',
    website: 'https://hifocuscctv.com',
    country: 'India',
    notes: 'HiFocus Electronics India Pvt. Ltd.',
    aliases: ['hi-focus', 'hifocus', 'hi focus', 'hifocus cctv', 'hifocus electronics'],
  },
  {
    name: 'Secureye',
    slug: 'secureye',
    website: 'https://www.secureye.com',
    country: 'India',
    notes: 'Fortune Marketing Pvt. Ltd.',
    aliases: ['secureye', 'secur eye', 'secureye security'],
  },
  {
    name: 'Sparsh',
    slug: 'sparsh',
    website: 'https://www.sparshsecuritech.com',
    country: 'India',
    notes: 'Samriddhi Automations Pvt. Ltd.; Make in India surveillance pioneer',
    aliases: ['sparsh', 'sparsh securitech', 'sparsh cctv', 'samriddhi automations'],
  },
  {
    name: 'Trueview',
    slug: 'trueview',
    website: 'https://trueview.co.in',
    country: 'India',
    notes: 'Trueview Electronic Security Pvt. Ltd.',
    aliases: ['trueview', 'true view', 'trueview india'],
  },
  {
    name: 'Godrej Security Solutions',
    slug: 'godrej',
    website: 'https://www.godrejenterprises.com',
    country: 'India',
    notes: 'Godrej & Boyce Mfg. Co. Ltd.',
    aliases: ['godrej', 'godrej security', 'godrej security solutions', 'godrej & boyce'],
  },
  {
    name: 'EZVIZ',
    slug: 'ezviz',
    website: 'https://www.ezviz.com',
    country: 'China',
    notes: 'Consumer IoT and smart home camera brand',
    aliases: ['ezviz', 'ezviz life'],
  },
  {
    name: 'TP-Link',
    slug: 'tp-link',
    website: 'https://www.tp-link.com',
    country: 'China',
    notes: 'Umbrella brand encompassing Tapo smart home and VIGI commercial surveillance',
    aliases: ['tp-link', 'tplink', 'tp link', 'tp-link tapo', 'tp-link vigi', 'tapo', 'vigi'],
  },
  {
    name: 'Reolink',
    slug: 'reolink',
    website: 'https://reolink.com',
    country: 'Hong Kong',
    notes: 'DIY and prosumer battery/solar/PoE camera brand',
    aliases: ['reolink', 'reolink innovation'],
  },
] as const;

export const AMBIGUOUS_BRAND_ALIASES: ReadonlyMap<
  string,
  { candidateSlugs: readonly string[]; reason: string }
> = new Map([
  [
    'panasonic / i-pro',
    {
      candidateSlugs: ['panasonic', 'i-pro'],
      reason:
        "References both Panasonic and i-PRO. Specify either 'Panasonic' or 'i-PRO' explicitly.",
    },
  ],
  [
    'panasonic/i-pro',
    {
      candidateSlugs: ['panasonic', 'i-pro'],
      reason:
        "References both Panasonic and i-PRO. Specify either 'Panasonic' or 'i-PRO' explicitly.",
    },
  ],
  [
    'panasonic & i-pro',
    {
      candidateSlugs: ['panasonic', 'i-pro'],
      reason:
        "References both Panasonic and i-PRO. Specify either 'Panasonic' or 'i-PRO' explicitly.",
    },
  ],
]);
