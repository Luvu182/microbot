/**
 * Friend management command handlers — 18 commands.
 * Maps to openzca `friend` subcommands.
 * Reference: openzca cli.ts line 4138-4423
 */

import type { API } from 'zca-js';
import type { BridgeCommand } from '../command-handler.js';

export async function handleFriendCommand(
  api: API,
  cmd: BridgeCommand,
): Promise<unknown> {
  switch (cmd.type) {
    // List all friends (cli.ts line 4147)
    case 'friendList':
      return api.getAllFriends();

    // Find user by phone/username (cli.ts line 4174)
    case 'friendFind':
      return api.findUser(String(cmd.query));

    // Online friends (cli.ts line 4225)
    case 'friendOnline': {
      try {
        const data = await api.getFriendOnlines();
        return (data as any).onlines;
      } catch {
        // Fallback: filter active from friend list (openzca pattern)
        const friends = await api.getAllFriends();
        return (friends as any[]).filter(
          (f: any) =>
            Number(f.isActive) === 1 ||
            Number(f.isActiveWeb) === 1 ||
            Number(f.isActivePC) === 1,
        );
      }
    }

    // Friend recommendations (cli.ts line 4260)
    case 'friendRecommendations': {
      const data = await api.getFriendRecommendations();
      return (data as any).recommItems;
    }

    // Send friend request (cli.ts line 4277)
    case 'friendAdd':
      return api.sendFriendRequest(
        String(cmd.message || 'Hello!'),
        String(cmd.userId),
      );

    // Accept friend request (cli.ts line 4288)
    case 'friendAccept':
      return api.acceptFriendRequest(String(cmd.userId));

    // Reject friend request (cli.ts line 4298)
    case 'friendReject':
      return api.rejectFriendRequest(String(cmd.userId));

    // Cancel sent request (cli.ts line 4308)
    case 'friendCancel':
      return api.undoFriendRequest(String(cmd.userId));

    // List sent requests (cli.ts line 4319)
    case 'friendSent':
      return api.getSentFriendRequest();

    // Check request status (cli.ts line 4329)
    case 'friendRequestStatus':
      return api.getFriendRequestStatus(String(cmd.userId));

    // Remove friend (cli.ts line 4339)
    case 'friendRemove':
      return api.removeFriend(String(cmd.userId));

    // Set friend alias (cli.ts line 4349)
    case 'friendAlias':
      return api.changeFriendAlias(String(cmd.alias), String(cmd.userId));

    // Remove friend alias (cli.ts line 4359)
    case 'friendRemoveAlias':
      return api.removeFriendAlias(String(cmd.userId));

    // List all aliases (cli.ts line 4370)
    case 'friendAliases':
      return api.getAliasList();

    // Block user (cli.ts line 4380)
    case 'friendBlock':
      return api.blockUser(String(cmd.userId));

    // Unblock user (cli.ts line 4390)
    case 'friendUnblock':
      return api.unblockUser(String(cmd.userId));

    // Block feed viewing (cli.ts line 4400)
    case 'friendBlockFeed':
      return api.blockViewFeed(true, String(cmd.userId));

    // Unblock feed viewing (cli.ts line 4410)
    case 'friendUnblockFeed':
      return api.blockViewFeed(false, String(cmd.userId));

    // Conversation boards (cli.ts line 4421)
    case 'friendBoards':
      return api.getFriendBoardList(String(cmd.conversationId));

    default:
      throw new Error(`Unknown friend command: ${cmd.type}`);
  }
}
