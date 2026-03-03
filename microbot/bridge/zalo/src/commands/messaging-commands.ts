/**
 * Messaging command handlers — 16 commands.
 * Maps to openzca `msg` subcommands.
 * Reference: openzca cli.ts line 3035-3727
 */

import { ThreadType, DestType, type Reactions, type API } from 'zca-js';
import type { BridgeCommand } from '../command-handler.js';

function threadType(isGroup?: unknown): ThreadType {
  return isGroup ? ThreadType.Group : ThreadType.User;
}

export async function handleMessagingCommand(
  api: API,
  cmd: BridgeCommand,
): Promise<unknown> {
  switch (cmd.type) {
    // Send text message (cli.ts line 3044)
    case 'send':
      return api.sendMessage(
        String(cmd.text),
        String(cmd.to),
        threadType(cmd.isGroup),
      );

    // Send image(s) or video(s) with optional caption (cli.ts line 3088)
    case 'sendImage':
    case 'sendVideo':
      return api.sendMessage(
        { msg: String(cmd.message || ''), attachments: cmd.filePaths as string[] },
        String(cmd.to),
        threadType(cmd.isGroup),
      );

    // Send voice — upload then sendVoice (cli.ts line 3202-3205)
    case 'sendVoice': {
      const tt = threadType(cmd.isGroup);
      const uploaded = await api.uploadAttachment(
        [String(cmd.filePath)],
        String(cmd.to),
        tt,
      );
      const results = [];
      for (const item of uploaded) {
        if ((item as any).fileType === 'others' || (item as any).fileType === 'video') {
          results.push(
            await api.sendVoice({ voiceUrl: (item as any).fileUrl }, String(cmd.to), tt),
          );
        }
      }
      return results;
    }

    // Send sticker — fetch details first (cli.ts line 3236-3251)
    case 'sendSticker': {
      const details = await api.getStickersDetail(Number(cmd.stickerId));
      const first = (details as any[])[0];
      if (!first) throw new Error(`Sticker ${cmd.stickerId} not found`);
      return api.sendSticker(
        { id: Number(first.id), cateId: Number(first.cateId), type: Number(first.type) },
        String(cmd.to),
        threadType(cmd.isGroup),
      );
    }

    // Send link (cli.ts line 3263)
    case 'sendLink':
      return api.sendLink(
        { link: String(cmd.url) },
        String(cmd.to),
        threadType(cmd.isGroup),
      );

    // Send contact card (cli.ts line 3281)
    case 'sendCard':
      return api.sendCard(
        { userId: String(cmd.contactId) },
        String(cmd.to),
        threadType(cmd.isGroup),
      );

    // React to message (cli.ts line 3306)
    case 'react':
      return api.addReaction(cmd.reaction as Reactions, {
        data: { msgId: String(cmd.msgId), cliMsgId: String(cmd.cliMsgId) },
        threadId: String(cmd.threadId),
        type: threadType(cmd.isGroup),
      } as any);

    // Typing indicator (cli.ts line 3326)
    case 'typing':
      return api.sendTypingEvent(
        String(cmd.threadId),
        threadType(cmd.isGroup),
        DestType.User,
      );

    // Forward text to multiple targets (cli.ts line 3348)
    case 'forward':
      return api.forwardMessage(
        { message: String(cmd.message) } as any,
        cmd.targets as string[],
        threadType(cmd.isGroup),
      );

    // Delete message (cli.ts line 3374)
    case 'deleteMsg':
      return api.deleteMessage(
        {
          data: {
            msgId: String(cmd.msgId),
            cliMsgId: String(cmd.cliMsgId),
            uidFrom: String(cmd.uidFrom),
          },
          threadId: String(cmd.threadId),
          type: threadType(cmd.isGroup),
        } as any,
        Boolean(cmd.onlyMe),
      );

    // Undo/recall sent message (cli.ts line 3405)
    case 'undoMsg':
      return api.undo(
        { msgId: String(cmd.msgId), cliMsgId: String(cmd.cliMsgId) } as any,
        String(cmd.threadId),
        threadType(cmd.isGroup),
      );

    // Edit = undo + resend (cli.ts line 3432-3451)
    case 'editMsg': {
      const tt = threadType(cmd.isGroup);
      const undoRes = await api.undo(
        { msgId: String(cmd.msgId), cliMsgId: String(cmd.cliMsgId) } as any,
        String(cmd.threadId),
        tt,
      );
      const sendRes = await api.sendMessage(
        String(cmd.newText),
        String(cmd.threadId),
        tt,
      );
      return { mode: 'undo+send', undo: undoRes, send: sendRes };
    }

    // Upload and send file(s) (cli.ts line 3550-3558)
    case 'upload':
      return api.sendMessage(
        { msg: '', attachments: cmd.filePaths as string[] },
        String(cmd.threadId),
        threadType(cmd.isGroup),
      );

    // Recent messages — simplified (cli.ts line 3581-3632)
    case 'recentMessages':
      return { note: 'Recent messages requires listener-based fetch; not yet implemented' };

    // Pin conversation (cli.ts line 3642)
    case 'pin':
      return api.setPinnedConversations(
        true,
        String(cmd.threadId),
        threadType(cmd.isGroup),
      );

    // Unpin conversation (cli.ts line 3662)
    case 'unpin':
      return api.setPinnedConversations(
        false,
        String(cmd.threadId),
        threadType(cmd.isGroup),
      );

    // List pinned conversations (cli.ts line 3683)
    case 'listPins':
      return api.getPinConversations();

    // Get user/member info (cli.ts line 3705)
    case 'memberInfo':
      return api.getUserInfo(String(cmd.userId));

    default:
      throw new Error(`Unknown messaging command: ${cmd.type}`);
  }
}
