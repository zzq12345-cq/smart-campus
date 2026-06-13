# Private Messaging

部署清单见：`docs/integration/appwrite/private-messaging-function-deploy.md`

这个 Appwrite Function 负责私信场景里需要服务端权限的两类操作：

- 创建/查找一对一会话
- 发送消息并同步更新会话摘要、未读数

## 为什么需要它

前端 Client SDK 不能把行权限直接授给“其他用户”。私信场景需要把会话/消息权限同时分配给双方成员，所以必须在服务端使用 API Key 完成。

## 支持动作

- `findOrCreateDirectConversation`
- `createConversation`
- `sendMessage`

## 必填变量

- `APPWRITE_API_KEY`
- `APPWRITE_ENDPOINT`（默认读取 `APPWRITE_FUNCTION_API_ENDPOINT`）
- `APPWRITE_PROJECT_ID`（默认读取 `APPWRITE_FUNCTION_PROJECT_ID`）

## 可选变量

- `APPWRITE_DATABASE_ID`，默认 `mindguard`
- `APPWRITE_CONVERSATIONS_TABLE_ID`，默认 `conversations`
- `APPWRITE_CONVERSATION_MEMBERS_TABLE_ID`，默认 `conversation_members`
- `APPWRITE_MESSAGES_TABLE_ID`，默认 `messages`

## 部署

1. Appwrite Console → Functions → Create Function
2. Runtime 选 `Node.js`
3. Entrypoint 填 `src/main.js`
4. Root directory 选 `functions/private-messaging`
5. 配置上面的环境变量

## 返回格式

```json
{
  "ok": true,
  "data": {}
}
```

失败时：

```json
{
  "ok": false,
  "error": "message",
  "code": 400
}
```
