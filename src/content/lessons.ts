import type { AtlasFacts } from "@/server/facts";
import { lessonMeta, type L, type LessonMeta } from "./lesson-index";

export interface Step {
  title: L;
  body: L;
  /** A map view that shows exactly what the step describes. */
  href?: string;
  hrefLabel?: L;
}
export interface Lesson extends LessonMeta {
  level: L;
  objectives: L[];
  prepare: L[];
  background: L[];
  table?: { caption: L; head: L[]; rows: L[][] };
  steps: Step[];
  /** What the numbers show, counted from the data files at build time. */
  notice: L[];
  questions: L[];
  pitfalls: L[];
  assess: L;
  sources: { label: string; url: string }[];
  reviewed: string;
}

const num = (value: number) => value.toLocaleString("en");
const pct = (value: number, digits = 0) => `${value.toFixed(digits)}%`;
const both = (en: string, zh = en): L => ({ en, zh });

export function buildLessons(facts: AtlasFacts): Lesson[] {
  const county = (code: string): L => {
    const found = facts.counties.find((item) => item.code === code);
    return both(found?.en ?? code, found?.zh ?? code);
  };
  const w = facts.wildlife;
  const forests = facts.forests.counties;
  const byArea = [...forests].sort((a, b) => b.forestKm2 - a.forestKm2);
  const top = forests.slice(0, 3);
  const low = forests.slice(-3).reverse();
  const year = (name: string) =>
    w.byYear.find((item) => item.name === name)?.count ?? 0;
  const monthNames = [
    ["January", "一月"],
    ["February", "二月"],
    ["March", "三月"],
    ["April", "四月"],
    ["May", "五月"],
    ["June", "六月"],
    ["July", "七月"],
    ["August", "八月"],
    ["September", "九月"],
    ["October", "十月"],
    ["November", "十一月"],
    ["December", "十二月"],
  ] as const;
  const peak = w.byMonth.indexOf(Math.max(...w.byMonth));
  const trough = w.byMonth.indexOf(Math.min(...w.byMonth));
  const totalClass = (name: string) =>
    w.classes.find((item) => item.name === name)?.count ?? 0;
  const toad = w.topSpecies[0];
  const snake = w.topSpecies.find((item) => item.name === "Boiga kraepelini");
  const topCounties = w.byCounty.slice(0, 3);
  const c = facts.culture;
  const topVillageCounties = c.byCounty.slice(0, 2);
  const topTwo = topVillageCounties.reduce((sum, item) => sum + item.count, 0);
  const reviewed = "2026-11-20";

  const lessons: Record<string, Omit<Lesson, keyof LessonMeta | "reviewed">> = {
    "air-quality-index": {
      level: both("Introductory, any year", "入門，不限年級"),
      objectives: [
        both(
          "Explain what an air-quality index is and recognise the six official bands (0–50, 51–100, 101–150, 151–200, 201–300, 301 and above).",
          "說明空氣品質指標是什麼，並認得六個官方分級（0–50、51–100、101–150、151–200、201–300、301 以上）。",
        ),
        both(
          "Tell an index (AQI) apart from a concentration (PM₂.₅, in µg/m³).",
          "分辨指標（AQI）與濃度（PM₂.₅，單位 µg/m³）。",
        ),
        both(
          "Read a county-shaded map and say what the shading hides.",
          "閱讀縣市著色地圖，並說出著色掩蓋了什麼。",
        ),
        both(
          "Turn a seasonal pattern reported in the literature into a hypothesis that this atlas could help test, without treating it as proven.",
          "把文獻中的季節性規律轉成可用本平台協助檢驗的假設，而不當作定論。",
        ),
      ],
      prepare: [
        both(
          "Open the Environment page a few minutes before class. This lesson uses the latest station reports, so numbers differ each time. If a feed is unavailable the page says so; do not read blank counties as zero.",
          "上課前幾分鐘先開啟「環境」頁。本課使用最新測站報告，每次數字都不同。若資料源暫停，頁面會明示；請勿把空白縣市解讀為零。",
        ),
        both(
          "Ask students to bring a phone or laptop. Two students per screen works.",
          "請學生攜帶手機或筆電；兩人一組共用一個畫面即可。",
        ),
      ],
      background: [
        both(
          "An air-quality index turns pollutant readings into one number so people can compare places and days. Taiwan's Ministry of Environment publishes it from its monitoring stations, and the atlas loads the latest reports. PM₂.₅ refers to particles up to 2.5 micrometres across; it is a measured concentration, while AQI is a score built from readings.",
          "空氣品質指標把污染物讀值轉成單一數字，方便比較地點與日期。環境部由監測站發布 AQI，本平台載入最新報告。PM₂.₅ 指粒徑 2.5 微米以下的懸浮微粒，是實測濃度；AQI 則是由讀值換算的分數。",
        ),
        both(
          "Published studies report that PM₂.₅ in Taiwan is usually higher in winter than in summer, most strongly on the western, downwind side of the winter northeast monsoon. In December 2024 the ministry warned of orange-level air across central Taiwan and areas south of Yunlin during a northeast-monsoon episode, and an official explained higher levels in the central and southern regions largely by less rain and low wind speeds, which let pollutants accumulate. Treat these as hypotheses to test: one snapshot cannot show a season.",
          "已發表研究指出，臺灣 PM₂.₅ 通常冬季高於夏季，在冬季東北季風的背風側（西部）最明顯。2024 年 12 月東北季風期間，環境部曾提醒中部及雲林以南空品達橘色提醒；官員也指出中南部濃度較高，主要因為雨量少、風速低，使污染物累積。請把這些當作待檢驗的假設：單次快照無法呈現一個季節。",
        ),
      ],
      steps: [
        {
          title: both("Find the stations", "找到測站"),
          body: both(
            "Each circle is one monitoring station, coloured by the official band of its own latest reading. Zoom to your own city and find the nearest station. Note its value and the time shown under “Source state”.",
            "每個圓圈是一個測站，顏色為該站最新讀值的官方分級。放大到你所在的城市，找出最近的測站，記下數值與「來源狀態」下顯示的時間。",
          ),
          href: "/environment",
          hrefLabel: both("Open air quality", "開啟空氣品質"),
        },
        {
          title: both("Read the county shading", "讀縣市著色"),
          body: both(
            "With “Shade counties” on, each county takes the official colour of the mean of its stations' readings. Name the highest and the lowest county and write down how many stations each one has (the number beside the county name in the list is the mean AQI).",
            "開啟「縣市著色」後，各縣市以其測站讀值平均對應官方顏色。找出最高與最低的縣市，並查明各有幾個測站（列表中縣市名旁的數字為平均 AQI）。",
          ),
          href: "/environment?shade=1",
          hrefLabel: both("Open the shaded map", "開啟著色地圖"),
        },
        {
          title: both(
            "Switch from the index to a concentration",
            "從指標換成濃度",
          ),
          body: both(
            "Under “More filters”, set Metric to PM₂.₅. The county list re-ranks by mean concentration. Does the order match the AQI order? AQI combines several pollutants, so it need not.",
            "在「更多篩選」把指標改為 PM₂.₅，縣市列表依平均濃度重新排序。順序與 AQI 相同嗎？AQI 綜合多種污染物，兩者不一定一致。",
          ),
          href: "/environment?metric=pm25",
          hrefLabel: both("Open PM₂.₅ view", "開啟 PM₂.₅ 檢視"),
        },
        {
          title: both("Look inside one county", "看進一個縣市"),
          body: both(
            "Choose a county with several stations. Compare the highest and lowest station inside it. How large is the spread compared with the gap between two counties?",
            "選一個有多個測站的縣市，比較其中最高與最低的測站。縣內差距與兩縣之間的差距相比如何？",
          ),
          href: "/environment?county=66000",
          hrefLabel: both("Open Taichung as an example", "以臺中市為例"),
        },
        {
          title: both("Save the view", "保存這個畫面"),
          body: both(
            "Press “Copy link to this view” and paste it into your notes together with the time. Repeat next week and compare. The link reopens the same choices, not the same numbers, because the feed is live.",
            "按「複製此檢視連結」，連同時間貼進筆記。下週重做並比較。連結會重現相同的選項，但因為資料即時更新，數字不會相同。",
          ),
        },
      ],
      notice: [
        both(
          "Nothing here is fixed in advance: the feed is live. What should stay stable is the method. Students who record the time and station counts can compare their notes honestly.",
          "本課沒有預設答案：資料是即時的。穩定的是方法；記下時間與測站數的學生，筆記才有可比性。",
        ),
        both(
          "A county with one station gets its colour from that single reading. A county with ten stations averages them. The map does not show this difference, so ask students to find it in the table.",
          "只有一個測站的縣市，顏色完全來自那一筆讀值；有十個測站的縣市則取平均。地圖看不出差別，請學生在表格中找出來。",
        ),
      ],
      questions: [
        both(
          "What information is lost when a county's stations are averaged into one colour?",
          "把一個縣市的測站平均成一個顏色，會失去什麼資訊？",
        ),
        both(
          "Two counties have the same colour. Does that mean people breathe the same air?",
          "兩個縣市顏色相同，是否代表居民呼吸相同的空氣？",
        ),
        both(
          "If you wanted to compare winter and summer air in western and eastern Taiwan, what data would you need that this atlas does not hold?",
          "若要比較臺灣東西部冬夏兩季的空氣，需要哪些本平台沒有的資料？",
        ),
        both(
          "Who sets the band thresholds, and what might they be based on? Is a threshold a fact about the air or a decision about risk?",
          "分級門檻由誰訂定、可能依據什麼？門檻是空氣的事實，還是對風險的決定？",
        ),
      ],
      pitfalls: [
        both(
          "Station readings are point measurements, not population exposure. A county mean is not what a resident experiences.",
          "測站讀值是點位量測，並非人口暴露量；縣市平均不等於居民的實際感受。",
        ),
        both(
          "A snapshot is not a trend. Do not describe a pattern as seasonal from one afternoon's data.",
          "快照不是趨勢，不要用一個下午的資料就稱某模式為季節性。",
        ),
        both(
          "The northeast-monsoon explanation is a published hypothesis about regional patterns. It does not explain any single station's reading on any single day.",
          "東北季風的說明是關於區域模式的已發表假設，不能解釋任何單一測站在某一天的讀值。",
        ),
      ],
      assess: both(
        "In 150 words, describe the pattern in your saved view, name two things the map cannot tell you, and propose one extra dataset that would help.",
        "用 150 字描述你保存畫面中的模式，指出地圖無法告訴你的兩件事，並提出一份能補充的資料。",
      ),
      sources: [
        {
          label: "Ministry of Environment air-quality dataset AQX_P_432",
          url: "https://data.moenv.gov.tw/en/dataset/detail/AQX_P_432",
        },
        {
          label:
            "Huang et al. (2024), winter PM2.5 in Taiwan, Atmospheric Chemistry and Physics",
          url: "https://acp.copernicus.org/articles/24/10759/2024/",
        },
        {
          label: "TVBS News (4 Dec 2024), northeast monsoon and air quality",
          url: "https://news.tvbs.com.tw/english/2707312",
        },
        {
          label:
            "Taipei Times (25 Mar 2024), PM2.5 targets and regional levels",
          url: "https://www.taipeitimes.com/News/front/archives/2024/03/25/2003815427",
        },
      ],
    },

    "river-pollution-index": {
      level: both("Introductory to intermediate", "入門至中階"),
      objectives: [
        both(
          "Name the four measurements behind the River Pollution Index.",
          "說出河川污染指數（RPI）所依據的四項測值。",
        ),
        both(
          "Compute an RPI by hand and place it in the right pollution class.",
          "親手計算 RPI，並判定污染程度等級。",
        ),
        both(
          "Explain how averaging can hide one very poor measurement.",
          "說明平均如何掩蓋某一項極差的測值。",
        ),
        both(
          "Say why monthly samples from a few sites cannot describe a whole river.",
          "說明為何少數測點的每月採樣無法代表整條河川。",
        ),
      ],
      prepare: [
        both(
          "The river data are monthly laboratory samples, not live conditions. Open the page once beforehand: if the provider feed is not available the page says so, and the worked example in this lesson still lets you teach the calculation.",
          "河川資料為每月實驗室採樣，並非即時水況。請先開啟頁面確認；若資料源暫停，頁面會明示，本課的計算範例仍可用來教學。",
        ),
        both(
          "Print the scoring table below or project it. Boundaries are given as in published summaries of the EPA scheme; check the agency's current definition before using them for grading.",
          "請列印或投影下方計分表。界線依已發表之環保署制度摘要整理；若用於評分，請先核對機關現行定義。",
        ),
      ],
      background: [
        both(
          "Taiwan's EPA uses the River Pollution Index to track surface-water quality. It uses four parameters: dissolved oxygen (DO), five-day biochemical oxygen demand (BOD₅), suspended solids (SS) and ammonia nitrogen (NH₃-N). Each measurement is converted to a point score of 1, 3, 6 or 10, and the four scores are averaged. A lower score is cleaner. An average below 2.0 is classed as not or slightly polluted, 2.0–3.0 lightly polluted, 3.1–6.0 moderately polluted and above 6.0 severely polluted.",
          "環保署以河川污染指數（RPI）追蹤地面水水質，使用四項參數：溶氧量（DO）、五日生化需氧量（BOD₅）、懸浮固體（SS）與氨氮（NH₃-N）。每項測值換算為 1、3、6 或 10 分，再取四項平均；分數越低越乾淨。平均低於 2.0 為未（稍）受污染，2.0–3.0 為輕度污染，3.1–6.0 為中度污染，高於 6.0 為嚴重污染。",
        ),
        both(
          "Worked example: DO 5.2 mg/L scores 3; BOD₅ 4.0 mg/L scores 3; SS 35 mg/L scores 3; NH₃-N 1.4 mg/L scores 6. RPI = (3 + 3 + 3 + 6) ÷ 4 = 3.75, which is moderately polluted.",
          "計算範例：DO 5.2 mg/L 得 3 分；BOD₅ 4.0 mg/L 得 3 分；SS 35 mg/L 得 3 分；NH₃-N 1.4 mg/L 得 6 分。RPI =（3 + 3 + 3 + 6）÷ 4 = 3.75，屬中度污染。",
        ),
        both(
          "The hiding effect: if DO is below 2.0 mg/L (score 10) while the other three measures are in their cleanest class (score 1 each), RPI = (10 + 1 + 1 + 1) ÷ 4 = 3.25. That is still only moderately polluted, even though one measure is in its worst class.",
          "掩蓋效應：若 DO 低於 2.0 mg/L（10 分），其餘三項都在最乾淨級別（各 1 分），RPI =（10 + 1 + 1 + 1）÷ 4 = 3.25，仍只是中度污染，儘管有一項落在最差級別。",
        ),
      ],
      table: {
        caption: both(
          "Point score for each measurement (mg/L)",
          "各項測值的計分（mg/L）",
        ),
        head: [
          both("Measurement", "測項"),
          both("1 point", "1 分"),
          both("3 points", "3 分"),
          both("6 points", "6 分"),
          both("10 points", "10 分"),
        ],
        rows: [
          [
            both("DO (higher is better)", "DO（越高越好）"),
            both("6.5 or more", "6.5 以上"),
            both("4.6–6.5", "4.6–6.5"),
            both("2.0–4.5", "2.0–4.5"),
            both("below 2.0", "低於 2.0"),
          ],
          [
            both("BOD₅", "BOD₅"),
            both("3.0 or less", "3.0 以下"),
            both("3.0–4.9", "3.0–4.9"),
            both("5.0–15", "5.0–15"),
            both("above 15", "高於 15"),
          ],
          [
            both("SS", "SS"),
            both("20 or less", "20 以下"),
            both("20–49", "20–49"),
            both("50–100", "50–100"),
            both("above 100", "高於 100"),
          ],
          [
            both("NH₃-N", "NH₃-N"),
            both("below 0.50", "低於 0.50"),
            both("0.50–0.99", "0.50–0.99"),
            both("1.0–3.0", "1.0–3.0"),
            both("above 3.0", "高於 3.0"),
          ],
        ],
      },
      steps: [
        {
          title: both("Open the river samples", "開啟河川採樣"),
          body: both(
            "Open the river dataset with the reported RPI as the measurement. Each record is one station on one sampling date.",
            "開啟河川資料集，並以官方發布的 RPI 為指標。每筆紀錄是一個測站在一個採樣日的資料。",
          ),
          href: "/environment?dataset=river-quality&metric=rpi",
          hrefLabel: both("Open river samples", "開啟河川採樣"),
        },
        {
          title: both("Score one record by hand", "手算一筆紀錄"),
          body: both(
            "Pick a record from the table, open “All fields”, and copy DO, BOD, SS and NH₃-N. Score each with the table, average the four, and compare with the reported RPI. If a measurement shows “—” the source gave no value: choose another record instead of guessing.",
            "從表格選一筆紀錄，展開「全部欄位」，抄下 DO、BOD、SS 與 NH₃-N。依計分表為各項打分、取平均，再與官方發布的 RPI 比較。若某項顯示「—」，表示來源未提供，請改選別筆，不要自行推估。",
          ),
        },
        {
          title: both(
            "Find which measurement drives the score",
            "找出左右分數的測項",
          ),
          body: both(
            "Change the Metric to ammonia nitrogen, then to DO. For the record you scored, which measurement carried the most points?",
            "把指標分別改為氨氮與 DO。對你手算的那筆紀錄，哪一項的分數最高？",
          ),
        },
        {
          title: both(
            "Shade the counties, then check the counts",
            "著色縣市，再檢查樣本數",
          ),
          body: both(
            "Turn on “Shade counties”. Before naming the most polluted county, look at how many records and stations stand behind its colour in the list.",
            "開啟「縣市著色」。在說出污染最重的縣市之前，先在列表檢查其顏色背後有多少紀錄與測站。",
          ),
          href: "/environment?dataset=river-quality&metric=rpi&shade=1",
          hrefLabel: both("Open shaded river map", "開啟著色河川地圖"),
        },
      ],
      notice: [
        both(
          "The worked example (3.75) and the hiding example (3.25) both land in the same class even though the second contains a measurement in its worst class. Ask students to say why before you tell them.",
          "計算範例（3.75）與掩蓋範例（3.25）落在同一級，但後者有一項測值在最差級別。請先讓學生說出原因再揭曉。",
        ),
        both(
          "Records are monthly samples. A county colour built from one or two sampling dates is not a statement about the county's rivers in general.",
          "紀錄為每月採樣。僅由一兩個採樣日構成的縣市顏色，不能代表該縣河川的整體狀況。",
        ),
      ],
      questions: [
        both(
          "Why might a scoring scheme use 1, 3, 6 and 10 instead of the raw measurements? What is gained and what is lost?",
          "為什麼計分制度採用 1、3、6、10 分，而不直接用原始測值？得到什麼、失去什麼？",
        ),
        both(
          "A river scores “lightly polluted” in March and “moderately polluted” in August. What would you need to know before saying it got worse?",
          "一條河三月為輕度污染、八月為中度污染。在說它變差之前，還需要知道什麼？",
        ),
        both(
          "RPI is chemistry only. What would a biologist add to judge the health of a river?",
          "RPI 只涵蓋化學項目。生物學者還會加入什麼來判斷河川健康？",
        ),
        both(
          "A county colour averages stations on different rivers. When is that comparison fair, and when is it not?",
          "縣市顏色是不同河川測站的平均。這樣的比較何時公平、何時不公平？",
        ),
      ],
      pitfalls: [
        both(
          "Monthly samples are not live river conditions and say nothing about the days between samples.",
          "每月採樣並非即時水況，也無法說明採樣之間幾天的情形。",
        ),
        both(
          "Do not compute an RPI from partly missing data, and do not treat a blank as zero.",
          "不要用缺漏的資料計算 RPI，也不要把空白當作零。",
        ),
        both(
          "Some published sources round class boundaries slightly differently (for example around DO 4.5 and 4.6). Settle on one table for the whole class.",
          "部分已發表資料對級別界線的取捨略有出入（例如 DO 4.5 與 4.6 附近）。請全班統一使用同一份表。",
        ),
      ],
      assess: both(
        "Give students a fresh set of four measurements, ask for the RPI and class with the working shown, then ask which single change to one measurement would move the class most.",
        "給學生一組新的四項測值，請他們寫出計算過程、RPI 與級別，再問：改變哪一項的值最能改變級別？",
      ),
      sources: [
        {
          label:
            "Chen et al. (2012), Estimation of River Pollution Index in a Tidal Stream (scoring table), IJERPH",
          url: "https://mdpi.com/1660-4601/9/9/3085",
        },
        {
          label: "Long-term river water quality trends in Taiwan (2018), Water",
          url: "https://www.mdpi.com/2073-4441/10/10/1394",
        },
        {
          label: "Taiwan EPA water-quality encyclopedia entry on the RPI",
          url: "https://wq.epa.gov.tw/EWQP/zh/Encyclopedia/NounDefinition/Pedia_37.aspx",
        },
      ],
    },

    "where-is-the-forest": {
      level: both("Intermediate", "中階"),
      objectives: [
        both(
          "Distinguish a county's forest share from its forest area, and say when each answers the question.",
          "區分縣市的森林占比與森林面積，並說明各自適合回答什麼問題。",
        ),
        both(
          "Read a county choropleth and its legend without over-reading class boundaries.",
          "閱讀縣市分級著色圖與圖例，不過度解讀級距。",
        ),
        both(
          "State what a single-year land-cover map cannot show, in particular change over time.",
          "說明單一年度土地覆蓋圖無法呈現的事，特別是時間上的變化。",
        ),
      ],
      prepare: [
        both(
          "The forests page opens on the 2023 land-cover image. Switch on “Shade counties” to see county shares.",
          "森林頁預設為 2023 年土地覆蓋影像；開啟「縣市著色」可看各縣市占比。",
        ),
      ],
      background: [
        both(
          `The atlas shows the ${facts.forests.year} land-cover classification published on Zenodo. The classes are forest, built-up land, water, agricultural land, grassland and shrubs, and a class where built-up and agricultural land could not be told apart. “Forest share” here means forest divided by all mapped classes in the county, not by the county's legal area.`,
          `本平台呈現 Zenodo 發布的 ${facts.forests.year} 年土地覆蓋分類，類別包括森林、建成地、水域、農業用地、草地與灌叢，以及無法區分建成地與農地的未區分類。此處「森林占比」是森林除以縣市內所有已繪製類別，而非縣市法定面積。`,
        ),
        both(
          "The public archive holds one verified year. There is no verified 2013 baseline, so the atlas draws no 2013–2023 change map and states no deforestation figure.",
          "公開典藏只有一個經確認的年度，沒有可確認的 2013 基準，因此本平台不繪製 2013–2023 變遷圖，也不提供毀林數字。",
        ),
      ],
      steps: [
        {
          title: both("Start with the image", "先看影像"),
          body: both(
            "Open the land-cover image and the legend. Find the large green areas and the grey “unresolved” pixels. Where are the gaps?",
            "開啟土地覆蓋影像與圖例，找出大片綠色區域與灰色「未區分」像素，並留意哪裡有缺口。",
          ),
          href: "/forests",
          hrefLabel: both("Open land cover", "開啟土地覆蓋"),
        },
        {
          title: both("Switch to county shares", "改看縣市占比"),
          body: both(
            "Turn on “Shade counties”. The five classes hold about the same number of counties each. Name the darkest and lightest counties and read their values in the list.",
            "開啟「縣市著色」。五個級距的縣市數大致相同。找出最深與最淺的縣市，並在列表讀取其數值。",
          ),
          href: "/forests?shade=1",
          hrefLabel: both("Open county shares", "開啟縣市占比"),
        },
        {
          title: both("Compare share with area", "比較占比與面積"),
          body: both(
            "In the Charts tab, compare forest share with forest area for the counties you named. Which county ranks differently on the two measures?",
            "在「比較與圖表」分頁，比較你找出的縣市的森林占比與森林面積。哪個縣市在兩種指標下排名不同？",
          ),
          href: "/forests?shade=1&tab=charts",
          hrefLabel: both("Open charts", "開啟圖表"),
        },
        {
          title: both("Open one county profile", "開啟一個縣市檔案"),
          body: both(
            "Open the county profile of the county with the most forest. What else does the atlas hold about it?",
            "開啟森林最多的縣市檔案。本平台還有哪些關於該縣市的資料？",
          ),
          href: top[0] ? `/county/${top[0].code}` : "/county",
          hrefLabel: both("Open county profile", "開啟縣市檔案"),
        },
      ],
      notice: [
        both(
          top.length
            ? `Highest forest share: ${top.map((item) => `${item.en} ${pct(item.sharePct, 1)}`).join(", ")}. Lowest: ${low.map((item) => `${item.en} ${pct(item.sharePct, 1)}`).join(", ")}.`
            : "",
          top.length
            ? `森林占比最高：${top.map((item) => `${item.zh} ${pct(item.sharePct, 1)}`).join("、")}；最低：${low.map((item) => `${item.zh} ${pct(item.sharePct, 1)}`).join("、")}。`
            : "",
        ),
        both(
          byArea.length
            ? `By forest area the order is different: ${byArea
                .slice(0, 3)
                .map(
                  (item) => `${item.en} ${num(Math.round(item.forestKm2))} km²`,
                )
                .join(", ")}. Share and area answer different questions.`
            : "",
          byArea.length
            ? `以森林面積排序則不同：${byArea
                .slice(0, 3)
                .map(
                  (item) =>
                    `${item.zh} ${num(Math.round(item.forestKm2))} 平方公里`,
                )
                .join("、")}。占比與面積回答不同的問題。`
            : "",
        ),
        both(
          `${facts.forests.unavailable.map((item) => item.en).join(" and ")} have no mapped pixels in this release, so they are blank, not zero.`,
          `${facts.forests.unavailable.map((item) => item.zh).join("與")}在本版沒有已繪製像素，故為空白而非零。`,
        ),
        both(
          (() => {
            const taipei = forests.find((item) => item.code === "63000");
            return taipei
              ? `Taipei City, a dense city, is ${pct(taipei.sharePct, 1)} forest by this measure. Boundaries include hill land; a county is not one kind of place.`
              : "";
          })(),
          (() => {
            const taipei = forests.find((item) => item.code === "63000");
            return taipei
              ? `以此指標，高度都市化的臺北市森林占比為 ${pct(taipei.sharePct, 1)}。行政界線包含山坡地；一個縣市並非單一類型的地方。`
              : "";
          })(),
        ),
      ].filter((item) => item.en),
      questions: [
        both(
          "Which is the better measure for deciding where to protect forest: share or area? Does your answer change with the goal?",
          "決定保護森林的優先地區時，占比與面積哪個較好？目標不同，答案是否改變？",
        ),
        both(
          "Does the map tell you whether a forest is natural or planted? What would you need to find out?",
          "這張地圖是否說明森林是天然林或人工林？你還需要查證什麼？",
        ),
        both(
          "If a verified 2013 map existed, what could you then say, and what could still go wrong when comparing two maps?",
          "若有經確認的 2013 年地圖，你能說什麼？比較兩張地圖時仍可能出什麼錯？",
        ),
        both(
          "Why might county boundaries be a poor frame for a question about forests?",
          "為什麼縣市界線可能不適合作為討論森林的框架？",
        ),
      ],
      pitfalls: [
        both(
          "This is one year. Do not describe any county as gaining or losing forest.",
          "這只是一個年度，不要說任何縣市的森林增加或減少。",
        ),
        both(
          "Share of mapped area is not share of legal area, and a classification has errors the legend cannot show.",
          "已繪製面積占比不等於法定面積占比，分類也有圖例無法呈現的誤差。",
        ),
        both(
          "Colour classes are quantiles: a small change in value can cross a class boundary. Read the number, not just the colour.",
          "色階為分位數：數值小幅變動就可能跨越級距。請讀數字，不要只看顏色。",
        ),
      ],
      assess: both(
        "A one-page memo: “Which county should receive attention for forest protection?” Students must use share and area, name what the map cannot show, and list one dataset that would improve their case. There is no single right county.",
        "一頁備忘錄：「哪個縣市最需要森林保護的關注？」學生須同時使用占比與面積，說明地圖無法呈現的事，並列出一項能強化論證的資料。沒有唯一正確的縣市。",
      ),
      sources: [
        {
          label: `Taiwan land-cover classification ${facts.forests.year} (Zenodo, CC BY 4.0)`,
          url: "https://zenodo.org/records/14033363",
        },
      ],
    },

    "roadkill-and-counting-effort": {
      level: both("Intermediate", "中階"),
      objectives: [
        both(
          "Explain why a count of records is not a count of animals or a measure of risk.",
          "說明為什麼紀錄數不是動物數量，也不是風險指標。",
        ),
        both(
          "Look for signs that effort changed (by year, by month, by place) and propose data that could separate effort from real change.",
          "從年份、月份與地點尋找調查投入改變的跡象，並提出能區分投入與真實變化的資料。",
        ),
        both(
          "Describe what a conservation-screened, location-generalised subset leaves out.",
          "說明經保育篩檢且位置概化的子集省略了什麼。",
        ),
      ],
      prepare: [
        both(
          "This dataset is a subset of a larger citizen-science archive. Read the “About this data” box together first; it is the most important text on the page.",
          "本資料為較大公民科學典藏的子集。請先一起閱讀「關於此資料」；那是這頁最重要的文字。",
        ),
      ],
      background: [
        both(
          `The atlas holds ${num(w.records)} roadkill records of ${w.species} species from ${w.firstDate} to ${w.lastDate}, drawn from the Taiwan Roadkill Observation Network's data published on GBIF. It is a conservation-screened subset: some groups, such as bats, sea snakes, marine turtles and seabird groups, are left out on purpose, exact coordinates are withheld, and each point is the centre of a 10 km grid cell. The source states that counts reflect reporting effort, not animal abundance or roadkill risk.`,
          `本平台收錄 ${w.firstDate} 至 ${w.lastDate} 間 ${num(w.records)} 筆、${w.species} 種的路死紀錄，來自臺灣路死觀察網發布於 GBIF 的資料。這是經保育篩檢的子集：蝙蝠、海蛇、海龜與海鳥類等部分類群刻意省略，不提供精確座標，每個點為 10 公里網格的中心。來源明載：計數反映通報投入，而非動物數量或路死風險。`,
        ),
      ],
      steps: [
        {
          title: both("See where the records are", "看紀錄在哪裡"),
          body: both(
            "Open the map. Each county is shaded by how many records it holds, with the number printed inside. Which counties are darkest? Then find Lienchiang County among the offshore islands under the map: how does a small island compare?",
            "開啟地圖。各縣市依紀錄數著色，數字標在縣市內。哪些縣市最深？接著在地圖下方的離島中找出連江縣：一座小島的紀錄數如何比較？",
          ),
          href: "/wildlife",
          hrefLabel: both("Open the map", "開啟地圖"),
        },
        {
          title: both("Compare years", "比較年份"),
          body: both(
            "Use the date filters to show only 2017, then only 2014. How does the number of matching records change? Do the same for one species.",
            "用日期篩選分別只看 2017 與 2014，比較符合紀錄數的變化；再對單一物種重做一次。",
          ),
          href: "/wildlife?start=2017-01-01&end=2017-12-31",
          hrefLabel: both("Open 2017 only", "只看 2017"),
        },
        {
          title: both(
            "Compare one species across years",
            "比較單一物種的年度變化",
          ),
          body: both(
            `Choose the species with the most records (${toad?.name ?? ""}) and read its yearly counts, then compare with another species of your choice.`,
            `選擇紀錄最多的物種（${toad?.name ?? ""}），閱讀其逐年數量，再與你選的另一物種比較。`,
          ),
          href: toad ? `/wildlife/species/${toad.id}` : "/wildlife",
          hrefLabel: both("Open the species page", "開啟物種頁"),
        },
        {
          title: both("Look at the seasons", "看季節"),
          body: both(
            "In the Charts tab, group by month. Describe the shape. Write down two explanations that involve animals and two that involve people.",
            "在「比較與圖表」分頁以月份彙整，描述曲線形狀，並寫出兩個與動物有關、兩個與人有關的可能解釋。",
          ),
          href: "/wildlife?tab=charts",
          hrefLabel: both("Open charts", "開啟圖表"),
        },
        {
          title: both("Click a grid cell", "點選一個網格"),
          body: both(
            "Select a square and read what it says about its cell. What can you say about where an animal was found, and what can you not?",
            "點選一個方格，閱讀它對該網格的說明。關於動物被發現的位置，你能說什麼、不能說什麼？",
          ),
        },
      ],
      notice: [
        both(
          `Records by group: ${w.classes.map((item) => `${item.name} ${num(item.count)}`).join(", ")}. Amphibians alone are ${pct((totalClass("Amphibia") / w.records) * 100)} of the total.`,
          `各類群紀錄數：${w.classes.map((item) => `${item.name} ${num(item.count)}`).join("、")}。兩棲類單獨占全部的 ${pct((totalClass("Amphibia") / w.records) * 100)}。`,
        ),
        both(
          `Records by year: ${w.byYear.map((item) => `${item.name}: ${num(item.count)}`).join("; ")}. 2017 alone holds ${pct((year("2017") / w.records) * 100)} of everything, about ${(year("2017") / year("2014")).toFixed(1)} times 2014.`,
          `各年紀錄數：${w.byYear.map((item) => `${item.name} 年 ${num(item.count)}`).join("；")}。僅 2017 年就占全部的 ${pct((year("2017") / w.records) * 100)}，約為 2014 年的 ${(year("2017") / year("2014")).toFixed(1)} 倍。`,
        ),
        both(
          toad && snake
            ? `One species rises, another does not. ${toad.name}: ${Object.entries(
                toad.yearCounts,
              )
                .map(([y, n]) => `${y} ${num(n)}`)
                .join(", ")}. ${snake.name}: ${Object.entries(snake.yearCounts)
                .map(([y, n]) => `${y} ${num(n)}`)
                .join(
                  ", ",
                )}. Changes in reporting and species-specific factors could both produce a contrast like this, and the table cannot tell them apart, so treat it as a question rather than an answer.`
            : "",
          toad && snake
            ? `一種大幅上升，另一種幾乎持平。${toad.name}：${Object.entries(
                toad.yearCounts,
              )
                .map(([y, n]) => `${y} 年 ${num(n)}`)
                .join("、")}。${snake.name}：${Object.entries(snake.yearCounts)
                .map(([y, n]) => `${y} 年 ${num(n)}`)
                .join(
                  "、",
                )}。通報方式的改變與物種本身的因素都可能造成這種對比，表格無法區分，所以請把它當作問題，而不是答案。`
            : "",
        ),
        both(
          `By month, records peak in ${monthNames[peak][0]} (${num(w.byMonth[peak])}) and are fewest in ${monthNames[trough][0]} (${num(w.byMonth[trough])}), across all four years together.`,
          `以月份計，四年合計的紀錄以${monthNames[peak][1]}最多（${num(w.byMonth[peak])}），${monthNames[trough][1]}最少（${num(w.byMonth[trough])}）。`,
        ),
        both(
          `Most records by county: ${topCounties.map((item) => `${county(item.name).en} ${num(item.count)}`).join(", ")}. Lienchiang County is a small offshore county, yet it is third. The data do not say why.`,
          `紀錄最多的縣市：${topCounties.map((item) => `${county(item.name).zh} ${num(item.count)}`).join("、")}。連江縣是小型離島縣，卻名列第三。資料本身並未說明原因。`,
        ),
      ].filter((item) => item.en),
      questions: [
        both(
          "What are four possible reasons for 2017 having so many more records? For each, what data would you need to check it?",
          "2017 年紀錄大幅增加，可能有哪四種原因？各需要什麼資料來檢驗？",
        ),
        both(
          "To estimate roadkill risk for a county you would need denominators. Which ones (traffic, road length, animals present)?",
          "要估計一個縣市的路死風險，需要哪些分母（車流、道路長度、現存動物數）？",
        ),
        both(
          "Why might a publisher generalise locations and omit some groups? What does the researcher lose, and what is protected?",
          "為什麼發布者會概化位置並省略部分類群？研究者失去什麼，又保護了什麼？",
        ),
        both(
          "Bats are omitted from this subset. Can you conclude anything about bats and roads from this atlas?",
          "此子集省略了蝙蝠。從本平台你能對蝙蝠與道路下任何結論嗎？",
        ),
      ],
      pitfalls: [
        both(
          "A dark county is a county with many reports, not necessarily many animals or dangerous roads.",
          "顏色深的縣市是通報多，不一定動物多或道路危險。",
        ),
        both(
          "Do not describe a rise in records as a rise in roadkill.",
          "不要把紀錄增加說成路死增加。",
        ),
        both(
          "Do not point to a square as the place where an animal was found; the source only gives a 10 km cell.",
          "不要把方格說成動物被發現的地點；來源只提供 10 公里網格。",
        ),
      ],
      assess: both(
        "Ask students to design a study that could estimate roadkill risk by county: what to count, how often, with what denominators, and what the atlas data could contribute as a starting point.",
        "請學生設計一項能估計各縣市路死風險的研究：要計什麼、多久一次、用什麼分母，以及本平台資料可作為什麼起點。",
      ),
      sources: [
        {
          label:
            "Taiwan Roadkill Observation Network dataset on GBIF (CC BY 4.0)",
          url: "https://www.gbif.org/dataset/db09684b-0fd1-431e-b5fa-4c1532fbdb14",
        },
        {
          label: "Taiwan Roadkill Observation Network",
          url: "https://roadkill.tw/",
        },
      ],
    },

    "villages-and-places": {
      level: both("Intermediate; suits seminars", "中階，適合研討課"),
      objectives: [
        both(
          "Describe what a public reference point is and why it is not a territory.",
          "說明公開定位點是什麼，以及為何它不是傳統領域。",
        ),
        both(
          "Identify who is included in an officially recognised list and who is not, and what follows for a dataset built on it.",
          "辨識官方認定名單包含誰、不包含誰，以及這對建立在其上的資料集意味著什麼。",
        ),
        both(
          "Discuss the ethics of mapping living communities as dots.",
          "討論以點位標示活生生的社群之倫理。",
        ),
      ],
      prepare: [
        both(
          "This lesson works best as a discussion. Set the tone first: the records are people's homes and heritage, not specimens. Use the traditional names shown in the data when you speak about a place.",
          "本課最適合以討論進行。請先定調：這些紀錄是人們的家園與文化，而非標本。談及地方時，請使用資料中的傳統名稱。",
        ),
        both(
          "If students come from Indigenous communities, invite but never require them to speak for their community.",
          "若學生來自原住民族社群，可邀請但切勿要求他們代表自己的社群發言。",
        ),
      ],
      background: [
        both(
          "Taiwan's government officially recognises 16 Indigenous peoples, who make up roughly 2.5 per cent of the population; one 2023 summary gives 580,758 people, or 2.48 per cent. Other groups, including ten lowland (Pingpu) peoples' groups, are not officially recognised and so are outside programmes built on that recognition. A dataset organised by official categories inherits this boundary.",
          "臺灣政府正式認定 16 個原住民族，約占人口 2.5%；2023 年的一項彙整為 580,758 人、占 2.48%。其他群體，包括十個平埔族群，未獲官方認定，因此不在以認定為基礎的政策之內。依官方分類整理的資料集會承襲這條界線。",
        ),
        both(
          `The atlas shows ${num(c.villages)} village listings from the Council of Indigenous Peoples. Each dot is a public reference point that locates a listed village (the source names one for each record; the first record in the file, for instance, names a police substation). It is an index to a record. It does not mark a boundary, a community centre or a claim to land or access.`,
          `本平台呈現原住民族委員會的 ${num(c.villages)} 筆部落列載。每個點是用來定位該部落的公開定位點（來源為每筆紀錄標示一個，例如檔案中的第一筆即標示一處派出所）。它是紀錄的索引，並不標示邊界、社群中心，也不代表對土地或通行的主張。`,
        ),
      ],
      steps: [
        {
          title: both("See the pattern", "看分布"),
          body: both(
            "Open the map with counties shaded by number of listed villages. Which counties are darkest, and which have none?",
            "開啟依部落數著色的地圖。哪些縣市最深、哪些沒有紀錄？",
          ),
          href: "/culture?shade=1",
          hrefLabel: both("Open villages", "開啟部落"),
        },
        {
          title: both("Read one record closely", "細讀一筆紀錄"),
          body: both(
            "Select a dot. Read the traditional name, the source-listed group, the township and the public reference point. Which of these tells you where the community is, and which tells you what the dot actually is?",
            "點選一個點，閱讀傳統名稱、來源所列族別、鄉鎮與公開定位點。哪些資訊告訴你社群在哪裡？哪些說明這個點究竟是什麼？",
          ),
        },
        {
          title: both("Filter by group", "依族別篩選"),
          body: both(
            "Search for a group name in the box (for example 阿美族). Compare where its villages are with where other groups' villages are. What can the dots show, and what can they not?",
            "在搜尋框輸入族別名稱（例如「阿美族」），比較其部落分布與其他族別的分布。這些點能顯示什麼、不能顯示什麼？",
          ),
          href: "/culture?q=%E9%98%BF%E7%BE%8E%E6%97%8F",
          hrefLabel: both("Open Amis example", "開啟阿美族範例"),
        },
        {
          title: both("Meet the people behind a group", "認識族群背後的人"),
          body: both(
            "Open the guide to the sixteen peoples and read the profile of one of them: its history, the words worth knowing and the discussion question. Then open the profile of one of its villages. What did the profile tell you that the dot could not?",
            "開啟十六族介紹，閱讀其中一個族群的歷史、值得認識的詞彙與討論題，再開啟該族群某個部落的介紹頁。介紹頁告訴了你哪些「點」無法告訴你的事？",
          ),
          href: "/culture/peoples",
          hrefLabel: both("Open the peoples guide", "開啟族群介紹"),
        },
        {
          title: both("Compare with routes and studies", "對照路線與歷史研究"),
          body: both(
            "Switch to the public historical trails. These are real route geometry. Then open the Sources tab: eight historical studies have no coordinates and are not drawn on the map. Why does the atlas choose not to draw them?",
            "切換到公開古道，這些是實際路線。再開啟「來源與範圍」分頁：另有八筆歷史研究沒有座標，因此不畫在地圖上。為什麼本平台選擇不畫？",
          ),
          href: "/culture?dataset=public-historic-trails&tab=sources",
          hrefLabel: both("Open trails and studies", "開啟古道與研究"),
        },
      ],
      notice: [
        both(
          `${topVillageCounties.map((item) => `${county(item.name).en} ${num(item.count)}`).join(" and ")} together hold ${num(topTwo)} of the ${num(c.villages)} listings (${pct((topTwo / c.villages) * 100)}). The listings fall in ${c.byCounty.length} of 22 counties.`,
          `${topVillageCounties.map((item) => `${county(item.name).zh} ${num(item.count)} 筆`).join("與")}合計 ${num(topTwo)} 筆，占 ${num(c.villages)} 筆的 ${pct((topTwo / c.villages) * 100)}。列載分布於 22 個縣市中的 ${c.byCounty.length} 個。`,
        ),
        both(
          `The source uses ${c.groups.length} group labels. They resolve to ${c.peoples.length} peoples, because ${c.sharedLabels.labels} labels name more than one people (${c.sharedLabels.villages} villages). Largest single labels: ${c.groups
            .slice(0, 4)
            .map((item) => `${item.name} ${num(item.count)}`)
            .join(", ")}.`,
          `來源使用 ${c.groups.length} 種族別標示，實際涵蓋 ${c.peoples.length} 個族群，因為有 ${c.sharedLabels.labels} 種標示同時列出多個族群（共 ${c.sharedLabels.villages} 個部落）。最大的單一標示：${c.groups
            .slice(0, 4)
            .map((item) => `${item.name} ${num(item.count)}`)
            .join("、")}。`,
        ),
        both(
          `The atlas also shows ${c.trails} public historical trails with real route geometry, and ${c.studies} historical studies that have no coordinates.`,
          `本平台另呈現 ${c.trails} 條有實際路線的公開古道，以及 ${c.studies} 筆沒有座標的歷史研究。`,
        ),
      ],
      questions: [
        both(
          "Who decides what counts as a village, and who decides which group a village belongs to? Does the source label match how the community describes itself?",
          "誰決定什麼算「部落」、誰決定部落屬於哪個族別？來源標示是否符合社群的自我描述？",
        ),
        both(
          "What is lost when a community is reduced to a point? What is gained?",
          "把社群縮減為一個點，失去什麼、得到什麼？",
        ),
        both(
          "If a peoples' group is not officially recognised, what does its absence from this dataset mean, and what does it not mean?",
          "若某族群未獲官方認定，它在此資料集中缺席意味著什麼、又不意味著什麼？",
        ),
        both(
          "What would respectful research use of this dataset involve: consultation, credit, who benefits, who can say no?",
          "尊重地使用這份資料做研究，應包含哪些：諮詢、署名、誰受益、誰可以說不？",
        ),
      ],
      pitfalls: [
        both(
          "Never call the dots territories, and never infer a village's founding date from its listing date.",
          "不要把這些點稱為傳統領域，也不要由列載日期推斷部落成立時間。",
        ),
        both(
          "Source group labels are administrative labels, not statements of identity.",
          "來源所列族別是行政標示，並非身分認同的陳述。",
        ),
        both(
          "A map with no dot in a place does not mean no Indigenous history there.",
          "地圖上某處沒有點，並不代表那裡沒有原住民族歷史。",
        ),
      ],
      assess: both(
        "A short reflective essay: what one map-based claim about Indigenous communities would this dataset support, which would it not, and what would you need to ask the communities before making the second kind?",
        "一篇短反思文：這份資料能支持關於原住民族社群的哪一種地圖論述、不能支持哪一種，以及在提出後者之前，你需要先詢問社群什麼？",
      ),
      sources: [
        {
          label:
            "Council of Indigenous Peoples village listing, data.gov.tw dataset 156632",
          url: "https://data.gov.tw/dataset/156632",
        },
        {
          label: "IWGIA, The Indigenous World 2022: Taiwan",
          url: "https://iwgia.org/en/taiwan/4657-iw-2022-taiwan.html",
        },
        {
          label: "IWGIA, The Indigenous World 2023: Taiwan",
          url: "https://iwgia.org/en/taiwan/5133-iw-2023-taiwan.html",
        },
        {
          label: "Taiwan.gov.tw, People (16 recognised tribes)",
          url: "https://taiwan.gov.tw/content_2.php",
        },
      ],
    },

    "urban-green-and-heat": {
      level: both("Introductory to intermediate", "入門至中階"),
      objectives: [
        both(
          "Separate a good question from a claim the data supports.",
          "區分一個好問題與資料能支持的主張。",
        ),
        both(
          "Explain why a tree inventory is not canopy cover and a station is not a park.",
          "說明為何樹木清冊不等於樹冠覆蓋，測站也不等於公園。",
        ),
        both(
          "Name what data would let you test whether greener places are cooler.",
          "指出哪些資料可以檢驗「綠地較多的地方是否較涼」。",
        ),
      ],
      prepare: [
        both(
          "The tree data cover Taipei only. Make that limit explicit before students start; it is the main lesson.",
          "樹木資料僅涵蓋臺北市。請在學生開始前說明這個限制，這正是本課重點。",
        ),
      ],
      background: [
        both(
          `The atlas holds ${num(facts.urban.parks)} Taipei parks, ${num(facts.urban.parkTrees)} surveyed park trees and ${num(facts.urban.riversideTrees)} surveyed riverside trees, all from Taipei City open data, plus measured air temperature from weather stations. The two kinds of data were collected for different purposes, at different places and on different dates.`,
          `本平台收錄 ${num(facts.urban.parks)} 座臺北市公園、${num(facts.urban.parkTrees)} 筆公園樹木與 ${num(facts.urban.riversideTrees)} 筆河濱樹木調查，皆來自臺北市開放資料，另有氣象測站實測氣溫。兩類資料的蒐集目的、地點與日期都不同。`,
        ),
      ],
      steps: [
        {
          title: both("Find a park and its trees", "找一座公園與其樹木"),
          body: both(
            "Open the parks and zoom to one you know. Then switch to park trees. Select a tree and read its height and trunk diameter and the survey date.",
            "開啟公園資料並放大到你熟悉的一座，再切換到公園樹木。點選一棵樹，閱讀其樹高、胸徑與調查日期。",
          ),
          href: "/urban?dataset=taipei-park-trees",
          hrefLabel: both("Open park trees", "開啟公園樹木"),
        },
        {
          title: both("Look at the survey dates", "檢查調查日期"),
          body: both(
            "Open “About this data” for park trees and for riverside trees. Compare their survey dates. Could you place both on one map of “Taipei's trees today”?",
            "分別開啟公園樹木與河濱樹木的「關於此資料」，比較調查日期。你能把兩者放在同一張「臺北今日樹木」地圖上嗎？",
          ),
          href: "/urban?dataset=taipei-riverside-trees",
          hrefLabel: both("Open riverside trees", "開啟河濱樹木"),
        },
        {
          title: both("See the measured temperatures", "看實測氣溫"),
          body: both(
            "Open the live weather stations with air temperature as the measurement. Find a station near a park you looked at. Is it in the park?",
            "開啟即時氣象測站並以氣溫為指標，找出你查看的公園附近的測站。測站在公園裡嗎？",
          ),
          href: "/urban?dataset=live-weather&metric=temperature",
          hrefLabel: both("Open temperatures", "開啟氣溫"),
        },
        {
          title: both("Write the study you would need", "寫下你需要的研究"),
          body: both(
            "In three sentences, say what you would measure, where and when, to test whether greener places are cooler.",
            "以三句話說明：為了檢驗綠地較多的地方是否較涼，你會在何時何地測量什麼。",
          ),
        },
      ],
      notice: [
        both(
          `Coverage is one city of 22 counties and cities. Nothing here supports a statement about Taiwan as a whole.`,
          `涵蓋範圍只有 22 個縣市中的一個城市，不足以對全臺灣下任何結論。`,
        ),
        both(
          `Park-tree and riverside-tree surveys were carried out in different periods (see each dataset's date range), so they describe different moments.`,
          `公園樹木與河濱樹木調查在不同時期進行（見各資料集的日期範圍），描述的是不同時間點。`,
        ),
      ],
      questions: [
        both(
          "Station A is next to a park and reads 1 °C cooler than station B. Does that show the park cools the air? What else differs?",
          "A 站靠近公園，比 B 站低 1 °C。這能證明公園使空氣變涼嗎？還有什麼不同？",
        ),
        both(
          "What is the difference between a survey of trees and a measurement of shade or canopy?",
          "樹木調查與遮蔭或樹冠覆蓋的測量有何不同？",
        ),
        both(
          "The atlas says satellite surface temperature is a separate source not yet included. How would it help, and how would it differ from air temperature?",
          "本平台說明衛星地表溫度是尚未納入的獨立來源。它會有什麼幫助？與氣溫又有何不同？",
        ),
      ],
      pitfalls: [
        both(
          "Tree records are not proof a tree is alive today.",
          "樹木紀錄不證明該樹目前仍存活。",
        ),
        both(
          "Air temperature from a station is not land-surface temperature.",
          "測站的氣溫不是地表溫度。",
        ),
        both(
          "Do not claim causation from two maps placed side by side.",
          "不要因為兩張地圖並列就主張因果。",
        ),
      ],
      assess: both(
        "Students write a one-paragraph research question and a design table: variable, source, date, place, known limit.",
        "學生寫一段研究問題，並完成設計表：變項、來源、日期、地點、已知限制。",
      ),
      sources: [
        {
          label: "Taipei City open data, park trees",
          url: "https://data.taipei/dataset/detail?id=7a49d00c-a5ff-4a6b-be9e-aaa6dc1ff7e8",
        },
        {
          label: "Taipei City open data, riverside trees",
          url: "https://data.taipei/dataset/detail?id=34800b67-b5a5-4ce9-9892-eb0945b82644",
        },
        {
          label: "Taipei parks, data.gov.tw dataset 128366",
          url: "https://data.gov.tw/dataset/128366",
        },
      ],
    },

    "audit-a-dataset": {
      level: both(
        "Any level; works as a take-home",
        "不限程度，可作為課後作業",
      ),
      objectives: [
        both(
          "Apply one checklist to any open dataset.",
          "以同一份檢核表審視任何開放資料。",
        ),
        both(
          "Tell what a record is, what is missing and how location is represented.",
          "說明一筆紀錄是什麼、缺了什麼，以及位置如何表示。",
        ),
        both(
          "Write a citation that includes the licence.",
          "撰寫包含授權的引用。",
        ),
      ],
      prepare: [
        both(
          "Assign one dataset per group. Suggested: the wildlife subset, the 2023 land cover, the village listings, the Taipei park trees.",
          "每組分配一份資料，建議：野生動物子集、2023 土地覆蓋、部落列載、臺北公園樹木。",
        ),
      ],
      background: [
        both(
          "Every dataset in the atlas lists its agency, dates, licence and limits under “About this data” and “Sources & scope”. The skill is not collecting those facts but asking what they change about what you may conclude.",
          "本平台每個資料集都在「關於此資料」與「來源與範圍」列出機關、日期、授權與限制。重點不在蒐集這些事實，而在追問它們如何改變你能下的結論。",
        ),
      ],
      table: {
        caption: both("Audit worksheet", "審視學習單"),
        head: [both("Question", "問題"), both("Your finding", "你的發現")],
        rows: [
          [
            both("Who published it, and why?", "誰發布、為何發布？"),
            both("", ""),
          ],
          [both("What is one record?", "一筆紀錄代表什麼？"), both("", "")],
          [both("What dates does it cover?", "涵蓋哪些日期？"), both("", "")],
          [
            both(
              "What is missing, on purpose or not?",
              "缺了什麼（有意或無意）？",
            ),
            both("", ""),
          ],
          [
            both(
              "How is location represented, and how precise is it?",
              "位置如何表示、精確度如何？",
            ),
            both("", ""),
          ],
          [
            both(
              "Is a count a rate? What would the denominator be?",
              "數量是比率嗎？分母會是什麼？",
            ),
            both("", ""),
          ],
          [
            both("What may you not conclude?", "你不能下什麼結論？"),
            both("", ""),
          ],
          [
            both("What licence allows reuse?", "授權允許如何再利用？"),
            both("", ""),
          ],
        ],
      },
      steps: [
        {
          title: both(
            "Choose a dataset and open its scope",
            "選一份資料並開啟其範圍說明",
          ),
          body: both(
            "Open any section page, choose your dataset, then read “About this data” and the Sources & scope tab before you look at the map.",
            "開啟任一專題頁，選擇你的資料集，在看地圖之前先讀「關於此資料」與「來源與範圍」分頁。",
          ),
          href: "/sources",
          hrefLabel: both("Open the source library", "開啟來源庫"),
        },
        {
          title: both("Fill in the worksheet", "填寫學習單"),
          body: both(
            "Answer each question in the table with evidence from the page. Write “not stated” where the page does not say.",
            "依頁面證據回答表中每個問題；頁面沒有說明的就寫「未說明」。",
          ),
        },
        {
          title: both("Write the citation", "撰寫引用"),
          body: both(
            "Use the citation pattern at the end of this lesson. Add the dataset's own source and licence.",
            "使用本課末的引用格式，並補上該資料集的原始來源與授權。",
          ),
        },
      ],
      notice: [
        both(
          `Examples inside this atlas: the wildlife subset covers ${w.firstDate} to ${w.lastDate} only; land cover is one year (${facts.forests.year}); the village listings have no founding dates; park trees were surveyed in different periods from riverside trees.`,
          `本平台內的例子：野生動物子集只涵蓋 ${w.firstDate} 至 ${w.lastDate}；土地覆蓋只有一個年度（${facts.forests.year}）；部落列載沒有成立日期；公園樹木與河濱樹木調查期間不同。`,
        ),
      ],
      questions: [
        both(
          "Which row of the worksheet was hardest to fill, and what does that tell you about the dataset?",
          "學習單哪一列最難填？這說明了資料的什麼？",
        ),
        both(
          "Would you trust the dataset for a claim about change over time? Why or why not?",
          "你會信任這份資料來支持關於時間變化的主張嗎？為什麼？",
        ),
        both(
          "What is the strongest claim you could responsibly make from it, in one sentence?",
          "用一句話說，你能負責任地從中得出的最強主張是什麼？",
        ),
      ],
      pitfalls: [
        both(
          "“Not stated” is a finding, not a failure. Do not fill the gap with a guess.",
          "「未說明」本身就是發現，不是失敗；不要用猜測補空。",
        ),
      ],
      assess: both(
        "Mark the worksheet for evidence (a page or source for each answer), not for how impressive the dataset sounds.",
        "學習單以證據（每項回答是否有頁面或來源支持）評分，而非資料聽起來多厲害。",
      ),
      sources: [{ label: "Taiwan EcoAtlas source library", url: "/sources" }],
    },
  };

  return lessonMeta.map((meta) => ({
    ...meta,
    ...lessons[meta.slug],
    reviewed,
  }));
}
