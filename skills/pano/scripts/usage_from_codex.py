#!/usr/bin/env python3
"""Reads a Codex session log and prints its real token usage as JSON, ready for Pano.

Usage:
  usage_from_codex_session.py --cwd <folder>      newest session started in that folder
  usage_from_codex_session.py <rollout.jsonl>     a given session file

The numbers follow Pano's usage record. Codex's input_tokens includes cached reads, so
input_tokens here is new input only and cache_tokens is cached reads; total_tokens is
input + output, which leaves out cache reads the same way as Claude runs. context_tokens
is the largest single prompt, duration_ms the time from the first to the last event.

`codex exec resume` appends to the same file and its log does not mark the prompts, so a
session that covered several cards cannot be split: record it once, and say so in --note.
"""
import glob
import json
import os
import sys
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8")


def stamp(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def read(path):
    cwd = model = total = first = last = None
    context = 0
    for line in open(path, encoding="utf-8", errors="replace"):
        try:
            entry = json.loads(line)
        except ValueError:
            continue
        payload = entry.get("payload") or {}
        first = first or entry.get("timestamp")
        kind = entry.get("type")
        if kind == "session_meta":
            cwd = payload.get("cwd")
        elif kind == "turn_context":
            model = payload.get("model") or model
        elif kind == "event_msg" and payload.get("type") == "token_count" and payload.get("info"):
            info = payload["info"]
            total = info.get("total_token_usage") or total
            context = max(context, (info.get("last_token_usage") or {}).get("input_tokens", 0))
            last = entry.get("timestamp")
    if not total:
        return None
    cached = total["cached_input_tokens"]
    new_input = total["input_tokens"] - cached
    return {
        "file": os.path.basename(path),
        "cwd": cwd,
        "model": model,
        "input_tokens": new_input,
        "output_tokens": total["output_tokens"],
        "cache_tokens": cached,
        "total_tokens": new_input + total["output_tokens"],
        "context_tokens": context,
        "duration_ms": int((stamp(last) - stamp(first)).total_seconds() * 1000),
    }


def newest_in(folder):
    wanted = os.path.normcase(os.path.abspath(folder))
    root = os.path.expanduser("~/.codex/sessions")
    files = sorted(glob.glob(root + "/**/*.jsonl", recursive=True), key=os.path.getmtime, reverse=True)
    for path in files[:200]:
        result = read(path)
        if (
            result
            and result["cwd"]
            and os.path.normcase(result["cwd"]) == wanted
            and result["model"] != "codex-auto-review"
        ):
            return result
    return None


arguments = sys.argv[1:]
if arguments[:1] == ["--cwd"] and len(arguments) == 2:
    print(json.dumps(newest_in(arguments[1]), ensure_ascii=False))
elif len(arguments) == 1:
    print(json.dumps(read(arguments[0]), ensure_ascii=False))
else:
    sys.exit(__doc__)
