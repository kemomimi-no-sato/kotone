import { bindThis } from "@/decorators.js";
import Module from '@/module.js';
import Message from '@/message.js';
import serifs from '@/serifs.js';

export default class extends Module {
	public readonly name = 'loverate';

	@bindThis
	public install() {
		return {
			mentionHook: this.mentionHook
		};
	}

	@bindThis
	private async mentionHook(msg: Message): Promise<boolean> {
		if (!msg.includes(['好感度'])) return false;

		if (msg.visibility !== 'specified') return true;

		//TODO: 好感度が一定の数値に達するごとに文言を変える

		msg.reply(serifs.loveRate.lr(msg.friend.love, msg.friend.name));

		return true;
	}
}
