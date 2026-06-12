# CHANGELOG

This changelog follows the [Keep a Changelog](https://keepachangelog.com/zh-TW/1.1.0/) format to track version updates.

## [1.0.0] - 2026-06-12

### Changed

- 將 `MutationObserver` 更新排入 frame 批次處理，減少 Figma 動態頁面上的重複 DOM 掃描。
- 在掃描前去除待翻譯根節點中的重複巢狀項目，避免重複處理同一段 DOM。
- 集中管理可翻譯屬性，統一處理 `data-label` 與 `placeholder`。

### Fixed

- 移除一筆查找時永遠不會被使用到的重複 `Open in...` 翻譯項目。
