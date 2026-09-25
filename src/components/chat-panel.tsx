"use client";

import { useChat } from "@ai-sdk/react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";

export function ChatPanel({ orgName }: { orgName: string | null }) {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat();
  const busy = status === "submitted" || status === "streaming";

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <p className="text-sm text-stone-500">
            Pergunte algo sobre os documentos de {orgName ?? "sua organização"}. A resposta aparece conforme o modelo gera o texto.
          </p>
        ) : null}
        {messages.map((message, messageIndex) => {
          const isLast = messageIndex === messages.length - 1;
          const text = message.parts
            .filter((part) => part.type === "text")
            .map((part) => part.text)
            .join("");
          const showCaret = busy && isLast && message.role === "assistant" && text.length > 0;

          return (
            <article
              key={message.id}
              className={
                message.role === "user"
                  ? "ml-12 rounded-2xl bg-[var(--accent-ink)] px-4 py-3 text-[var(--paper)]"
                  : "mr-12 rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3"
              }
            >
              <p className="mb-1 text-xs tracking-wide uppercase opacity-70">
                {message.role === "user" ? "Você" : "Assistente"}
              </p>
              {text ? (
                message.role === "assistant" ? (
                  <div className="chat-markdown">
                    <ReactMarkdown>{text}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{text}</p>
                )
              ) : null}
              {showCaret ? <span className="typing-caret ml-0.5 inline-block">▍</span> : null}
              {busy && isLast && message.role === "assistant" && text.length === 0 ? <TypingDots /> : null}
            </article>
          );
        })}
        {busy && messages.at(-1)?.role !== "assistant" ? (
          <article className="mr-12 rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3">
            <p className="mb-1 text-xs tracking-wide uppercase opacity-70">Assistente</p>
            <TypingDots />
          </article>
        ) : null}
      </div>
      {error ? <p className="mt-3 text-sm text-[var(--warn)]">{error.message}</p> : null}
      <form
        className="mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const text = input.trim();
          if (!text || busy) return;
          void sendMessage({ text });
          setInput("");
        }}
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={orgName ? `Pergunte ao acervo de ${orgName}` : "Selecione uma organização"}
          disabled={!orgName || busy}
          className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-white px-4 py-3"
        />
        <button
          type="submit"
          disabled={!orgName || busy || input.trim().length === 0}
          className="rounded-xl bg-[var(--accent)] px-4 py-3 font-medium text-white disabled:opacity-50"
        >
          {busy ? "…" : "Enviar"}
        </button>
      </form>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex h-5 items-end gap-1" aria-label="A IA está digitando">
      {[0, 1, 2].map((dot) => (
        <span
          key={dot}
          className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)]"
          style={{ animationDelay: `${dot * 0.15}s` }}
        />
      ))}
    </span>
  );
}
