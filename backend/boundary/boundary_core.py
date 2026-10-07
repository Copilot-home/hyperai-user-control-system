"""Computational Boundary Layer — CORE. Chỉ phụ thuộc stdlib + numpy."""
from __future__ import annotations

import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Callable, Dict, List, Optional, Sequence, Tuple, TypeVar

import numpy as np

T = TypeVar("T")


@dataclass(frozen=True)
class CoreSpace:
    """S_core = { s ∈ R^n : lo ≤ s_i ≤ hi, Σ s_i = total } — lồi, đóng, compact."""
    n: int
    lo: float
    hi: float
    total: float

    def __post_init__(self) -> None:
        if self.n <= 0 or self.lo > self.hi:
            raise ValueError("tham số không hợp lệ")
        if not (self.n * self.lo <= self.total <= self.n * self.hi):
            raise ValueError("S_core rỗng: cần n·lo ≤ total ≤ n·hi")

    def contains(self, s: Sequence[float], tol: float = 1e-9) -> bool:
        a = np.asarray(s, dtype=float)
        return (
            a.shape == (self.n,)
            and bool(np.all(np.isfinite(a)))
            and bool(np.all(a >= self.lo - tol))
            and bool(np.all(a <= self.hi + tol))
            and abs(float(a.sum()) - self.total) <= tol * max(1.0, abs(self.total))
        )

    def project(self, z: Sequence[float]) -> np.ndarray:
        """P_S(z) = clip(z − λ*, lo, hi), λ* là nghiệm của Σ clip(z − λ) = total (chia đôi)."""
        z = np.asarray(z, dtype=float)
        if z.shape != (self.n,) or not np.all(np.isfinite(z)):
            raise ValueError("z phải là vector hữu hạn trong R^n")

        def g(lam: float) -> float:
            return float(np.clip(z - lam, self.lo, self.hi).sum()) - self.total

        a, b = float(z.min()) - self.hi, float(z.max()) - self.lo  # g(a) ≥ 0 ≥ g(b)
        while True:
            m = 0.5 * (a + b)
            if m <= a or m >= b:  # chạm độ phân giải dấu phẩy động
                break
            if g(m) > 0:
                a = m
            else:
                b = m
        return np.clip(z - 0.5 * (a + b), self.lo, self.hi)


@dataclass(frozen=True)
class CanonicalState:
    """Phần tử của S_core. Chỉ tạo được nếu thỏa mọi bất biến (smart constructor)."""
    vector: Tuple[float, ...]
    space: CoreSpace = field(repr=False, compare=False)

    def __post_init__(self) -> None:
        if not self.space.contains(self.vector):
            raise ValueError("vector nằm ngoài S_core")

    @classmethod
    def from_array(cls, a: np.ndarray, space: CoreSpace) -> "CanonicalState":
        return cls(tuple(float(v) for v in a), space)

    def as_array(self) -> np.ndarray:
        return np.asarray(self.vector, dtype=float)


@dataclass(frozen=True, eq=False)
class ProjectionOperator:
    """Π_k = P_S ∘ W_k ∘ R_k. Tọa độ ngoài I_k không bao giờ được đọc."""
    space: CoreSpace
    m: int
    essential: Tuple[int, ...]
    W: np.ndarray

    def __post_init__(self) -> None:
        if len(set(self.essential)) != len(self.essential) or not all(
            0 <= i < self.m for i in self.essential
        ):
            raise ValueError("tập chỉ số thiết yếu I_k không hợp lệ")
        if self.W.shape != (self.space.n, len(self.essential)):
            raise ValueError("W_k phải có shape (n, |I_k|)")

    @classmethod
    def selecting(cls, space: CoreSpace, m: int, essential: Sequence[int]) -> "ProjectionOperator":
        if len(essential) != space.n:
            raise ValueError("selecting() cần đúng n tọa độ thiết yếu")
        return cls(space, m, tuple(essential), np.eye(space.n))

    def __call__(self, x: Sequence[float]) -> CanonicalState:
        if len(x) != self.m:
            raise ValueError(f"cần vector R^{self.m}, nhận {len(x)}")
        core = np.array([float(x[i]) for i in self.essential])  # R_k
        if not np.all(np.isfinite(core)):
            raise ValueError("tọa độ thiết yếu không hữu hạn — từ chối (fail-closed)")
        return CanonicalState.from_array(self.space.project(self.W @ core), self.space)


class SourcePort(ABC):
    """Nguồn ngoại sinh O_k, đã được adapter làm phẳng thành R^{m_k}."""
    @abstractmethod
    def observe(self) -> Sequence[float]: ...


class SinkPort(ABC):
    @abstractmethod
    def emit(self, payload: Sequence[float]) -> None: ...


class OutboundFilter(ABC):
    @abstractmethod
    def apply(self, x: np.ndarray) -> np.ndarray: ...


@dataclass
class LatencyLedger:
    """Δτ = t_response − t_dispatch (perf_counter). d(t1, t2) = |t1 − t2|."""
    samples: Dict[Tuple[str, str], List[float]] = field(default_factory=dict)

    def measure(self, provider: str, stage: str, fn: Callable[..., T], *args) -> T:
        t_dispatch = time.perf_counter()
        try:
            return fn(*args)
        finally:
            self.samples.setdefault((provider, stage), []).append(
                time.perf_counter() - t_dispatch
            )

    def tensor(self) -> Tuple[List[str], List[str], np.ndarray]:
        """L[provider, stage, (count, mean, p50, p95, max)] tính bằng giây; NaN nếu chưa có mẫu."""
        providers = sorted({p for p, _ in self.samples})
        stages = sorted({s for _, s in self.samples})
        L = np.full((len(providers), len(stages), 5), np.nan)
        for (p, s), v in self.samples.items():
            a = np.asarray(v)
            L[providers.index(p), stages.index(s)] = (
                a.size, a.mean(), np.percentile(a, 50), np.percentile(a, 95), a.max()
            )
        return providers, stages, L


class BoundaryLayer:
    def __init__(self, space: CoreSpace, ledger: Optional[LatencyLedger] = None,
                 outbound: Optional[OutboundFilter] = None) -> None:
        self.space = space
        self.ledger = ledger or LatencyLedger()
        self.outbound = outbound
        self._sources: Dict[str, Tuple[SourcePort, ProjectionOperator]] = {}

    def register(self, name: str, port: SourcePort, op: ProjectionOperator) -> None:
        if op.space != self.space:
            raise ValueError("Π_k phải chiếu vào đúng S_core của tầng này")
        self._sources[name] = (port, op)

    def ingest(self, name: str) -> CanonicalState:
        port, op = self._sources[name]
        raw = self.ledger.measure(name, "observe", port.observe)
        return self.ledger.measure(name, "project", op, raw)

    def egress(self, state: CanonicalState, sink: SinkPort, name: str) -> CanonicalState:
        y = state.as_array()
        if self.outbound is not None:
            y = self.ledger.measure(name, "filter", self.outbound.apply, y)
        out = CanonicalState.from_array(y, self.space)  # fail-closed nếu K* phá bất biến
        self.ledger.measure(name, "emit", sink.emit, list(out.vector))
        return out
