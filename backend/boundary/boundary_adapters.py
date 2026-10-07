"""Adapters & demo. Phụ thuộc boundary_core; core không bao giờ import file này."""
from __future__ import annotations

import json
import threading
import urllib.request
from dataclasses import dataclass
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Dict, List, Sequence

import numpy as np

from boundary_core import (BoundaryLayer, CoreSpace, OutboundFilter,
                           ProjectionOperator, SinkPort, SourcePort)


class LoopbackConvolution(OutboundFilter):
    """y = K ⊛ x (tích chập vòng) tại nút 127.0.0.1:port.
    K ≥ 0, ΣK = 1 ⇒ y_i là tổ hợp lồi của x ⇒ bất biến của S_core được bảo toàn."""

    def __init__(self, kernel: Sequence[float], port: int = 0, timeout: float = 2.0) -> None:
        k = np.asarray(kernel, dtype=float)
        if k.ndim != 1 or k.size == 0 or np.any(k < 0) or not np.isclose(k.sum(), 1.0):
            raise ValueError("K phải không âm và có tổng bằng 1")
        kern = k / k.sum()
        self.kernel = kern

        class Handler(BaseHTTPRequestHandler):
            def do_POST(self) -> None:
                try:
                    body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
                    x = np.asarray(json.loads(body)["x"], dtype=float)
                    data, code = json.dumps({"y": LoopbackConvolution.circular(kern, x).tolist()}).encode(), 200
                except Exception as exc:  # trả lỗi có cấu trúc, không làm sập server
                    data, code = json.dumps({"error": str(exc)}).encode(), 400
                self.send_response(code)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)

            def log_message(self, *args) -> None:
                pass

        self._server = ThreadingHTTPServer(("127.0.0.1", port), Handler)  # chỉ loopback
        self.address = self._server.server_address
        threading.Thread(target=self._server.serve_forever, daemon=True).start()
        self._opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))  # bỏ proxy hệ thống
        self._timeout = timeout

    @staticmethod
    def circular(k: np.ndarray, x: np.ndarray) -> np.ndarray:
        c = k.size // 2
        return sum(k[j] * np.roll(x, j - c) for j in range(k.size))

    def apply(self, x: np.ndarray) -> np.ndarray:
        req = urllib.request.Request(
            f"http://{self.address[0]}:{self.address[1]}/convolve",
            data=json.dumps({"x": np.asarray(x, dtype=float).tolist()}).encode(),
            headers={"Content-Type": "application/json"}, method="POST",
        )
        with self._opener.open(req, timeout=self._timeout) as resp:
            return np.asarray(json.loads(resp.read())["y"], dtype=float)

    def close(self) -> None:
        self._server.shutdown()
        self._server.server_close()


@dataclass(frozen=True)
class VendorAReading:  # kiểu riêng của provider A — core không hề biết kiểu này
    load: List[float]
    firmware: str
    jitter: float


class VendorASource(SourcePort):
    def __init__(self, readings: Sequence[VendorAReading]) -> None:
        self._it = iter(readings)

    def observe(self) -> Sequence[float]:
        r = next(self._it)
        return [*r.load, r.jitter, float(len(r.firmware))]  # O_A ⊂ R^{n+2}


class DictSource(SourcePort):  # provider B: dict khóa tự do, có NaN ở kênh phụ
    def __init__(self, payload: Dict[str, float], order: Sequence[str]) -> None:
        self._payload, self._order = payload, list(order)

    def observe(self) -> Sequence[float]:
        return [float(self._payload.get(k, float("nan"))) for k in self._order]


class ListSink(SinkPort):
    def __init__(self) -> None:
        self.received: List[List[float]] = []

    def emit(self, payload: Sequence[float]) -> None:
        self.received.append(list(payload))


if __name__ == "__main__":
    import ast
    import pathlib

    import boundary_core

    S = CoreSpace(n=4, lo=0.0, hi=1.0, total=2.0)
    conv = LoopbackConvolution([0.25, 0.5, 0.25])
    layer = BoundaryLayer(S, outbound=conv)

    # Provider A: m_A = 6; tọa độ 0..3 thiết yếu, 4..5 là nhiễu (jitter, firmware)
    layer.register("A", VendorASource([VendorAReading([0.9, 1.7, -0.3, 0.4], "fw-2.1", 13.0)]),
                   ProjectionOperator.selecting(S, 6, (0, 1, 2, 3)))

    # Provider B: m_B = 5, thứ tự khác, kênh phụ là NaN; W_B đổi % → tỉ lệ
    order = ["noise", "c3", "c1", "c0", "c2"]
    layer.register("B", DictSource({"noise": float("nan"), "c0": 50, "c1": 50, "c2": 50, "c3": 50}, order),
                   ProjectionOperator(S, 5, (3, 2, 4, 1), np.eye(4) / 100.0))

    sink = ListSink()
    for name in ("A", "B"):
        s = layer.ingest(name)
        assert S.contains(s.vector)                                  # Π_k(x) ∈ S_core
        assert np.allclose(S.project(s.as_array()), s.as_array())    # lũy đẳng
        out = layer.egress(s, sink, name)
        assert S.contains(out.vector)                                # K* bảo toàn bất biến
        print(f"{name}: Π(x) = {np.round(s.as_array(), 6)}  →  K⊛Π(x) = {np.round(out.as_array(), 6)}")

    rng = np.random.default_rng(0)
    for _ in range(1000):                                            # không giãn
        z1, z2 = rng.normal(size=4) * 3, rng.normal(size=4) * 3
        assert np.linalg.norm(S.project(z1) - S.project(z2)) <= np.linalg.norm(z1 - z2) + 1e-9

    # Mệnh đề 3: kiểm tra tĩnh đồ thị import của core
    tree = ast.parse(pathlib.Path(boundary_core.__file__).read_text(encoding="utf-8"))
    imported = {a.name.split(".")[0] for n in ast.walk(tree) if isinstance(n, ast.Import) for a in n.names}
    imported |= {n.module.split(".")[0] for n in ast.walk(tree) if isinstance(n, ast.ImportFrom) and n.module}
    assert imported <= {"__future__", "abc", "dataclasses", "typing", "time", "numpy"}, imported

    providers, stages, L = layer.ledger.tensor()
    for i, p in enumerate(providers):
        for j, st in enumerate(stages):
            if not np.isnan(L[i, j, 0]):
                print(f"  {p} {st:<8} Δτ_mean = {L[i, j, 1] * 1e6:9.1f} µs   p95 = {L[i, j, 3] * 1e6:9.1f} µs")
    conv.close()
    print("Mọi bất biến: OK")
