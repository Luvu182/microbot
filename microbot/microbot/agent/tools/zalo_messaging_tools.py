"""Zalo messaging agent tools: send image, file, sticker, react."""

from microbot.agent.tools.zalo_bridge_client import ZaloBaseTool


class ZaloSendImageTool(ZaloBaseTool):
    name = "zalo_send_image"
    description = "Send image(s) to a Zalo user or group"
    parameters = {
        "type": "object",
        "properties": {
            "to": {"type": "string", "description": "Thread ID to send to"},
            "file_paths": {"type": "array", "items": {"type": "string"},
                           "description": "Local file paths of images"},
            "message": {"type": "string", "description": "Optional caption"},
            "is_group": {"type": "boolean", "description": "True if group"},
        },
        "required": ["to", "file_paths"],
    }

    async def execute(self, to: str, file_paths: list[str],
                      message: str = "", is_group: bool = False, **kw) -> str:
        return await self._cmd("sendImage", to=to, filePaths=file_paths,
                               message=message, isGroup=is_group)


class ZaloSendFileTool(ZaloBaseTool):
    name = "zalo_send_file"
    description = "Upload and send file(s) to a Zalo user or group"
    parameters = {
        "type": "object",
        "properties": {
            "thread_id": {"type": "string", "description": "Thread ID"},
            "file_paths": {"type": "array", "items": {"type": "string"},
                           "description": "Local file paths to upload"},
            "is_group": {"type": "boolean", "description": "True if group"},
        },
        "required": ["thread_id", "file_paths"],
    }

    async def execute(self, thread_id: str, file_paths: list[str],
                      is_group: bool = False, **kw) -> str:
        return await self._cmd("upload", threadId=thread_id,
                               filePaths=file_paths, isGroup=is_group)


class ZaloReactTool(ZaloBaseTool):
    name = "zalo_react"
    description = "React to a Zalo message (heart/like/haha/wow/cry/angry)"
    parameters = {
        "type": "object",
        "properties": {
            "msg_id": {"type": "string", "description": "Message ID"},
            "cli_msg_id": {"type": "string", "description": "Client message ID"},
            "thread_id": {"type": "string", "description": "Thread ID"},
            "reaction": {"type": "string", "description": "heart/like/haha/wow/cry/angry"},
            "is_group": {"type": "boolean"},
        },
        "required": ["msg_id", "cli_msg_id", "thread_id", "reaction"],
    }

    async def execute(self, msg_id: str, cli_msg_id: str, thread_id: str,
                      reaction: str, is_group: bool = False, **kw) -> str:
        return await self._cmd("react", msgId=msg_id, cliMsgId=cli_msg_id,
                               threadId=thread_id, reaction=reaction, isGroup=is_group)


class ZaloSendStickerTool(ZaloBaseTool):
    name = "zalo_send_sticker"
    description = "Send a sticker by ID to a Zalo user or group"
    parameters = {
        "type": "object",
        "properties": {
            "to": {"type": "string", "description": "Thread ID"},
            "sticker_id": {"type": "string", "description": "Sticker ID"},
            "is_group": {"type": "boolean"},
        },
        "required": ["to", "sticker_id"],
    }

    async def execute(self, to: str, sticker_id: str,
                      is_group: bool = False, **kw) -> str:
        return await self._cmd("sendSticker", to=to, stickerId=sticker_id,
                               isGroup=is_group)
