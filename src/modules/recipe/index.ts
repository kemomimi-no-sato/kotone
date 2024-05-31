import { bindThis } from '@/decorators.js';
import Module from '@/module.js';
import Message from '@/message.js';
import iconv from 'iconv-lite';
import { JSDOM } from 'jsdom';

export default class extends Module {
	public readonly name = 'recipe';

  @bindThis
		public install() {
			return {
				mentionHook: this.mentionHook,
			};
		}

	@bindThis
	private async mentionHook(msg: Message): Promise<boolean> {
		if (msg.text && msg.text.includes('ごはん')) {
			// 1~2535111の適当な数字を取得
			const randomNumber = Math.floor(Math.random() * 2535111) + 1;
			const url = `
			recipe/${randomNumber}`;
			// testUrlして、200以外なら再取得
			const res = await fetch(url);
			if (res.status !== 200) {
				return this.mentionHook(msg);
			} else {
				// jsdomを利用してレシピのタイトルを取得
				const dom = new JSDOM(await res.text());
				// @ts-ignore
				let title = dom.window.document.querySelector('h1.recipe-title').textContent;
				// titleから改行を除く
				title = title!.replace(/\n/g, '');
				msg.reply(`こんなのどう？> [${title}](${url})`, {
					immediate: true,
				});
				return true;
			}
		} else if (msg.text && msg.includes(['おつまみ', 'おやつ'])){
			const randomNumber = Math.floor(Math.random() * 2730) + 1;
			const paddedNumber = randomNumber.toString().padStart(10, '0');
			const url = `https://www.asahibeer.co.jp/enjoy/recipe/search/recipe.psp.html?CODE=${paddedNumber}`
			const res = await fetch(url);
			if (res.status !== 200) {
				return this.mentionHook(msg);
			} else {
				const buffer = await res.arrayBuffer();
				// 取得したデータをShift_JISとしてデコード
				const html = iconv.decode(Buffer.from(buffer), 'Shift_JIS');
				const dom = new JSDOM(html);
				// @ts-ignore
				let title = dom.window.document.querySelector('h1#h1ttl').textContent;
				const encodedTitleBuffer = iconv.encode(title, 'Shift_JIS');
				// バッファを文字列に変換（ここではShift JISエンコーディングでの表現）
				const encodedTitle = iconv.decode(encodedTitleBuffer, 'Shift_JIS');
				msg.reply(`こんなのどう？お酒が飲めなくてもおやつ感覚で食べられると思うよ。> [${encodedTitle}](${url})`, {
					immediate: true,
				});
				return true;
			}
		}
		return false;
	}
}
