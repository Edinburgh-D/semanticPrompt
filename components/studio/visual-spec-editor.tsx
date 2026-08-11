"use client";

import { Check, Lock, RotateCcw, Unlock } from "lucide-react";
import { useState } from "react";

import {
  LOCKABLE_VISUAL_SPEC_MODULES,
  VISUAL_SPEC_MODULES,
  type VisualSpec,
  type VisualSpecLocks,
  type VisualSpecModule,
} from "../../lib/prompt-engine";

import styles from "./studio.module.css";

const MODULE_COPY: Record<VisualSpecModule, { label: string; hint: string }> = {
  subject: { label: "主体", hint: "类型、数量、动作" },
  identity: { label: "人物身份", hint: "面部、头发、肤色、稳定特征" },
  appearance: { label: "外观", hint: "妆发、配饰、可见细节" },
  wardrobe: { label: "服装", hint: "单品、材质、穿戴状态" },
  pose: { label: "姿势", hint: "基础姿态、朝向、肢体" },
  composition: { label: "构图", hint: "景别、裁切、画面层次" },
  camera: { label: "镜头", hint: "焦段、距离、机位、景深" },
  environment: { label: "环境", hint: "地点、结构、道具、氛围" },
  lighting: { label: "光线", hint: "强度、方向、光质、曝光" },
  color: { label: "色彩", hint: "饱和度、色板、调色" },
  aesthetic: { label: "美学", hint: "媒介、类型、真实度、质感" },
  constraints: { label: "硬约束", hint: "必须满足的画面要求" },
  negativeConstraints: { label: "负面约束", hint: "需要避免的偏差" },
  references: { label: "参考图", hint: "引用角色、权重和说明" },
};

function isLockable(module: VisualSpecModule): module is keyof VisualSpecLocks {
  return (LOCKABLE_VISUAL_SPEC_MODULES as readonly string[]).includes(module);
}

function serializeModule(spec: VisualSpec, module: VisualSpecModule): string {
  const value = spec[module];
  if (value === undefined) return "";
  return JSON.stringify(value, null, 2);
}

interface ModuleEditorProps {
  module: VisualSpecModule;
  spec: VisualSpec;
  onCommit: (module: VisualSpecModule, value: unknown) => { ok: boolean; error?: string };
  onToggleLock: (module: keyof VisualSpecLocks) => void;
}

function ModuleEditor({ module, spec, onCommit, onToggleLock }: ModuleEditorProps) {
  const [text, setText] = useState(() => serializeModule(spec, module));
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const lockable = isLockable(module);
  const locked = lockable && spec.locks[module];

  const commit = () => {
    let parsed: unknown;
    try {
      parsed = text.trim() === "" ? undefined : JSON.parse(text);
    } catch {
      setError("JSON 格式不完整，请检查逗号、引号和括号。");
      return;
    }

    const result = onCommit(module, parsed);
    setError(result.error);
    if (result.ok) {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    }
  };

  return (
    <details className={styles.specModule} open={module === "subject" || module === "identity"}>
      <summary className={styles.specSummary}>
        <span>
          <strong>{MODULE_COPY[module].label}</strong>
          <small>{MODULE_COPY[module].hint}</small>
        </span>
        {lockable ? (
          <button
            aria-label={`${locked ? "解锁" : "锁定"}${MODULE_COPY[module].label}`}
            aria-pressed={locked}
            className={styles.lockButton}
            onClick={(event) => {
              event.preventDefault();
              onToggleLock(module);
            }}
            type="button"
          >
            {locked ? <Lock aria-hidden="true" size={15} /> : <Unlock aria-hidden="true" size={15} />}
            {locked ? "已锁" : "锁定"}
          </button>
        ) : null}
      </summary>
      <div className={styles.specEditorBody}>
        <label className={styles.srOnly} htmlFor={`module-${module}`}>
          {MODULE_COPY[module].label} JSON
        </label>
        <textarea
          aria-describedby={error ? `module-${module}-error` : undefined}
          aria-invalid={Boolean(error)}
          className={styles.jsonEditor}
          disabled={locked}
          id={`module-${module}`}
          onChange={(event) => setText(event.target.value)}
          spellCheck={false}
          value={text}
        />
        <div className={styles.editorActions}>
          <span className={error ? styles.inlineError : styles.editorHint} id={`module-${module}-error`}>
            {error ?? (locked ? "锁定模块不会被重新解析或 LLM 补全覆盖。" : "编辑 JSON 后应用，系统会重新校验、诊断并编译。")}
          </span>
          <button className={styles.quietButton} disabled={locked} onClick={commit} type="button">
            {saved ? <Check aria-hidden="true" size={15} /> : null}
            {saved ? "已应用" : "应用"}
          </button>
        </div>
      </div>
    </details>
  );
}

interface VisualSpecEditorProps {
  spec?: VisualSpec;
  onCommit: ModuleEditorProps["onCommit"];
  onToggleLock: ModuleEditorProps["onToggleLock"];
  onReset: () => void;
}

export function VisualSpecEditor({ spec, onCommit, onToggleLock, onReset }: VisualSpecEditorProps) {
  if (!spec) {
    return (
      <div className={styles.emptyState}>
        <span aria-hidden="true">{`{ }`}</span>
        <p>输入视觉描述并运行解析后，结构化字段会显示在这里。</p>
      </div>
    );
  }

  return (
    <div className={styles.specList}>
      <div className={styles.specToolbar}>
        <span>{VISUAL_SPEC_MODULES.length} 个语义模块</span>
        <button className={styles.textButton} onClick={onReset} type="button">
          <RotateCcw aria-hidden="true" size={14} />
          撤销手动修改
        </button>
      </div>
      <div className={styles.lockGuide}>
        <Lock aria-hidden="true" size={16} />
        <p><strong>想只改一部分？</strong>先锁定人物、姿势或环境，再修改左侧原文并点“解析画面”。例如：锁人物后只换衣服；锁姿势后只换场景。</p>
      </div>
      {VISUAL_SPEC_MODULES.map((module) => (
        <ModuleEditor
          key={`${module}-${JSON.stringify(spec[module])}`}
          module={module}
          onCommit={onCommit}
          onToggleLock={onToggleLock}
          spec={spec}
        />
      ))}
    </div>
  );
}
