import { bindThis } from '@/decorators.js';
import Module from '@/module.js';
import serifs from '@/serifs.js';
import { genItem } from '@/vocabulary.js';
import config from '@/config.js';
import type { User } from '@/misskey/user.js';

export default class extends Module {
	public readonly name = 'noting';
	private myUserId: string | null = null;

	@bindThis
	public install() {
		if (config.notingEnabled === false) return {};

    setInterval(() => {
			const now = new Date();
			const hour = now.getHours();

			// 23時から7時の間は投稿頻度を低くする
			if (hour >= 23 || hour < 7) {
					if (Math.random() < 0.09) { //確率を抑えて投稿頻度を低く設定
							this.post();
					}
			} else {
					if (Math.random() < 0.6) {
							this.post();
					}
			}
	}, 1000 * 60 * 8);

		this.ai.api('i').then((me) => {
			this.myUserId = (me as User).id;
		}).catch((error) => {
			this.log(`Failed to fetch user ID: ${error}`);
		});

		return {};
	}

	@bindThis
	private post() {
		const notes = [
			...serifs.noting.notes,
			() => {
				const item = genItem();
				return serifs.noting.want(item);
			},
			() => {
				const item = genItem();
				return serifs.noting.see(item);
			},
			() => {
				const item = genItem();
				return serifs.noting.expire(item);
			},
		];

		const note = notes[Math.floor(Math.random() * notes.length)];

		//console.log(this.myUserId);

		// TODO: 季節に応じたセリフ
		// NEW Date()とget.monthを使って場合分けすればいけるかも

		this.ai.post({
			text: typeof note === 'function' ? note() : note
		});
	}
}
