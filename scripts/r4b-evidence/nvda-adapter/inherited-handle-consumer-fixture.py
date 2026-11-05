"""NON_EVIDENCE Windows inherited-handle consumer fixture."""

import hashlib
import json
import msvcrt
import os
import struct
import sys


def main():
    if len(sys.argv) != 11 or any(not value.isdecimal() for value in sys.argv[1:]):
        raise ValueError("exact ten-handle NVDA schema is required")
    binary = getattr(os, "O_BINARY", 0)
    executable_fd = msvcrt.open_osfhandle(int(sys.argv[1]), os.O_RDONLY | binary)
    plugin_fd = msvcrt.open_osfhandle(int(sys.argv[2]), os.O_RDONLY | binary)
    protocol_fd = msvcrt.open_osfhandle(int(sys.argv[3]), os.O_RDONLY | binary)
    control_fd = msvcrt.open_osfhandle(int(sys.argv[4]), os.O_RDONLY | binary)
    ready_fd = msvcrt.open_osfhandle(int(sys.argv[5]), os.O_WRONLY | binary)
    transcript_fd = msvcrt.open_osfhandle(int(sys.argv[6]), os.O_WRONLY | os.O_APPEND | binary)
    diagnostic_fd = msvcrt.open_osfhandle(int(sys.argv[7]), os.O_WRONLY | os.O_APPEND | binary)
    directory_handles = [int(value) for value in sys.argv[8:11]]
    try:
        if any(handle <= 0 for handle in directory_handles):
            raise ValueError("directory handles are absent")
        for descriptor in (executable_fd, plugin_fd, protocol_fd):
            os.lseek(descriptor, 0, os.SEEK_SET)
        executable_digest = hashlib.sha256(os.read(executable_fd, 4096)).hexdigest()
        plugin_digest = hashlib.sha256(os.read(plugin_fd, 4096)).hexdigest()
        protocol = os.read(protocol_fd, 65).decode("ascii").strip()
        length = struct.unpack("<I", os.read(control_fd, 4))[0]
        chunks = []
        remaining = length
        while remaining:
            chunk = os.read(control_fd, remaining)
            if not chunk:
                raise ValueError("injected control frame is truncated")
            chunks.append(chunk)
            remaining -= len(chunk)
        control_raw = b"".join(chunks)
        control = json.loads(control_raw.decode("utf-8"))
        expected = [
            "schema", "attemptId", "observationId", "generation", "phase", "expectedSpeechContract", "controllerPid",
            "controllerCreationIdentity", "brokerPid", "brokerCreationIdentity",
            "expectedNvdaPid", "nvdaCreationIdentity", "capabilities",
            "pluginSha256", "protocolSha256", "createdMonotonicMilliseconds",
            "expiresMonotonicMilliseconds",
        ]
        if list(control) != expected or control["expectedNvdaPid"] != os.getpid() or control["protocolSha256"] != protocol:
            raise ValueError("injected control schema or identity changed")
        ready = json.dumps({
            "schema": "fluyo:r4b:nvda-ready:v1",
            "attemptId": "attempt-002-observer",
            "observationId": control["observationId"],
            "generation": control["generation"],
            "phase": control["phase"],
            "status": "CONTROL_LATCHED",
            "controllerPid": control["controllerPid"],
            "controllerCreationIdentity": control["controllerCreationIdentity"],
            "brokerPid": control["brokerPid"],
            "brokerCreationIdentity": control["brokerCreationIdentity"],
            "pluginSha256": control["pluginSha256"],
            "protocolSha256": control["protocolSha256"],
            "nvdaPid": os.getpid(),
            "nvdaCreationIdentity": control["nvdaCreationIdentity"],
            "capabilities": control["capabilities"],
            "controlSha256": hashlib.sha256(control_raw).hexdigest(),
            "monotonicMilliseconds": "1",
        }, separators=(",", ":")).encode()
        os.write(ready_fd, struct.pack("<I", len(ready)) + ready)
        os.write(transcript_fd, (plugin_digest + "\n").encode())
        os.write(diagnostic_fd, (executable_digest + "\n").encode())
    finally:
        for descriptor in (diagnostic_fd, transcript_fd, ready_fd, control_fd, protocol_fd, plugin_fd, executable_fd):
            os.close(descriptor)


if __name__ == "__main__":
    main()
