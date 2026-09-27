"""Isolated patch validation and test execution service (Phase 7).

Executes generated patches and regression tests inside a non-privileged,
ephemeral Docker container with network=none and strict resource limits.
Never executes generated code directly on the PatchPilot API host.
"""

import logging
import os
import re
import shutil
import subprocess
import tempfile
import time
from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.repository import Repository
from app.models.issue import Issue
from app.models.analysis_run import AnalysisRun
from app.models.patch import Patch
from app.models.regression_test import RegressionTest
from app.models.release_readiness import ReleaseReadiness
from app.models.validation_run import ValidationRun

logger = logging.getLogger(__name__)

# Security & Path Traversal Guards
_SUSPICIOUS_PATH_PATTERNS = re.compile(
    r"(\.\.[/\\]|[/\\]\.\.|^[/\\]|[a-zA-Z]:[/\\]|/etc/|~[/\\])",
    re.IGNORECASE,
)

# Denylist for secret-like files — must NEVER be placed in workspace
_SECRET_FILENAME_PATTERN = re.compile(
    r"(^|[/\\])(\.env(\..*)?|.*\.pem|.*\.key|id_rsa\w*|.*secret.*|.*credential.*|.*password.*|"
    r"\.npmrc|\.pypirc|.*\.pfx|.*\.p12)$",
    re.IGNORECASE,
)

# Supported safe test commands (conservative whitelist)
_SAFE_COMMANDS = {
    "pytest": ["pytest", "-v", "-o", "pythonpath=."],
    "python -m pytest": ["python", "-m", "pytest", "-v"],
    "unittest": ["python", "-m", "unittest", "-v"],
    "python -m unittest": ["python", "-m", "unittest", "-v"],
}


@dataclass
class ValidationResult:
    """Outcome of an isolated validation run."""

    status: str  # "passed" | "failed" | "timeout" | "validation_unavailable" | "setup_failed"
    tests_run: bool = False
    exit_code: Optional[int] = None
    stdout: str = ""
    stderr: str = ""
    duration_ms: int = 0
    summary: str = ""
    failure_reason: Optional[str] = None
    executed_command: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class ValidationService:
    """Manages the lifecycle of isolated validation workspaces and container executions."""

    def __init__(self):
        self._docker_available: Optional[bool] = None

    def is_docker_available(self) -> bool:
        """Check if Docker CLI and daemon are operational without throwing."""
        if not settings.VALIDATION_ENABLED:
            return False

        try:
            res = subprocess.run(
                ["docker", "info"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            return res.returncode == 0
        except Exception as exc:
            logger.warning("Docker is not available on host: %s", exc)
            return False

    def validate_patch_and_test(
        self,
        repository: Repository,
        issue: Optional[Issue],
        patch_diff: Optional[str],
        target_files: List[str],
        test_code: Optional[str],
        test_file: Optional[str] = None,
        test_command: Optional[str] = None,
        source_files: Optional[Dict[str, str]] = None,
        timeout_seconds: Optional[int] = None,
    ) -> ValidationResult:
        """Execute validation of a patch and regression test in a sandboxed container."""
        start_time = time.time()
        timeout = timeout_seconds or settings.VALIDATION_TIMEOUT_SECONDS

        # 1. Verify safe execution infrastructure availability
        if not self.is_docker_available():
            return ValidationResult(
                status="validation_unavailable",
                tests_run=False,
                summary="Validation could not be completed safely. No host-side execution was attempted.",
                failure_reason="Docker sandbox is unavailable or disabled on host.",
            )

        # 2. Validate paths for path traversal & suspicious patterns
        test_file_path = test_file or "tests/test_regression.py"
        all_paths = list(target_files or []) + [test_file_path]
        for path in all_paths:
            if not path:
                continue
            if _SUSPICIOUS_PATH_PATTERNS.search(path):
                return ValidationResult(
                    status="setup_failed",
                    tests_run=False,
                    summary="Validation setup failed: unsafe path detected.",
                    failure_reason=f"Path traversal or invalid path detected: {path}",
                )
            if _SECRET_FILENAME_PATTERN.search(path):
                return ValidationResult(
                    status="setup_failed",
                    tests_run=False,
                    summary="Validation setup failed: secret-like file referenced.",
                    failure_reason=f"Secret-like file excluded from validation workspace: {path}",
                )

        # 3. Detect and validate test command
        cmd_args = self._resolve_test_command(test_command, repository.language)
        if not cmd_args:
            return ValidationResult(
                status="validation_unavailable",
                tests_run=False,
                summary="Validation could not be completed safely. Unsupported test runner.",
                failure_reason=f"Unsupported test command or runtime for language '{repository.language}'.",
            )

        # 4. Prepare isolated workspace directory
        workspace_dir = None
        try:
            workspace_dir = tempfile.mkdtemp(prefix="patchpilot-val-")

            # Copy or write pre-existing source files (excluding any secret-like files)
            if source_files:
                for rel_path, content in source_files.items():
                    if _SUSPICIOUS_PATH_PATTERNS.search(rel_path) or _SECRET_FILENAME_PATTERN.search(rel_path):
                        continue
                    dest = os.path.realpath(os.path.join(workspace_dir, rel_path))
                    if not dest.startswith(os.path.realpath(workspace_dir)):
                        continue
                    os.makedirs(os.path.dirname(dest), exist_ok=True)
                    with open(dest, "w", encoding="utf-8", errors="replace") as f:
                        f.write(content)
                    self._ensure_package_inits(workspace_dir, dest)

            # Apply patch if present
            if patch_diff:
                apply_err = self._apply_patch_to_workspace(workspace_dir, patch_diff)
                if apply_err:
                    return ValidationResult(
                        status="setup_failed",
                        tests_run=False,
                        summary="Validation setup failed: unable to apply proposed patch.",
                        failure_reason=apply_err,
                    )

            # Write regression test code
            if test_code:
                test_dest = os.path.realpath(os.path.join(workspace_dir, test_file_path))
                if not test_dest.startswith(os.path.realpath(workspace_dir)):
                    return ValidationResult(
                        status="setup_failed",
                        tests_run=False,
                        summary="Validation setup failed: test path escapes workspace.",
                        failure_reason=f"Test path escapes workspace: {test_file_path}",
                    )
                os.makedirs(os.path.dirname(test_dest), exist_ok=True)
                with open(test_dest, "w", encoding="utf-8", errors="replace") as f:
                    f.write(test_code)
                self._ensure_package_inits(workspace_dir, test_dest)

            # 5. Execute container in sandbox
            container_result = self._run_docker_container(
                workspace_dir=workspace_dir,
                cmd_args=cmd_args,
                timeout=timeout,
            )

            duration_ms = int((time.time() - start_time) * 1000)
            container_result.duration_ms = duration_ms
            container_result.executed_command = " ".join(cmd_args)
            return container_result

        except Exception as exc:
            logger.exception("Unexpected error during validation workspace execution: %s", exc)
            return ValidationResult(
                status="setup_failed",
                tests_run=False,
                summary="Validation setup failed unexpectedly.",
                failure_reason=f"Internal error: {str(exc)}",
            )
        finally:
            if workspace_dir and os.path.exists(workspace_dir):
                shutil.rmtree(workspace_dir, ignore_errors=True)

    def _resolve_test_command(self, requested_cmd: Optional[str], language: Optional[str]) -> Optional[List[str]]:
        """Conservatively determine safe test command; never allow arbitrary shell commands."""
        lang = (language or "python").lower()

        if requested_cmd:
            cleaned = requested_cmd.strip().lower()
            if cleaned in _SAFE_COMMANDS:
                return _SAFE_COMMANDS[cleaned]
            return None

        if lang == "python":
            return ["pytest", "-v", "-o", "pythonpath=."]

        return None

    def _apply_patch_to_workspace(self, workspace_dir: str, patch_diff: str) -> Optional[str]:
        """Safely apply unified diff inside temporary workspace directory.

        Returns None on success, or an error string on failure.
        """
        if not patch_diff or not patch_diff.strip():
            return None

        # Check for path traversal in diff headers
        for line in patch_diff.splitlines():
            if line.startswith("--- ") or line.startswith("+++ "):
                path_part = line[4:].strip().split("\t")[0]
                # Strip leading a/ or b/
                if path_part.startswith("a/") or path_part.startswith("b/"):
                    path_part = path_part[2:]
                if _SUSPICIOUS_PATH_PATTERNS.search(path_part) or _SECRET_FILENAME_PATTERN.search(path_part):
                    return f"Diff references suspicious or secret file: {path_part}"

        # Write diff to file inside workspace
        patch_file = os.path.join(workspace_dir, ".patchpilot_patch.diff")
        with open(patch_file, "w", encoding="utf-8") as f:
            f.write(patch_diff)

        # Attempt to apply diff using git apply or custom minimal hunk applier
        # Since git might be available in host or git apply inside workspace
        try:
            res = subprocess.run(
                ["git", "apply", "--ignore-whitespace", "--recount", patch_file],
                cwd=workspace_dir,
                capture_output=True,
                text=True,
                timeout=10,
            )
            if res.returncode == 0:
                return None
        except Exception:
            pass

        # If git apply was not available or failed on host without git repo, apply directly via minimal parser
        return self._apply_unified_diff_fallback(workspace_dir, patch_diff)

    def _apply_unified_diff_fallback(self, workspace_dir: str, patch_diff: str) -> Optional[str]:
        """Pure-Python best-effort unified diff applier for single/multi-file changes."""
        try:
            lines = patch_diff.splitlines()
            current_target = None
            files_to_hunks: Dict[str, List[List[str]]] = {}
            current_hunk: List[str] = []

            for line in lines:
                if line.startswith("+++ "):
                    if current_target and current_hunk:
                        files_to_hunks.setdefault(current_target, []).append(current_hunk)
                        current_hunk = []
                    raw_path = line[4:].strip().split("\t")[0]
                    if raw_path.startswith("b/"):
                        raw_path = raw_path[2:]
                    current_target = raw_path
                elif line.startswith("@@"):
                    if current_target and current_hunk:
                        files_to_hunks.setdefault(current_target, []).append(current_hunk)
                        current_hunk = []
                    current_hunk.append(line)
                elif current_target:
                    current_hunk.append(line)

            if current_target and current_hunk:
                files_to_hunks.setdefault(current_target, []).append(current_hunk)

            if not files_to_hunks:
                return "Malformed patch: no valid unified diff hunks found."

            for target_rel, hunk_list in files_to_hunks.items():
                target_dest = os.path.realpath(os.path.join(workspace_dir, target_rel))
                if not target_dest.startswith(os.path.realpath(workspace_dir)):
                    return f"Target path escapes workspace: {target_rel}"

                existing_content = ""
                if os.path.exists(target_dest):
                    with open(target_dest, "r", encoding="utf-8", errors="replace") as f:
                        existing_content = f.read()

                updated_text = existing_content
                for hunk in hunk_list:
                    updated_text = self._apply_single_hunk(updated_text, hunk)

                os.makedirs(os.path.dirname(target_dest), exist_ok=True)
                with open(target_dest, "w", encoding="utf-8") as f:
                    f.write(updated_text)
                self._ensure_package_inits(workspace_dir, target_dest)

            return None
        except Exception as exc:
            return f"Failed to apply unified diff: {str(exc)}"

    def _ensure_package_inits(self, workspace_dir: str, file_path: str) -> None:
        """Create empty __init__.py in ancestor directories inside workspace if missing."""
        try:
            curr = os.path.dirname(os.path.realpath(file_path))
            ws_real = os.path.realpath(workspace_dir)
            while curr and curr != ws_real and curr.startswith(ws_real):
                init_file = os.path.join(curr, "__init__.py")
                if not os.path.exists(init_file):
                    with open(init_file, "w", encoding="utf-8") as f:
                        f.write("")
                curr = os.path.dirname(curr)
        except Exception:
            pass

    def _apply_single_hunk(self, orig_text: str, hunk_lines: List[str]) -> str:
        """Apply a single unified diff hunk to text content."""
        orig_lines = orig_text.splitlines() if orig_text else []
        pre_image = []
        post_image = []
        for hl in hunk_lines:
            if hl.startswith("-") and not hl.startswith("---"):
                pre_image.append(hl[1:])
            elif hl.startswith("+") and not hl.startswith("+++"):
                post_image.append(hl[1:])
            elif hl.startswith(" "):
                pre_image.append(hl[1:])
                post_image.append(hl[1:])
            elif hl == "":
                pre_image.append("")
                post_image.append("")

        if not orig_lines or not pre_image:
            return "\n".join(post_image) + "\n"

        n = len(pre_image)
        # 1. Exact match
        for i in range(len(orig_lines) - n + 1):
            if orig_lines[i : i + n] == pre_image:
                new_lines = orig_lines[:i] + post_image + orig_lines[i + n :]
                return "\n".join(new_lines) + "\n"

        # 2. Stripped match for whitespace leniency
        pre_stripped = [l.strip() for l in pre_image]
        for i in range(len(orig_lines) - n + 1):
            if [l.strip() for l in orig_lines[i : i + n]] == pre_stripped:
                new_lines = orig_lines[:i] + post_image + orig_lines[i + n :]
                return "\n".join(new_lines) + "\n"

        # 3. Fallback
        return "\n".join(post_image) + "\n"

    def _run_docker_container(
        self,
        workspace_dir: str,
        cmd_args: List[str],
        timeout: int,
    ) -> ValidationResult:
        """Execute test command inside ephemeral, resource-constrained container."""
        image = getattr(settings, "VALIDATION_SANDBOX_IMAGE", None) or settings.VALIDATION_DOCKER_IMAGE

        docker_cmd = [
            "docker", "run", "--rm",
            "--network", settings.VALIDATION_NETWORK_MODE,
            "--memory", settings.VALIDATION_MEMORY_LIMIT,
            "--cpus", str(settings.VALIDATION_CPU_LIMIT),
            "--security-opt", "no-new-privileges",
            "--cap-drop", "ALL",
            "-v", f"{workspace_dir}:/workspace:rw",
            "-w", "/workspace",
            image,
            *cmd_args,
        ]

        try:
            proc = subprocess.run(
                docker_cmd,
                capture_output=True,
                text=True,
                timeout=timeout,
            )

            stdout = self._sanitize_output(proc.stdout, workspace_dir)
            stderr = self._sanitize_output(proc.stderr, workspace_dir)

            if proc.returncode == 0:
                summary = self._extract_test_summary(stdout) or "All isolated validation tests passed."
                return ValidationResult(
                    status="passed",
                    tests_run=True,
                    exit_code=0,
                    stdout=stdout,
                    stderr=stderr,
                    summary=summary,
                    failure_reason=None,
                )
            else:
                summary = self._extract_test_summary(stdout) or f"Validation tests failed with exit code {proc.returncode}."
                failure = f"Process exited with non-zero code {proc.returncode}."
                return ValidationResult(
                    status="failed",
                    tests_run=True,
                    exit_code=proc.returncode,
                    stdout=stdout,
                    stderr=stderr,
                    summary=summary,
                    failure_reason=failure,
                )

        except subprocess.TimeoutExpired as exc:
            stdout = self._sanitize_output(exc.stdout or "", workspace_dir)
            stderr = self._sanitize_output(exc.stderr or "", workspace_dir)
            return ValidationResult(
                status="timeout",
                tests_run=True,
                exit_code=None,
                stdout=stdout,
                stderr=stderr,
                summary=f"Validation timed out after {timeout} seconds.",
                failure_reason=f"Execution exceeded the {timeout}s timeout limit.",
            )
        except Exception as exc:
            return ValidationResult(
                status="validation_unavailable",
                tests_run=False,
                summary="Validation failed to launch sandbox container.",
                failure_reason=f"Container execution error: {str(exc)}",
            )

    def _sanitize_output(self, output: Optional[str], workspace_dir: str) -> str:
        """Scrub host workspace paths and truncate output to maximum limit."""
        if not output:
            return ""

        # Remove local host workspace directory references
        sanitized = output.replace(workspace_dir, "/workspace")
        sanitized = sanitized.replace(workspace_dir.replace("\\", "/"), "/workspace")

        # Truncate if exceeds limit
        max_bytes = settings.VALIDATION_MAX_OUTPUT_BYTES
        if len(sanitized) > max_bytes:
            sanitized = (
                sanitized[:max_bytes]
                + f"\n\n[... truncated by PatchPilot: output exceeded {max_bytes} characters ...]"
            )
        return sanitized

    def _extract_test_summary(self, stdout: str) -> Optional[str]:
        """Extract high-level test counts like 'X passed, Y failed' from output."""
        match = re.search(r"(=+\s*[\d\w\s,]+in\s+[\d\.]+s\s*=+|[\d]+\s+passed[^\n]*)", stdout, re.IGNORECASE)
        if match:
            return match.group(0).strip("= ")
        return None

    def persist_validation_result(
        self,
        db: Session,
        analysis_run_id: int,
        repository_id: int,
        issue_id: Optional[int],
        validation_result: ValidationResult,
    ) -> ValidationRun:
        """Durable record creation for validation results and update of related artifacts."""
        val_run = ValidationRun(
            analysis_run_id=analysis_run_id,
            repository_id=repository_id,
            issue_id=issue_id,
            status=validation_result.status,
            tests_run=validation_result.tests_run,
            exit_code=validation_result.exit_code,
            stdout=validation_result.stdout,
            stderr=validation_result.stderr,
            duration_ms=validation_result.duration_ms,
            summary=validation_result.summary,
            failure_reason=validation_result.failure_reason,
            executed_command=validation_result.executed_command,
        )
        db.add(val_run)
        db.flush()

        # Update RegressionTest execution_status if row exists for this analysis_run
        reg_test = (
            db.query(RegressionTest)
            .filter(RegressionTest.analysis_run_id == analysis_run_id)
            .first()
        )
        if reg_test:
            if validation_result.status == "passed":
                reg_test.execution_status = "Executed — Passed"
            elif validation_result.status == "failed":
                reg_test.execution_status = "Executed — Failed"
            elif validation_result.status == "timeout":
                reg_test.execution_status = "Execution Timeout"
            elif validation_result.status in ("validation_unavailable", "setup_failed"):
                reg_test.execution_status = "Validation Unavailable"

        # Update ReleaseReadiness if present
        release_row = (
            db.query(ReleaseReadiness)
            .filter(ReleaseReadiness.analysis_run_id == analysis_run_id)
            .first()
        )
        if release_row:
            if validation_result.status == "passed":
                # Only mark ready if no other blocking reasons exist
                existing_blocking = [b for b in (release_row.blocking_reasons or []) if "Validation" not in b]
                release_row.blocking_reasons = existing_blocking
                release_row.release_ready = len(existing_blocking) == 0
                release_row.status = "human_review_required" if release_row.release_ready else "blocked"
            else:
                release_row.release_ready = False
                release_row.status = "blocked"
                blocking = list(release_row.blocking_reasons or [])
                val_block = f"Validation failed: {validation_result.failure_reason or validation_result.summary}"
                if val_block not in blocking:
                    blocking.append(val_block)
                release_row.blocking_reasons = blocking

        db.commit()
        db.refresh(val_run)
        return val_run


validation_service = ValidationService()
