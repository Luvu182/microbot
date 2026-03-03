"""Zalo agent tools — aggregate module for registration."""

from microbot.agent.tools.zalo_bridge_client import ZaloBridgeClient
from microbot.agent.tools.zalo_management_tools import (
    ZaloFriendFindTool,
    ZaloFriendListTool,
    ZaloFriendOnlineTool,
    ZaloGroupAddMembersTool,
    ZaloGroupCreateTool,
    ZaloGroupInfoTool,
    ZaloGroupListTool,
    ZaloGroupMembersTool,
    ZaloGroupRemoveMembersTool,
    ZaloMyInfoTool,
    ZaloUserInfoTool,
)
from microbot.agent.tools.zalo_messaging_tools import (
    ZaloReactTool,
    ZaloSendFileTool,
    ZaloSendImageTool,
    ZaloSendStickerTool,
)

ALL_ZALO_TOOLS = [
    ZaloSendImageTool, ZaloSendFileTool, ZaloReactTool, ZaloSendStickerTool,
    ZaloGroupListTool, ZaloGroupInfoTool, ZaloGroupMembersTool,
    ZaloGroupCreateTool, ZaloGroupAddMembersTool, ZaloGroupRemoveMembersTool,
    ZaloFriendListTool, ZaloFriendFindTool, ZaloFriendOnlineTool,
    ZaloMyInfoTool, ZaloUserInfoTool,
]


def register_zalo_tools(registry, bridge_url: str, bridge_token: str = "") -> None:
    """Register all Zalo tools with a shared bridge client."""
    client = ZaloBridgeClient(bridge_url, bridge_token)
    for tool_cls in ALL_ZALO_TOOLS:
        registry.register(tool_cls(client))
