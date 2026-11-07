#!/usr/bin/env python3
"""Reads a Claude Code transcript (JSONL) and prints its real token usage as JSON.

Usage: usage_from_transcript.py <transcript.jsonl> [--since 2026-11-07T15:00:00Z]

Works on a subagent transcript and on a main session. --since counts only messages from
that moment on, which gives a long-running orchestrator its usage for one card.

The result fits Pano's usage record. input_tokens counts new input (fresh + cache writes);
cache_tokens counts cache reads, which repeat the same context every turn and so are not
added to total_tokens (input + output). context_tokens is the largest single prompt,
duration_ms the time from the first to the last counted message.
Each message may span several lines, so usage is counted once per message id.
"""
import json
import sys
from datetime import datetime


def stamp(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


arguments = sys.argv[1:]
since = None
if "--since" in arguments:
    at = arguments.index("--since")
    since = stamp(arguments[at + 1])
    del arguments[at : at + 2]
if len(arguments) != 1:
    sys.exit(__doc__)

usage_by_id = {}
models = {}
first = last = None
for line in open(arguments[0], encoding="utf-8", errors="replace"):
    try:
        entry = json.loads(line)
    except ValueError:
        continue
    message = entry.get("message") or {}
    usage = message.get("usage")
    if not usage or message.get("role") != "assistant":
        continue
    when = entry.get("timestamp")
    if when and since and stamp(when) < since:
        continue
    if when:
        first = first or when
        last = when
    key = message.get("id") or len(usage_by_id)
    usage_by_id[key] = usage
    if message.get("model"):
        models[message["model"]] = models.get(message["model"], 0) + 1

input_tokens = output_tokens = cache_tokens = context_tokens = 0
for usage in usage_by_id.values():
    fresh = usage.get("input_tokens", 0) + usage.get("cache_creation_input_tokens", 0)
    cached = usage.get("cache_read_input_tokens", 0)
    input_tokens += fresh
    output_tokens += usage.get("output_tokens", 0)
    cache_tokens += cached
    context_tokens = max(context_tokens, fresh + cached)

print(json.dumps({
    "model": max(models, key=models.get) if models else None,
    "input_tokens": input_tokens,
    "output_tokens": output_tokens,
    "cache_tokens": cache_tokens,
    "total_tokens": input_tokens + output_tokens,
    "context_tokens": context_tokens,
    "duration_ms": int((stamp(last) - stamp(first)).total_seconds() * 1000) if first else None,
    "messages": len(usage_by_id),
}))
