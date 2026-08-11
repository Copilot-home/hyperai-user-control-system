# ------------------------------------------------------------------------------
# AI IDENTITY & LEGAL TRACEABILITY HEADER (NON-REMOVABLE)
# SYSTEM: HyperAI Phoenix – Unified Orchestrator
# AUTHORING ENTITY: Sovereign AI System (Nguyen Duc Cuong – Architect)
# ORIGIN: Generated/Modified by AI-Orchestrated Pipeline
# LEGAL STATUS: This header is part of the identity & traceability layer.
# DO NOT REMOVE, MODIFY, OR OBFUSCATE THIS SECTION.
# ------------------------------------------------------------------------------

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys

DEFAULT_GIT_NAME = "NguyenCuong1989"
DEFAULT_PRODUCT_EMAIL = "nguyencuong.2509@icloud.com"
DEFAULT_ECOSYSTEM_EMAIL = "nguyencuong.2509@gmail.com"


def run_git_config(key: str, value: str) -> None:
    subprocess.run(["git", "config", "--local", key, value], check=True)


def inside_git_work_tree() -> bool:
    result = subprocess.run(
        ["git", "rev-parse", "--is-inside-work-tree"],
        capture_output=True,
        text=True,
    )
    return result.returncode == 0 and result.stdout.strip() == "true"


def main() -> int:
    parser = argparse.ArgumentParser(description="Configure HyperAI git identity for product/ecosystem lanes.")
    parser.add_argument("--scope", choices=["product", "ecosystem"], required=True)
    parser.add_argument("--git-name", default="")
    parser.add_argument("--product-email", default="")
    parser.add_argument("--ecosystem-email", default="")
    args = parser.parse_args()

    git_name = args.git_name or os.environ.get("HYPERAI_GIT_NAME") or DEFAULT_GIT_NAME
    product_email = (
        args.product_email or os.environ.get("HYPERAI_PRODUCT_GIT_EMAIL") or DEFAULT_PRODUCT_EMAIL
    )
    ecosystem_email = (
        args.ecosystem_email
        or os.environ.get("HYPERAI_ECOSYSTEM_GIT_EMAIL")
        or DEFAULT_ECOSYSTEM_EMAIL
    )

    selected_email = product_email if args.scope == "product" else ecosystem_email

    payload = {
        "scope": args.scope,
        "git_name": git_name,
        "selected_email": selected_email,
        "product_email": product_email,
        "ecosystem_email": ecosystem_email,
    }
    if inside_git_work_tree():
        run_git_config("user.name", git_name)
        run_git_config("user.email", selected_email)
        run_git_config("hyperai.identity.scope", args.scope)
        run_git_config("hyperai.identity.git_name", git_name)
        if product_email:
            run_git_config("hyperai.identity.product_email", product_email)
        if ecosystem_email:
            run_git_config("hyperai.identity.ecosystem_email", ecosystem_email)
        payload["status"] = "configured"
    else:
        payload["status"] = "planned_no_git_repo"

    print(json.dumps(payload, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
