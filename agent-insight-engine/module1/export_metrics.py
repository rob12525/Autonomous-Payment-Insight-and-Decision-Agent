"""
Module 1: Metrics Exporter

Generates MetricsSnapshot JSON files following the JSON contract.
This is the boundary where Module 1 (Python) outputs data for Module 2 (TypeScript).

Usage:
    python export_metrics.py [--output-dir ./output]
"""

import json
import argparse
from pathlib import Path
from datetime import datetime
from typing import List
from generator.payment_event_generator import PaymentEventGenerator
from metrics.metrics_aggregator import MetricsAggregator
from utils.models_stub import MetricsSnapshot


def generate_test_scenario(
    duration_seconds: int = 60,
    tps: int = 100,
    issuers: List[str] = None,
    baseline_success_rate: float = 0.99,
    degradation_factor: float = None,
) -> tuple[MetricsSnapshot, MetricsSnapshot]:
    """
    Generate baseline and current metrics for testing.
    
    Args:
        duration_seconds: How long to simulate
        tps: Transactions per second
        issuers: List of issuer names
        baseline_success_rate: Success rate for baseline
        degradation_factor: If set, simulate degradation for current metrics
    
    Returns:
        (baseline_metrics, current_metrics)
    """
    if issuers is None:
        issuers = ["visa", "mastercard", "amex"]

    # Generate baseline (healthy system)
    print(f"Generating baseline metrics (healthy system)...")
    baseline_gen = PaymentEventGenerator(
        tps=tps,
        issuers=issuers,
        merchants=["merchant_a", "merchant_b", "merchant_c"],
        baseline_success_rate=baseline_success_rate,
    )
    baseline_agg = MetricsAggregator(window_minutes=5)

    total_events = duration_seconds * tps
    for _ in range(total_events):
        event = baseline_gen.generate_event()
        baseline_agg.add_event(event)

    baseline_metrics = baseline_agg.snapshot()
    print(f"  OK Generated {total_events} events")
    print(f"    Success Rate: {baseline_metrics.successRate:.2%}")
    print(f"    Retry Ratio: {baseline_metrics.retryRatio:.2%}")
    print()

    # Generate current (potentially degraded system)
    print(f"Generating current metrics (degradation_factor={degradation_factor})...")
    if degradation_factor is None:
        degradation_factor = 1.0  # No degradation by default

    current_gen = PaymentEventGenerator(
        tps=tps,
        issuers=issuers,
        merchants=["merchant_a", "merchant_b", "merchant_c"],
        baseline_success_rate=baseline_success_rate * degradation_factor,
    )
    current_agg = MetricsAggregator(window_minutes=5)

    for _ in range(total_events):
        event = current_gen.generate_event(
            overrides={
                "latency_ms": 500 + int(500 * (1 - degradation_factor)),
            }
        )
        current_agg.add_event(event)

    current_metrics = current_agg.snapshot()
    print(f"  OK Generated {total_events} events")
    print(f"    Success Rate: {current_metrics.successRate:.2%}")
    print(f"    Retry Ratio: {current_metrics.retryRatio:.2%}")
    print()

    return baseline_metrics, current_metrics


def export_metrics_to_json(
    baseline: MetricsSnapshot,
    current: MetricsSnapshot,
    output_dir: Path,
) -> None:
    """
    Export metrics to JSON files following the JSON contract.
    
    Args:
        baseline: Baseline MetricsSnapshot
        current: Current MetricsSnapshot
        output_dir: Directory to write JSON files
    """
    output_dir.mkdir(parents=True, exist_ok=True)

    baseline_path = output_dir / "baseline_metrics.json"
    current_path = output_dir / "current_metrics.json"

    # Write baseline
    with open(baseline_path, 'w') as f:
        f.write(baseline.to_json())
    print(f"OK Exported baseline: {baseline_path}")

    # Write current
    with open(current_path, 'w') as f:
        f.write(current.to_json())
    print(f"OK Exported current: {current_path}")

    # Also print sample for inspection
    print()
    print("Sample (baseline_metrics.json):")
    print(baseline.to_json()[:500] + "...")


def main():
    parser = argparse.ArgumentParser(description="Export metrics following JSON contract")
    parser.add_argument(
        "--output-dir",
        type=str,
        default="./output",
        help="Output directory for JSON files",
    )
    parser.add_argument(
        "--degradation",
        type=float,
        default=0.85,
        help="Degradation factor for current metrics (0-1, lower = worse)",
    )
    parser.add_argument(
        "--duration-seconds",
        type=int,
        default=60,
        help="Duration to simulate (seconds)",
    )
    parser.add_argument(
        "--tps",
        type=int,
        default=100,
        help="Transactions per second",
    )
    args = parser.parse_args()

    print("=" * 60)
    print("Module 1: Metrics Exporter (JSON Contract)")
    print("=" * 60)
    print()

    # Generate scenarios
    baseline, current = generate_test_scenario(
        duration_seconds=args.duration_seconds,
        tps=args.tps,
        degradation_factor=args.degradation,
    )

    # Export to JSON
    output_dir = Path(args.output_dir)
    export_metrics_to_json(baseline, current, output_dir)

    print()
    print("OK Export complete!")
    print(f"   Ready for Module 2 integration at: {output_dir}")


if __name__ == "__main__":
    main()
