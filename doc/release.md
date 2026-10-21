# Android 自动发布

工作流在推送 `v*` 格式的 Git tag 后构建 Android Release APK，并创建 GitHub Release。tag 去掉 `v` 后必须与 `package.json` 的 `version` 完全一致。

此 fork 的 Android applicationId 为 `cn.toside.music.mobile.fork`，可与上游应用并存。应用内 APK 安装使用对应的 FileProvider authority。

发布前请更新 `package.json` 中的 `version` 和 `versionCode`，并更新 `publish/changeLog.md`。然后为新版本创建并推送 tag，例如：

```bash
git tag v1.9.2
git push origin v1.9.2
```

在仓库的 **Settings -> Secrets and variables -> Actions** 中配置以下 Repository secrets：

| Secret | 内容 |
| --- | --- |
| `KEYSTORE_STORE_FILE_BASE64` | 发布签名 keystore 文件的 Base64 文本 |
| `KEYSTORE_STORE_FILE` | keystore 文件名，文件会临时写入 `android/app/` |
| `KEYSTORE_KEY_ALIAS` | 签名 key alias |
| `KEYSTORE_PASSWORD` | keystore 密码 |
| `KEYSTORE_KEY_PASSWORD` | key 密码 |

同一个 `applicationId` 的后续版本必须继续使用相同的签名证书，否则用户无法覆盖安装更新。工作流使用仓库自动提供的 `GITHUB_TOKEN` 创建 Release，无需额外配置 token。

Release 签名密钥保存在仓库外的本机私有 Android 配置目录 `C:\Users\Admin\.android\lx-music-mobile-release.keystore`，工作流通过 Actions Secrets 使用它。请保留这份 keystore 和对应密码的离线备份；GitHub Secrets 可用于云构建，但不能替代密钥备份。
