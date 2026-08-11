# Visual Prompt Compiler

把中文画面描述转换成结构化 `VisualSpec`，检查内部冲突，再编译成 GPT Image Prompt。

## 本地启动

```powershell
npm.cmd install
npm.cmd run dev
```

浏览器打开 [http://localhost:3000/studio](http://localhost:3000/studio)。

## Studio 怎么用

1. 在左侧输入普通中文，或点击一个示例载入描述。
2. 点击“解析画面”。这一步完全在本地运行，不需要 API Key。
3. 在中间查看系统理解到的画面；需要时展开模块修改 JSON，再点“应用”。
4. 在右侧处理 Doctor 标出的错误，诊断通过后复制 GPT Image Prompt。
5. 想“人物不变，只换衣服”时，先锁定“人物身份”，再改左侧原文并重新解析。其他锁定模块同理。

“AI 补全”是可选功能，只适合复杂转身、镜像、多人物关系等规则解析不完整的描述。它需要 OpenAI 或 DeepSeek API Key；没有 Key 不影响规则解析、Doctor、编辑、锁定、Diff 和 GPT Image Prompt 编译。

## 可选：配置 DeepSeek AI 补全

复制 `.env.example` 为 `.env.local`，填写：

```dotenv
LLM_PARSER_PROVIDER=deepseek
DEEPSEEK_API_KEY=你的_api_key
DEEPSEEK_PARSER_MODEL=deepseek-chat
```

修改环境变量后重启开发服务器。不要把 `.env.local` 提交到 Git。若 PowerShell 报“禁止运行脚本”，请始终使用 `npm.cmd`，不要使用 `npm`。

## 工程检查

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```
