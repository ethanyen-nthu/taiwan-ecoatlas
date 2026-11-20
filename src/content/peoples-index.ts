import type { L } from "./lesson-index";

/** The sixteen officially recognised Indigenous peoples of Taiwan, in the form
 *  the rest of the site needs on every page: a stable slug, the label the
 *  village source uses for the group, and one line of orientation. The long
 *  profiles live in `peoples.ts` and are only built on the server. */
export interface PeopleBrief {
  slug: string;
  /** The group label exactly as it appears in the village source records. */
  group: string;
  name: L;
  /** What the people call themselves, where the Council records one. */
  selfName?: string;
  /** Year of official recognition. null = among the nine groups the state
   *  already recognised, before the later additions. */
  recognised: number | null;
  /** Approximate registered population, rounded. */
  population: number;
  /** True for the three figures taken directly from the Ministry of the
   *  Interior's end-of-2025 release; the rest are rounded estimates. */
  official?: boolean;
  where: L;
  line: L;
}

const both = (en: string, zh: string): L => ({ en, zh });

export const peopleBriefs: PeopleBrief[] = [
  {
    slug: "amis",
    group: "阿美族",
    name: both("Amis", "阿美族"),
    selfName: "Pangcah",
    recognised: null,
    population: 234661,
    official: true,
    where: both(
      "East coast and Huatung Valley, Hualien and Taitung",
      "花蓮、臺東的花東縱谷與東海岸",
    ),
    line: both(
      "The largest people, with age-set organisation and a strong summer festival season.",
      "人口最多的族群，以年齡階層組織與夏季豐年祭著稱。",
    ),
  },
  {
    slug: "atayal",
    group: "泰雅族",
    name: both("Atayal", "泰雅族"),
    selfName: "Tayal",
    recognised: null,
    population: 102638,
    official: true,
    where: both(
      "Northern and central mountains, from Taoyuan to Hualien",
      "從桃園到花蓮的北部與中部山區",
    ),
    line: both(
      "Communities held together by gaga, shared rules of life; known for weaving and facial tattooing.",
      "以 gaga（共同生活規範）維繫的部落，以織布與紋面傳統聞名。",
    ),
  },
  {
    slug: "paiwan",
    group: "排灣族",
    name: both("Paiwan", "排灣族"),
    recognised: null,
    population: 114081,
    official: true,
    where: both(
      "Southern mountains and coast, Pingtung and Taitung",
      "屏東與臺東的南部山區與海岸",
    ),
    line: both(
      "A society of hereditary ranks, carved houses and glass beads passed down as family treasures.",
      "具有世襲階層的社會，以雕刻家屋與傳家琉璃珠著稱。",
    ),
  },
  {
    slug: "bunun",
    group: "布農族",
    name: both("Bunun", "布農族"),
    recognised: null,
    population: 65000,
    where: both(
      "High central mountains, Nantou, Hualien, Taitung and Kaohsiung",
      "南投、花蓮、臺東與高雄的中央山脈高地",
    ),
    line: both(
      "Mountain villagers whose ritual year follows the millet, and who sing the polyphonic Pasibutbut.",
      "生活在高山的族群，儀式年曆依小米而行，並以多聲部的祈禱小米豐收歌聞名。",
    ),
  },
  {
    slug: "truku",
    group: "太魯閣族",
    name: both("Truku", "太魯閣族"),
    recognised: 2004,
    population: 35000,
    where: both(
      "Taroko Gorge and nearby valleys, Hualien",
      "花蓮太魯閣峽谷與周邊山谷",
    ),
    line: both(
      "Recognised in 2004 after being counted as Atayal; its recognition was debated among Seediq-speaking communities.",
      "原被歸入泰雅族，2004 年正名；其正名在賽德克語系社群內曾有討論。",
    ),
  },
  {
    slug: "puyuma",
    group: "卑南族",
    name: both("Puyuma", "卑南族"),
    selfName: "Pinuyumayan",
    recognised: null,
    population: 15000,
    where: both("The Taitung plain and its edges", "臺東平原及其周緣"),
    line: both(
      "Plain villages with men's youth halls, once the most influential power on the Taitung plain.",
      "以少年會所制度聞名的平原部落，歷史上曾是臺東平原影響力最大的族群之一。",
    ),
  },
  {
    slug: "rukai",
    group: "魯凱族",
    name: both("Rukai", "魯凱族"),
    recognised: null,
    population: 14000,
    where: both(
      "Pingtung, Kaohsiung and Taitung foothills",
      "屏東、高雄與臺東的山麓",
    ),
    line: both(
      "Slate-house villages and chiefly families; the wild lily is a mark of honour.",
      "石板屋聚落與頭目家族；野百合是榮譽的象徵。",
    ),
  },
  {
    slug: "seediq",
    group: "賽德克族",
    name: both("Seediq", "賽德克族"),
    recognised: 2008,
    population: 11000,
    where: both(
      "Mountain townships of Nantou and Hualien",
      "南投與花蓮的山區鄉鎮",
    ),
    line: both(
      "Recognised in 2008; the 1930 Wushe Incident is central to the Seediq historical memory.",
      "2008 年正名；1930 年霧社事件是賽德克族歷史記憶的核心。",
    ),
  },
  {
    slug: "tsou",
    group: "鄒族",
    name: both("Tsou", "鄒族"),
    selfName: "Cou",
    recognised: null,
    population: 7000,
    where: both(
      "Alishan area of Chiayi and the Xinyi area of Nantou",
      "嘉義阿里山與南投信義一帶",
    ),
    line: both(
      "Villages centred on the kuba men's house, where the Mayasvi ceremony is held.",
      "以 kuba（男子集會所）為中心的部落，並在此舉行 Mayasvi 儀式。",
    ),
  },
  {
    slug: "saisiyat",
    group: "賽夏族",
    name: both("Saisiyat", "賽夏族"),
    recognised: null,
    population: 7000,
    where: both("Mountains of Hsinchu and Miaoli", "新竹與苗栗的山區"),
    line: both(
      "Best known for the pastaay ceremony, a rite of remembrance and apology to the Ta'ai.",
      "以矮靈祭（pastaay）聞名，是向矮人 Ta'ai 追思與致歉的儀式。",
    ),
  },
  {
    slug: "tao",
    group: "雅美族(達悟族)",
    name: both("Tao (Yami)", "達悟族（雅美族）"),
    selfName: "Tao",
    recognised: null,
    population: 5000,
    where: both("Orchid Island (Lanyu), off Taitung", "臺東外海的蘭嶼"),
    line: both(
      "An island people of the sea: flying-fish seasons, carved plank boats and typhoon-proof houses.",
      "海島民族：飛魚季、拼板舟與抗颱的半穴居家屋。",
    ),
  },
  {
    slug: "kavalan",
    group: "噶瑪蘭族",
    name: both("Kavalan", "噶瑪蘭族"),
    recognised: 2002,
    population: 1500,
    where: both(
      "Hualien and Taitung coast; ancestral home on the Yilan plain",
      "花蓮與臺東海岸；祖居地為宜蘭平原",
    ),
    line: both(
      "The first plains Indigenous people to be recognised, in 2002; known for banana-fibre weaving.",
      "2002 年成為第一個正名的平埔族群；以香蕉絲織布聞名。",
    ),
  },
  {
    slug: "sakizaya",
    group: "撒奇萊雅族",
    name: both("Sakizaya", "撒奇萊雅族"),
    recognised: 2007,
    population: 1000,
    where: both("The Hualien plain", "花蓮平原"),
    line: both(
      "Recognised in 2007 after being counted as Amis; the 1878 Takobowan incident is central to its history.",
      "原被歸入阿美族，2007 年正名；1878 年達固湖灣事件是其歷史核心。",
    ),
  },
  {
    slug: "thao",
    group: "邵族",
    name: both("Thao", "邵族"),
    recognised: 2001,
    population: 800,
    where: both("Sun Moon Lake, Nantou", "南投日月潭"),
    line: both(
      "A lake people of fewer than a thousand; the first group added to the original nine, in 2001.",
      "不到一千人的湖畔民族；2001 年是原本九族之外第一個正名的族群。",
    ),
  },
  {
    slug: "hlaalua",
    group: "拉阿魯哇族",
    name: both("Hla'alua", "拉阿魯哇族"),
    selfName: "Saaroa",
    recognised: 2014,
    population: 450,
    where: both("Taoyuan and Namasia districts, Kaohsiung", "高雄桃源與那瑪夏"),
    line: both(
      "Recognised in 2014 after being counted as Tsou; its villages are often shared with Bunun neighbours.",
      "原被歸入鄒族，2014 年正名；部落常與布農族鄰居共居。",
    ),
  },
  {
    slug: "kanakanavu",
    group: "卡那卡那富族",
    name: both("Kanakanavu", "卡那卡那富族"),
    recognised: 2014,
    population: 400,
    where: both("Namasia District, Kaohsiung", "高雄那瑪夏"),
    line: both(
      "Recognised in 2014 after being counted as Tsou; a very small people, shared villages with Bunun.",
      "原被歸入鄒族，2014 年正名；人口很少，常與布農族共居。",
    ),
  },
];

export const peopleBySlug = new Map(peopleBriefs.map((p) => [p.slug, p]));
export const peopleByGroup = new Map(peopleBriefs.map((p) => [p.group, p]));

/** The source lists shared villages as "拉阿魯哇族、布農族"; split such labels
 *  into the peoples they name, keeping source order. Unknown labels are
 *  dropped, never guessed. */
export function peoplesOfLabel(label: unknown): PeopleBrief[] {
  if (typeof label !== "string") return [];
  return label
    .split("、")
    .map((part) => peopleByGroup.get(part.trim()))
    .filter((item): item is PeopleBrief => !!item);
}
