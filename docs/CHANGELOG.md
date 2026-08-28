# CHANGELOG

This changelog follows the [Keep a Changelog](https://keepachangelog.com/zh-TW/1.1.0/) format to track version updates.

## [1.1.0] - 2026-08-28

### Added

- 新增 `{@}` 動態模式匹配與 `{1}`、`{2}`、`{3}` 編號回填，支援翻譯動態數量、名稱、方案和日期等內容。
- 新增 553 筆繁體中文詞條，詞庫現有 4,382 個不重複 key。
- 新增 `aria-label`、`data-placeholder`、`data-tooltip` 與 `<i18n-text>` 翻譯支援。

### Changed

- 將翻譯流程更新為「精確匹配 → 動態模式匹配 → 捕獲值翻譯 → 編號回填」。
- 將純文字匹配邏輯拆分為可測試的翻譯引擎，並加入動態模式、語序調整與特殊字元等測試。
- 更新台灣用語，包括「存取權限」、「範本」、「本機字型」、「席次」、「小工具」與「電子郵件」。

### Fixed

- 避免翻譯使用者正在編輯的內容、變數名稱和程式碼編輯器文字。
- 避免翻譯器再次處理自己剛寫回的文字或屬性，減少 MutationObserver 自我觸發。

## [1.0.0] - 2026-06-12

### Changed

- 將 `MutationObserver` 更新排入 frame 批次處理，減少 Figma 動態頁面上的重複 DOM 掃描。
- 在掃描前去除待翻譯根節點中的重複巢狀項目，避免重複處理同一段 DOM。
- 集中管理可翻譯屬性，統一處理 `data-label` 與 `placeholder`。

### Fixed

- 移除一筆查找時永遠不會被使用到的重複 `Open in...` 翻譯項目。
