import { bindThis } from "@/decorators.js";
import Module from '@/module.js';
import { WebSocket } from "ws";

const USE_TEST_DATA = false;

interface EQ {
  code: 551; //地震情報決め打ち
	earthquake: earthquake; //本文
	id: string; //ID
	issue: issue; //発表元の情報
	points: points[]; //震度観測点情報
	time: string; //受信日時
}

interface issue {
	source: string; //発表元
	time: string; //発表日時
	type: string; //発表種類
	correct: string; //訂正の有無
}

interface earthquake {
	time: string; //発生日時
	hypocenter: hypocenter; //震源情報
	maxScale: number; //最大震度
	domesticTsunami: string; //国内での津波の有無
	foreignTsunami: string; //海外での津波の有無
}

interface hypocenter {
	name: string; //震源地点名
	latitude: number; //緯度
	longitude: number; //経度
	depth: number; //深さ
	magnitude: number; //マグニチュード
}

interface points {
	pref: string; //都道府県名
	addr: string; //震度観測点名
	isArea: boolean; //区域名かどうか
	scale: number; //震度
}


const intensityMap: { [key: number]: string } = {
  10: '1',
  20: '2',
  30: '3',
  40: '4',
  45: '5弱',
  50: '5強',
  55: '6弱',
  60: '6強',
  70: '7'
};

function getMaxIntensityLabel(intensity: number): string {
  if (intensity === -1) {
    return '--';
  }
	return intensityMap[intensity];
}

function getPointsIntensityLabel(intensity: number): string {
	return intensityMap[intensity];
}

const domesticTsunamiMap: { [key: string]: string } = {
	"None": "この地震による津波の心配はありません。",
	"Unknown": "この地震による津波の可能性は不明です。",
	"NonEffective": "この地震で若干の海面変動が予想されますが、被害の心配はありません。",
	"Watch": "津波注意報が発令されています。",
	"Warning": "津波警報もしくは大津波警報が発令されています。"
}

const foreignTsunamiMap: { [key: string]: string } = {
	"None": "この地震による津波の心配はありません。",
	"Unknown": "この地震による津波の可能性は不明です。",
	"checking": "この地震による津波の可能性は調査中です。",
	"NonEffectiveNearby": "震源の近傍で小さな津波が発生する可能性がありますが、被害の心配はありません。",
	"WarningNearby": "震源の近傍で津波の可能性があります。",
	"WarningPacific": "太平洋で津波の可能性があります。",
	"WarningPacificWide": "太平洋の広域で津波の可能性があります。",
	"WarningIndian": "インド洋で津波の可能性があります。",
	"WarningIndianWide": "インド洋の広域で津波の可能性があります。",
	"Potential": "一般的にこの規模の地震では津波が発生する可能性があります。"
}

function getDomesticTsunamiLabel(dtsunami: string): string {
	return domesticTsunamiMap[dtsunami];
}

function getForeignTsunamiLabel(ftsunami: string): string {
	return foreignTsunamiMap[ftsunami];
}

export default class extends Module {
	public readonly name = 'jma_eq';
	private message: string = '';

  @bindThis
	public install() {
		this.createWebSocketConnection();

		return {};
	}
	

  @bindThis
	private createWebSocketConnection() {
		const ws = USE_TEST_DATA ? new WebSocket('ws://localhost:8081')  : new WebSocket('wss://api.p2pquake.net/v2/ws');

		ws.on('open', () => {
			console.log('WebSocket connection established.');
		});
	
		ws.on('message', (data: string) => {
			this.handleWebSocketMessage(data);
		});
	
		ws.on('close', () => {
			console.log('WebSocket connection closed. Reconnecting...');
			setTimeout(this.createWebSocketConnection, 5000);
		});
	
		ws.on('error', (error) => {
			console.error('WebSocket error:', error);
		});
	}

	@bindThis
	private handleWebSocketMessage(rawDataString: string) {
    let rawDataJSON;
    try {
      rawDataJSON = JSON.parse(rawDataString);
    } catch (error) {
      console.error('Failed to parse JSON:', error);
      return;
    }

    // 受信データが配列の場合、最初の要素にアクセスする
    if (Array.isArray(rawDataJSON) && rawDataJSON.length > 0) {
      rawDataJSON = rawDataJSON[0];
    }

    if (rawDataJSON.code === 551) {
      console.log('Received Data:', rawDataJSON);
    } else {
      console.log('地震情報じゃないデータを受電したよ', rawDataJSON.code);
      return;
    }

		const data: EQ = {
			code: rawDataJSON.code,
			earthquake: rawDataJSON.earthquake,
			id: rawDataJSON.id,
			issue: rawDataJSON.issue,
			points: rawDataJSON.points,
			time: rawDataJSON.time,
		}

		console.log(data.earthquake.hypocenter.name);

		const maxIntensityValue = getMaxIntensityLabel(data.earthquake.maxScale);
		const domesticTsunamiValue = getDomesticTsunamiLabel(data.earthquake.domesticTsunami);
		const foreignTsunamiValue = getForeignTsunamiLabel(data.earthquake.foreignTsunami);

		const intensityPointsMap: { [key: number]: { [pref: string]: Set<string> } } = {
			10: {}, // 震度1
			20: {}, // 震度2
			30: {}, // 震度3
			40: {}, // 震度4
			45: {}, // 震度5弱
			50: {}, // 震度5強
			55: {}, // 震度6弱
			60: {}, // 震度6強
			70: {}, // 震度7
		};
		// 各震度に対するポイントをまとめる
		for (const point of data.points) {
			const { scale, pref, addr, isArea } = point;
	
			if (isArea) {
				// isAreaがtrueの場合はaddrをそのまま追加
				if (!intensityPointsMap[scale][pref]) {
					intensityPointsMap[scale][pref] = new Set<string>();
				}
				intensityPointsMap[scale][pref].add(addr);
			} else {
				// isAreaがfalseの場合は市区町村名を抽出して追加
				const cityname = addr.match(/(?:旭川|伊達|石狩|盛岡|奥州|田村|南相馬|那須塩原|東村山|武蔵村山|羽村|十日町|上越|富山|野々市|大町|蒲郡|四日市|姫路|大和郡山|廿日市|下松|岩国|田川|大村)市|(?:玉村|大町)町|.+?[市区町村]/)?.[0];
				if (cityname) {
					if (!intensityPointsMap[scale][pref]) {
						intensityPointsMap[scale][pref] = new Set<string>();
					}
					intensityPointsMap[scale][pref].add(cityname);
				}
			}
		}
	
		// 重複を排除し、より大きな震度に統合する
		const mergedPointsMap: { [pref: string]: { [city: string]: number } } = {};
	
		for (const scale in intensityPointsMap) {
			const scaleNum = Number(scale);
			if (intensityPointsMap.hasOwnProperty(scale)) {
				const prefectures = intensityPointsMap[scaleNum];
				for (const pref in prefectures) {
					if (prefectures.hasOwnProperty(pref)) {
						const cities = prefectures[pref];
						if (!mergedPointsMap[pref]) {
							mergedPointsMap[pref] = {};
						}
						cities.forEach(city => {
							if (!mergedPointsMap[pref][city] || mergedPointsMap[pref][city] < scaleNum) {
								mergedPointsMap[pref][city] = scaleNum;
							}
						});
					}
				}
			}
		}
	
		// 各震度に対する情報を生成
		let formattedPoints = '';
		const processedScales: Set<number> = new Set();
	
		Object.keys(intensityMap).map(Number).sort((a, b) => b - a).forEach(scale => {
			const intensityLabel = getPointsIntensityLabel(scale);
			const prefCityMap: { [pref: string]: string[] } = {};
	
			Object.keys(mergedPointsMap).forEach(pref => {
				const cities = mergedPointsMap[pref];
				for (const city in cities) {
					if (cities[city] === scale) {
						if (!prefCityMap[pref]) {
							prefCityMap[pref] = [];
						}
						prefCityMap[pref].push(city);
					}
				}
			});
	
			if (Object.keys(prefCityMap).length > 0) {
				formattedPoints += (intensityLabel === '1' ? `$[bg.color=54BDFE $[fg.color=000 **震度 ${intensityLabel}　　　　　**]]\n` :
				intensityLabel === '2' ? `$[bg.color=8AD05C $[fg.color=000 **震度 ${intensityLabel}　　　　　**]]\n` :
				intensityLabel === '3' ? `$[bg.color=F4DB7E $[fg.color=000 **震度 ${intensityLabel}　　　　　**]]\n` :
				intensityLabel === '4' ? `$[bg.color=FF793C $[fg.color=000 **震度 ${intensityLabel}　　　　　**]]\n` :
				intensityLabel === '5弱' ? `$[bg.color=B80C22 $[fg.color=FFF **震度 ${intensityLabel}　　　　**]]\n` :
				intensityLabel === '5強' ? `$[bg.color=B80C22 $[fg.color=FFF **震度 ${intensityLabel}　　　　**]]\n` :
				intensityLabel === '6弱' ? `$[bg.color=FDCAD9 $[fg.color=A90625 **震度 ${intensityLabel}　　　　**]]\n` :
				intensityLabel === '6強' ? `$[bg.color=FDCAD9 $[fg.color=A90625 **震度 ${intensityLabel}　　　　**]]\n` :
				`$[bg.color=AE101E $[fg.color=FFF $[border.style=outset,width=4,color=FEEC8A **震度 ${intensityLabel}　　　　　**]]]\n`
				);
				Object.keys(prefCityMap).forEach(pref => {
					const cityList = prefCityMap[pref].join(' ');
					formattedPoints += `${pref}: ${cityList}\n`;
				});
			}
		});
		
		const OriginTime = new Date(data.earthquake.time);

		if (data.code === 551 && data.points.length === 0) {
			this.log("震度の情報がないよ。");
		} else if (data.code === 551) {
			this.message = `発生時刻: ${OriginTime.getMonth()}月${OriginTime.getDay()}日 ${OriginTime.getHours()}時${OriginTime.getMinutes()}分ごろ\n震源地: ${data.earthquake.hypocenter.name === "" ? "--" : data.earthquake.hypocenter.name}\n震源の深さ: ${data.earthquake.hypocenter.depth === 0 ? "ごく浅い" : data.earthquake.hypocenter.depth === -1 ? "--" : data.earthquake.hypocenter.depth + " km"}\n地震の規模: M${data.earthquake.hypocenter.magnitude === -1 ? "--" : data.earthquake.hypocenter.magnitude.toFixed(1)}\n${maxIntensityValue === '1' ? `$[bg.color=54BDFE $[fg.color=000 最大震度: ${maxIntensityValue}]]` : maxIntensityValue === '2' ? `$[bg.color=8AD05C $[fg.color=000 最大震度: ${maxIntensityValue}]]` : maxIntensityValue === '3' ? `$[bg.color=F4DB7E $[fg.color=000 最大震度: ${maxIntensityValue}]]` : maxIntensityValue === '4' ? `$[bg.color=FF793C $[fg.color=000 最大震度: ${maxIntensityValue}]]` : maxIntensityValue === '5弱' ? `$[bg.color=B80C22 $[fg.color=FFF 最大震度: ${maxIntensityValue}]]` : maxIntensityValue === '5弱' ? `$[bg.color=B80C22 $[fg.color=FFF 最大震度: ${maxIntensityValue}]]` : maxIntensityValue === '6弱' ? `$[bg.color=FDCAD9 $[fg.color=A90625 最大震度: ${maxIntensityValue}]]` : maxIntensityValue === '6強' ? `$[bg.color=FDCAD9 :  $[fg.color=A90625 最大震度: ${maxIntensityValue}]]` :maxIntensityValue === '7' ? `$[bg.color=AE101E $[fg.color=FFF $[border.style=outset,width=4,color=FEEC8A  最大震度: ${maxIntensityValue}]]]` : `$[bg.color=C6C6C6 $[fg.color=000 最大震度: ${maxIntensityValue}]]`}\n${domesticTsunamiValue || foreignTsunamiValue}\n\n各地の震度は次の通りです。\n\n${formattedPoints}\n#tenka_eq`
		} else {
			console.log('なんもないよ');
		}

		if (this.message && (data.earthquake.maxScale <= 40 && data.earthquake.hypocenter.magnitude < 6)) {
			this.ai.post({
				cw: '[EQ]地震があったみたいだよ。',
				visibility: 'home',
				text: this.message,
			})
		} else if (this.message && (data.earthquake.maxScale >= 45 || data.earthquake.hypocenter.magnitude >= 6)){
			this.ai.post({
				cw: '[EQ]大きめの地震があったみたいだよ。大丈夫だった？',
				visibility: 'home',
				text: this.message,
			})
		};
	}
}
