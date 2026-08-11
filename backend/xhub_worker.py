#!/usr/bin/env python3
"""
CLI shim to process a single event via tasks.process_event_job
"""
import logging
import argparse
from tasks import process_event_job


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--event-id", required=True)
    args = parser.parse_args()
    process_event_job(int(args.event_id))


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    main()
