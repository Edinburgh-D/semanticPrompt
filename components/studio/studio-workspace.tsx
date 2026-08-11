"use client";

import {
  AlertCircle,
  AlertTriangle,
  Check,
  CircleDashed,
  Clipboard,
  Play,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";

import { useStudioStore } from "../../lib/stores/studio-store";
import { VisualSpecEditor } from "./visual-spec-editor";

import styles from "./studio.module.css";

const STUDIO_EXAMPLES = [
  {
    label: "人物不变，只换衣服",
    text: "成年东亚女性站在白色摄影棚中，保持人物面部、发型和体型不变，换成黑色无袖轻薄上衣和高腰长裤，正面全身构图，50mm 镜头，柔和侧光，不要改变人物身份。",
  },
  {
    label: "姿势不变，只换场景",
    text: "成年女性保持坐姿不变，双手自然放在膝上，把场景换成老式住宅楼梯，镜头距离人物数级台阶，正面全身构图，28mm 环境人像，昏暗环境但面部正常曝光。",
  },
  {
    label: "镜头与光线",
    text: "成年男性靠在雨夜街边的玻璃橱窗旁，身体朝左、看向镜头，35mm 镜头，中景，平视机位，浅景深，蓝色霓虹侧光，不要过曝，不要裁掉双手。",
  },
] as const;

function levelIcon(level: "error" | "warning" | "suggestion") {
  if (level === "error") return <AlertCircle aria-hidden="true" size={16} />;
  if (level === "warning") return <AlertTriangle aria-hidden="true" size={16} />;
  return <Sparkles aria-hidden="true" size={16} />;
}

function formatDiffValue(value: unknown): string {
  if (value === undefined) return "—";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

export function StudioWorkspace() {
  const {
    sourceText,
    model,
    status,
    error,
    parserOutput,
    enhancedOutput,
    draftSpec,
    doctor,
    compiledPrompt,
    diff,
    setSourceText,
    setModel,
    parseDeterministically,
    enhanceWithLlm,
    updateModule,
    toggleLock,
    resetDraft,
  } = useStudioStore();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === "idle") parseDeterministically();
  }, [parseDeterministically, status]);

  const copyPrompt = async () => {
    if (!compiledPrompt) return;
    await navigator.clipboard.writeText(compiledPrompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  };

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.brandBlock}>
          <span className={styles.wordmark}>VPC</span>
          <span className={styles.productName}>Visual Prompt Compiler</span>
        </div>
        <div className={styles.pipeline} aria-label="Prompt pipeline">
          <span>原文</span><i aria-hidden="true" />
          <span>VisualSpec</span><i aria-hidden="true" />
          <span>Doctor</span><i aria-hidden="true" />
          <span>Prompt</span>
        </div>
        <div className={styles.topStatus} data-status={status}>
          <CircleDashed aria-hidden="true" size={15} />
          {status === "parsing"
            ? "规则解析中"
            : status === "enhancing"
              ? "AI 补全中"
              : status === "ready"
                ? "解析完成"
                : status === "dirty"
                  ? "等待解析"
                  : status === "error"
                    ? "需要处理"
                    : "本地工作区"}
        </div>
      </header>

      <div className={styles.workbench}>
        <section className={`${styles.panel} ${styles.intentPanel}`} aria-labelledby="intent-title">
          <div className={styles.panelHeading}>
            <span className={styles.eyebrow}>01 / INPUT</span>
            <h1 id="intent-title">描述你脑中的画面</h1>
            <p>不需要会写 Prompt。像平时说话一样描述人物、动作、镜头和环境。</p>
          </div>

          <section className={styles.quickStart} aria-labelledby="quick-start-title">
            <h2 id="quick-start-title">第一次使用，只做这 3 步</h2>
            <ol>
              <li><span>1</span><p><strong>写画面</strong>输入一段自然中文。</p></li>
              <li><span>2</span><p><strong>解析画面</strong>系统拆成可编辑字段。</p></li>
              <li><span>3</span><p><strong>检查并复制</strong>右侧无错误即可复制 Prompt。</p></li>
            </ol>
          </section>

          <div className={styles.exampleGroup}>
            <span>不知道怎么写？先载入一个例子</span>
            <div className={styles.exampleList}>
              {STUDIO_EXAMPLES.map((example) => (
                <button key={example.label} onClick={() => setSourceText(example.text)} type="button">
                  {example.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="visual-intent">自然语言原文</label>
            <textarea
              className={styles.intentInput}
              id="visual-intent"
              onChange={(event) => setSourceText(event.target.value)}
              placeholder="例如：一个人在雨夜街头……"
              value={sourceText}
            />
            <small>{sourceText.length} 字符 · 中文规则解析</small>
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="target-model">目标模型</label>
            <select
              className={styles.select}
              id="target-model"
              onChange={(event) => setModel(event.target.value as "gpt-image")}
              value={model}
            >
              <option value="gpt-image">GPT Image · 已接入</option>
              <option disabled>Grok · 规划中</option>
              <option disabled>Midjourney · 规划中</option>
              <option disabled>FLUX · 规划中</option>
            </select>
            <small>本阶段仅 GPT Image Adapter 可编译。</small>
          </div>

          <div className={styles.runActions}>
            <button
              className={styles.primaryButton}
              disabled={status === "parsing" || status === "enhancing" || sourceText.trim().length === 0}
              onClick={parseDeterministically}
              type="button"
            >
              <Play aria-hidden="true" fill="currentColor" size={15} />
              {status === "parsing" ? "正在解析" : "解析画面"}
            </button>
            <button
              className={styles.llmButton}
              disabled={status === "parsing" || status === "enhancing" || sourceText.trim().length === 0}
              onClick={enhanceWithLlm}
              type="button"
            >
              <Sparkles aria-hidden="true" size={15} />
              {status === "enhancing" ? "补全中" : "AI 补全（可选）"}
            </button>
          </div>
          <p className={styles.actionHint}>先点“解析画面”。只有复杂转身、镜像或多人物关系时，才需要 AI 补全。</p>

          {error ? <p className={styles.globalError} role="alert">{error}</p> : null}

          <div className={styles.parseMeta}>
            <span>规则置信度</span>
            <strong>{parserOutput ? `${Math.round(parserOutput.confidence.overall * 100)}%` : "—"}</strong>
            <span>歧义</span>
            <strong>{parserOutput?.ambiguities.length ?? 0}</strong>
            <span>待补信息</span>
            <strong>{parserOutput?.missingInformation.length ?? 0}</strong>
            <span>字段来源</span>
            <strong>
              {enhancedOutput
                ? `规则 ${enhancedOutput.provenance.filter(({ source }) => source === "rule").length} · LLM ${enhancedOutput.provenance.filter(({ source }) => source === "llm").length}`
                : "仅规则"}
            </strong>
            <span>LLM Provider</span>
            <strong>{enhancedOutput ? `${enhancedOutput.llm.provider} / ${enhancedOutput.llm.model}` : "—"}</strong>
          </div>
        </section>

        <section className={`${styles.panel} ${styles.specPanel}`} aria-labelledby="spec-title">
          <span className={styles.eyebrow}>02 / VISUALSPEC</span>
          <div className={styles.panelHeadingCompact}>
            <h2 id="spec-title">系统理解到的画面</h2>
            <span className={styles.schemaBadge}>schema 1.0</span>
          </div>
          <p className={styles.panelDescription}>展开模块可查看或修改。锁住不想变化的部分，再修改原文并重新解析。</p>
          <VisualSpecEditor
            onCommit={updateModule}
            onReset={resetDraft}
            onToggleLock={toggleLock}
            spec={draftSpec}
          />
        </section>

        <aside className={`${styles.panel} ${styles.outputPanel}`} aria-label="诊断和编译结果">
          <section className={styles.outputSection} aria-labelledby="doctor-title">
            <span className={styles.eyebrow}>03 / DOCTOR</span>
            <div className={styles.panelHeadingCompact}>
              <h2 id="doctor-title">问题检查</h2>
              {doctor ? (
                <span className={doctor.canCompile ? styles.passBadge : styles.blockBadge}>
                  {doctor.canCompile ? "可编译" : "已阻断"}
                </span>
              ) : null}
            </div>
            <p className={styles.panelDescription}>错误会阻止编译；警告和建议不会阻止你继续使用。</p>

            {doctor?.diagnostics.length ? (
              <ol className={styles.diagnosticList}>
                {doctor.diagnostics.map((item) => (
                  <li className={styles.diagnostic} data-level={item.level} key={`${item.code}-${item.paths.join("-")}`}>
                    {levelIcon(item.level)}
                    <div>
                      <strong>{item.message}</strong>
                      <p>{item.suggestion}</p>
                      <code>{item.paths.join(" · ")}</code>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className={styles.cleanState}>
                <Check aria-hidden="true" size={18} />
                <span>未发现跨字段冲突。</span>
              </div>
            )}
          </section>

          <section className={styles.outputSection} aria-labelledby="prompt-title">
            <span className={styles.eyebrow}>04 / COMPILED</span>
            <div className={styles.panelHeadingCompact}>
              <h2 id="prompt-title">GPT Image Prompt</h2>
              <button
                className={styles.copyButton}
                disabled={!compiledPrompt}
                onClick={copyPrompt}
                type="button"
              >
                {copied ? <Check aria-hidden="true" size={14} /> : <Clipboard aria-hidden="true" size={14} />}
                {copied ? "已复制" : "复制"}
              </button>
            </div>
            <p className={styles.panelDescription}>这是可以直接复制到 GPT Image 的最终结果。</p>
            <pre className={styles.promptOutput}>{compiledPrompt ?? "诊断通过后将在这里生成最终 Prompt。"}</pre>
          </section>

          <section className={styles.outputSection} aria-labelledby="diff-title">
            <span className={styles.eyebrow}>05 / DIFF</span>
            <div className={styles.panelHeadingCompact}>
              <h2 id="diff-title">修改记录</h2>
              <span className={styles.changeCount}>{diff.length}</span>
            </div>
            {diff.length ? (
              <ol className={styles.diffList}>
                {diff.map((entry) => (
                  <li key={entry.path}>
                    <code>{entry.path}</code>
                    <span>{entry.kind}</span>
                    <div><del>{formatDiffValue(entry.before)}</del><ins>{formatDiffValue(entry.after)}</ins></div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className={styles.noDiff}>当前 VisualSpec 与解析基线一致。</p>
            )}
          </section>
        </aside>
      </div>

      <footer className={styles.statusFooter}>
        <span>LOCAL / NO DATABASE</span>
        <span>Parser → Doctor → Compiler → GPT Image</span>
        <span aria-live="polite">{doctor ? `${doctor.summary.errors}E · ${doctor.summary.warnings}W · ${doctor.summary.suggestions}S` : "等待输入"}</span>
      </footer>
    </main>
  );
}
