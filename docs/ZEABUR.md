# Zeabur 部署說明

## 1. 建立服務

在 Zeabur Project 內建立：

- `Next.js` 服務：連到本 repo
- `PostgreSQL` addon：提供正式資料庫

## 2. 環境變數

將下列值填入 Zeabur：

```env
DATABASE_URL=<由 Zeabur PostgreSQL 提供>
ADMIN_PASSWORD=larry1201
ADMIN_SESSION_SECRET=larry1201
THREADS_APP_ID=2011012076458714
THREADS_APP_SECRET=9fa74e356543ee55c4946181fcbeb8b9
THREADS_REDIRECT_URI=https://social-audio.zeabur.app/api/threads/callback
TOKEN_ENCRYPTION_KEY=larry1201
ANTHROPIC_API_KEY=
```

## 3. Meta Threads 設定

在 Meta Developer Console 將 Redirect URI 設為：

`https://social-audio.zeabur.app/api/threads/callback`

並將要測試的 Threads 帳號加入 `Threads Testers`。

## 4. 首次初始化

Zeabur 第一次部署完成後，執行：

```bash
npm run db:push
```

如需示範資料，再執行：

```bash
npm run db:seed
```

## 5. 安全提醒

目前你提供的 `ADMIN_SESSION_SECRET` 與 `TOKEN_ENCRYPTION_KEY` 都偏弱，只適合暫時測試。
正式上線前請改成隨機字串，並建議重設已曝光過的 `THREADS_APP_SECRET`。
