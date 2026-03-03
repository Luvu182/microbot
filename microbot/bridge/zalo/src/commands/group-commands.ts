/**
 * Group management command handlers — 22 commands.
 * Maps to openzca `group` subcommands.
 * Reference: openzca cli.ts line 3729-4136
 */

import type { API } from 'zca-js';
import type { BridgeCommand } from '../command-handler.js';

export async function handleGroupCommand(
  api: API,
  cmd: BridgeCommand,
): Promise<unknown> {
  switch (cmd.type) {
    // List all groups (cli.ts line 3737-3754)
    case 'groupList': {
      const groups = await api.getAllGroups();
      const ids = Object.keys((groups as any).gridVerMap ?? {});
      if (ids.length === 0) return [];
      const info = await api.getGroupInfo(ids);
      return ids
        .map((id: string) => (info as any).gridInfoMap?.[id])
        .filter(Boolean);
    }

    // Group info (cli.ts line 3762)
    case 'groupInfo': {
      const data = await api.getGroupInfo(String(cmd.groupId));
      return (data as any).gridInfoMap[String(cmd.groupId)];
    }

    // Group members with profiles (cli.ts line 3772-3848)
    case 'groupMembers': {
      const groupId = String(cmd.groupId);
      const info = await api.getGroupInfo(groupId);
      const groupInfo = (info as any).gridInfoMap[groupId];
      if (!groupInfo) throw new Error(`Group not found: ${groupId}`);
      const ids: string[] = Array.isArray(groupInfo.memberIds)
        ? groupInfo.memberIds.map(String)
        : [];
      if (ids.length === 0) return [];
      const profiles = await api.getGroupMembersInfo(ids);
      return ids.map((id: string) => ({
        userId: id,
        ...((profiles as any).profiles as Record<string, any>)?.[id],
      }));
    }

    // Create group (cli.ts line 3856)
    case 'groupCreate':
      return api.createGroup({
        name: String(cmd.name),
        members: cmd.memberIds as string[],
      } as any);

    // Rename group (cli.ts line 3870)
    case 'groupRename':
      return api.changeGroupName(String(cmd.name), String(cmd.groupId));

    // Change group avatar (cli.ts line 3883)
    case 'groupAvatar':
      return api.changeGroupAvatar(String(cmd.filePath), String(cmd.groupId));

    // Update group settings (cli.ts line 3896-3943)
    case 'groupSettings': {
      const groupId = String(cmd.groupId);
      const data = await api.getGroupInfo(groupId);
      const current = (data as any).gridInfoMap[groupId]?.setting;
      if (!current) throw new Error(`Group not found: ${groupId}`);
      const overrides = (cmd.settings || {}) as Record<string, boolean>;
      const payload = {
        blockName: Boolean(current.blockName),
        signAdminMsg: Boolean(current.signAdminMsg),
        setTopicOnly: Boolean(current.setTopicOnly),
        enableMsgHistory: Boolean(current.enableMsgHistory),
        joinAppr: Boolean(current.joinAppr),
        lockCreatePost: Boolean(current.lockCreatePost),
        lockCreatePoll: Boolean(current.lockCreatePoll),
        lockSendMsg: Boolean(current.lockSendMsg),
        lockViewMember: Boolean(current.lockViewMember),
        ...overrides,
      };
      return api.updateGroupSettings(payload, groupId);
    }

    // Add members (cli.ts line 3951)
    case 'groupAddMembers':
      return api.addUserToGroup(cmd.userIds as string[], String(cmd.groupId));

    // Remove members (cli.ts line 3963)
    case 'groupRemoveMembers':
      return api.removeUserFromGroup(
        cmd.userIds as string[],
        String(cmd.groupId),
      );

    // Promote deputy (cli.ts line 3973)
    case 'groupAddDeputy':
      return api.addGroupDeputy(String(cmd.userId), String(cmd.groupId));

    // Demote deputy (cli.ts line 3985)
    case 'groupRemoveDeputy':
      return api.removeGroupDeputy(String(cmd.userId), String(cmd.groupId));

    // Transfer ownership (cli.ts line 3995)
    case 'groupTransfer':
      return api.changeGroupOwner(
        String(cmd.newOwnerId),
        String(cmd.groupId),
      );

    // Block member (cli.ts line 4006)
    case 'groupBlock':
      return api.addGroupBlockedMember(
        String(cmd.userId),
        String(cmd.groupId),
      );

    // Unblock member (cli.ts line 4017)
    case 'groupUnblock':
      return api.removeGroupBlockedMember(
        String(cmd.userId),
        String(cmd.groupId),
      );

    // List blocked members (cli.ts line 4028)
    case 'groupBlocked': {
      const res = await api.getGroupBlockedMember(
        {} as any,
        String(cmd.groupId),
      );
      return (res as any).blocked_members;
    }

    // Enable invite link (cli.ts line 4039)
    case 'groupEnableLink':
      return api.enableGroupLink(String(cmd.groupId));

    // Disable invite link (cli.ts line 4049)
    case 'groupDisableLink':
      return api.disableGroupLink(String(cmd.groupId));

    // Get invite link detail (cli.ts line 4059)
    case 'groupLinkDetail':
      return api.getGroupLinkDetail(String(cmd.groupId));

    // Join via invite link (cli.ts line 4069)
    case 'groupJoinLink':
      return api.joinGroupLink(String(cmd.linkId));

    // List pending member requests (cli.ts line 4079)
    case 'groupPending':
      return api.getPendingGroupMembers(String(cmd.groupId));

    // Approve/deny pending request (cli.ts line 4100)
    case 'groupReview':
      return api.reviewPendingMemberRequest(
        {
          members: String(cmd.userId),
          isApprove: cmd.action === 'approve',
        } as any,
        String(cmd.groupId),
      );

    // Leave group (cli.ts line 4124)
    case 'groupLeave':
      return api.leaveGroup(String(cmd.groupId));

    // Disperse group (cli.ts line 4134)
    case 'groupDisperse':
      return api.disperseGroup(String(cmd.groupId));

    default:
      throw new Error(`Unknown group command: ${cmd.type}`);
  }
}
