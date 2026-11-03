"""Attempt-owned NVDA 2026.3 speech scratchpad. NON_EVIDENCE synthetic data only."""

import hashlib
import json
import msvcrt
import os
import re
import struct
import threading
import time
import unicodedata

import globalPluginHandler
import queueHandler
from speech.extensions import pre_speech, pre_speechCanceled

ATTEMPT_ID = "attempt-002-observer"
PRE_SPEECH_REQUEST_SCHEMA = "fluyo:r4b:nvda-filtered-pre-speech-request:v1"
CONTROL_SCHEMA = "fluyo:r4b:nvda-control:v1"
READY_SCHEMA = "fluyo:r4b:nvda-ready:v1"
MAX_TOTAL_BYTES = 2097152
MAX_LINE_BYTES = 4096
MAX_TEXT_CHARS = 2048
QUIET_MILLISECONDS = 50
FORBIDDEN = re.compile(
    r"(?:https?://|www\.|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b(?:bearer|password|passwd|secret|token|api[_ -]?key)\b|\baccount(?:\s+(?:id|number)|:)|\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b|(?:[a-z]:\\|\\\\|/(?:users|home|var|etc|tmp)/))",
    re.IGNORECASE,
)
SYNTHETIC_ATOMS = (
    "Back to dashboard", "Activity progress", "Activity complete", "Activity incomplete",
    "heading", "link", "radio button", "checked", "not checked", "unavailable",
    "button", "button unavailable", "Conversation Canvas",
    "Getting your activity ready", "Checking the latest activity", "Choose your answer",
    "Select one answer", "Checking your answer", "Waiting for a confirmed result",
    "Correct", "Not quite", "We couldn’t", "We couldn’t load the activity",
    "We couldn’t check your answer", "This activity changed",
    "Nothing changed", "Your answer wasn’t confirmed", "Your session ended",
    "Your confirmed progress hasn’t changed", "You can’t open this activity",
    "This activity isn’t available for your account right now", "Nothing to review right now",
    "You can continue with your next activity", "You’re offline",
    "Your answer is kept for this session", "Reconnect to load your activity",
    "Check answer", "Checking…", "Continue", "Finish", "Try again",
    "Refresh activity", "Sign in", "Return to learning", "Continue learning",
    "Synthetic confirmed feedback", "A friend asks", "Está cerca del parque",
    "Está cerca del parque.",
    "Está cerca del parque, después del puente y frente a la biblioteca del barrio.",
    "Gracias por la comida", "Gracias por la comida.",
    "Primera línea Segunda línea", "أين تقع", "تقع قرب",
)
SYNTHETIC_ATOMS = SYNTHETIC_ATOMS + tuple(
    localized
    for atom in SYNTHETIC_ATOMS
    for localized in (f"⟦{atom} ···⟧", f"⟦عَرَبِيّ {atom} ···⟧")
)
EXPECTED_NAMES = {
    "PREPARING": ["Getting your activity ready"],
    "ACTIVE": ["Choose your answer"],
    "SUBMITTING": ["Checking your answer"],
    "CONFIRMED": ["Correct", "Not quite"],
    "RETRYABLE_ERROR": ["We couldn’t load the activity", "We couldn’t check your answer"],
    "STALE_CONTENT": ["This activity changed"],
    "SESSION_ENDED": ["Your session ended"],
    "ACCESS_BLOCKED": ["You can’t open this activity"],
    "EMPTY_REVIEW": ["Nothing to review right now"],
    "OFFLINE_READ_ONLY": ["You’re offline"],
}

DEFAULT_CHOICES = [
    "Está cerca del parque.",
    "Gracias por la comida.",
    "Está cerca del parque, después del puente y frente a la biblioteca del barrio.",
]
EXPECTED_FIXTURE_IDS = {
    "long_localized_prompt_and_choices", "rtl_mixed_script_activity",
    "large_text_compact_landscape", "one_character_and_multiline_answers",
    "empty_activity_catalog", "network_loss_during_submit", "duplicate_submit",
    "stale_content_version", "late_confirmation_after_exit", "authentication_expired",
    "entitlement_blocked", "offline_saved_material", "corrupt_cache_recovery",
    "protected_mode_unknown_cohort", "missing_optional_explanation",
}


def _pseudo_speech(value, locale_id):
    if locale_id == "en":
        return value
    if locale_id == "en-XA":
        return f"⟦{value} ···⟧"
    if locale_id == "ar-XB":
        return f"⟦عَرَبِيّ {value} ···⟧"
    raise ValueError("expected speech locale changed")


def _speech_target(target_id, names, state_content):
    return {
        "targetId": target_id,
        "accessibleNameAlternatives": names,
        "requiredStateContentAlternatives": state_content,
    }


def _expected_speech_contract(state_id, locale_id, fixture_id, variant_id):
    headings = EXPECTED_NAMES.get(state_id)
    if headings is None:
        raise ValueError("expected speech state changed")
    if fixture_id not in EXPECTED_FIXTURE_IDS:
        raise ValueError("expected speech fixture changed")
    choices = DEFAULT_CHOICES
    if fixture_id == "long_localized_prompt_and_choices":
        choices = [str(index) * 180 for index in range(1, 5)]
    elif fixture_id == "rtl_mixed_script_activity":
        choices = ["تقع قرب parque 7 المركزي."]
    elif fixture_id == "one_character_and_multiline_answers":
        choices = ["A", "Primera línea Segunda línea"]
    targets = [
        _speech_target("heading", [_pseudo_speech(value, locale_id) for value in headings], ["heading"]),
        _speech_target(
            "progress",
            [_pseudo_speech("Activity progress", locale_id)],
            ["Activity complete" if state_id == "CONFIRMED" else "Activity incomplete"],
        ),
        _speech_target("back-link", [_pseudo_speech("Back to dashboard", locale_id)], ["link"]),
    ]
    disabled = state_id in {"SUBMITTING", "OFFLINE_READ_ONLY"}
    selected = state_id == "SUBMITTING" or (
        state_id == "OFFLINE_READ_ONLY" and str(variant_id).endswith("active")
    )
    if state_id in {"ACTIVE", "SUBMITTING", "OFFLINE_READ_ONLY"}:
        for index, choice in enumerate(choices):
            tokens = ["checked" if selected and index == 0 else "not checked", "radio button"]
            if disabled:
                tokens.append("unavailable")
            targets.append(
                _speech_target(
                    f"choice-{index + 1}",
                    [_pseudo_speech(choice, locale_id)],
                    [" ".join(tokens)],
                )
            )
    primary = {
        "ACTIVE": "Check answer",
        "SUBMITTING": "Checking…",
        "STALE_CONTENT": "Refresh activity",
        "SESSION_ENDED": "Sign in",
        "ACCESS_BLOCKED": "Return to learning",
        "EMPTY_REVIEW": "Continue learning",
        "OFFLINE_READ_ONLY": "Try again",
    }.get(state_id)
    if state_id == "CONFIRMED":
        primary = "Finish" if str(variant_id).endswith("finish") else "Continue"
    if state_id == "RETRYABLE_ERROR" and str(variant_id).endswith("prepare"):
        primary = "Try again"
    if primary:
        targets.append(
            _speech_target(
                "primary-action" if state_id in {"ACTIVE", "SUBMITTING"} else "recovery-action",
                [_pseudo_speech(primary, locale_id)],
                ["button unavailable" if disabled or (state_id == "ACTIVE" and not selected) else "button"],
            )
        )
    return {
        "stateId": state_id,
        "localeId": locale_id,
        "fixtureId": fixture_id,
        "variantId": variant_id,
        "orderedTargets": targets,
        "legalTerminalKinds": ["SPEAK", "CANCEL"],
    }


def _sha256_bytes(value):
    return hashlib.sha256(value).hexdigest()


def _canonical_sha256(value):
    return _sha256_bytes(json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))


def _inherited_fd(name, flags):
    value = os.environ.pop(name, None)
    if value is None or not value.isdecimal():
        raise ValueError("required inherited NVDA handle is absent")
    return msvcrt.open_osfhandle(int(value), flags | getattr(os, "O_BINARY", 0))


def _read_inherited(descriptor, maximum_bytes):
    os.lseek(descriptor, 0, os.SEEK_SET)
    size = os.fstat(descriptor).st_size
    if size < 0 or size > maximum_bytes:
        raise ValueError("inherited NVDA input exceeds its byte gate")
    chunks = []
    total = 0
    while total < size:
        chunk = os.read(descriptor, min(4096, size - total))
        if not chunk:
            raise ValueError("inherited NVDA input changed during read")
        chunks.append(chunk)
        total += len(chunk)
    if os.fstat(descriptor).st_size != total:
        raise ValueError("inherited NVDA input changed during read")
    return b"".join(chunks)


def _write_inherited(descriptor, payload, append=False):
    if append:
        os.lseek(descriptor, 0, os.SEEK_END)
    else:
        os.lseek(descriptor, 0, os.SEEK_SET)
        os.ftruncate(descriptor, 0)
    offset = 0
    while offset < len(payload):
        offset += os.write(descriptor, payload[offset:])
    os.fsync(descriptor)


def _read_pipe_frame(descriptor, maximum_bytes):
    length_bytes = os.read(descriptor, 4)
    if len(length_bytes) != 4:
        raise ValueError("inherited NVDA pipe frame length is truncated")
    length = struct.unpack("<I", length_bytes)[0]
    if length < 1 or length > maximum_bytes:
        raise ValueError("inherited NVDA pipe frame exceeds its byte gate")
    chunks = []
    remaining = length
    while remaining:
        chunk = os.read(descriptor, remaining)
        if not chunk:
            raise ValueError("inherited NVDA pipe frame is truncated")
        chunks.append(chunk)
        remaining -= len(chunk)
    return b"".join(chunks)


def _write_pipe_frame(descriptor, payload):
    framed = struct.pack("<I", len(payload)) + payload
    offset = 0
    while offset < len(framed):
        offset += os.write(descriptor, framed[offset:])


def _inherited_raw_handle(name):
    value = os.environ.pop(name, None)
    if value is None or not value.isdecimal() or int(value) <= 0:
        raise ValueError("required inherited NVDA directory handle is absent")
    return int(value)


def _normalize(value):
    value = unicodedata.normalize("NFC", value).replace("\r", " ").replace("\n", " ")
    value = " ".join(value.split()).strip()
    if len(value) > MAX_TEXT_CHARS or FORBIDDEN.search(value):
        raise ValueError("speech text violates the closed synthetic-data boundary")
    if value in {"", "A", "P" * 600}:
        return value
    if re.fullmatch(r"([1-4])\1{179}", value):
        return value
    reachable = {0}
    for start in range(len(value) + 1):
        if start not in reachable:
            continue
        for atom in SYNTHETIC_ATOMS:
            if value.startswith(atom, start):
                end = start + len(atom)
                if end == len(value):
                    return value
                if value[end:end + 1] == " ":
                    reachable.add(end + 1)
    raise ValueError("pre-speech request text is outside the exact synthetic grammar")
    return value


class GlobalPlugin(globalPluginHandler.GlobalPlugin):
    def __init__(self):
        super().__init__()
        self._lock = threading.RLock()
        self._control_condition = threading.Condition(self._lock)
        self._active_control = None
        self._control_error = None
        self._control_stopped = False
        self._closing_generation = None
        self._seen_observations = set()
        self._closed_generations = set()
        self._last_control_created = -1
        self._sequences = {}
        self._event_counts = {}
        self._last_event_monotonic = {}
        self._callback_inflight = {}
        self._executable_fd = _inherited_fd("FLUYO_NVDA_EXECUTABLE_HANDLE", os.O_RDONLY)
        self._plugin_fd = _inherited_fd("FLUYO_NVDA_PLUGIN_HANDLE", os.O_RDONLY)
        self._protocol_fd = _inherited_fd("FLUYO_NVDA_PROTOCOL_HANDLE", os.O_RDONLY)
        self._control_fd = _inherited_fd("FLUYO_NVDA_CONTROL_HANDLE", os.O_RDONLY)
        self._ready_fd = _inherited_fd("FLUYO_NVDA_READY_HANDLE", os.O_WRONLY)
        self._speech_fd = _inherited_fd("FLUYO_NVDA_TRANSCRIPT_HANDLE", os.O_WRONLY | os.O_APPEND)
        self._diagnostic_fd = _inherited_fd("FLUYO_NVDA_DIAGNOSTIC_HANDLE", os.O_WRONLY | os.O_APPEND)
        self._raw_handle = _inherited_raw_handle("FLUYO_NVDA_RAW_HANDLE")
        self._config_handle = _inherited_raw_handle("FLUYO_NVDA_CONFIG_HANDLE")
        self._cwd_handle = _inherited_raw_handle("FLUYO_NVDA_CWD_HANDLE")
        controller_pid = os.environ.pop("FLUYO_NVDA_CONTROLLER_PID", None)
        if controller_pid is None or not controller_pid.isdecimal():
            raise ValueError("required NVDA controller PID is absent")
        self._controller_pid = int(controller_pid)
        self._plugin_sha256 = _sha256_bytes(_read_inherited(self._plugin_fd, 65536))
        self._control_thread = threading.Thread(
            target=self._control_reader,
            name="FluyoNvdaControlReader",
            daemon=True,
        )
        self._control_thread.start()
        self._wait_for_first_control()
        pre_speech.register(self._on_speech)
        pre_speechCanceled.register(self._on_cancel)

    def terminate(self):
        pre_speech.unregister(self._on_speech)
        pre_speechCanceled.unregister(self._on_cancel)
        with self._control_condition:
            self._control_stopped = True
            self._control_condition.notify_all()
        for descriptor in (
            self._executable_fd, self._plugin_fd, self._protocol_fd, self._control_fd,
            self._ready_fd, self._speech_fd, self._diagnostic_fd,
        ):
            os.close(descriptor)
        super().terminate()

    def _read_and_validate_control(self):
        raw = _read_pipe_frame(self._control_fd, MAX_LINE_BYTES)
        control = json.loads(raw.decode("utf-8"))
        expected_keys = [
            "schema", "attemptId", "observationId", "generation", "phase", "expectedSpeechContract",
            "controllerPid", "controllerCreationIdentity",
            "brokerPid", "brokerCreationIdentity", "expectedNvdaPid", "nvdaCreationIdentity", "capabilities",
            "pluginSha256", "protocolSha256", "createdMonotonicMilliseconds",
            "expiresMonotonicMilliseconds",
        ]
        if list(control) != expected_keys:
            raise ValueError("control keys changed")
        now = int(time.monotonic() * 1000)
        protocol_sha256 = _read_inherited(self._protocol_fd, 65).decode("ascii").strip()
        speech_contract = control.get("expectedSpeechContract")
        expected_contract = (
            _expected_speech_contract(
                speech_contract.get("stateId"),
                speech_contract.get("localeId"),
                speech_contract.get("fixtureId"),
                speech_contract.get("variantId"),
            )
            if isinstance(speech_contract, dict)
            else None
        )
        if (
            control["schema"] != CONTROL_SCHEMA
            or control["attemptId"] != ATTEMPT_ID
            or control["controllerPid"] != self._controller_pid
            or control["expectedNvdaPid"] != os.getpid()
            or control["capabilities"] != "CONTROL_READ|READY_WRITE|TRANSCRIPT_WRITE|DIAGNOSTIC_WRITE|OWNED_JOB_STOP"
            or control["pluginSha256"] != self._plugin_sha256
            or not re.fullmatch(r"[0-9a-f]{64}", control["observationId"])
            or control["protocolSha256"] != protocol_sha256
            or now < int(control["createdMonotonicMilliseconds"])
            or now > int(control["expiresMonotonicMilliseconds"])
            or control["phase"] not in {"OBSERVE", "CLOSE"}
            or not str(control["generation"]).isdecimal()
            or int(control["generation"]) < 1
            or not isinstance(speech_contract, dict)
            or speech_contract != expected_contract
        ):
            raise ValueError("control identity, writer, hash, or lifetime changed")
        created = int(control["createdMonotonicMilliseconds"])
        observation_id = control["observationId"]
        with self._control_condition:
            generation = int(control["generation"])
            if created < self._last_control_created:
                raise ValueError("control observation replayed or reordered")
            if control["phase"] == "OBSERVE":
                if observation_id in self._seen_observations or generation in self._closed_generations:
                    raise ValueError("control observation replayed or reordered")
                self._seen_observations.add(observation_id)
            elif (
                self._active_control is None
                or self._active_control["observationId"] != observation_id
                or self._active_control["generation"] != control["generation"]
            ):
                raise ValueError("close control does not bind the active observation generation")
            self._last_control_created = created
        return control

    def _ready_payload(self, control):
        ready = {
            "schema": READY_SCHEMA,
            "attemptId": ATTEMPT_ID,
            "observationId": control["observationId"],
            "generation": control["generation"],
            "phase": control["phase"],
            "status": "CONTROL_LATCHED" if control["phase"] == "OBSERVE" else "OBSERVATION_IDLE",
            "controllerPid": control["controllerPid"],
            "controllerCreationIdentity": control["controllerCreationIdentity"],
            "brokerPid": control["brokerPid"],
            "brokerCreationIdentity": control["brokerCreationIdentity"],
            "pluginSha256": self._plugin_sha256,
            "protocolSha256": control["protocolSha256"],
            "nvdaPid": os.getpid(),
            "nvdaCreationIdentity": control["nvdaCreationIdentity"],
            "capabilities": control["capabilities"],
            "controlSha256": _canonical_sha256(control),
            "monotonicMilliseconds": str(int(time.monotonic() * 1000)),
        }
        payload = (json.dumps(ready, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
        _write_pipe_frame(self._ready_fd, payload)

    def _drain_active_generation(self, control):
        """Cross NVDA's event queue, then require a bounded quiet interval.

        CLOSE stays latched while this runs, so a callback queued before the
        barrier is recorded against the closing generation. The reader cannot
        latch the next OBSERVE frame until the queue barrier and quiet period
        both complete.
        """
        drained = threading.Event()
        queueHandler.queueFunction(queueHandler.eventQueue, drained.set)
        if not drained.wait(2.0):
            raise TimeoutError("NVDA event queue did not reach the CLOSE drain barrier")
        key = (control["observationId"], control["generation"])
        quiet_seconds = QUIET_MILLISECONDS / 1000.0
        quiet_started = time.monotonic()
        deadline = time.monotonic() + 2.0
        with self._control_condition:
            while True:
                last_event = self._last_event_monotonic.get(key, quiet_started)
                quiet_remaining = quiet_seconds - (time.monotonic() - last_event)
                inflight = self._callback_inflight.get(key, 0)
                if inflight == 0 and quiet_remaining <= 0:
                    return
                remaining = min(deadline - time.monotonic(), max(quiet_remaining, 0.001))
                if remaining <= 0:
                    raise TimeoutError("NVDA CLOSE did not reach a quiet callback boundary")
                self._control_condition.wait(remaining)

    def _control_reader(self):
        try:
            while True:
                control = self._read_and_validate_control()
                if control["phase"] == "OBSERVE":
                    with self._control_condition:
                        if self._control_stopped:
                            return
                        self._active_control = control
                        self._closing_generation = None
                        self._control_condition.notify_all()
                else:
                    # Mark the generation as closing, then release the condition
                    # before crossing NVDA's queue. A callback ahead of the drain
                    # marker must be able to acquire this lock and finish.
                    with self._control_condition:
                        if self._control_stopped:
                            return
                        self._closing_generation = (
                            control["observationId"], control["generation"]
                        )
                        self._control_condition.notify_all()
                    self._drain_active_generation(control)
                    with self._control_condition:
                        if self._control_stopped:
                            return
                        if (
                            self._active_control is None
                            or self._active_control["observationId"] != control["observationId"]
                            or self._active_control["generation"] != control["generation"]
                            or self._closing_generation
                            != (control["observationId"], control["generation"])
                        ):
                            raise RuntimeError("NVDA CLOSE generation changed during queue drain")
                        self._closed_generations.add(int(control["generation"]))
                        self._active_control = None
                        self._closing_generation = None
                        self._control_condition.notify_all()
                self._ready_payload(control)
        except Exception as error:
            with self._control_condition:
                if not self._control_stopped:
                    self._control_error = error
                self._control_condition.notify_all()

    def _wait_for_first_control(self):
        deadline = time.monotonic() + 10
        with self._control_condition:
            while self._active_control is None and self._control_error is None:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise TimeoutError("initial NVDA control frame timed out")
                self._control_condition.wait(remaining)
            if self._control_error is not None:
                raise self._control_error

    def _latched_control(self):
        with self._control_condition:
            if self._control_error is not None:
                raise self._control_error
            if self._active_control is None:
                raise RuntimeError("no active NVDA observation control is latched")
            return dict(self._active_control)

    def _begin_callback(self):
        with self._control_condition:
            control = self._latched_control()
            key = (control["observationId"], control["generation"])
            self._callback_inflight[key] = self._callback_inflight.get(key, 0) + 1
            return control, key

    def _finish_callback(self, key):
        with self._control_condition:
            self._callback_inflight[key] = max(0, self._callback_inflight.get(key, 1) - 1)
            self._control_condition.notify_all()

    def _append(self, control, kind, priority, text):
        with self._control_condition:
            if (
                self._active_control is None
                or self._active_control["observationId"] != control["observationId"]
                or self._active_control["generation"] != control["generation"]
                or int(control["generation"]) in self._closed_generations
            ):
                raise RuntimeError("NVDA callback crossed a closed observation generation")
            observation_id = control["observationId"]
            sequence = self._sequences.get(observation_id, 0) + 1
            self._sequences[observation_id] = sequence
            record = {
                "schema": PRE_SPEECH_REQUEST_SCHEMA,
                "attemptId": ATTEMPT_ID,
                "observationId": observation_id,
                "generation": control["generation"],
                "sequence": sequence,
                "monotonicMilliseconds": str(int(time.monotonic() * 1000)),
                "kind": kind,
                "priority": priority,
                "text": _normalize(text),
            }
            payload = (json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
            if len(payload) > MAX_LINE_BYTES:
                raise ValueError("pre-speech request line exceeds 4 KiB")
            current = os.fstat(self._speech_fd).st_size
            if current + len(payload) > MAX_TOTAL_BYTES:
                raise ValueError("pre-speech request stream exceeds 2 MiB")
            _write_inherited(self._speech_fd, payload, append=True)
            key = (observation_id, control["generation"])
            self._event_counts[key] = self._event_counts.get(key, 0) + 1
            self._last_event_monotonic[key] = time.monotonic()
            self._control_condition.notify_all()

    def _on_speech(self, speechSequence=None, symbolLevel=None, priority=None):
        del symbolLevel
        text = _normalize(" ".join(item for item in (speechSequence or []) if isinstance(item, str)))
        if not text:
            return
        priority_name = getattr(priority, "name", "NORMAL")
        if priority_name not in {"NORMAL", "NEXT", "NOW"}:
            raise ValueError("speech priority is outside the NVDA-derived closed set")
        control, key = self._begin_callback()
        try:
            self._append(control, "SPEAK", priority_name, text)
        finally:
            self._finish_callback(key)

    def _on_cancel(self):
        control, key = self._begin_callback()
        try:
            self._append(control, "CANCEL", "NORMAL", "")
        finally:
            self._finish_callback(key)
