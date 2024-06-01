/**
 * from ncatchan(https://github.com/nullnyat/ncatchan-misskey/)
 */

import Module from '@/module.js';
import { bindThis } from "@/decorators.js";

import accurateInterval from 'accurate-interval';
import { homedir } from 'node:os';

export default class extends Module {
	public readonly name = 'jihou';

	@bindThis
	public install() {
		accurateInterval(this.post, 1000 * 60 * 60, { aligned: true, immediate: true });

		return {};
	}

	@bindThis
	private async post() {
		const date = new Date();
		date.setMinutes(date.getMinutes() + 1);

		const hour = date.getHours();

		switch (hour) {
			default:
				this.ai.post({
					visibility: 'home',
					text: `${hour}時だよ。`
				});
				break;

			case 7:
				this.ai.post({
					visibility: 'home',
					text: `おはよ……${hour}時だよ……ねむい……`
				});
				break;

			case 12:
				this.ai.post({
					visibility: 'home',
					text: `${hour}時だよ。一緒におやつたべよ。`
				});
				break;

			case 15:
				this.ai.post({
					visibility: 'home',
					text: `${hour}時だよ。一緒におやつたべよ。`
				});
				break;

			case 24:
				this.ai.post({
					visibility: 'home',
					text: `あけおめ。${hour}時だよ。`
				})

			case 1:
				this.ai.post({
					visibility: 'home',
					text: `${hour}時だよ。寝ないと朝に響くよ。`
				});
				break;

			case 5:
				this.ai.post({
					visibility: 'home',
					text: `${hour}時だよ。みんな早起きだね……わたしは二度寝するよ……Zzz……`
				});
				break;
		}
	}
}
