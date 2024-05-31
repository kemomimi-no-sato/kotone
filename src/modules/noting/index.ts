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
			if (Math.random() < 0.04) {
				this.post();
			}
		}, 1000 * 60 * 10);

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

		this.ai.post({
			text: typeof note === 'function' ? note() : note
		});
	}
}
