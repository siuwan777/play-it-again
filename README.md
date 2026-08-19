# Play it again

香港二手樂器市集 App，使用 Expo (React Native) + Firebase。

## 功能概覽

- 市集瀏覽、搜尋、分類篩選
- 刊登 / 編輯商品（規格表單、圖片上傳）
- 收藏、即時聊天、討論區
- Firebase Auth、Firestore、Storage

## 環境需求

- Node.js 18+
- npm
- [Expo Go](https://expo.dev/go)（手機測試）或 iOS Simulator / Android Emulator
- Firebase 專案（Auth、Firestore、Storage 已啟用）

## 本地開發

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm start

# 或指定平台
npm run ios
npm run android
npm run web
```

首次啟動後，用手機 Expo Go 掃描終端機 QR code，或在本機瀏覽器開啟 web 版。

### Firebase 設定

Firebase 設定位於 `firebaseConfig.js`。請確認你的 Firebase Console 已：

1. 啟用 **Email/Password** 登入方式
2. 建立 Firestore 資料庫
3. 啟用 **Storage**

## 部署 Firebase 規則

專案根目錄已包含 `firebase.json`、`firestore.rules`、`storage.rules` 及 `firestore.indexes.json`。

```bash
# 安裝 Firebase CLI（只需一次）
npm install -g firebase-tools

# 登入並選擇專案
firebase login
firebase use <your-firebase-project-id>

# 部署規則與索引
firebase deploy --only firestore:rules,firestore:indexes,storage
```

> **重要：** 修改 `firestore.rules` 或 `storage.rules` 後，必須重新 deploy，Console 上的規則才會生效。

### Firestore 索引

個人頁查詢已在 App 內做 client-side 排序，**通常不需要**額外建立複合索引。若日後在 Console 看到其他查詢要求索引，可按錯誤訊息內的連結建立。

## 專案結構

```
app/                  Expo Router 頁面
components/           共用 UI 元件
utils/                Firebase 及業務邏輯
assets/               圖片等靜態資源
firebaseConfig.js     Firebase 初始化
firestore.rules       Firestore 安全規則
storage.rules         Storage 安全規則
```

## 主要 Firestore Collections

| Collection | 用途 |
|------------|------|
| `guitars` | 商品 listing |
| `users` | 用戶資料 |
| `users/{uid}/favorites` | 收藏 |
| `conversations` / `messages` | 聊天 |
| `forumPosts` / `replies` | 討論區 |

## 舊版商品（Legacy Listings）

部分早期商品可能沒有 `userId` 欄位。這類商品會在個人頁顯示為「舊版未綁定」。  
在編輯頁 **儲存** 後，會自動綁定到目前登入帳號（需 `sellerEmail` 與登入電郵一致）。

## 建置 Web 靜態版

```bash
npx expo export --platform web
```

輸出目錄：`dist/`

## 版本

目前 MVP 版本：**v1.0.0**
