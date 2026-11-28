/**
 * The 22 counties by official code, with their English and Traditional Chinese
 * names, small enough for any page to import. `tests/pinned-county.test.ts`
 * checks it against the county outlines and the atlas facts, so a renamed or
 * missing county fails a test instead of quietly dropping out of the pin.
 */
export interface CountyName {
  code: string;
  en: string;
  zh: string;
}

export const countyList: CountyName[] = [
  { code: "09007", en: "Lienchiang County", zh: "連江縣" },
  { code: "09020", en: "Kinmen County", zh: "金門縣" },
  { code: "10002", en: "Yilan County", zh: "宜蘭縣" },
  { code: "10004", en: "Hsinchu County", zh: "新竹縣" },
  { code: "10005", en: "Miaoli County", zh: "苗栗縣" },
  { code: "10007", en: "Changhua County", zh: "彰化縣" },
  { code: "10008", en: "Nantou County", zh: "南投縣" },
  { code: "10009", en: "Yunlin County", zh: "雲林縣" },
  { code: "10010", en: "Chiayi County", zh: "嘉義縣" },
  { code: "10013", en: "Pingtung County", zh: "屏東縣" },
  { code: "10014", en: "Taitung County", zh: "臺東縣" },
  { code: "10015", en: "Hualien County", zh: "花蓮縣" },
  { code: "10016", en: "Penghu County", zh: "澎湖縣" },
  { code: "10017", en: "Keelung City", zh: "基隆市" },
  { code: "10018", en: "Hsinchu City", zh: "新竹市" },
  { code: "10020", en: "Chiayi City", zh: "嘉義市" },
  { code: "63000", en: "Taipei City", zh: "臺北市" },
  { code: "64000", en: "Kaohsiung City", zh: "高雄市" },
  { code: "65000", en: "New Taipei City", zh: "新北市" },
  { code: "66000", en: "Taichung City", zh: "臺中市" },
  { code: "67000", en: "Tainan City", zh: "臺南市" },
  { code: "68000", en: "Taoyuan City", zh: "桃園市" },
];

export const countyByCode = (code: string | null | undefined) =>
  countyList.find((county) => county.code === code) ?? null;

/** Station records name counties with 台 or 臺 interchangeably. */
const same = (a: string) => a.replaceAll("台", "臺").trim();
export const countyByZh = (zh: string | null | undefined) =>
  countyList.find((county) => same(county.zh) === same(zh ?? "")) ?? null;
