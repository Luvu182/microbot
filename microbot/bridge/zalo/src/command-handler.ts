/**
 * Central command dispatcher.
 * Routes incoming WebSocket commands to the appropriate module handler.
 */

import type { API } from 'zca-js';
import { handleMessagingCommand } from './commands/messaging-commands.js';
import { handleGroupCommand } from './commands/group-commands.js';
import { handleFriendCommand } from './commands/friend-commands.js';
import { handleProfileCommand } from './commands/profile-commands.js';

export interface BridgeCommand {
  requestId?: string;
  type: string;
  [key: string]: unknown;
}

export interface BridgeResponse {
  requestId?: string;
  type: 'response' | 'error';
  command: string;
  data?: unknown;
  error?: string;
}

const MESSAGING_TYPES = new Set([
  'send', 'sendImage', 'sendVideo', 'sendVoice', 'sendSticker', 'sendLink',
  'sendCard', 'react', 'typing', 'forward', 'deleteMsg', 'undoMsg', 'editMsg',
  'upload', 'recentMessages', 'pin', 'unpin', 'listPins', 'memberInfo',
]);

const GROUP_TYPES = new Set([
  'groupList', 'groupInfo', 'groupMembers', 'groupCreate', 'groupRename',
  'groupAvatar', 'groupSettings', 'groupAddMembers', 'groupRemoveMembers',
  'groupAddDeputy', 'groupRemoveDeputy', 'groupTransfer', 'groupBlock',
  'groupUnblock', 'groupBlocked', 'groupEnableLink', 'groupDisableLink',
  'groupLinkDetail', 'groupJoinLink', 'groupPending', 'groupReview',
  'groupLeave', 'groupDisperse',
]);

const FRIEND_TYPES = new Set([
  'friendList', 'friendFind', 'friendOnline', 'friendRecommendations',
  'friendAdd', 'friendAccept', 'friendReject', 'friendCancel', 'friendSent',
  'friendRequestStatus', 'friendRemove', 'friendAlias', 'friendRemoveAlias',
  'friendAliases', 'friendBlock', 'friendUnblock', 'friendBlockFeed',
  'friendUnblockFeed', 'friendBoards',
]);

const PROFILE_TYPES = new Set([
  'myInfo', 'myId', 'myUpdate', 'myAvatar', 'myAvatars', 'myDeleteAvatar',
  'myReuseAvatar', 'myStatus', 'lastOnline',
]);

export async function handleCommand(
  api: API,
  cmd: BridgeCommand,
): Promise<BridgeResponse> {
  const { requestId, type } = cmd;
  try {
    let data: unknown;

    if (MESSAGING_TYPES.has(type)) {
      data = await handleMessagingCommand(api, cmd);
    } else if (GROUP_TYPES.has(type)) {
      data = await handleGroupCommand(api, cmd);
    } else if (FRIEND_TYPES.has(type)) {
      data = await handleFriendCommand(api, cmd);
    } else if (PROFILE_TYPES.has(type)) {
      data = await handleProfileCommand(api, cmd);
    } else {
      throw new Error(`Unknown command: ${type}`);
    }

    return { requestId, type: 'response', command: type, data };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { requestId, type: 'error', command: type, error };
  }
}
