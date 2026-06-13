# Follows Manager

部署清单见：`docs/integration/appwrite/follows-function-deploy.md`

这个 Appwrite Function 负责关注关系里需要服务端权限的两类操作：

- `followUser`
- `unfollowUser`

## 为什么需要它

前端 Client SDK 不能安全地把行权限直接授给“另一个用户”。
关注场景需要在创建 `follows` 行时，同时让关注者和被关注者拥有指定读取权限，所以必须在服务端使用 API Key 完成。

## 必填变量

- `APPWRITE_API_KEY`
- `APPWRITE_ENDPOINT`（默认读取 `APPWRITE_FUNCTION_API_ENDPOINT`）
- `APPWRITE_PROJECT_ID`（默认读取 `APPWRITE_FUNCTION_PROJECT_ID`）

## 可选变量

- `APPWRITE_DATABASE_ID`，默认 `mindguard`
- `APPWRITE_FOLLOWS_TABLE_ID`，默认 `follows`
- `APPWRITE_USERS_TABLE_ID`，默认 `users`

## 部署

1. Appwrite Console → Functions → Create Function
2. Runtime 选 `Node.js`
3. Entrypoint 填 `src/main.js`
4. Root directory 选 `functions/follows`
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
