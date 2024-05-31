/**
 * from ncatchan(https://github.com/nullnyat/ncatchan-misskey/)
 */

import Message from '@/message.js';
import Module from '@/module.js';
import { bindThis } from '@/decorators.js';

export default class extends Module {
	public readonly name = 'is-nani';

	@bindThis
	public install() {
		return {
			mentionHook: this.mentionHook
		};
	}

	@bindThis
	private async mentionHook(msg: Message): Promise<boolean> {
		if (!msg.includes(['って何', 'ってなに', 'ってにゃに', ':is_nani:'])) return false;

		const match = msg.extractedText.match(/(.+?)って(何|なに|にゃに)/);

		if (match) {
			msg.reply(`えーめんどくさい……自分で調べて……\n${match[1]} 検索`);
		}

		return true;
	}
}
