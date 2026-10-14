import React from "react";

interface SafeMarkdownProps {
  content: string;
  className?: string;
}

// Ensure URLs only use safe protocols
function sanitizeUrl(url: string): string {
  const trimmed = (url || "").trim();
  if (/^https?:\/\//i.test(trimmed) || /^\//.test(trimmed)) {
    return trimmed;
  }
  return "#";
}

// Parses inline tokens (bold, italic, code, links) into React elements
function parseInline(text: string): React.ReactNode[] {
  if (!text) return [];

  const nodes: React.ReactNode[] = [];
  // Tokenizer pattern matching:
  // 1. Links: [text](url)
  // 2. Inline code: `code`
  // 3. Bold-italic: ***text***
  // 4. Bold: **text** or __text__
  // 5. Italic: *text* or _text_
  const inlineRegex = /(\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|__([^_]+)__|(?<!\*)\*([^*]+)\*(?!\*)|(?<!_)_([^_]+)_(?!_))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = inlineRegex.exec(text)) !== null) {
    // Add any preceding plain text
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const fullMatch = match[0];
    const key = `inline-${match.index}-${lastIndex}`;

    if (fullMatch.startsWith("[") && match[2] && match[3]) {
      // Link [label](url)
      const label = match[2];
      const url = sanitizeUrl(match[3]);
      nodes.push(
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "var(--accent-teal, #14b8a6)",
            textDecoration: "underline",
            textUnderlineOffset: "3px",
            fontWeight: 500
          }}
        >
          {parseInline(label)}
        </a>
      );
    } else if (fullMatch.startsWith("`") && match[4]) {
      // Inline code `code`
      nodes.push(
        <code
          key={key}
          style={{
            fontFamily: "var(--font-mono, monospace)",
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            padding: "0.15rem 0.35rem",
            borderRadius: "4px",
            fontSize: "0.85em",
            color: "#38bdf8"
          }}
        >
          {match[4]}
        </code>
      );
    } else if (fullMatch.startsWith("***") && match[5]) {
      // Bold-italic ***text***
      nodes.push(
        <strong key={key} style={{ fontWeight: 700, color: "var(--text-primary, #f8fafc)" }}>
          <em>{match[5]}</em>
        </strong>
      );
    } else if ((fullMatch.startsWith("**") && match[6]) || (fullMatch.startsWith("__") && match[7])) {
      // Bold **text** or __text__
      const boldText = match[6] || match[7];
      nodes.push(
        <strong key={key} style={{ fontWeight: 700, color: "var(--text-primary, #f8fafc)" }}>
          {boldText}
        </strong>
      );
    } else if ((fullMatch.startsWith("*") && match[8]) || (fullMatch.startsWith("_") && match[9])) {
      // Italic *text* or _text_
      const italicText = match[8] || match[9];
      nodes.push(
        <em key={key} style={{ fontStyle: "italic", color: "var(--text-secondary, #cbd5e1)" }}>
          {italicText}
        </em>
      );
    } else {
      nodes.push(fullMatch);
    }

    lastIndex = match.index + fullMatch.length;
  }

  // Add trailing plain text
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

export function SafeMarkdown({ content, className }: SafeMarkdownProps) {
  if (!content) return null;

  const rawLines = content.split("\n");
  const elements: React.ReactNode[] = [];

  let currentListType: "ul" | "ol" | null = null;
  let currentListItems: React.ReactNode[] = [];
  let currentBlockquote: string[] = [];

  const flushList = () => {
    if (currentListType && currentListItems.length > 0) {
      const key = `list-${elements.length}`;
      if (currentListType === "ul") {
        elements.push(
          <ul
            key={key}
            style={{
              margin: "0.4rem 0 0.75rem 1.25rem",
              paddingLeft: "0.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.3rem"
            }}
          >
            {currentListItems}
          </ul>
        );
      } else {
        elements.push(
          <ol
            key={key}
            style={{
              margin: "0.4rem 0 0.75rem 1.25rem",
              paddingLeft: "0.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.3rem"
            }}
          >
            {currentListItems}
          </ol>
        );
      }
      currentListType = null;
      currentListItems = [];
    }
  };

  const flushBlockquote = () => {
    if (currentBlockquote.length > 0) {
      const key = `quote-${elements.length}`;
      elements.push(
        <blockquote
          key={key}
          style={{
            borderLeft: "3px solid var(--accent-teal, #14b8a6)",
            paddingLeft: "0.85rem",
            margin: "0.5rem 0 0.75rem",
            color: "var(--text-secondary, #94a3b8)",
            fontStyle: "italic",
            backgroundColor: "rgba(20, 184, 166, 0.05)",
            padding: "0.5rem 0.85rem",
            borderRadius: "0 6px 6px 0"
          }}
        >
          {parseInline(currentBlockquote.join(" "))}
        </blockquote>
      );
      currentBlockquote = [];
    }
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmed = line.trim();

    // Check empty line
    if (!trimmed) {
      flushList();
      flushBlockquote();
      continue;
    }

    // Check Horizontal Rule: --- or ***
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushList();
      flushBlockquote();
      elements.push(
        <hr
          key={`hr-${i}`}
          style={{
            border: "none",
            borderTop: "1px solid var(--border-subtle, #1e2e4a)",
            margin: "0.85rem 0"
          }}
        />
      );
      continue;
    }

    // Check Blockquote: > text
    if (trimmed.startsWith(">")) {
      flushList();
      const quoteText = trimmed.replace(/^>\s*/, "");
      currentBlockquote.push(quoteText);
      continue;
    } else {
      flushBlockquote();
    }

    // Check Headings
    if (trimmed.startsWith("### ")) {
      flushList();
      elements.push(
        <h4
          key={`h3-${i}`}
          style={{
            fontSize: "1.05rem",
            fontWeight: 700,
            color: "var(--text-accent, #2dd4bf)",
            marginTop: "0.9rem",
            marginBottom: "0.35rem"
          }}
        >
          {parseInline(trimmed.slice(4))}
        </h4>
      );
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushList();
      elements.push(
        <h3
          key={`h2-${i}`}
          style={{
            fontSize: "1.15rem",
            fontWeight: 700,
            color: "#ffffff",
            marginTop: "1.1rem",
            marginBottom: "0.4rem"
          }}
        >
          {parseInline(trimmed.slice(3))}
        </h3>
      );
      continue;
    }

    if (trimmed.startsWith("# ")) {
      flushList();
      elements.push(
        <h2
          key={`h1-${i}`}
          style={{
            fontSize: "1.25rem",
            fontWeight: 800,
            color: "#ffffff",
            marginTop: "1.2rem",
            marginBottom: "0.5rem"
          }}
        >
          {parseInline(trimmed.slice(2))}
        </h2>
      );
      continue;
    }

    if (trimmed.startsWith("#### ")) {
      flushList();
      elements.push(
        <h5
          key={`h4-${i}`}
          style={{
            fontSize: "0.95rem",
            fontWeight: 600,
            color: "var(--text-primary, #f8fafc)",
            marginTop: "0.75rem",
            marginBottom: "0.25rem"
          }}
        >
          {parseInline(trimmed.slice(5))}
        </h5>
      );
      continue;
    }

    // Check Bullet List: - item, * item, • item
    const bulletMatch = trimmed.match(/^([-*•])\s+(.+)$/);
    if (bulletMatch) {
      if (currentListType !== "ul") {
        flushList();
        currentListType = "ul";
      }
      currentListItems.push(
        <li
          key={`li-ul-${i}`}
          style={{
            fontSize: "0.92rem",
            lineHeight: 1.6,
            color: "var(--text-primary, #f8fafc)"
          }}
        >
          {parseInline(bulletMatch[2])}
        </li>
      );
      continue;
    }

    // Check Numbered List: 1. item, 2. item
    const numMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (numMatch) {
      if (currentListType !== "ol") {
        flushList();
        currentListType = "ol";
      }
      currentListItems.push(
        <li
          key={`li-ol-${i}`}
          style={{
            fontSize: "0.92rem",
            lineHeight: 1.6,
            color: "var(--text-primary, #f8fafc)"
          }}
        >
          {parseInline(numMatch[2])}
        </li>
      );
      continue;
    }

    // Otherwise, normal paragraph
    flushList();
    elements.push(
      <p
        key={`p-${i}`}
        style={{
          margin: "0.4rem 0 0.6rem",
          fontSize: "0.92rem",
          lineHeight: 1.65,
          color: "var(--text-primary, #f8fafc)"
        }}
      >
        {parseInline(trimmed)}
      </p>
    );
  }

  flushList();
  flushBlockquote();

  return <div className={className}>{elements}</div>;
}
