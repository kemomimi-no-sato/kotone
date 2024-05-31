import { bindThis } from '@/decorators.js';
import { parse } from 'twemoji-parser';

import type { Note } from '@/misskey/note.js';
import Module from '@/module.js';
import Stream from '@/stream.js';
import includes from '@/utils/includes.js';
import { sleep } from '@/utils/sleep.js';
import type { User } from '@/misskey/user.js';

export default class extends Module {
	public readonly name = 'emoji-react';

	private htl: ReturnType<Stream['useSharedConnection']>;
	private myUserId: string | null = null;
	
	@bindThis
	public install() {
		this.htl = this.ai.connection.useSharedConnection('homeTimeline');
		this.htl.on('note', this.onNote);

		this.ai.api('i').then((me) => {
			this.myUserId = (me as User).id;
		}).catch((error) => {
			this.log(`Failed to fetch user ID: ${error}`);
		});

		return {};
	}

	@bindThis
	private async onNote(note: Note, user: User) {
		if (note.reply != null) return;
		if (note.text == null) return;
		if (note.text.includes('@')) return; // (自分または他人問わず)メンションっぽかったらreject
		if (note.text.includes('<plain>')) return;

		const react = async (reaction: string, immediate = false) => {
			if (!immediate) {
				await sleep(1500);
			}
			this.ai.api('notes/reactions/create', {
				noteId: note.id,
				reaction: reaction
			});
		};

		const customEmojis = note.text.match(/:([^\n:]+?):/g);
		if (customEmojis) {
			// カスタム絵文字が複数種類ある場合はキャンセル
			if (!customEmojis.every((val, i, arr) => val === arr[0])) return;

			this.log(`Custom emoji detected - ${customEmojis[0]}`);

			return react(customEmojis[0]);
		}

		const emojis = parse(note.text).map(x => x.text);
		if (emojis.length > 0) {
			// 絵文字が複数種類ある場合はキャンセル
			if (!emojis.every((val, i, arr) => val === arr[0])) return;

			this.log(`Emoji detected - ${emojis[0]}`);

			let reaction = emojis[0];

			switch (reaction) {
				case '✊': return react('🖐', true);
				case '✌': return react('✊', true);
				case '🖐': case '✋': return react('✌', true);
			}

			return react(reaction);
		}

		if (includes(note.text, ['ぴざ'])) return react('🍕');
		if (includes(note.text, ['ぷりん'])) return react('🍮');
		if (includes(note.text, ['寿司', 'sushi']) || note.text === 'すし') return react('🍣');

		if (includes(note.text, ['あたまがいたい', '頭が痛い', '頭痛え', '頭痛', 'あたまいたい', '頭痛い', ':ablobcatpnd_headache:'])) return react(':ablobcat_nadenadeyou:');
		if (includes(note.text, ['おなかがいたい', 'お腹が痛い', 'お腹痛え', '腹が痛い', 'お腹痛い', 'おなかいたい', ':ablobcatpnd_stomachache:'])) return react(':blobcatpnd_onaka_nade:');

		if (includes(note.text, ['てんか', 'てんかちゃん'])){
			if (note.userId === this.myUserId) {
				return;
			} else {
				return react('🙌');
			} 
		}
	}
}
