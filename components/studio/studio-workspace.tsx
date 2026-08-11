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
          {status === "parsing" ? "规则解析中" : status === "enhancing" ? "LLM 补全中" : status === "error" ? "需要处理" : "本地工作区"}
        </div>
      </header>

      <div className={styles.workbench}>
        <section className={`${styles.panel} ${styles.intentPanel}`} aria-labelledby="intent-title">
          <div className={styles.panelHeading}>
            <span className={styles.eyebrow}>01 / INPUT</span>
            <h1 id="intent-title">描述你脑中的画面</h1>
            <p>使用自然中文即可。规则解析器只提取明确表达，不补写未说出的视觉事实。</p>
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
              {status === "parsing" ? "正在解析" : "规则解析"}
            </button>
            <button
              className={styles.llmButton}
              disabled={status === "parsing" || status === "enhancing" || sourceText.trim().length === 0}
              onClick={enhanceWithLlm}
              type="button"
            >
              <Sparkles aria-hidden="true" size={15} />
              {status === "enhancing" ? "补全中" : "LLM 补全"}
            </button>
          </div>

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
          <div className={styles.panelHeadingCompact}>
            <div>
              <span className={styles.eyebrow}>02 / VISUALSPEC</span>
              <h2 id="spec-title">结构化视觉意图</h2>
            </div>
            <span className={styles.schemaBadge}>schema 1.0</span>
          </div>
          <VisualSpecEditor
            onCommit={updateModule}
            onReset={resetDraft}
            onToggleLock={toggleLock}
            spec={draftSpec}
          />
        </section>

        <aside className={`${styles.panel} ${styles.outputPanel}`} aria-label="诊断和编译结果">
          <section className={styles.outputSection} aria-labelledby="doctor-title">
            <div className={styles.panelHeadingCompact}>
              <div>
                <span className={styles.eyebrow}>03 / DOCTOR</span>
                <h2 id="doctor-title">诊断</h2>
              </div>
              {doctor ? (
                <span className={doctor.canCompile ? styles.passBadge : styles.blockBadge}>
                  {doctor.canCompile ? "可编译" : "已阻断"}
                </span>
              ) : null}
            </div>

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
            <div className={styles.panelHeadingCompact}>
              <div>
                <span className={styles.eyebrow}>04 / COMPILED</span>
                <h2 id="prompt-title">GPT Image Prompt</h2>
              </div>
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
            <pre className={styles.promptOutput}>{compiledPrompt ?? "诊断通过后将在这里生成最终 Prompt。"}</pre>
          </section>

          <section className={styles.outputSection} aria-labelledby="diff-title">
            <div className={styles.panelHeadingCompact}>
              <div>
                <span className={styles.eyebrow}>05 / DIFF</span>
                <h2 id="diff-title">修改记录</h2>
              </div>
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
