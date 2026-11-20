import type { Localized } from "@/lib/types";

/**
 * Common names and short descriptions for the 99 roadkill-record taxa.
 *
 * The source data names every taxon by its scientific name only. Chinese
 * names follow Taiwan's usual references (TaiCOL / TaiBNET, the CWBF bird
 * checklist, museum collection pages). `provisional: true` marks names that
 * could not be confirmed against a second source and should be checked by a
 * specialist; `zh: null` means no confirmed Chinese name was found, so the
 * atlas shows the scientific name instead of guessing.
 */
export interface SpeciesInfo {
  zh: string | null;
  en: string | null;
  /** Another Chinese name in common use. */
  aka?: string;
  /** Family when the source file's family is outdated. */
  family?: string;
  endemic?: boolean;
  introduced?: boolean;
  provisional?: boolean;
  note: Localized;
}

const s = (
  zh: string | null,
  en: string | null,
  noteEn: string,
  noteZh: string,
  extra: Partial<SpeciesInfo> = {},
): SpeciesInfo => ({ zh, en, note: { en: noteEn, zh: noteZh }, ...extra });

export const speciesInfo: Record<string, SpeciesInfo> = {
  // ── Amphibians ────────────────────────────────────────────────
  "Duttaphrynus melanostictus": s(
    "黑眶蟾蜍",
    "Asian common toad",
    "One of Taiwan’s most familiar toads. It lives around gardens, farmland and roadsides and often sits on warm roads at night after rain.",
    "臺灣最常見的蟾蜍之一，棲息在住家庭園、農地與路旁，雨後夜間常停在溫熱的路面上。",
  ),
  "Fejervarya limnocharis": s(
    "澤蛙",
    "Asian grass frog",
    "A small frog of rice paddies, ditches and wet grassland across the lowlands; it follows rain and irrigation across fields and roads.",
    "常見於水田、水溝與潮濕草地的小型蛙類，會隨降雨與灌溉在農田與道路間移動。",
  ),
  "Buergeria robusta": s(
    "褐樹蛙",
    "Brown tree frog",
    "A Taiwan endemic of mountain streams and their edges. It tolerates warmer stream water than most frogs.",
    "臺灣特有種，生活在山區溪流及其周邊，比多數蛙類更能忍受偏高的水溫。",
    { endemic: true },
  ),
  "Polypedates megacephalus": s(
    "斑腿樹蛙",
    "Spot-legged tree frog",
    "A common lowland tree frog of gardens, farmland and ponds that lays its eggs in a foam nest above or beside the water.",
    "低海拔常見的樹蛙，出現在庭園、農地與池塘，把卵產在水邊的泡沫卵塊中。",
  ),
  "Polypedates braueri": s(
    "布氏樹蛙",
    "Brauer’s tree frog",
    "A tree frog of lowland and mid-elevation farmland, bamboo and ponds, also nesting in foam above water.",
    "分布於低、中海拔農地、竹林與池塘的樹蛙，同樣把卵產在水面上方的泡沫卵塊裡。",
  ),
  "Buergeria japonica": s(
    "日本樹蛙",
    "Japanese stream tree frog",
    "A stream-side tree frog found at low elevations, known for tolerating warm water such as near hot springs.",
    "低海拔溪流旁的樹蛙，能耐較高的水溫，例如溫泉周邊的溪水。",
  ),
  "Odorrana swinhoana": s(
    "斯文豪氏赤蛙",
    "Swinhoe’s frog",
    "A Taiwan endemic of clear mountain streams. Its greenish-brown skin and rocky-stream habit make it easy to overlook; roads that follow streams cut across its range.",
    "臺灣特有種，棲息於清澈的山區溪流，體色隱蔽不易察覺；沿溪的道路常橫切過牠的活動範圍。",
    { endemic: true },
  ),
  "Hyla chinensis": s(
    "中國樹蟾",
    "Chinese tree toad",
    "A small green tree frog of lowland ponds, rice fields and grassy edges; it calls loudly in spring and summer.",
    "體型小的綠色樹蛙，棲息於低海拔池塘、水田與草叢邊緣，春夏鳴叫聲響亮。",
  ),
  "Kurixalus idiootocus": s(
    "臺北樹蛙",
    "Taipei tree frog",
    "A Taiwan endemic tree frog of northern and central lowland hills, often found around farms, bamboo and ponds.",
    "臺灣特有種樹蛙，分布於北部與中部低海拔丘陵，常見於農地、竹林與池塘周邊。",
    { endemic: true },
  ),
  "Microhyla fissipes": s(
    "小雨蛙",
    "Ornate narrow-mouthed frog",
    "A tiny, round frog that appears after heavy rain to breed in temporary puddles and ditches.",
    "體型極小的圓胖蛙類，大雨後出現在臨時水窪與水溝中繁殖。",
  ),
  "Microhyla heymonsi": s(
    "黑蒙西氏小雨蛙",
    "Heymons’ narrow-mouthed frog",
    "A very small frog of grassland, leaf litter and shallow pools that surfaces during rainy periods.",
    "非常小的蛙類，棲息於草地、落葉層與淺水坑，雨季時才容易見到。",
  ),
  "Limnonectes fujianensis": s(
    "福建大頭蛙",
    "Fujian large-headed frog",
    "A stout, big-headed frog of forest streams and wet ground in low and mid elevations.",
    "頭部寬大、身形粗壯的蛙類，棲息於低、中海拔林間溪流與潮濕地面。",
  ),
  "Buergeria otai": s(
    "太田樹蛙",
    "Ota’s stream tree frog",
    "A Taiwan endemic stream tree frog, scarce in the roadkill records.",
    "臺灣特有的溪流樹蛙，在路死紀錄中很少見。",
    { endemic: true },
  ),
  "Kurixalus eiffingeri": s(
    "艾氏樹蛙",
    "Eiffinger’s tree frog",
    "A forest tree frog that lays eggs in bamboo stumps and tree hollows; the mother returns to feed the tadpoles with unfertilised eggs.",
    "林中的樹蛙，把卵產在竹筒與樹洞積水中，母蛙會回來以未受精卵餵食蝌蚪。",
  ),

  // ── Reptiles ─────────────────────────────────────────────────
  "Boiga kraepelini": s(
    "大頭蛇",
    "Kelung cat snake",
    "A slender, nocturnal tree-and-ground snake with a broad head and large eyes. Its venom is weak and it is not dangerous to people.",
    "夜行性的細長蛇類，頭大眼大，毒性微弱，對人無危險。",
  ),
  "Oligodon formosanus": s(
    "赤背松柏根",
    "Taiwan kukri snake",
    "A small snake that feeds on reptile eggs, slicing the shell open with enlarged teeth. A thin red stripe runs along the back.",
    "以爬蟲類的卵為食的小型蛇，用特化的大牙割開蛋殼；背部有一道細紅線。",
  ),
  "Oligodon ornatus": s(
    "赤腹松柏根",
    "Ornate kukri snake",
    "A kukri snake of hill and orchard edges in northern and central Taiwan, also egg-eating and uncommon.",
    "分布於北部與中部山區及果園邊緣的松柏根，同樣吃蛋，數量不多。",
  ),
  "Eutropis longicaudata": s(
    "長尾真稜蜥",
    "Long-tailed sun skink",
    "A glossy, fast skink of open ground, farmland and forest edges. It is active by day and sunbathes on warm surfaces, including roads.",
    "身體光亮、動作迅速的石龍子，白天活動，在農地、林緣與開闊地曬太陽，也會到路面上。",
  ),
  "Eutropis multifasciata": s(
    "多線真稜蜥",
    "Many-lined sun skink",
    "A widespread Asian skink with several pale lines down the back, found in open, sunny places.",
    "分布廣泛的石龍子，背上有多條淺色縱線，常見於日照充足的開闊處。",
  ),
  "Psammodynastes pulverulentus": s(
    "茶斑蛇",
    "Mock viper",
    "A small brownish snake that flattens its head like a viper to bluff predators. It is mildly venomous but harmless to people.",
    "棕色小型蛇，受驚時會壓扁頭部假裝成毒蛇；毒性輕微，對人無害。",
  ),
  "Ptyas dhumnades": s(
    "過山刀",
    "Big-eyed ratsnake",
    "A fast, daytime-active snake with large eyes; its Chinese name, “over-the-hill blade”, is about its speed. It eats rodents and frogs.",
    "大眼睛、日行性且行動迅速的蛇，以鼠類與蛙類為食；「過山刀」之名來自牠疾行如刀的速度。",
  ),
  "Sphenomorphus indicus": s(
    "印度蜓蜥",
    "Brown forest skink",
    "A small brown skink of forest floors and leaf litter in the hills and lowlands.",
    "棲息於山區與低地林下落葉層的小型棕色石龍子。",
  ),
  "Pareas formosensis": s(
    "臺灣鈍頭蛇",
    "Taiwan slug snake",
    "A Taiwan endemic with a blunt head that specialises in snails and slugs, hunting them on wet nights.",
    "臺灣特有種，頭部鈍圓，專門在潮濕的夜晚捕食蝸牛與蛞蝓。",
    { endemic: true },
  ),
  "Plestiodon elegans": s(
    "麗紋石龍子",
    "Shanghai elegant skink",
    "A striped skink whose juveniles have bright blue tails. Common in grass, gardens and rocky slopes.",
    "身上有縱紋的石龍子，幼體尾巴呈鮮藍色，常見於草叢、庭園與岩石坡地。",
    { aka: "藍尾石龍子" },
  ),
  "Achalinus niger": s(
    "標蛇",
    "Black odd-scaled snake",
    "A small, secretive snake that lives in leaf litter and soil of mid-elevation forest; rarely seen alive.",
    "隱蔽性高的小型蛇，生活在中海拔森林的落葉與土壤中，活體很少被看到。",
  ),
  "Plagiopholis styani": s(
    "福建頸斑蛇",
    "Chinese mountain snake",
    "A small mountain snake that is very rare in Taiwan; each record matters.",
    "臺灣極為稀少的山區小型蛇，每一筆紀錄都很珍貴。",
  ),
  "Hemidactylus bowringii": s(
    "無疣蝎虎",
    "Bowring’s gecko",
    "A house-and-wall gecko that hunts insects at night around lights and buildings.",
    "棲息於建物牆面的壁虎，夜間在燈光附近捕食昆蟲。",
  ),
  "Hemidactylus stejnegeri": s(
    "史丹吉氏蝎虎",
    "Stejneger’s leaf-toed gecko",
    "A gecko of forests and building edges. Its populations reproduce without males.",
    "棲息於森林與建物邊緣的壁虎，族群以孤雌生殖方式繁殖。",
    { aka: "史氏蝎虎" },
  ),
  "Scincella formosensis": s(
    "臺灣滑蜥",
    "Van Denburgh’s ground skink",
    "A small, smooth-scaled skink endemic to Taiwan that lives in leaf litter.",
    "臺灣特有的小型滑蜥，鱗片光滑，生活在落葉層中。",
    { endemic: true },
  ),
  "Ateuchosaurus chinensis": s(
    "中國光蜥",
    null,
    "A small skink with tiny limbs that lives in leaf litter and soil; scarce in the records.",
    "四肢短小的小型石龍子，生活在落葉與土壤中，紀錄不多。",
  ),
  "Emoia atrocostata": s(
    null,
    "Littoral skink",
    "A coast-dwelling skink that forages on rocky and coral shores; in Taiwan it is best known from Orchid Island.",
    "生活在海岸岩礁與珊瑚礁的石龍子，在臺灣以蘭嶼最為人所知。",
  ),
  "Sphenomorphus taiwanensis": s(
    "臺灣蜓蜥",
    null,
    "A small forest skink that lives in leaf litter in the hills.",
    "棲息於山區林下落葉層的小型石龍子。",
    { provisional: true },
  ),

  // ── Mammals ──────────────────────────────────────────────────
  "Rattus norvegicus": s(
    "溝鼠",
    "Brown rat",
    "The large rat of drains, markets and riverbanks. It lives alongside people worldwide.",
    "體型大的家鼠，常見於水溝、市場與河岸，與人類共同生活在世界各地。",
    { introduced: true },
  ),
  "Suncus murinus": s(
    "錢鼠",
    "Asian house shrew",
    "A shrew, not a rodent: a small insect-eater found in and around buildings, giving off a musky smell.",
    "鼩鼱而不是老鼠，是吃昆蟲的小型動物，常在建物內外活動，帶有麝香味。",
    { aka: "臭鼩" },
  ),
  "Bandicota indica": s(
    "大偉鼠",
    "Greater bandicoot rat",
    "Taiwan’s largest rat, up to about a kilogram, living in lowland farmland and wasteland where it digs burrows.",
    "臺灣最大型的鼠類，體重可達約一公斤，棲息於低海拔農地與荒地並挖掘洞穴。",
    { aka: "大鬼鼠", provisional: true },
  ),
  "Niviventer coninga": s(
    "臺灣刺鼠",
    "Coxing’s white-bellied rat",
    "A Taiwan endemic rat of broadleaf forest and scrub, most common below about 1,300 m.",
    "臺灣特有的鼠類，棲息於闊葉林與灌叢，海拔約 1,300 公尺以下較常見。",
    { endemic: true },
  ),
  "Rattus losea": s(
    "小黃腹鼠",
    "Lesser rice-field rat",
    "A common rat of lowland fields and grassland, and a crop pest in many places.",
    "低海拔田野與草地常見的鼠類，在許多地方是農作物害鼠。",
  ),
  "Rattus tanezumi": s(
    "亞洲家鼠",
    "Asian house rat",
    "A rat that lives in and around houses and farms across Asia.",
    "在亞洲各地住家與農場周邊生活的鼠類。",
  ),
  "Mus caroli": s(
    "田鼷鼠",
    "Ryukyu mouse",
    "A small field mouse of grassland and lowland farmland, weighing only 10–14 g; the main field mouse of Taiwan’s plains.",
    "體重僅約 10–14 公克的小型田鼠，是臺灣平原田野的主要小型鼠類。",
    { aka: "卡氏小鼠" },
  ),
  "Crocidura tanakae": s(
    "臺灣灰麝鼩",
    "Taiwanese gray shrew",
    "A Taiwan endemic shrew that hunts insects and worms in leaf litter and along field edges.",
    "臺灣特有的鼩鼱，在落葉層與田邊捕食昆蟲與蚯蚓。",
    { endemic: true, provisional: true },
  ),
  "Episoriculus fumidus": s(
    "臺灣煙尖鼠",
    "Taiwanese brown-toothed shrew",
    "A Taiwan endemic shrew of mountain forest, scarce in the records.",
    "臺灣特有的山地尖鼠，紀錄不多。",
    { endemic: true },
  ),
  "Niviventer culturatus": s(
    "高山白腹鼠",
    "Oldfield white-bellied rat",
    "A Taiwan endemic rat of mid- to high-elevation forest.",
    "臺灣特有的鼠類，棲息於中高海拔森林。",
    { endemic: true },
  ),
  "Apodemus semotus": s(
    "臺灣森鼠",
    "Taiwan field mouse",
    "A Taiwan endemic mouse of mountain forests at roughly 1,500–3,500 m. It eats seeds, fruit and small insects and can leap well.",
    "臺灣特有的山地小鼠，分布約 1,500–3,500 公尺，食性包括種子、果實與小昆蟲，彈跳力佳。",
    { endemic: true },
  ),
  "Mus musculus": s(
    "小家鼠",
    "House mouse",
    "The mouse that lives alongside people in homes and warehouses around the world.",
    "與人類共居於住家與倉庫、分布於世界各地的小鼠。",
    { introduced: true },
  ),
  "Anourosorex yamashinai": s(
    "山階氏鼴鼩",
    "Taiwanese mole shrew",
    "A Taiwan endemic shrew with a mole-like build that burrows in mountain soil between about 1,500 and 2,500 m.",
    "臺灣特有的鼩鼱，外形似鼴鼠，在約 1,500–2,500 公尺山區土壤中掘洞。",
    { endemic: true, provisional: true },
  ),
  "Apodemus agrarius": s(
    "黑線姬鼠",
    "Striped field mouse",
    "A field mouse with a dark stripe along the back, living in grassland and farmland edges.",
    "背部有黑色縱線的田鼠，棲息於草地與農田邊緣。",
  ),
  "Micromys minutus": s(
    "巢鼠",
    "Eurasian harvest mouse",
    "One of the smallest rodents in the world. It weaves ball-shaped nests among tall grass stems.",
    "世界上最小的嚙齒類之一，會在高草莖間編織球形的巢。",
  ),
  "Rattus exulans": s(
    "緬甸小鼠",
    "Polynesian rat",
    "A small rat first found in Taiwan around Hualien in 1999, probably carried in by ships.",
    "1999 年首度在花蓮一帶發現的小型鼠類，可能是隨船舶傳入。",
    { introduced: true },
  ),
  "Eothenomys melanogaster": s(
    "臺灣黑腹絨鼠",
    "Père David’s vole",
    "A vole of mountain forest and grassland. Taxonomists now debate whether Taiwan’s animals belong to this species, so check TaiCOL for the current name.",
    "山區森林與草地的絨鼠。分類學者仍在討論臺灣族群是否屬於此種，目前學名請參考 TaiCOL。",
    { provisional: true },
  ),

  // ── Birds ────────────────────────────────────────────────────
  "Columba livia": s(
    "原鴿",
    "Rock dove",
    "The feral pigeon of cities and farmland, descended from domestic pigeons.",
    "城市與農地常見的野化鴿，由家鴿野放後繁衍而來。",
    { aka: "野鴿", introduced: true },
  ),
  "Hirundo rustica": s(
    "家燕",
    "Barn swallow",
    "A migratory swallow that nests under eaves and bridges and hunts insects low over fields and roads.",
    "候鳥性的燕子，在屋簷與橋下築巢，貼近田野與路面低飛捕食昆蟲。",
    { family: "Hirundinidae" },
  ),
  "Pomatorhinus musicus": s(
    "小彎嘴",
    "Taiwan scimitar babbler",
    "A Taiwan endemic babbler of low and mid-elevation forest with a long down-curved bill and a loud, whistling duet.",
    "臺灣特有的畫眉類，棲息於低、中海拔森林，嘴長而下彎，鳴聲清亮、常成對合唱。",
    { endemic: true },
  ),
  "Centropus sinensis": s(
    "番鵑",
    "Greater coucal",
    "A large, long-tailed ground-walking cuckoo that raises its own young, unlike most cuckoos.",
    "體型大、尾長的地棲杜鵑，與多數杜鵑不同，會自己育雛。",
  ),
  "Hirundo tahitica": s(
    "洋燕",
    "Pacific swallow",
    "A resident swallow of towns and coasts that nests on buildings and bridges all year.",
    "留鳥性的燕子，常在建物與橋梁築巢，全年可見。",
    { family: "Hirundinidae" },
  ),
  "Myophonus insularis": s(
    "臺灣紫嘯鶇",
    "Taiwan whistling thrush",
    "A Taiwan endemic glossy blue-black thrush of mountain streams and forest trails.",
    "臺灣特有的藍黑色嘯鶇，棲息於山區溪流與森林步道。",
    { endemic: true },
  ),
  "Ixobrychus cinnamomeus": s(
    "栗小鷺",
    "Cinnamon bittern",
    "A small chestnut-coloured heron of reed beds and flooded fields.",
    "栗紅色的小型鷺類，棲息於蘆葦叢與淹水的田地。",
  ),
  "Ixobrychus sinensis": s(
    "黃小鷺",
    "Yellow bittern",
    "A small buff-yellow heron of reed beds, ponds and rice fields.",
    "淡黃色的小型鷺類，棲息於蘆葦叢、池塘與水田。",
  ),
  "Copsychus saularis": s(
    "鵲鴝",
    "Oriental magpie-robin",
    "A black-and-white songbird of gardens and parks that sings from rooftops and wires.",
    "黑白相間的鳴禽，常在庭園與公園活動，喜歡站在屋頂與電線上鳴唱。",
  ),
  "Dendrocitta formosae": s(
    "樹鵲",
    "Grey treepie",
    "A long-tailed member of the crow family that lives in forests and wooded towns, with a loud harsh call.",
    "屬鴉科、尾巴長，棲息於森林與多樹的聚落，叫聲響亮沙啞。",
  ),
  "Pluvialis fulva": s(
    "太平洋金斑鴴",
    "Pacific golden plover",
    "A shorebird that winters on Taiwan’s coast, fields and wetlands before flying north to breed.",
    "冬季在臺灣海岸、農田與濕地度冬的鴴科水鳥，春季北返繁殖。",
  ),
  "Motacilla tschutschensis": s(
    "東方黃鶺鴒",
    "Eastern yellow wagtail",
    "A migratory wagtail that winters in wet fields and open ground, wagging its tail as it walks.",
    "冬季來臺的鶺鴒，在濕潤農地與開闊地走動時尾巴會上下擺動。",
  ),
  "Alcippe morrisonia": s(
    "繡眼畫眉",
    "Grey-cheeked fulvetta",
    "A small, busy flocking bird of broadleaf forest, often in groups moving through the understorey.",
    "棲息於闊葉林的小型鳥，常成群在林下層穿梭覓食。",
  ),
  "Aplonis panayensis": s(
    "亞洲輝椋鳥",
    "Asian glossy starling",
    "A glossy black starling with red eyes that gathers in flocks in lowland towns and coasts.",
    "紅眼、全身黑亮的椋鳥，在低海拔市區與海岸成群活動。",
  ),
  "Actitis hypoleucos": s(
    "磯鷸",
    "Common sandpiper",
    "A small shorebird that bobs along streams, ponds and coasts.",
    "沿溪流、池塘與海岸邊走邊點頭擺尾的小型水鳥。",
  ),
  "Anthus cervinus": s(
    "紅喉鷚",
    "Red-throated pipit",
    "A winter visitor to open fields and wetland edges.",
    "冬季到訪開闊農田與濕地邊緣的鷚類。",
  ),
  "Cuculus optatus": s(
    "北方中杜鵑",
    "Oriental cuckoo",
    "A migratory cuckoo that passes through Taiwan in spring and autumn and lays its eggs in other birds’ nests.",
    "春秋過境臺灣的杜鵑，把卵產在其他鳥類的巢裡。",
  ),
  "Euodice malabarica": s(
    "銀嘴文鳥",
    "Indian silverbill",
    "A small seed-eating finch, introduced from South Asia, that lives in open grassy areas.",
    "從南亞引入、以種子為食的小型文鳥，棲息於開闊草地。",
    { introduced: true },
  ),
  "Rallus indicus": s(
    "東亞秧雞",
    "Brown-cheeked rail",
    "A shy wetland rail that winters in Taiwan and skulks in dense reeds; seldom seen except when crossing open ground.",
    "冬季來臺、躲藏在濃密蘆葦中的膽小秧雞，除了穿越開闊地面時很少被看到。",
    { family: "Rallidae" },
  ),
  "Clamator coromandus": s(
    "紅翅鳳頭鵑",
    "Chestnut-winged cuckoo",
    "A crested migrant cuckoo that appears in spring.",
    "春季過境的有冠杜鵑。",
  ),
  "Fringilla montifringilla": s(
    "花雀",
    "Brambling",
    "A northern finch that visits Taiwan only in occasional winters.",
    "只在部分冬季偶然南下到臺灣的北方雀鳥。",
    { family: "Fringillidae" },
  ),
  "Myophonus caeruleus": s(
    "紫嘯鶇",
    "Blue whistling thrush",
    "A large dark thrush of mountain streams; in Taiwan most birds belong to the endemic whistling thrush.",
    "棲息於山溪的大型黑藍色嘯鶇；臺灣的族群多已獨立為臺灣紫嘯鶇。",
    { provisional: true },
  ),
  "Phalaropus lobatus": s(
    "紅領瓣足鷸",
    "Red-necked phalarope",
    "A small migrant shorebird that spins on the water to stir up food.",
    "過境的小型水鳥，會在水面旋轉以攪起食物。",
  ),
  "Sturnia sinensis": s(
    "灰背椋鳥",
    "White-shouldered starling",
    "A grey starling with white shoulders that visits farmland and gardens.",
    "肩部有白斑的灰色椋鳥，常到農田與庭園活動。",
  ),
  "Acrocephalus orientalis": s(
    "大葦鶯",
    "Oriental reed warbler",
    "A migratory warbler of reed beds and wetland edges.",
    "棲息於蘆葦叢與濕地邊緣的過境鶯類。",
    { family: "Acrocephalidae" },
  ),
  "Columba pulchricollis": s(
    "灰林鴿",
    "Ashy wood pigeon",
    "A forest pigeon of the mid and upper mountains, rarely seen near towns.",
    "棲息於中高海拔森林的鴿類，很少出現在聚落附近。",
  ),
  "Copsychus malabaricus": s(
    "白腰鵲鴝",
    "White-rumped shama",
    "A long-tailed forest songbird, famous for its song, mostly introduced or escaped in Taiwan.",
    "尾羽很長、以歌聲聞名的林棲鳥，在臺灣多為外來或逸出個體。",
    { introduced: true },
  ),
  "Dicrurus macrocercus": s(
    "大卷尾",
    "Black drongo",
    "A glossy black bird with a forked tail that perches on wires and fence posts over farmland, catching insects.",
    "尾巴分叉、全身黑亮的鳥，常停在農地的電線與柵欄上捕食昆蟲。",
  ),
  "Ficedula narcissina": s(
    "黃眉黃鶲",
    "Narcissus flycatcher",
    "A bright yellow-and-black migrant flycatcher that passes through in spring and autumn.",
    "黃黑相間的鮮豔過境鶲，春秋兩季經過臺灣。",
  ),
  "Gallinago stenura": s(
    "針尾鷸",
    "Pin-tailed snipe",
    "A well-camouflaged migrant snipe of wet fields and marshes.",
    "偽裝良好的過境鷸，棲息於潮濕農田與沼澤。",
  ),
  "Gracupica nigricollis": s(
    "黑領椋鳥",
    "Black-collared starling",
    "A black-and-white starling that is now established in parts of lowland Taiwan.",
    "黑白相間的椋鳥，已在臺灣部分低海拔地區建立族群。",
    { introduced: true },
  ),
  "Locustella alishanensis": s(
    "臺灣叢樹鶯",
    "Taiwan bush warbler",
    "A Taiwan endemic warbler of high-mountain grass and scrub that is heard far more often than seen.",
    "臺灣特有的高山鶯類，棲息於草叢與灌叢，聽到的機會遠多於看到。",
    { endemic: true, family: "Locustellidae" },
  ),
  "Locustella lanceolata": s(
    "矛斑蝗鶯",
    "Lanceolated warbler",
    "A streaky migrant warbler that creeps through low, dense cover.",
    "身上有縱斑的過境鶯類，在低矮濃密的草叢中穿行。",
    { family: "Locustellidae" },
  ),
  "Merops philippinus": s(
    "栗喉蜂虎",
    "Blue-tailed bee-eater",
    "A colourful bee-eater that nests in sandy banks and hunts flying insects over open land.",
    "色彩鮮豔的蜂虎，在沙質河岸築巢，在開闊地上空捕食飛蟲。",
  ),
  "Motacilla alba": s(
    "白鶺鴒",
    "White wagtail",
    "A black, white and grey wagtail of rivers, fields and car parks.",
    "黑、白、灰相間的鶺鴒，常見於河岸、農田與停車場。",
  ),
  "Nymphicus hollandicus": s(
    "玄鳳鸚鵡",
    "Cockatiel",
    "A pet parrot from Australia; records are of escaped birds.",
    "原產澳洲的寵物鸚鵡，紀錄為逸出個體。",
    { introduced: true, family: "Cacatuidae" },
  ),
  "Pnoepyga formosana": s(
    "臺灣鷦鶯",
    "Taiwan wren-babbler",
    "A tiny tailless Taiwan endemic of damp mountain forest floors, very hard to see.",
    "臺灣特有的小型無尾鳥，棲息於潮濕山區林下，很不容易看見。",
    { endemic: true, family: "Pnoepygidae", provisional: true },
  ),
  "Recurvirostra avosetta": s(
    "反嘴鴴",
    "Pied avocet",
    "A black-and-white shorebird with an upturned bill that sweeps shallow water for food.",
    "黑白相間、嘴上翹的水鳥，在淺水區左右掃動覓食。",
  ),
  "Scolopax rusticola": s(
    "丘鷸",
    "Eurasian woodcock",
    "A forest-floor wader with superb leaf-litter camouflage that winters in Taiwan.",
    "在林下活動的水鳥，保護色與落葉極為相近，冬季來臺。",
  ),
  "Xenus cinereus": s(
    "反嘴鷸",
    "Terek sandpiper",
    "A migrant shorebird with an upturned bill that runs along mudflats.",
    "嘴微微上翹的過境水鳥，在泥灘上奔跑覓食。",
  ),

  // ── Freshwater and shore crabs ─────────────────────────────
  "Geothelphusa olea": s(
    "黃綠澤蟹",
    null,
    "A small freshwater crab of Taiwan’s streams. Most Geothelphusa species live nowhere else.",
    "臺灣溪流中的小型淡水蟹；澤蟹屬多數種類只分布在臺灣。",
    { endemic: true },
  ),
  "Geothelphusa tsayae": s(
    "蔡氏澤蟹",
    null,
    "A freshwater crab recorded in the hills of Kaohsiung, in southern Taiwan.",
    "記錄於南臺灣高雄山區的淡水蟹。",
    { endemic: true },
  ),
  "Geothelphusa albogilva": s(
    "黃灰澤蟹",
    null,
    "A freshwater crab of Taiwan’s streams.",
    "臺灣溪流中的淡水蟹。",
    { endemic: true },
  ),
  "Geothelphusa ancylophallus": s(
    "厚圓澤蟹",
    null,
    "A freshwater crab of Taiwan’s streams.",
    "臺灣溪流中的淡水蟹。",
    { endemic: true },
  ),
  "Geothelphusa bicolor": s(
    "雙色澤蟹",
    null,
    "A freshwater crab of Taiwan’s streams.",
    "臺灣溪流中的淡水蟹。",
    { endemic: true },
  ),
  "Geothelphusa cinerea": s(
    "灰甲澤蟹",
    null,
    "A freshwater crab of Taiwan’s streams.",
    "臺灣溪流中的淡水蟹。",
    { endemic: true },
  ),
  "Geothelphusa candidiensis": s(
    "日月潭澤蟹",
    null,
    "A freshwater crab named for the Sun Moon Lake area.",
    "以日月潭一帶命名的淡水蟹。",
    { endemic: true },
  ),
  "Geothelphusa monticola": s(
    "高山澤蟹",
    null,
    "A freshwater crab of high-elevation streams.",
    "棲息於高海拔溪流的淡水蟹。",
    { endemic: true },
  ),
  "Candidiopotamon rathbunae": s(
    "拉氏清溪蟹",
    null,
    "A large freshwater crab that lives in burrows near streams and wanders across roads after rain.",
    "在溪邊挖洞居住的大型淡水蟹，雨後會爬過道路。",
    { endemic: true },
  ),
  "Ocypode ceratophthalmus": s(
    "角眼沙蟹",
    "Horn-eyed ghost crab",
    "A fast, pale crab that digs burrows in sandy beaches above the tide line and comes out at night.",
    "動作迅速的淡色沙蟹，在潮線以上的沙灘挖洞，夜間外出活動。",
  ),
};

export const roadNotes: Record<string, Localized> = {
  Amphibia: {
    en: "Frogs and toads cross roads on warm, wet nights to reach ponds and streams for breeding, and many rest on warm asphalt.",
    zh: "蛙類與蟾蜍在溫暖潮濕的夜晚穿越道路前往池塘與溪流繁殖，也常停在溫熱的柏油路面上。",
  },
  Reptilia: {
    en: "Snakes and lizards warm themselves on asphalt and cross roads while hunting, so roads that cut through their habitat show up in the records.",
    zh: "蛇與蜥蜴會在柏油路面取暖，也會在覓食時穿越道路，因此穿過棲地的道路容易出現紀錄。",
  },
  Aves: {
    en: "Birds are struck when flying low across roads, feeding on roadside insects or seeds, or scavenging carcasses.",
    zh: "鳥類多在低飛穿越道路、啄食路旁昆蟲或種子、或取食其他動物屍體時被撞。",
  },
  Mammalia: {
    en: "Small mammals cross roads between fields, drains and hedgerows; many rat and shrew records mostly show where roads cut through farmland.",
    zh: "小型哺乳類在田野、水溝與樹籬之間穿越道路；許多鼠類與鼩鼱的紀錄反映的是道路切過農地的位置。",
  },
  Malacostraca: {
    en: "Crabs move between streams, forests and the shore and are slow on open ground, especially after rain.",
    zh: "蟹類在溪流、森林與海岸之間移動，在開闊地面上行動緩慢，雨後尤其明顯。",
  },
};

export const familyZh: Record<string, string> = {
  Bufonidae: "蟾蜍科",
  Dicroglossidae: "叉舌蛙科",
  Rhacophoridae: "樹蛙科",
  Ranidae: "赤蛙科",
  Hylidae: "樹蟾科",
  Microhylidae: "狹口蛙科",
  Colubridae: "游蛇科",
  Scincidae: "石龍子科",
  Pareatidae: "鈍頭蛇科",
  Gekkonidae: "壁虎科",
  Muridae: "鼠科",
  Soricidae: "尖鼠科",
  Cricetidae: "倉鼠科",
  Columbidae: "鳩鴿科",
  Hirundinidae: "燕科",
  Cuculidae: "杜鵑科",
  Timaliidae: "畫眉科",
  Muscicapidae: "鶲科",
  Ardeidae: "鷺科",
  Corvidae: "鴉科",
  Charadriidae: "鴴科",
  Motacillidae: "鶺鴒科",
  Sturnidae: "椋鳥科",
  Scolopacidae: "鷸科",
  Estrildidae: "梅花雀科",
  Rallidae: "秧雞科",
  Fringillidae: "燕雀科",
  Dicruridae: "卷尾科",
  Meropidae: "蜂虎科",
  Cacatuidae: "美冠鸚鵡科",
  Recurvirostridae: "長腳鷸科",
  Potamidae: "溪蟹科",
  Ocypodidae: "沙蟹科",
  Apodidae: "雨燕科",
  Emberizidae: "鵐科",
  Psittacidae: "鸚鵡科",
  Sylviidae: "鶯科",
  Xenodermatidae: "瘰鱗蛇科",
  Acrocephalidae: "葦鶯科",
  Locustellidae: "蝗鶯科",
  Pnoepygidae: "鱗胸鷦鷯科",
};

export function findSpeciesInfo(scientificName: string | null | undefined) {
  return scientificName ? speciesInfo[scientificName] : undefined;
}

/** One line for selects and plain-text lists: "黑眶蟾蜍 · Asian common toad". */
export function speciesLabel(
  scientificName: string,
  language: "en" | "zh",
): string {
  const info = findSpeciesInfo(scientificName);
  if (!info) return scientificName;
  const names = language === "zh" ? [info.zh, info.en] : [info.en, info.zh];
  const first = names.filter(Boolean).join(" · ");
  return first ? `${first} (${scientificName})` : scientificName;
}

/** Short form: the common name in the reader's language, or the scientific name. */
export function speciesShortName(
  scientificName: string,
  language: "en" | "zh",
): string {
  const info = findSpeciesInfo(scientificName);
  if (!info) return scientificName;
  return (
    (language === "zh" ? info.zh || info.en : info.en || info.zh) ||
    scientificName
  );
}
