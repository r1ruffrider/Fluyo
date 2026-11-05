"""NON_EVIDENCE executable fixture for the production NVDA pipe reader/latch."""

import importlib.util
import json
import os
import pathlib
import queue
import struct
import sys
import threading
import types


class _Extension:
    def register(self, callback):
        del callback

    def unregister(self, callback):
        del callback


class _BasePlugin:
    def __init__(self):
        pass


class _AsyncEventQueue:
    def __init__(self):
        self._items = queue.Queue()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def enqueue(self, callback):
        self._items.put(callback)

    def _run(self):
        while True:
            callback = self._items.get()
            if callback is None:
                return
            callback()

    def stop(self):
        self._items.put(None)
        self._thread.join(timeout=1)

    def terminate(self):
        pass


def _load_plugin(path):
    # Keep this repository fixture read-only when importing the plug-in source.
    sys.dont_write_bytecode = True
    global_plugin = types.ModuleType("globalPluginHandler")
    global_plugin.GlobalPlugin = _BasePlugin
    speech = types.ModuleType("speech")
    extensions = types.ModuleType("speech.extensions")
    extensions.pre_speech = _Extension()
    extensions.pre_speechCanceled = _Extension()
    speech.extensions = extensions
    queue_handler = types.ModuleType("queueHandler")
    queue_handler.eventQueue = _AsyncEventQueue()
    queue_handler.queueFunction = lambda event_queue, callback: event_queue.enqueue(callback)
    sys.modules["globalPluginHandler"] = global_plugin
    sys.modules["queueHandler"] = queue_handler
    sys.modules["speech"] = speech
    sys.modules["speech.extensions"] = extensions
    spec = importlib.util.spec_from_file_location("fluyoPreflightSpeech", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _write_frame(descriptor, value):
    payload = json.dumps(value, separators=(",", ":")).encode("utf-8")
    framed = struct.pack("<I", len(payload)) + payload
    offset = 0
    while offset < len(framed):
        offset += os.write(descriptor, framed[offset:])


def main():
    if len(sys.argv) != 3:
        raise ValueError("plugin path and transcript path are required")
    module = _load_plugin(pathlib.Path(sys.argv[1]).resolve())
    transcript = pathlib.Path(sys.argv[2]).resolve()
    transcript_fd = os.open(transcript, os.O_CREAT | os.O_EXCL | os.O_WRONLY | os.O_APPEND)
    control_read, control_write = os.pipe()
    ready_read, ready_write = os.pipe()
    plugin = module.GlobalPlugin.__new__(module.GlobalPlugin)
    plugin._lock = threading.RLock()
    plugin._control_condition = threading.Condition(plugin._lock)
    plugin._active_control = None
    plugin._control_error = None
    plugin._control_stopped = False
    plugin._closing_generation = None
    plugin._closed_generations = set()
    plugin._sequences = {}
    plugin._event_counts = {}
    plugin._last_event_monotonic = {}
    plugin._callback_inflight = {}
    plugin._speech_fd = transcript_fd
    plugin._control_fd = control_read
    plugin._ready_fd = ready_write

    def read_control():
        return json.loads(module._read_pipe_frame(control_read, module.MAX_LINE_BYTES).decode("utf-8"))

    def write_ready(control):
        module._write_pipe_frame(
            ready_write,
            json.dumps(
                {
                    "observationId": control["observationId"],
                    "generation": control["generation"],
                    "phase": control["phase"],
                    "status": "CONTROL_LATCHED" if control["phase"] == "OBSERVE" else "OBSERVATION_IDLE",
                },
                separators=(",", ":"),
            ).encode("utf-8"),
        )

    plugin._read_and_validate_control = read_control
    plugin._ready_payload = write_ready
    reader = threading.Thread(target=plugin._control_reader, daemon=True)
    reader.start()
    event_queue = sys.modules["queueHandler"].eventQueue
    priority = types.SimpleNamespace(name="NORMAL")
    expected = []
    try:
        # 120 controls exceed the 4096-byte pipe. Per-control ACK consumption
        # proves bounded flow control and prevents observation misattribution.
        first_observation_id = f"{0:064x}"
        _write_frame(control_write, {
            "observationId": first_observation_id,
            "generation": "1",
            "phase": "OBSERVE",
        })
        ready = json.loads(module._read_pipe_frame(ready_read, module.MAX_LINE_BYTES))
        for index in range(120):
            observation_id = f"{index:064x}"
            if ready != {
                "observationId": observation_id,
                "generation": str(index + 1),
                "phase": "OBSERVE",
                "status": "CONTROL_LATCHED",
            }:
                raise ValueError("ready ACK was missing, reordered, or misattributed")
            closing_control = plugin._latched_control()
            # These callbacks are queued ahead of the CLOSE drain marker. The
            # asynchronous queue proves the reader releases its condition while
            # waiting, otherwise the first callback and marker deadlock.
            event_queue.enqueue(lambda: plugin._on_speech(["Choose your answer"], priority=priority))
            event_queue.enqueue(lambda: plugin._on_speech(["Correct"], priority=priority))
            event_queue.enqueue(plugin._on_cancel)
            _write_frame(control_write, {
                "observationId": observation_id,
                "generation": str(index + 1),
                "phase": "CLOSE",
            })
            next_observation_id = f"{index + 1:064x}"
            if index < 119:
                # Queue the next OBSERVE before CLOSE has acknowledged, then
                # deliver a late prior-generation callback. The persistent
                # reader must drain it into the closing generation and must
                # not attribute it to the queued next generation.
                _write_frame(control_write, {
                    "observationId": next_observation_id,
                    "generation": str(index + 2),
                    "phase": "OBSERVE",
                })
            idle = json.loads(module._read_pipe_frame(ready_read, module.MAX_LINE_BYTES))
            if idle != {
                "observationId": observation_id,
                "generation": str(index + 1),
                "phase": "CLOSE",
                "status": "OBSERVATION_IDLE",
            }:
                raise ValueError("CLOSE/DRAIN/IDLE barrier was missing or misattributed")
            expected.extend(
                [
                    (observation_id, str(index + 1), 1, "SPEAK", "Choose your answer"),
                    (observation_id, str(index + 1), 2, "SPEAK", "Correct"),
                    (observation_id, str(index + 1), 3, "CANCEL", ""),
                ]
            )
            if index < 119:
                ready = json.loads(module._read_pipe_frame(ready_read, module.MAX_LINE_BYTES))
                try:
                    plugin._append(closing_control, "SPEAK", "NORMAL", "Correct")
                except RuntimeError as error:
                    if "closed observation generation" not in str(error):
                        raise
                else:
                    raise ValueError("late prior-generation callback was attributed forward")
            else:
                try:
                    plugin._on_speech(["Correct"], priority=priority)
                except RuntimeError as error:
                    if "no active" not in str(error):
                        raise
                else:
                    raise ValueError("late out-of-generation speech was accepted")
    finally:
        with plugin._control_condition:
            plugin._control_stopped = True
            plugin._control_condition.notify_all()
        for descriptor in (control_write, control_read, ready_read, ready_write, transcript_fd):
            try:
                os.close(descriptor)
            except OSError:
                pass
        reader.join(timeout=1)
        event_queue.stop()
    records = [json.loads(line) for line in transcript.read_text(encoding="utf-8").splitlines()]
    actual = [
        (item["observationId"], item["generation"], item["sequence"], item["kind"], item["text"])
        for item in records
    ]
    if actual != expected:
        raise ValueError("reader-based multi-control/multi-event ordering changed")
    print("PASS")


if __name__ == "__main__":
    main()
