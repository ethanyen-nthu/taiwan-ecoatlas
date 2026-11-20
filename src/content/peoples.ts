import type { L } from "./lesson-index";
import { peopleBriefs, type PeopleBrief } from "./peoples-index";

/** Longer, sourced profiles of the sixteen peoples. Server-only: pages pass
 *  down just the text they show. Everything here is a summary of widely
 *  documented history and public sources, written in our own words, hedged
 *  where scholars differ, and in the present tense for living cultures. */
export interface PeopleProfile extends PeopleBrief {
  /** A short paragraph that opens the profile. */
  summary: L;
  /** Two or three paragraphs of history. */
  history: L[];
  /** Living culture and today. */
  today: L[];
  /** Words and ideas worth knowing, each with a short gloss. */
  terms: { term: string; gloss: L }[];
  /** One question for a class to discuss. */
  discuss: L;
}

const both = (en: string, zh: string): L => ({ en, zh });

const profiles: Record<string, Omit<PeopleProfile, keyof PeopleBrief>> = {
  amis: {
    summary: both(
      "The Amis are the largest of Taiwan's recognised Indigenous peoples, living mainly on the eastern plains and coast of Hualien and Taitung, with a large community in western cities. Kinship is traditionally traced through the mother's line, while men are grouped into age sets that carry public duties.",
      "阿美族是臺灣人口最多的原住民族，主要居住在花蓮與臺東的東部平原與海岸，也有許多族人住在西部都會。傳統上以母系計算親屬，男子則依年齡編入階層，承擔公共事務。",
    ),
    history: [
      both(
        "Amis communities farmed rice and millet and fished along the rivers and Pacific shore of the Huatung valley for many generations. From the late nineteenth century, Qing and then Japanese administration, later Han settlement and the postwar state, reshaped who owned and used the eastern plains.",
        "阿美族人世代在花東縱谷的河川與太平洋海岸耕作稻米與小米、捕魚。十九世紀後期起，清朝與日本的行政治理、後來的漢人移入與戰後國家政策，逐步改變了東部平原的土地擁有與使用。",
      ),
      both(
        "“Amis” is the name that spread through outside records; many people use Pangcah for themselves. The Sakizaya, long counted as Amis, were recognised as a separate people in 2007, and the Amis category today covers regional groups whose dialects and customs differ.",
        "「阿美」是外界紀錄中流傳的名稱，許多族人自稱 Pangcah。長期被歸入阿美族的撒奇萊雅族於 2007 年正名為獨立族群；今天的阿美族之下，各區域群體的語言與習俗也有差異。",
      ),
    ],
    today: [
      both(
        "The summer harvest festival, often called Ilisin, is the best-known public event. Each community chooses its own dates and form, and age sets have defined roles in preparing and dancing. Many Amis moved to western cities for work from the mid-twentieth century, so the festival season is also a time when families travel home.",
        "夏季的豐年祭（常稱 Ilisin）是最廣為人知的公共活動，各部落自訂日期與形式，年齡階層在籌備與舞蹈中各有角色。許多阿美族人自二十世紀中期起到西部都市工作，因此豐年祭也是族人返鄉的時節。",
      ),
    ],
    terms: [
      {
        term: "Ilisin",
        gloss: both(
          "The harvest and age-set festival season.",
          "豐年祭，也是年齡階層活動的節慶季。",
        ),
      },
      {
        term: "Pangcah",
        gloss: both(
          "A name many Amis use for themselves.",
          "許多阿美族人的自稱。",
        ),
      },
      {
        term: "Age set",
        gloss: both(
          "Men grouped by cohort, each cohort with its own tasks and rank.",
          "男子依年次編組，各組有其任務與位階。",
        ),
      },
    ],
    discuss: both(
      "Festivals are often watched by visitors as well as practised by families. What changes when a ceremony becomes something to attend as a tourist, and what stays the same?",
      "祭典既是家庭與部落的實踐，也常有外來參觀者。當儀式成為遊客觀看的活動，什麼會改變、什麼不變？",
    ),
  },
  atayal: {
    summary: both(
      "The Atayal (Tayal) live across the northern and central mountains, from Taoyuan and Hsinchu through Taichung and Nantou to Yilan and Hualien. Community life is held together by gaga, a body of shared rules and obligations tied to the ancestral spirits.",
      "泰雅族（Tayal）分布於北部與中部山區，從桃園、新竹經臺中、南投，到宜蘭與花蓮。部落生活以 gaga（共同的規範與義務，與祖靈相連）維繫。",
    ),
    history: [
      both(
        "Atayal households hunted, farmed millet on cleared hill plots and wove cloth; for many generations, men and women wore facial tattoos (ptasan) as marks of adulthood, for men connected with hunting and warfare and for women with skill in weaving. Gaga governed marriage, farming, hunting and the settling of disputes, and was observed by the whole community.",
        "泰雅族人狩獵、在山坡開墾地種小米、並織布；許多世代以來，男女皆以紋面（ptasan）作為成年的標記，男子與狩獵和戰事相連，女子則與織布技藝相連。gaga 規範婚姻、耕作、狩獵與糾紛的處理，由全體部落共同遵守。",
      ),
      both(
        "In the early twentieth century the Japanese colonial government pushed “guard lines” and military campaigns into the northern mountains, especially in the 1910s, and moved many communities to lower ground. Atayal resistance during this period is widely recorded, and the later reshuffling of villages still shapes where Atayal communities stand today.",
        "二十世紀初，日本殖民政府將隘勇線與軍事行動推進北部山區（尤其在 1910 年代），並把許多部落遷往較低的地方。這段期間泰雅族的抵抗有廣泛紀錄，後來的部落遷徙仍影響今日泰雅部落的位置。",
      ),
    ],
    today: [
      both(
        "Atayal weaving, with its characteristic bands and diamond patterns, is an active craft. The mountain village of Smangus in Hsinchu County is often cited as a community that manages its land and visitor economy collectively. The Atayal language and Seediq form a related branch of the Austronesian languages.",
        "泰雅織布以特有的條紋與菱形紋樣為特色，至今仍是活躍的工藝。新竹縣的司馬庫斯常被視為共同管理土地與觀光經濟的部落例子。泰雅語與賽德克語屬於南島語系中關係相近的一支。",
      ),
    ],
    terms: [
      {
        term: "gaga",
        gloss: both(
          "Shared rules, obligations and ways of living, upheld together.",
          "共同遵守的規範、義務與生活方式。",
        ),
      },
      {
        term: "utux",
        gloss: both(
          "The ancestral spirits that gaga answers to.",
          "祖靈；gaga 所依循的對象。",
        ),
      },
      {
        term: "ptasan",
        gloss: both(
          "Facial tattooing, a mark of adulthood and skill.",
          "紋面，成年與技藝的標記。",
        ),
      },
    ],
    discuss: both(
      "Many Atayal villages in this atlas share a township. What does one public reference point tell you about where a community lives, farms and travels, and what does it leave out?",
      "本地圖中許多泰雅部落位於同一個鄉鎮。單一公開定位點能告訴你部落在哪裡居住、耕作與往來嗎？又遺漏了什麼？",
    ),
  },
  paiwan: {
    summary: both(
      "The Paiwan live in the southern mountains and coast of Pingtung and Taitung. Theirs is a society of hereditary ranks, in which the eldest child inherits regardless of gender, and its visual culture, from carved house posts to glass beads, is among the most recognisable in Taiwan.",
      "排灣族居住在屏東與臺東的南部山區與海岸。排灣社會有世襲階層，長嗣不分性別繼承；從雕刻家屋木柱到琉璃珠，其視覺文化是臺灣最易辨認的之一。",
    ),
    history: [
      both(
        "Paiwan villages were led by chiefly families, with nobles, commoners and ritual specialists each holding defined roles. House posts and lintels carry carved ancestors and the hundred-pace snake (a motif tied to noble lineages), and glass beads are family heirlooms with their own names and stories.",
        "排灣部落由頭目家族領導，貴族、平民與祭儀人員各有明確角色。家屋的木柱與門楣雕有祖先像與百步蛇紋（與貴族世系相關的圖紋），琉璃珠則是各有名稱與故事的傳家寶。",
      ),
      both(
        "The southern Paiwan came to the world's attention in the 1870s through the Mudan Incident, in which shipwrecked Ryukyuan sailors, Paiwan communities and a Japanese military expedition were involved, and which influenced Qing policy toward Taiwan. Historians describe the incident differently, and the Paiwan memory of it is part of that record.",
        "南部排灣族在 1870 年代因牡丹社事件受到外界注意：漂流的琉球船員、排灣族部落與日本出兵均牽涉其中，並影響了清朝對臺灣的政策。歷史學者對此事件的敘述不一，排灣族自身的記憶也是紀錄的一部分。",
      ),
    ],
    today: [
      both(
        "Five-yearly rituals such as Maljeveq, in which ancestral spirits are welcomed, remain important in several communities. Carving, weaving, pottery and glass-bead making continue as livelihoods and art, and rank still shapes ceremony and family responsibility in many villages.",
        "迎請祖靈的五年祭（Maljeveq）等儀式，在多個部落仍很重要。雕刻、織布、陶藝與琉璃珠製作作為生計與藝術持續傳承，在許多部落中階層仍影響祭儀與家庭責任。",
      ),
    ],
    terms: [
      {
        term: "Maljeveq",
        gloss: both(
          "A five-yearly ritual that welcomes the ancestral spirits.",
          "每五年舉行、迎接祖靈的祭儀（五年祭）。",
        ),
      },
      {
        term: "Hundred-pace snake",
        gloss: both(
          "A motif linked to noble lineages, carved and woven.",
          "與貴族世系相連、見於雕刻與織品的百步蛇紋。",
        ),
      },
      {
        term: "Glass beads",
        gloss: both(
          "Family treasures, each bead with a name and history.",
          "琉璃珠，是各有名稱與歷史的傳家寶。",
        ),
      },
    ],
    discuss: both(
      "Rank and inheritance work differently here than in many societies. How would a map of villages look different if it showed ranks and families instead of points?",
      "這裡的階層與繼承方式與許多社會不同。如果地圖呈現的是階層與家系而不是點，會有什麼不同？",
    ),
  },
  bunun: {
    summary: both(
      "The Bunun live in the high central mountains of Nantou, Hualien, Taitung and Kaohsiung, among the highest-altitude settlements in Taiwan. Their ritual year follows the millet, and their harvest prayer song, Pasibutbut, is a rare example of polyphonic singing.",
      "布農族居住在南投、花蓮、臺東與高雄的中央山脈高地，部落海拔是臺灣最高之一。其儀式年曆依小米而行，祈禱小米豐收歌 Pasibutbut 是少見的多聲部歌唱。",
    ),
    history: [
      both(
        "Bunun society is built on patrilineal clans, and hunting and millet farming set the rhythm of the year. Over the eighteenth and nineteenth centuries, Bunun families spread from the central mountains to the east and south, which is why Bunun villages today sit beside Atayal, Tsou, Hla'alua and Kanakanavu neighbours.",
        "布農社會以父系氏族為基礎，狩獵與小米耕作決定一年的節奏。十八至十九世紀，布農族人從中央山脈向東與向南擴散，因此今日布農部落與泰雅、鄒、拉阿魯哇與卡那卡那富等鄰族相鄰。",
      ),
      both(
        "During the Japanese period many Bunun communities were relocated to lower ground, and their rifles and hunting were restricted. Hunting remains legally and culturally contested today, a matter that Taiwan's courts have taken up in rulings about Indigenous hunting rights.",
        "日本時期許多布農部落被遷往較低處，槍枝與狩獵受到限制。狩獵至今仍是法律與文化上的爭議議題，臺灣法院也曾就原住民族狩獵權作出裁判。",
      ),
    ],
    today: [
      both(
        "The ear-shooting festival, held in spring, and millet harvest rituals mark the annual calendar. Pasibutbut is sung by a ring of men, whose voices rise in stepped parts, as a prayer for a good harvest. Choirs and cultural groups continue it, and it is taught in schools.",
        "春季的射耳祭與小米收穫祭儀標誌著年曆。Pasibutbut 由一圈男子合唱，聲部逐階上升，向祖靈祈求豐收。合唱團與文化團體持續傳唱，學校也教授。",
      ),
    ],
    terms: [
      {
        term: "Pasibutbut",
        gloss: both(
          "A polyphonic harvest prayer sung by a ring of men.",
          "由一圈男子合唱的多聲部祈禱小米豐收歌。",
        ),
      },
      {
        term: "Ear-shooting festival",
        gloss: both(
          "A spring hunting ritual centred on boys' first hunts.",
          "以男孩初次狩獵為核心的春季射耳祭。",
        ),
      },
      {
        term: "Millet",
        gloss: both(
          "The grain around which the ritual year is organised.",
          "儀式年曆所圍繞的穀物。",
        ),
      },
    ],
    discuss: both(
      "Bunun settlements sit at high altitude, among the steepest ground in Taiwan. How might elevation, rather than distance, help explain where the dots on the map are?",
      "布農部落多在高海拔、地勢最陡之處。用海拔而不是距離，能如何解釋地圖上這些點的位置？",
    ),
  },
  truku: {
    summary: both(
      "The Truku live in and around Taroko Gorge and nearby valleys in Hualien. They were recognised in 2004 after being counted as Atayal, and are a closely related Seediq-speaking people.",
      "太魯閣族居住在花蓮太魯閣峽谷及周邊山谷。他們原被歸入泰雅族，於 2004 年正名，與賽德克語系的族群關係密切。",
    ),
    history: [
      both(
        "Truku communities live by gaya, shared rules comparable to the Atayal gaga, hunt and farm millet, and wove cloth; facial tattooing marked adulthood. In 1914 the Japanese colonial government carried out a major military campaign against the Truku, known as the Taroko War, and relocated communities from the mountains to the foothills.",
        "太魯閣族人依循 gaya（類似泰雅 gaga 的共同規範）生活，狩獵、種小米並織布；紋面標示成年。1914 年日本殖民政府對太魯閣族發動大規模軍事行動（太魯閣戰爭），並將部落從山上遷到山麓。",
      ),
      both(
        "Taroko National Park, established in 1986, overlaps ancestral Truku land, and the Truku have long raised the question of who decides how that land is used. Their 2004 recognition was itself debated: some Seediq people did not regard the Truku as distinct from them.",
        "1986 年成立的太魯閣國家公園與太魯閣族祖傳土地重疊，族人長期提出土地使用由誰決定的問題。2004 年的正名本身也有爭論：部分賽德克族人不認為太魯閣族與他們有所區別。",
      ),
    ],
    today: [
      both(
        "Weaving, with its red, white and black bands, remains a living art, and communities in Hualien keep the language and rituals going. Much of daily life now involves tourism and work around the gorge, and communities negotiate their role in the park and its economy.",
        "織布的紅、白、黑條紋至今仍是活的藝術，花蓮的部落持續傳承語言與儀式。如今許多日常生活與峽谷周邊的觀光與工作相關，部落也持續協商自己在國家公園及其經濟中的角色。",
      ),
    ],
    terms: [
      {
        term: "gaya",
        gloss: both(
          "Shared rules and ways of living, upheld by the community.",
          "由部落共同遵守的規範與生活方式。",
        ),
      },
      {
        term: "Taroko War",
        gloss: both(
          "The 1914 Japanese military campaign against the Truku.",
          "1914 年日本對太魯閣族的軍事行動。",
        ),
      },
      {
        term: "Recognition (正名)",
        gloss: both(
          "Official acceptance of a people under its own name.",
          "官方以族群自身名稱承認其身分。",
        ),
      },
    ],
    discuss: both(
      "Recognition changed the Truku's status in 2004, but not everyone agreed on who counts as a separate people. Who should decide?",
      "2004 年的正名改變了太魯閣族的身分，但並非所有人都同意誰是獨立的族群。應該由誰決定？",
    ),
  },
  puyuma: {
    summary: both(
      "The Puyuma (Pinuyumayan) live on the Taitung plain and its edges. Boys are trained in men's youth halls, and the Puyuma village of Pilam was historically one of the most influential on the plain.",
      "卑南族（Pinuyumayan）居住在臺東平原及其周緣。男孩在少年會所中接受訓練，歷史上卑南覓（Pilam）部落是平原上影響力最大的部落之一。",
    ),
    history: [
      both(
        "Puyuma communities trace their origins to ancestral places that differ between villages, and keep those narratives alive. Boys enter age-graded youth halls (palakuwan) in which they train for years, and women have central roles in ritual and in the household.",
        "卑南族各部落有各自的祖源傳說並持續傳述。男孩進入依年齡分級的少年會所（palakuwan）受訓多年，女性則在儀式與家庭中擔任核心角色。",
      ),
      both(
        "Qing records describe the leader of the Puyuma village of Pilam as holding influence over neighbouring communities, sometimes called the “king of Beinan”. That description is how outside officials saw a local arrangement, and scholars continue to discuss how well it fits Puyuma political life.",
        "清代文獻描述卑南覓部落的領袖對鄰近部落有影響力，有時稱為「卑南王」。這是外來官員對地方安排的看法，學者仍在討論它與卑南社會政治的契合程度。",
      ),
    ],
    today: [
      both(
        "The Puyuma ceremonial calendar still includes harvest-season gatherings and hunts when villages come together, and the youth halls continue to mark life stages. Taitung City and its surroundings are shared with Amis, Paiwan and Han neighbours.",
        "卑南族的祭儀年曆仍包含收穫季的聚會與狩獵，各部落在此時共聚，少年會所也持續標記人生階段。臺東市及周邊與阿美、排灣與漢人鄰居共處。",
      ),
    ],
    terms: [
      {
        term: "Pinuyumayan",
        gloss: both(
          "The name the Puyuma use for themselves.",
          "卑南族的自稱。",
        ),
      },
      {
        term: "palakuwan",
        gloss: both(
          "The men's youth hall where boys are trained.",
          "男孩受訓的少年會所。",
        ),
      },
      {
        term: "Pilam",
        gloss: both(
          "The influential Puyuma village of the Qing records.",
          "清代文獻中影響力很大的卑南部落。",
        ),
      },
    ],
    discuss: both(
      "Outside records called a Puyuma leader a “king”. What is gained, and what is distorted, when one society describes another with its own words?",
      "外界文獻稱一位卑南領袖為「王」。當一個社會用自己的詞彙描述另一個社會時，得到了什麼，又扭曲了什麼？",
    ),
  },
  rukai: {
    summary: both(
      "The Rukai live in the foothills of Pingtung, Kaohsiung and Taitung. Their villages are known for slate houses, chiefly families with hereditary rank, and the wild lily, worn as a mark of honour.",
      "魯凱族居住在屏東、高雄與臺東的山麓。其部落以石板屋、世襲頭目家族與象徵榮譽的野百合著稱。",
    ),
    history: [
      both(
        "Rukai society is organised around chiefly families, with the eldest child inheriting. Slate houses, for example at old Haocha in Wutai, show how people built with the stone of their valleys. The wild lily (Lilium formosanum) is worn as a headdress and is tied to honour and virtue.",
        "魯凱社會以頭目家族為組織核心，長嗣繼承。石板屋（例如屏東霧臺的舊好茶）顯示人們以山谷的石材建屋。野百合（臺灣百合）被編成頭飾戴上，與榮譽與品德相連。",
      ),
      both(
        "In the twentieth century many Rukai villages were moved from the mountains to lower ground, and Rukai communities in Wutai, Maolin and Taimali developed in different directions. Typhoon Morakot in 2009 devastated or cut off several Rukai communities in Kaohsiung and Pingtung, and some villages were relocated to new sites.",
        "二十世紀許多魯凱部落從山上遷往低處，霧臺、茂林與臺東太麻里的魯凱部落各自走向不同的發展。2009 年莫拉克颱風重創或阻斷了高雄與屏東的數個魯凱部落，部分部落遷到新的地點。",
      ),
    ],
    today: [
      both(
        "Slate-house villages, weaving, carving and cultural festivals continue, and young Rukai artists work across media. Relocated villages grapple with what it means to live far from ancestral land.",
        "石板屋聚落、織布、雕刻與祭典持續傳承，年輕的魯凱藝術家跨媒材創作。遷居的部落也在思考遠離祖居地生活的意義。",
      ),
    ],
    terms: [
      {
        term: "Slate house",
        gloss: both(
          "A house built from layered slabs of local stone.",
          "以當地板岩疊建的石板屋。",
        ),
      },
      {
        term: "Wild lily",
        gloss: both(
          "A flower worn as a headdress, a symbol of honour.",
          "野百合，戴在頭上的榮譽象徵。",
        ),
      },
      {
        term: "Chiefly family",
        gloss: both(
          "A family with hereditary leadership, inherited by the eldest child.",
          "具有世襲領導權、由長嗣繼承的頭目家族。",
        ),
      },
    ],
    discuss: both(
      "After a disaster, communities were moved to new villages. What does the dot for a relocated village show, and what does it not show?",
      "災後部落遷到新村。遷村後的點能顯示什麼，又不能顯示什麼？",
    ),
  },
  seediq: {
    summary: both(
      "The Seediq live in the mountain townships of Nantou and Hualien and were recognised in 2008, after being counted as Atayal. Seediq means “person”, and the Wushe Incident of 1930 is central to their historical memory.",
      "賽德克族居住在南投與花蓮的山區鄉鎮，原被歸入泰雅族，2008 年正名。Seediq 意為「人」，1930 年的霧社事件是其歷史記憶的核心。",
    ),
    history: [
      both(
        "Seediq communities are traditionally grouped as Tgdaya, Toda and Truku, each with its own villages, and live by gaya, the shared rules of life. Facial tattooing and weaving carried meaning about adulthood and skill.",
        "賽德克傳統上分為德固達雅、都達與德魯固三群，各有自己的部落，依循 gaya（共同生活規範）生活。紋面與織布承載成年與技藝的意義。",
      ),
      both(
        "In 1930 Seediq communities around Musha (Wushe) rose against Japanese rule under leaders such as Mona Rudao. The colonial response, and a second attack in 1931 by other communities aligned with the Japanese side, devastated the Seediq, and survivors were resettled at Chuanzhongdao in Nantou. The 2011 film Seediq Bale brought this history to a wide audience.",
        "1930 年，霧社一帶的賽德克族人在莫那·魯道等人領導下起事反抗日本統治。殖民政府的回應，以及 1931 年與日方結盟的其他部落的另一次攻擊，重創了賽德克族，倖存者被遷往南投的川中島。2011 年電影《賽德克·巴萊》讓這段歷史為更多人所知。",
      ),
    ],
    today: [
      both(
        "Seediq communities in Nantou and Hualien continue the language, weaving and ritual life, and the name Seediq itself, restored in 2008, is a point of pride. Remembrance of the Wushe Incident is part of public life.",
        "南投與花蓮的賽德克部落持續傳承語言、織布與儀式生活，2008 年恢復的「賽德克」名稱本身也是榮耀所在。對霧社事件的追思是公共生活的一部分。",
      ),
    ],
    terms: [
      {
        term: "Seediq",
        gloss: both(
          "“Person”; the people's own name.",
          "意為「人」；族群的自稱。",
        ),
      },
      {
        term: "Wushe Incident",
        gloss: both(
          "The 1930 uprising around Musha and its aftermath.",
          "1930 年霧社一帶的起事及其後續。",
        ),
      },
      {
        term: "Chuanzhongdao",
        gloss: both(
          "The Nantou site where survivors were resettled.",
          "倖存者被安置的南投地點（川中島）。",
        ),
      },
    ],
    discuss: both(
      "The Wushe Incident has been told as history, as film and as family memory. How do those versions differ, and who tells each?",
      "霧社事件被當作歷史、電影與家族記憶來講述。這些版本有何不同，各由誰講述？",
    ),
  },
  tsou: {
    summary: both(
      "The Tsou (Cou) live in the Alishan area of Chiayi and in Xinyi, Nantou. Their villages are centred on the kuba, the men's house, where the Mayasvi ceremony is held.",
      "鄒族（Cou）居住在嘉義阿里山與南投信義一帶。部落以 kuba（男子集會所）為中心，並在此舉行 Mayasvi 儀式。",
    ),
    history: [
      both(
        "Tsou society is organised into clans and larger groupings that share a kuba, which serves as meeting place, school for boys and site of ritual. The Tsou language is quite distinct from its neighbours.",
        "鄒族社會由氏族與共用 kuba 的較大群體組成，kuba 是集會場所、男孩的學習處，也是儀式地點。鄒語與鄰近語言差異頗大。",
      ),
      both(
        "Older classifications counted the Tsou together with the “Southern Tsou”, the Kanakanavu and Hla'alua, until those two were recognised separately in 2014. The Thao, once counted with the Tsou, were recognised in 2001. These changes show how official categories can lump together peoples who see themselves as different.",
        "舊的分類把鄒族與「南鄒」（卡那卡那富與拉阿魯哇）歸為一類，直到 2014 年這兩族分別正名。曾被歸入鄒族的邵族於 2001 年正名。這些變動顯示，官方分類可能把自認不同的族群歸在一起。",
      ),
    ],
    today: [
      both(
        "Mayasvi, often described as a war or victory ceremony, brings the community together at the kuba to renew bonds and remember the past. The Alishan region is also a heavily visited tourist area, and the Tsou take part in and shape that economy.",
        "Mayasvi 常被描述為戰祭或凱旋祭，族人聚集在 kuba 重申彼此的連結並追念過往。阿里山也是遊客眾多的觀光區，鄒族參與並形塑這個經濟。",
      ),
    ],
    terms: [
      {
        term: "kuba",
        gloss: both(
          "The men's house at the centre of a Tsou village.",
          "鄒族部落中心的男子集會所。",
        ),
      },
      {
        term: "Mayasvi",
        gloss: both(
          "A ceremony held at the kuba to renew community bonds.",
          "在 kuba 舉行、重申部落連結的儀式。",
        ),
      },
      {
        term: "Cou",
        gloss: both("The Tsou word for themselves.", "鄒族的自稱。"),
      },
    ],
    discuss: both(
      "Three peoples were once counted as Tsou. What does it mean for a category on a government list to change after 2014?",
      "三個族群曾被算作鄒族。政府名單上的分類在 2014 年之後改變，意味著什麼？",
    ),
  },
  saisiyat: {
    summary: both(
      "The Saisiyat live in the mountains of Hsinchu and Miaoli, and are best known for pastaay, a ceremony of remembrance and apology to the Ta'ai, a group of short people in their stories.",
      "賽夏族居住在新竹與苗栗的山區，以矮靈祭（pastaay）聞名；這是對傳說中矮人 Ta'ai 的追思與致歉儀式。",
    ),
    history: [
      both(
        "Saisiyat communities are traditionally described in two regional groups, northern in Hsinchu and southern in Miaoli, organised by clan. They have shared land and life with Atayal and Hakka neighbours for a long time, and many Saisiyat also speak the languages of their neighbours.",
        "賽夏族傳統上分為新竹的北賽夏與苗栗的南賽夏，以氏族為組織。他們長期與泰雅與客家鄰居共享土地與生活，許多賽夏族人也會說鄰居的語言。",
      ),
      both(
        "According to the story behind pastaay, the Ta'ai once taught the Saisiyat songs and farming, but behaved badly and were killed; the Saisiyat then suffered misfortune and began a ceremony to atone. The ceremony is held every two years in a smaller form and about every ten years in a larger one.",
        "依據矮靈祭背後的傳說，矮人 Ta'ai 曾教導賽夏族歌謠與耕作，卻行為不端而被殺害；賽夏族此後遭遇不幸，並開始舉行祭典贖罪。祭典每兩年一次小祭，約每十年一次大祭。",
      ),
    ],
    today: [
      both(
        "Pastaay brings Saisiyat families home from across Taiwan and draws many visitors. The Saisiyat population is small, and the language is under pressure, so language classes and cultural groups matter.",
        "矮靈祭讓賽夏族人從臺灣各地返鄉，也吸引許多訪客。賽夏族人口不多，語言面臨壓力，因此語言班與文化團體很重要。",
      ),
    ],
    terms: [
      {
        term: "pastaay",
        gloss: both(
          "The ceremony of remembrance and apology to the Ta'ai.",
          "對 Ta'ai 追思與致歉的矮靈祭。",
        ),
      },
      {
        term: "Ta'ai",
        gloss: both(
          "The short people of Saisiyat stories.",
          "賽夏傳說中的矮人。",
        ),
      },
      {
        term: "Clan",
        gloss: both(
          "The unit that organises family, ritual and obligation.",
          "組織家族、儀式與義務的單位。",
        ),
      },
    ],
    discuss: both(
      "Pastaay is a ceremony of apology that has lasted for generations. What can a story of wrongdoing teach a community about its own responsibilities?",
      "矮靈祭是延續數代的致歉儀式。關於過錯的故事，能教導一個社群認識自己的責任嗎？",
    ),
  },
  tao: {
    summary: both(
      "The Tao (also called Yami) live on Orchid Island (Lanyu), off the coast of Taitung. Their culture is built around the sea, with flying-fish seasons, carved plank boats and houses sunk below ground against typhoons.",
      "達悟族（亦稱雅美）居住在臺東外海的蘭嶼。其文化圍繞著海洋，有飛魚季、雕刻的拼板舟，以及為抵禦颱風而半沈入地下的家屋。",
    ),
    history: [
      both(
        "The Tao language is closely related to the languages of the Batanes islands in the Philippines, which points to long contact across the sea. The island's name for itself is Pongso no Tao, “island of the people”. Tao society has no tradition of headhunting, and lives in several villages around the coast.",
        "達悟語與菲律賓巴丹群島的語言關係密切，顯示跨海的長期接觸。島的自稱是 Pongso no Tao，意為「人之島」。達悟社會沒有獵首傳統，沿海岸分布於數個部落。",
      ),
      both(
        "“Yami” is the name that entered the record through a Japanese anthropologist in the 1890s; Tao is the people's own name, and has been used officially alongside the older label. In the early 1980s a storage site for low-level radioactive waste was built on the island, and its removal has been a long-running demand of residents.",
        "「雅美」是 1890 年代經由日本人類學者進入紀錄的名稱；Tao 是族人自己的名稱，如今官方並用新舊兩種稱呼。1980 年代初，島上興建了低放射性廢棄物貯存場，遷出廢棄物是居民長期的訴求。",
      ),
    ],
    today: [
      both(
        "The flying-fish season in spring opens the ritual year, and large plank boats are launched for communal fishing. Underground and semi-subterranean houses are still seen on the island next to modern buildings. Tourism, the waste storage site and the future of the sea all shape current life.",
        "春季的飛魚季開啟儀式年，大型拼板舟下水進行集體捕魚。島上仍可見半地下家屋與現代建築並存。觀光、廢棄物貯存場與海洋的未來，都影響著當前的生活。",
      ),
    ],
    terms: [
      {
        term: "Pongso no Tao",
        gloss: both(
          "The Tao name for Orchid Island, “island of the people”.",
          "達悟人對蘭嶼的稱呼，意為「人之島」。",
        ),
      },
      {
        term: "Flying-fish season",
        gloss: both(
          "The spring fishing season that opens the ritual year.",
          "開啟儀式年的春季飛魚捕撈季。",
        ),
      },
      {
        term: "Plank boat",
        gloss: both(
          "A large carved boat built from joined planks.",
          "以拼接木板造成的大型雕刻船。",
        ),
      },
    ],
    discuss: both(
      "A national decision placed a waste storage site on a small island. Who bears the cost of decisions that benefit the whole country?",
      "一項國家決策把廢棄物貯存場放在小島上。為全國帶來好處的決策，成本由誰承擔？",
    ),
  },
  kavalan: {
    summary: both(
      "The Kavalan's ancestral home is the Yilan plain; today communities live on the Hualien and Taitung coast. Recognised in 2002, they were the first plains Indigenous people to be officially recognised, and are known for weaving fibre from the banana plant.",
      "噶瑪蘭族的祖居地是宜蘭平原，今日部落分布在花蓮與臺東海岸。2002 年正名，是第一個獲官方承認的平埔族群，以香蕉絲纖維織布聞名。",
    ),
    history: [
      both(
        "The Kavalan once lived in villages across the Yilan plain. Han settlement pressure through the nineteenth century moved some Kavalan communities south to the Hualien coast and then to Taitung, where they live among Amis neighbours.",
        "噶瑪蘭族曾住在宜蘭平原各處的村落。十九世紀漢人移墾的壓力，使部分噶瑪蘭人南遷至花蓮海岸，再到臺東，與阿美族鄰居共處。",
      ),
      both(
        "Official recognition in 2002 made the Kavalan the first “plains” (Pingpu) people to be recognised. Other plains peoples, such as the Siraya, are not among the sixteen recognised peoples, and their status has been argued in courts and public debate.",
        "2002 年的正名使噶瑪蘭族成為第一個被承認的「平埔」族群。西拉雅等其他平埔族群並不在十六族之列，其身分一直是法院與公共討論的議題。",
      ),
    ],
    today: [
      both(
        "Kavalan weavers in Hualien make cloth from banana fibre, a skill that was nearly lost and is being passed on again. The Kavalan language has few fluent speakers, and communities run language and cultural programmes.",
        "花蓮的噶瑪蘭織者以香蕉絲纖維織布，這項技藝一度幾乎失傳，現正重新傳承。噶瑪蘭語流利的使用者很少，部落推動語言與文化計畫。",
      ),
    ],
    terms: [
      {
        term: "Pingpu",
        gloss: both(
          "“Plains peoples”, a term used for groups of the western and northern plains.",
          "「平埔族」，指西部與北部平原的族群。",
        ),
      },
      {
        term: "Banana-fibre weaving",
        gloss: both(
          "Cloth made from fibre stripped from banana stems.",
          "以香蕉莖剝取的纖維織成的布。",
        ),
      },
      {
        term: "Migration",
        gloss: both(
          "Movement under pressure from the Yilan plain to the east coast.",
          "在壓力下由宜蘭平原遷往東海岸。",
        ),
      },
    ],
    discuss: both(
      "Only one plains people is among the sixteen recognised peoples. How does a map of recognised villages leave out the peoples who are not on the list?",
      "十六族中只有一個平埔族群。只呈現已被承認部落的地圖，如何遺漏了不在名單上的族群？",
    ),
  },
  sakizaya: {
    summary: both(
      "The Sakizaya live on the Hualien plain, among Amis communities. Recognised in 2007 after being counted as Amis, they remember the 1878 Takobowan incident as a turning point.",
      "撒奇萊雅族居住在花蓮平原，與阿美族部落相鄰。原被歸入阿美族，2007 年正名，並以 1878 年達固湖灣事件為歷史轉折。",
    ),
    history: [
      both(
        "In 1878 Sakizaya communities clashed with Qing forces at Takobowan. After the Qing victory, many survivors scattered and took shelter in Amis villages, where over time they were counted as Amis. That is one reason a people with a distinct language and ritual life went unrecognised for well over a century.",
        "1878 年，撒奇萊雅族人與清軍在達固湖灣交戰。清軍勝利後，許多倖存者四散，並在阿美族部落中避難，之後逐漸被算作阿美族。這是為什麼一個有自己語言與儀式生活的族群，在超過一個世紀之間未獲承認的原因之一。",
      ),
      both(
        "Sakizaya leaders and communities worked for years to be recognised, and the Sakizaya were recognised as a separate people in 2007, with a population of roughly a thousand.",
        "撒奇萊雅族的領袖與族人努力多年爭取正名，於 2007 年被承認為獨立族群，人口約一千人。",
      ),
    ],
    today: [
      both(
        "The fire ceremony Palamal remembers the 1878 events and the ancestors. Language revitalisation and community history projects continue in Hualien, and the Sakizaya name appears now on road signs and in school programmes.",
        "火神祭 Palamal 追憶 1878 年的事件與祖先。花蓮持續進行語言復振與社區歷史計畫，撒奇萊雅的名稱也出現在路標與學校課程中。",
      ),
    ],
    terms: [
      {
        term: "Takobowan incident",
        gloss: both(
          "The 1878 clash with Qing forces that dispersed the Sakizaya.",
          "1878 年與清軍的衝突，使撒奇萊雅族四散。",
        ),
      },
      {
        term: "Palamal",
        gloss: both("The fire ceremony of remembrance.", "追憶的火神祭。"),
      },
      {
        term: "Hidden in the Amis category",
        gloss: both(
          "How the Sakizaya were counted for more than a century.",
          "撒奇萊雅族一個多世紀以來被歸類的方式。",
        ),
      },
    ],
    discuss: both(
      "A people can disappear from official lists without disappearing from life. What does it take to be counted again?",
      "一個族群可以從官方名單消失，卻沒有從生活中消失。要被重新計入需要什麼？",
    ),
  },
  thao: {
    summary: both(
      "The Thao live around Sun Moon Lake in Nantou and number fewer than a thousand. In 2001 they were the first people added to the original nine recognised peoples.",
      "邵族居住在南投日月潭周圍，人口不到一千人。2001 年，他們是原本九族之外第一個正名的族群。",
    ),
    history: [
      both(
        "The Thao lived by fishing, hunting and farming around the lake, and the small island of Lalu is sacred to them. In the 1930s a Japanese hydroelectric project raised the water level of the lake, flooding Thao land and villages and forcing people to move.",
        "邵族在湖畔以漁獵與農耕為生，拉魯島是他們的聖地。1930 年代日本的水力發電工程抬高了湖水位，淹沒了邵族的土地與村落，迫使族人遷居。",
      ),
      both(
        "The Thao were long counted among the Tsou, and their recognition in 2001 opened the later recognitions of other peoples. The Thao language is critically endangered, with very few fluent speakers.",
        "邵族長期被歸入鄒族，2001 年的正名開啟了其他族群後續的正名。邵語是瀕危語言，流利的使用者非常少。",
      ),
    ],
    today: [
      both(
        "The Thao follow a lunar ritual calendar led by ritual specialists, and pounding millet in wooden mortars is also made into rhythmic music. Tourism around Sun Moon Lake is a central part of life, and the Thao have worked to keep control of how their culture is presented.",
        "邵族依農曆的儀式年曆，由祭儀人員主持；以木臼杵搗小米也發展成節奏性的音樂。日月潭一帶的觀光是生活的重要部分，邵族也努力掌握自身文化的呈現方式。",
      ),
    ],
    terms: [
      {
        term: "Lalu",
        gloss: both(
          "The small island in Sun Moon Lake sacred to the Thao.",
          "日月潭中邵族視為聖地的小島。",
        ),
      },
      {
        term: "Pestle music",
        gloss: both(
          "Rhythms made by pounding millet in wooden mortars.",
          "以木臼杵搗小米所發出的節奏音樂。",
        ),
      },
      {
        term: "Critically endangered language",
        gloss: both(
          "A language with very few fluent speakers.",
          "流利使用者很少的語言。",
        ),
      },
    ],
    discuss: both(
      "A dam changed the shape of a lake and the lives of the people around it. Who counts the cost of infrastructure, and when?",
      "一座水壩改變了湖的形狀，也改變了湖畔族人的生活。基礎建設的代價由誰、在何時計算？",
    ),
  },
  hlaalua: {
    summary: both(
      "The Hla'alua (Saaroa) live in the Taoyuan and Namasia districts of Kaohsiung and number a few hundred. They were recognised in 2014 after being counted among the Tsou, and many villages are shared with Bunun neighbours.",
      "拉阿魯哇族（Saaroa）居住在高雄桃源與那瑪夏，人口數百人。原被歸入鄒族，2014 年正名，許多部落與布農族鄰居共居。",
    ),
    history: [
      both(
        "Hla'alua communities have lived in the upper Laonong river valley for many generations, with a language and ritual life of their own. Older classifications counted them with the Kanakanavu as “Southern Tsou”.",
        "拉阿魯哇族人世代居住在荖濃溪上游河谷，有自己的語言與儀式生活。舊分類把他們與卡那卡那富一起歸為「南鄒」。",
      ),
      both(
        "A ceremony centred on sacred shells, known as Miatungusu, is among the best-known of their rituals. The 2009 Typhoon Morakot devastated the upper Laonong valley, and several communities were displaced.",
        "以聖貝為中心的儀式 Miatungusu 是他們最知名的儀式之一。2009 年莫拉克颱風重創荖濃溪上游河谷，數個部落流離失所。",
      ),
    ],
    today: [
      both(
        "The Hla'alua language is critically endangered, and revitalisation depends on a small number of speakers and teachers. Shared villages with Bunun mean that a single dot on a map may stand for more than one people.",
        "拉阿魯哇語是瀕危語言，復振仰賴少數的使用者與教師。與布農族共居的部落，意味著地圖上的一個點可能代表不只一個族群。",
      ),
    ],
    terms: [
      {
        term: "Miatungusu",
        gloss: both(
          "A ceremony centred on sacred shells.",
          "以聖貝為中心的儀式。",
        ),
      },
      {
        term: "Southern Tsou",
        gloss: both(
          "The older label that grouped the Hla'alua with the Kanakanavu.",
          "舊分類中把拉阿魯哇與卡那卡那富歸在一起的稱呼。",
        ),
      },
      {
        term: "Shared village",
        gloss: both(
          "A village listed with more than one people.",
          "同時列出多個族群的部落。",
        ),
      },
    ],
    discuss: both(
      "Some villages are listed under two or three peoples. What would you lose if each village had to be assigned to just one?",
      "有些部落同時列在兩三個族群之下。如果每個部落都只能歸屬一個族群，會失去什麼？",
    ),
  },
  kanakanavu: {
    summary: both(
      "The Kanakanavu live in the Namasia District of Kaohsiung and number a few hundred. They were recognised in 2014 after being counted among the Tsou, and their villages are shared with Bunun neighbours.",
      "卡那卡那富族居住在高雄那瑪夏，人口數百人。原被歸入鄒族，2014 年正名，部落與布農族鄰居共居。",
    ),
    history: [
      both(
        "The Kanakanavu live in the upper Laonong river valley, where they farmed millet and rice and hunted in the surrounding forest. Older classifications counted them with the Hla'alua as “Southern Tsou”, though their language and customs are distinct.",
        "卡那卡那富族居住在荖濃溪上游河谷，在周邊森林耕作小米與稻米並狩獵。舊分類把他們與拉阿魯哇一同歸為「南鄒」，但其語言與習俗有所不同。",
      ),
      both(
        "Typhoon Morakot in 2009 devastated Namasia, and communities were moved to new settlements. Recognition in 2014, together with the Hla'alua, brought the number of recognised peoples to sixteen.",
        "2009 年莫拉克颱風重創那瑪夏，部落遷往新的聚落。2014 年與拉阿魯哇族同時正名，使被承認的族群達到十六族。",
      ),
    ],
    today: [
      both(
        "Annual rites around the millet and rice harvests continue, and language classes and cultural groups work to pass on a language with very few speakers. Villages shared with Bunun mean that a single point on a map can stand for more than one people.",
        "圍繞小米與稻米收穫的年度儀式持續舉行，語言班與文化團體努力傳承使用者極少的語言。與布農族共居的部落，意味著地圖上的一個點可能代表不只一個族群。",
      ),
    ],
    terms: [
      {
        term: "Southern Tsou",
        gloss: both(
          "The older label that grouped the Kanakanavu with the Hla'alua.",
          "舊分類中把卡那卡那富與拉阿魯哇歸在一起的稱呼。",
        ),
      },
      {
        term: "Recognition in 2014",
        gloss: both(
          "The step that completed the sixteen peoples.",
          "完成十六族名單的一步。",
        ),
      },
      {
        term: "Relocation",
        gloss: both(
          "Moving communities to new sites after the 2009 typhoon.",
          "2009 年颱風後部落遷往新地點。",
        ),
      },
    ],
    discuss: both(
      "Sixteen is not a natural number; it is the count of a list. Who writes the list, and who can ask to be added?",
      "十六並不是自然的數字，而是一份名單的數量。誰來寫這份名單，誰能要求加入？",
    ),
  },
};

export const peopleProfiles: PeopleProfile[] = peopleBriefs.map((brief) => ({
  ...brief,
  ...profiles[brief.slug],
}));

export const profileBySlug = new Map(peopleProfiles.map((p) => [p.slug, p]));
