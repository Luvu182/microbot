"""Zalo group, friend, and profile agent tools."""

from microbot.agent.tools.zalo_bridge_client import ZaloBaseTool


# ---------------------------------------------------------------------------
# Group tools
# ---------------------------------------------------------------------------


class ZaloGroupListTool(ZaloBaseTool):
    name = "zalo_group_list"
    description = "List all Zalo groups the account belongs to"
    parameters = {"type": "object", "properties": {}}

    async def execute(self, **kw) -> str:
        return await self._cmd("groupList")


class ZaloGroupInfoTool(ZaloBaseTool):
    name = "zalo_group_info"
    description = "Get detailed info about a Zalo group"
    parameters = {
        "type": "object",
        "properties": {
            "group_id": {"type": "string", "description": "Group ID"},
        },
        "required": ["group_id"],
    }

    async def execute(self, group_id: str, **kw) -> str:
        return await self._cmd("groupInfo", groupId=group_id)


class ZaloGroupMembersTool(ZaloBaseTool):
    name = "zalo_group_members"
    description = "List members of a Zalo group with profiles"
    parameters = {
        "type": "object",
        "properties": {
            "group_id": {"type": "string", "description": "Group ID"},
        },
        "required": ["group_id"],
    }

    async def execute(self, group_id: str, **kw) -> str:
        return await self._cmd("groupMembers", groupId=group_id)


class ZaloGroupCreateTool(ZaloBaseTool):
    name = "zalo_group_create"
    description = "Create a new Zalo group with specified members"
    parameters = {
        "type": "object",
        "properties": {
            "name": {"type": "string", "description": "Group name"},
            "member_ids": {"type": "array", "items": {"type": "string"},
                           "description": "User IDs to add"},
        },
        "required": ["name", "member_ids"],
    }

    async def execute(self, name: str, member_ids: list[str], **kw) -> str:
        return await self._cmd("groupCreate", name=name, memberIds=member_ids)


class ZaloGroupAddMembersTool(ZaloBaseTool):
    name = "zalo_group_add_members"
    description = "Add users to an existing Zalo group"
    parameters = {
        "type": "object",
        "properties": {
            "group_id": {"type": "string", "description": "Group ID"},
            "user_ids": {"type": "array", "items": {"type": "string"},
                         "description": "User IDs to add"},
        },
        "required": ["group_id", "user_ids"],
    }

    async def execute(self, group_id: str, user_ids: list[str], **kw) -> str:
        return await self._cmd("groupAddMembers", groupId=group_id, userIds=user_ids)


class ZaloGroupRemoveMembersTool(ZaloBaseTool):
    name = "zalo_group_remove_members"
    description = "Remove users from a Zalo group"
    parameters = {
        "type": "object",
        "properties": {
            "group_id": {"type": "string", "description": "Group ID"},
            "user_ids": {"type": "array", "items": {"type": "string"},
                         "description": "User IDs to remove"},
        },
        "required": ["group_id", "user_ids"],
    }

    async def execute(self, group_id: str, user_ids: list[str], **kw) -> str:
        return await self._cmd("groupRemoveMembers", groupId=group_id, userIds=user_ids)


# ---------------------------------------------------------------------------
# Friend tools
# ---------------------------------------------------------------------------


class ZaloFriendListTool(ZaloBaseTool):
    name = "zalo_friend_list"
    description = "List all Zalo friends"
    parameters = {"type": "object", "properties": {}}

    async def execute(self, **kw) -> str:
        return await self._cmd("friendList")


class ZaloFriendFindTool(ZaloBaseTool):
    name = "zalo_friend_find"
    description = "Find a Zalo user by phone number"
    parameters = {
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "Phone number to search"},
        },
        "required": ["query"],
    }

    async def execute(self, query: str, **kw) -> str:
        return await self._cmd("friendFind", query=query)


class ZaloFriendOnlineTool(ZaloBaseTool):
    name = "zalo_friend_online"
    description = "List currently online Zalo friends"
    parameters = {"type": "object", "properties": {}}

    async def execute(self, **kw) -> str:
        return await self._cmd("friendOnline")


# ---------------------------------------------------------------------------
# Profile tools
# ---------------------------------------------------------------------------


class ZaloMyInfoTool(ZaloBaseTool):
    name = "zalo_my_info"
    description = "Get the bot's Zalo account info"
    parameters = {"type": "object", "properties": {}}

    async def execute(self, **kw) -> str:
        return await self._cmd("myInfo")


class ZaloUserInfoTool(ZaloBaseTool):
    name = "zalo_user_info"
    description = "Look up a Zalo user's profile by user ID"
    parameters = {
        "type": "object",
        "properties": {
            "user_id": {"type": "string", "description": "User ID to look up"},
        },
        "required": ["user_id"],
    }

    async def execute(self, user_id: str, **kw) -> str:
        return await self._cmd("memberInfo", userId=user_id)
