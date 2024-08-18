import { bindThis } from "@/decorators.js";
import Module from '@/module.js';
import { WebSocket } from "ws";

const USE_TEST_DATA = false;

interface EEW {
  Type: 'jma_eew'; //情報タイプ(固定)
	Title: string; //タイトル
	CodeType: string; //EEWの種別
	Issue: Issue; //発表元, ステータス
	EventID: string; //イベントID ""で囲われているのでstringだけど多分yyyymmddhhmmss形式
	Serial: string; // 第n報 最終報はstringで'final'となるので、とりあえずstring型 最終報がないときもある
	AnnoucementTime: string; //発報時刻
	OriginTime: string; //発生時刻
  Hypocenter: string; // 震源地
	Latitude: number;	//緯度
	Longtitude: number; //経度
	Magunitude: number; //マグニチュード
	Depth: number; //深さ
	MaxIntensity: string;	//最大震度
	Accuracy: Accuracy; //計測方法
	MaxIntChange: MaxIntChange; //最大震度の変動
	WarnArea: Array<WarnArea> | []; //警報発表時の発令地域(予想震度4以上)
	isSea: boolean; //海域の地震かどうか
	isTraining: boolean; //訓練か否か
	isAssumption: boolean; //震源を推定するか(PLUM法では震源を推定しない)
	isWarn: boolean; //警報(最大震度5弱以上)かどうか
	isFinal: boolean; //最終報か否か
	isCancel: boolean; //キャンセル報か否か
	OriginalText: string; //生の電文データ
}

interface Issue {
	Source: string; //発表元
	Status: string; //送信状況
}

interface Accuracy {
	Epicenter: string; //算出方法(震源)
	Depth: string; //算出方法(深さ)
	Magunitude: string; //算出方法(マグニチュード)
}

interface MaxIntChange {
	String: string; //最大震度は変化したか？
	Reason: string; //変化した場合、理由は？
}

interface WarnArea {
	Chiiki: string; //警報区分
	Shindo1: string; //最大震度
	Shindo2: string; //考えうる最小震度
	Time: string; //発表時間
	Type: "予報" | "警報"; //予報 or 警報？
	Arrive: boolean; //到達済み？
}

const intensityMap: { [key: string]: number } = {
  '1': 10,
  '2': 20,
  '3': 30,
  '4': 40,
  '5弱': 50,
  '5強': 51,
  '6弱': 60,
  '6強': 61,
  '7': 70
};

function getIntensityValue(intensity: string): number {
  return intensityMap[intensity] || 0;
}


export default class extends Module {
	public readonly name = 'jma_eew';
	private message: string = '';

  @bindThis
	public install() {
		this.createWebSocketConnection();

		return {};
	}
	

  @bindThis
	private createWebSocketConnection() {
		const ws = USE_TEST_DATA ? new WebSocket('ws://localhost:8080') : new WebSocket('wss://ws-api.wolfx.jp/jma_eew');

		ws.on('open', () => {
			this.log('WebSocket connection established.');
		});
	
		ws.on('message', (data: string) => {
			this.handleWebSocketMessage(data);
		});
	
		ws.on('close', () => {
			this.log('WebSocket connection closed. Reconnecting...');
			setTimeout(this.createWebSocketConnection, 5000);
		});
	
		ws.on('error', (error) => {
			console.error('WebSocket error:', error);
		});
	}


	@bindThis
	private handleWebSocketMessage(rawDataString: string) {
		this.message = '';
    const rawDataJSON = JSON.parse(rawDataString);

		const data: EEW = {
			Type: 'jma_eew',
			Title: rawDataJSON.Title,
			CodeType: rawDataJSON.CodeType,
			Issue: rawDataJSON.Issue,
			EventID: rawDataJSON.EventID,
			Serial: rawDataJSON.isCancel ? 'キャンセル報' : rawDataJSON.isFinal ? `第${rawDataJSON.Serial}報(最終報)` : `第${rawDataJSON.Serial}報`,
			AnnoucementTime: rawDataJSON.AnnoucementTime,
			OriginTime: rawDataJSON.OriginTime,
			Hypocenter: rawDataJSON.Hypocenter,
			Latitude: rawDataJSON.Latitude,
			Longtitude: rawDataJSON.Longtitude,
			Magunitude: rawDataJSON.Magunitude,
			Depth: rawDataJSON.Depth,
			MaxIntensity: rawDataJSON.MaxIntensity,
			Accuracy: rawDataJSON.Accuracy,
			MaxIntChange: rawDataJSON.MaxIntChange,
			WarnArea: rawDataJSON.WarnArea,
			isSea: rawDataJSON.isSea,
			isTraining: rawDataJSON.isTraining,
			isAssumption: rawDataJSON.isAssumption,
			isWarn: rawDataJSON.isWarn,
			isFinal: rawDataJSON.isFinal,
			isCancel: rawDataJSON.isCancel,
			OriginalText: rawDataJSON.OriginalText,			
		}

		if (data.isCancel) {
			this.message = `\n$[bg.color=F4DB7E $[fg.color=000 --- 緊急地震速報(キャンセル報) ---]]\n${data.Serial}\n発生時刻: --\n震源: --\n震源の深さ: --km\nマグニチュード: M--\n予想最大震度: --\n\n#tenka_eew`;
		} else if (data.Title === '緊急地震速報（予報）') {
			this.message = `\n$[bg.color=54BDFE $[fg.color=000 --- 緊急地震速報(予報) ---]]\n${data.Serial}\n発生時刻: <plain>${data.OriginTime}</plain>\n震源: ${data.Hypocenter}\n震源の深さ: ${data.Depth}km\nマグニチュード: M${data.Magunitude.toFixed(1)}\n${data.MaxIntensity === '1' ? `$[bg.color=54BDFE $[fg.color=000 予想最大震度: ${data.MaxIntensity}]]` : data.MaxIntensity === '2' ? `$[bg.color=8AD05C $[fg.color=000 予想最大震度: ${data.MaxIntensity}]]` : data.MaxIntensity === '3' ? `$[bg.color=F4DB7E $[fg.color=000 予想最大震度: ${data.MaxIntensity}]]` : data.MaxIntensity === '4' ? `$[bg.color=FF793C $[fg.color=000 予想最大震度: ${data.MaxIntensity}]]` : data.MaxIntensity === '5弱' ? `$[bg.color=B80C22 $[fg.color=FFF 予想最大震度: ${data.MaxIntensity}]]` : data.MaxIntensity === '5強' ? `$[bg.color=B80C22 $[fg.color=FFF 予想最大震度: ${data.MaxIntensity}]]` : data.MaxIntensity === '6弱' ? `$[bg.color=FDCAD9 $[fg.color=A90625 予想最大震度: ${data.MaxIntensity}]]` : data.MaxIntensity === '6強' ? `$[bg.color=FDCAD9 :  $[fg.color=A90625 予想最大震度: ${data.MaxIntensity}]]` :data.MaxIntensity === '7' ? `$[bg.color=AE101E $[fg.color=FFF $[border.style=outset,width=4,color=FEEC8A 予想最大震度: ${data.MaxIntensity}]]]` : `$[bg.color=C6C6C6 $[fg.color=000 予想最大震度: ${data.MaxIntensity}]]`}\n\n#tenka_eew`;
		} else if (data.Title === '緊急地震速報（警報）') {
			this.message = `\n$[bg.color=B80C22 --- 緊急地震速報(警報) ---]\n$[bg.color=B80C22 強い揺れに警戒してください]\n${data.Serial}\n発生時刻: <plain>${data.OriginTime}</plain>\n震源: ${data.Hypocenter}\n震源の深さ: ${data.Depth}km\nマグニチュード: M${data.Magunitude.toFixed(1)}\n${data.MaxIntensity === '1' ? `$[bg.color=54BDFE $[fg.color=000 予想最大震度: ${data.MaxIntensity}]]` : data.MaxIntensity === '2' ? `$[bg.color=8AD05C $[fg.color=000 予想最大震度: ${data.MaxIntensity}]]` : data.MaxIntensity === '3' ? `$[bg.color=F4DB7E $[fg.color=000 予想最大震度: ${data.MaxIntensity}]]` : data.MaxIntensity === '4' ? `$[bg.color=FF793C $[fg.color=000 予想最大震度: ${data.MaxIntensity}]]` : data.MaxIntensity === '5弱' ? `$[bg.color=B80C22 $[fg.color=FFF 予想最大震度: ${data.MaxIntensity}]]` : data.MaxIntensity === '5強' ? `$[bg.color=B80C22 $[fg.color=FFF 予想最大震度: ${data.MaxIntensity}]]` : data.MaxIntensity === '6弱' ? `$[bg.color=FDCAD9 $[fg.color=A90625 予想最大震度: ${data.MaxIntensity}]]` : data.MaxIntensity === '6強' ? `$[bg.color=FDCAD9 :  $[fg.color=A90625 予想最大震度: ${data.MaxIntensity}]]` :data.MaxIntensity === '7' ? `$[bg.color=AE101E $[fg.color=FFF $[border.style=outset,width=4,color=FEEC8A 予想最大震度: ${data.MaxIntensity}]]]` : `$[bg.color=C6C6C6 $[fg.color=000 予想最大震度: ${data.MaxIntensity}]]`}\n\n#tenka_eew`;
		} else {
			this.log('なんもないよ')
		}

		if (data.isCancel) {
			this.ai.post({
				cw: '[EEW]緊急地震速報がキャンセルされたみたい。',
				visibility: 'home',
				text: this.message,
			})
		} else if (data.Title === '緊急地震速報（予報）' && data.Magunitude < 6) {
			this.ai.post({
				cw: '[EEW]地震が起きたみたい。',
				visibility: 'home',
				text: this.message,
			})
		} else if (data.Title === '緊急地震速報（警報）' || data.Magunitude >= 6) {
			this.ai.post({
				cw: '[EEW]大きめの地震が起きたかも。気をつけてね。',
				visibility: 'home',
				text: this.message,
			})
		}
	}
}
