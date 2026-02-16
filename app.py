#!/usr/bin/env python3
"""Desktop file renaming tool with per-company naming schemes."""

from __future__ import annotations

import json
import re
import uuid
from datetime import date
from pathlib import Path
from typing import Any

try:
    from tkinter import BOTH, END, LEFT, VERTICAL, W, filedialog, messagebox, Tk, StringVar
    from tkinter import ttk

    TK_AVAILABLE = True
except ModuleNotFoundError:
    BOTH = END = LEFT = VERTICAL = W = None  # type: ignore[assignment]
    filedialog = messagebox = ttk = None  # type: ignore[assignment]
    Tk = Any  # type: ignore[assignment,misc]
    StringVar = Any  # type: ignore[assignment,misc]
    TK_AVAILABLE = False

CONFIG_PATH = Path(__file__).parent / "company_schemes.json"
INVALID_FILENAME_CHARS = re.compile(r'[\\/:*?"<>|]+')

DEFAULT_SCHEMES = {
    "Acme Design": {
        "pattern": "{client}_{project_code}_{deliverable}_{date}_{seq}",
        "fields": ["client", "project_code", "deliverable", "date"],
        "sequence_start": 1,
        "sequence_padding": 3,
    },
    "BluePeak Engineering": {
        "pattern": "{project_code}-{phase}-{drawing_type}-{seq}-{ext}",
        "fields": ["project_code", "phase", "drawing_type"],
        "sequence_start": 100,
        "sequence_padding": 4,
    },
}

TOKEN_HELP = (
    "Available pattern tokens: {seq}, {company}, {original_name}, {original_filename}, "
    "{ext}, {ext_with_dot}, plus your custom fields."
)


def sanitize_filename(filename: str) -> str:
    """Remove unsupported path characters and normalize whitespace."""
    cleaned = INVALID_FILENAME_CHARS.sub("-", filename).strip()
    cleaned = re.sub(r"\s+", "_", cleaned)
    cleaned = cleaned.strip(".")
    return cleaned or "untitled"


def normalize_field_name(value: str) -> str:
    """Normalize custom field names to safe placeholder identifiers."""
    normalized = value.strip().lower()
    normalized = re.sub(r"[^a-z0-9_]+", "_", normalized)
    normalized = re.sub(r"_+", "_", normalized).strip("_")
    return normalized


def ensure_valid_schemes(raw_data: object) -> dict[str, dict[str, object]]:
    """Validate loaded config and return clean schemes."""
    if not isinstance(raw_data, dict):
        return DEFAULT_SCHEMES.copy()

    clean: dict[str, dict[str, object]] = {}
    for company_name, scheme in raw_data.items():
        if not isinstance(company_name, str) or not company_name.strip():
            continue
        if not isinstance(scheme, dict):
            continue

        pattern = str(scheme.get("pattern", "")).strip()
        if not pattern:
            continue

        raw_fields = scheme.get("fields", [])
        if isinstance(raw_fields, str):
            raw_fields = [field.strip() for field in raw_fields.split(",")]
        if not isinstance(raw_fields, list):
            raw_fields = []

        fields = []
        for field in raw_fields:
            if not isinstance(field, str):
                continue
            normalized = normalize_field_name(field)
            if normalized and normalized not in fields:
                fields.append(normalized)

        try:
            sequence_start = int(scheme.get("sequence_start", 1))
        except (TypeError, ValueError):
            sequence_start = 1
        try:
            sequence_padding = int(scheme.get("sequence_padding", 3))
        except (TypeError, ValueError):
            sequence_padding = 3

        clean[company_name.strip()] = {
            "pattern": pattern,
            "fields": fields,
            "sequence_start": max(0, sequence_start),
            "sequence_padding": max(1, sequence_padding),
        }

    return clean or DEFAULT_SCHEMES.copy()


def load_schemes() -> dict[str, dict[str, object]]:
    """Load company naming schemes from disk."""
    if not CONFIG_PATH.exists():
        save_schemes(DEFAULT_SCHEMES.copy())
        return DEFAULT_SCHEMES.copy()

    try:
        with CONFIG_PATH.open("r", encoding="utf-8") as config_file:
            data = json.load(config_file)
    except (json.JSONDecodeError, OSError):
        if messagebox is not None:
            messagebox.showwarning(
                "Config warning",
                "Could not read company_schemes.json. Using defaults instead.",
            )
        else:
            print("Config warning: Could not read company_schemes.json. Using defaults instead.")
        data = DEFAULT_SCHEMES.copy()
        save_schemes(data)

    return ensure_valid_schemes(data)


def save_schemes(schemes: dict[str, dict[str, object]]) -> None:
    """Persist schemes to JSON config."""
    normalized = ensure_valid_schemes(schemes)
    with CONFIG_PATH.open("w", encoding="utf-8") as config_file:
        json.dump(normalized, config_file, indent=2, sort_keys=True)


class FileRenamingTool:
    """Main application controller."""

    def __init__(self, root: Tk) -> None:
        if not TK_AVAILABLE:
            raise RuntimeError("Tkinter is required to run this GUI app.")

        self.root = root
        self.root.title("Company File Naming Tool")
        self.root.geometry("1120x720")

        self.schemes = load_schemes()
        self.project_fields: dict[str, StringVar] = {}
        self.preview_plan: list[dict[str, Path | str]] = []

        self.selected_company = StringVar()
        self.selected_folder = StringVar()
        self.status_message = StringVar(value="Choose a company and folder, then click Preview.")

        self.manage_selected_company = StringVar()
        self.manage_company_name = StringVar()
        self.manage_pattern = StringVar()
        self.manage_fields = StringVar()
        self.manage_sequence_start = StringVar(value="1")
        self.manage_sequence_padding = StringVar(value="3")

        self._build_ui()
        self._refresh_company_dropdowns()

    def _build_ui(self) -> None:
        notebook = ttk.Notebook(self.root)
        notebook.pack(fill=BOTH, expand=True, padx=12, pady=12)

        rename_tab = ttk.Frame(notebook)
        manage_tab = ttk.Frame(notebook)
        notebook.add(rename_tab, text="Rename Files")
        notebook.add(manage_tab, text="Manage Company Schemes")

        self._build_rename_tab(rename_tab)
        self._build_manage_tab(manage_tab)

    def _build_rename_tab(self, parent: ttk.Frame) -> None:
        parent.columnconfigure(1, weight=1)
        parent.rowconfigure(5, weight=1)

        ttk.Label(parent, text="Company:").grid(row=0, column=0, sticky=W, padx=6, pady=6)
        self.company_combo = ttk.Combobox(parent, state="readonly", textvariable=self.selected_company)
        self.company_combo.grid(row=0, column=1, sticky="ew", padx=6, pady=6)
        self.company_combo.bind("<<ComboboxSelected>>", self._on_company_selected)

        ttk.Label(parent, text="Project folder:").grid(row=1, column=0, sticky=W, padx=6, pady=6)
        folder_entry = ttk.Entry(parent, textvariable=self.selected_folder)
        folder_entry.grid(row=1, column=1, sticky="ew", padx=6, pady=6)
        ttk.Button(parent, text="Browse", command=self._choose_folder).grid(
            row=1, column=2, sticky="ew", padx=6, pady=6
        )

        ttk.Label(parent, text=TOKEN_HELP, foreground="#525252").grid(
            row=2, column=0, columnspan=3, sticky=W, padx=6, pady=(0, 8)
        )

        ttk.Label(parent, text="Project details:").grid(row=3, column=0, sticky="nw", padx=6, pady=6)
        self.project_fields_frame = ttk.Frame(parent)
        self.project_fields_frame.grid(row=3, column=1, columnspan=2, sticky="ew", padx=6, pady=6)
        self.project_fields_frame.columnconfigure(1, weight=1)

        controls = ttk.Frame(parent)
        controls.grid(row=4, column=0, columnspan=3, sticky=W, padx=6, pady=(6, 10))
        ttk.Button(controls, text="Preview Renames", command=self.preview_renames).pack(side=LEFT)
        self.rename_button = ttk.Button(controls, text="Apply Rename", command=self.apply_rename, state="disabled")
        self.rename_button.pack(side=LEFT, padx=8)

        self.preview_tree = ttk.Treeview(parent, columns=("from", "to"), show="headings", height=18)
        self.preview_tree.heading("from", text="Current Name")
        self.preview_tree.heading("to", text="Renamed To")
        self.preview_tree.column("from", width=460, anchor="w")
        self.preview_tree.column("to", width=460, anchor="w")
        self.preview_tree.grid(row=5, column=0, columnspan=2, sticky="nsew", padx=6, pady=6)

        scrollbar = ttk.Scrollbar(parent, orient=VERTICAL, command=self.preview_tree.yview)
        scrollbar.grid(row=5, column=2, sticky="ns", padx=(0, 6), pady=6)
        self.preview_tree.configure(yscrollcommand=scrollbar.set)

        ttk.Label(parent, textvariable=self.status_message, foreground="#264e86").grid(
            row=6, column=0, columnspan=3, sticky=W, padx=6, pady=8
        )

    def _build_manage_tab(self, parent: ttk.Frame) -> None:
        parent.columnconfigure(1, weight=1)

        ttk.Label(parent, text="Saved company scheme:").grid(row=0, column=0, sticky=W, padx=6, pady=6)
        self.manage_company_combo = ttk.Combobox(
            parent, state="readonly", textvariable=self.manage_selected_company
        )
        self.manage_company_combo.grid(row=0, column=1, sticky="ew", padx=6, pady=6)
        self.manage_company_combo.bind("<<ComboboxSelected>>", self._load_selected_scheme_into_editor)

        ttk.Label(parent, text="Company name:").grid(row=1, column=0, sticky=W, padx=6, pady=6)
        ttk.Entry(parent, textvariable=self.manage_company_name).grid(row=1, column=1, sticky="ew", padx=6, pady=6)

        ttk.Label(parent, text="Naming pattern:").grid(row=2, column=0, sticky=W, padx=6, pady=6)
        ttk.Entry(parent, textvariable=self.manage_pattern).grid(row=2, column=1, sticky="ew", padx=6, pady=6)

        ttk.Label(parent, text="Required fields (comma-separated):").grid(
            row=3, column=0, sticky=W, padx=6, pady=6
        )
        ttk.Entry(parent, textvariable=self.manage_fields).grid(row=3, column=1, sticky="ew", padx=6, pady=6)

        ttk.Label(parent, text="Sequence start:").grid(row=4, column=0, sticky=W, padx=6, pady=6)
        ttk.Spinbox(parent, textvariable=self.manage_sequence_start, from_=0, to=999999, width=12).grid(
            row=4, column=1, sticky=W, padx=6, pady=6
        )

        ttk.Label(parent, text="Sequence padding:").grid(row=5, column=0, sticky=W, padx=6, pady=6)
        ttk.Spinbox(parent, textvariable=self.manage_sequence_padding, from_=1, to=12, width=12).grid(
            row=5, column=1, sticky=W, padx=6, pady=6
        )

        button_row = ttk.Frame(parent)
        button_row.grid(row=6, column=0, columnspan=2, sticky=W, padx=6, pady=(10, 8))
        ttk.Button(button_row, text="Load into editor", command=self._load_selected_scheme_into_editor).pack(
            side=LEFT
        )
        ttk.Button(button_row, text="Save scheme", command=self.save_scheme).pack(side=LEFT, padx=8)
        ttk.Button(button_row, text="Delete scheme", command=self.delete_scheme).pack(side=LEFT, padx=8)
        ttk.Button(button_row, text="Clear editor", command=self.clear_editor).pack(side=LEFT, padx=8)

        help_text = (
            "Pattern examples:\n"
            "  {project_code}_{deliverable}_{date}_{seq}\n"
            "  {company}-{phase}-{original_name}-{seq}-{ext}\n\n"
            + TOKEN_HELP
        )
        ttk.Label(parent, text=help_text, foreground="#525252", justify=LEFT).grid(
            row=7, column=0, columnspan=2, sticky=W, padx=6, pady=8
        )

    def _refresh_company_dropdowns(self, preferred_company: str | None = None) -> None:
        company_names = sorted(self.schemes.keys())
        self.company_combo["values"] = company_names
        self.manage_company_combo["values"] = company_names

        if not company_names:
            self.selected_company.set("")
            self.manage_selected_company.set("")
            self._render_project_fields("")
            return

        target_company = preferred_company if preferred_company in company_names else company_names[0]
        self.selected_company.set(target_company)
        self.manage_selected_company.set(target_company)
        self._render_project_fields(target_company)
        self._load_scheme_into_editor(target_company)

    def _choose_folder(self) -> None:
        selected = filedialog.askdirectory(title="Select folder containing files to rename")
        if selected:
            self.selected_folder.set(selected)
            self.status_message.set(f"Selected folder: {selected}")

    def _on_company_selected(self, _event: object | None = None) -> None:
        company = self.selected_company.get().strip()
        self._render_project_fields(company)
        if company in self.schemes:
            self.manage_selected_company.set(company)
            self._load_scheme_into_editor(company)

    def _render_project_fields(self, company: str) -> None:
        for child in self.project_fields_frame.winfo_children():
            child.destroy()
        self.project_fields.clear()

        scheme = self.schemes.get(company)
        if not scheme:
            return

        fields = scheme.get("fields", [])
        if not isinstance(fields, list):
            fields = []

        for row_index, field_name in enumerate(fields):
            if not isinstance(field_name, str):
                continue

            label_text = field_name.replace("_", " ").title() + ":"
            default_value = date.today().strftime("%Y%m%d") if "date" in field_name else ""
            field_value = StringVar(value=default_value)

            ttk.Label(self.project_fields_frame, text=label_text).grid(
                row=row_index, column=0, sticky=W, padx=4, pady=4
            )
            ttk.Entry(self.project_fields_frame, textvariable=field_value).grid(
                row=row_index, column=1, sticky="ew", padx=4, pady=4
            )
            self.project_fields[field_name] = field_value

    def _collect_project_details(self) -> dict[str, str]:
        details: dict[str, str] = {}
        for field_name, variable in self.project_fields.items():
            value = variable.get().strip()
            if not value:
                raise ValueError(f"Project field '{field_name}' is required.")
            details[field_name] = value
        return details

    def _build_preview_plan(self) -> tuple[list[dict[str, Path | str]], list[str]]:
        company = self.selected_company.get().strip()
        folder_path = self.selected_folder.get().strip()
        scheme = self.schemes.get(company)

        if not scheme:
            return [], ["Please select a valid company scheme."]
        if not folder_path:
            return [], ["Please choose a project folder."]

        folder = Path(folder_path)
        if not folder.exists() or not folder.is_dir():
            return [], ["Selected project folder does not exist or is not a directory."]

        files = sorted(path for path in folder.iterdir() if path.is_file())
        if not files:
            return [], ["No files found in selected folder."]

        try:
            details = self._collect_project_details()
        except ValueError as exc:
            return [], [str(exc)]

        pattern = str(scheme.get("pattern", "")).strip()
        if not pattern:
            return [], ["Current company scheme has an empty pattern."]

        sequence_start = int(scheme.get("sequence_start", 1))
        sequence_padding = int(scheme.get("sequence_padding", 3))

        uses_extension_token = "{ext}" in pattern or "{ext_with_dot}" in pattern
        plan: list[dict[str, Path | str]] = []
        errors: list[str] = []
        seen_targets: set[str] = set()
        source_paths = set(files)

        for offset, file_path in enumerate(files):
            sequence_value = str(sequence_start + offset).zfill(sequence_padding)
            context = {
                **details,
                "seq": sequence_value,
                "company": company,
                "index": sequence_value,
                "original_name": file_path.stem,
                "original_filename": file_path.name,
                "ext": file_path.suffix.lstrip("."),
                "ext_with_dot": file_path.suffix,
            }

            try:
                proposed_name = pattern.format_map(context)
            except KeyError as exc:
                errors.append(f"Pattern references unknown field {exc}.")
                break
            except ValueError as exc:
                errors.append(f"Pattern format is invalid: {exc}")
                break

            proposed_name = sanitize_filename(proposed_name)

            if not uses_extension_token and file_path.suffix:
                has_extension = bool(Path(proposed_name).suffix)
                if not has_extension:
                    proposed_name = f"{proposed_name}{file_path.suffix}"

            destination = folder / proposed_name
            if proposed_name in seen_targets:
                errors.append(f"Duplicate target filename generated: '{proposed_name}'")
                continue
            seen_targets.add(proposed_name)

            if destination.exists() and destination not in source_paths and destination != file_path:
                errors.append(f"Target '{proposed_name}' already exists and is not in the rename set.")
                continue

            plan.append({"source": file_path, "destination": destination})

        return plan, errors

    def preview_renames(self) -> None:
        plan, errors = self._build_preview_plan()
        self.preview_plan = plan

        for row in self.preview_tree.get_children():
            self.preview_tree.delete(row)

        for item in plan:
            self.preview_tree.insert("", END, values=(item["source"].name, item["destination"].name))

        if errors:
            self.rename_button.configure(state="disabled")
            self.status_message.set("Preview has issues. Resolve errors before renaming.")
            messagebox.showerror("Preview errors", "\n".join(errors))
            return

        if not plan:
            self.rename_button.configure(state="disabled")
            self.status_message.set("No files to rename.")
            return

        self.rename_button.configure(state="normal")
        self.status_message.set(f"Preview ready: {len(plan)} files will be renamed.")

    def apply_rename(self) -> None:
        plan, errors = self._build_preview_plan()
        if errors:
            messagebox.showerror("Cannot rename files", "\n".join(errors))
            self.rename_button.configure(state="disabled")
            return
        if not plan:
            messagebox.showinfo("Nothing to rename", "No files are available to rename.")
            self.rename_button.configure(state="disabled")
            return

        should_continue = messagebox.askyesno(
            "Confirm rename",
            f"Rename {len(plan)} files using '{self.selected_company.get()}' scheme?",
        )
        if not should_continue:
            return

        temp_records: list[dict[str, Path]] = []
        finalized_records: list[dict[str, Path]] = []
        batch_id = uuid.uuid4().hex[:10]

        try:
            for index, item in enumerate(plan):
                source = item["source"]
                temp_path = source.with_name(f".rename_tmp_{batch_id}_{index}")
                source.rename(temp_path)
                temp_records.append(
                    {
                        "original": source,
                        "temp": temp_path,
                        "destination": item["destination"],
                    }
                )

            for record in temp_records:
                record["temp"].rename(record["destination"])
                finalized_records.append(record)

        except OSError as exc:
            # Best-effort rollback to avoid leaving files in temp names.
            for record in reversed(temp_records):
                temp_path = record["temp"]
                original_path = record["original"]
                destination_path = record["destination"]

                if temp_path.exists():
                    try:
                        temp_path.rename(original_path)
                    except OSError:
                        pass
                elif destination_path.exists() and not original_path.exists():
                    try:
                        destination_path.rename(original_path)
                    except OSError:
                        pass

            messagebox.showerror("Rename failed", f"Error while renaming files:\n{exc}")
            self.status_message.set("Rename failed. Any possible rollback was attempted.")
            self.rename_button.configure(state="disabled")
            return

        self.status_message.set(f"Successfully renamed {len(finalized_records)} files.")
        self.rename_button.configure(state="disabled")
        self.preview_renames()
        messagebox.showinfo("Rename complete", f"Renamed {len(finalized_records)} files successfully.")

    def _load_selected_scheme_into_editor(self, _event: object | None = None) -> None:
        company = self.manage_selected_company.get().strip()
        self._load_scheme_into_editor(company)

    def _load_scheme_into_editor(self, company: str) -> None:
        scheme = self.schemes.get(company)
        if not scheme:
            return

        self.manage_company_name.set(company)
        self.manage_pattern.set(str(scheme.get("pattern", "")))
        fields = scheme.get("fields", [])
        if isinstance(fields, list):
            self.manage_fields.set(", ".join(str(field) for field in fields))
        else:
            self.manage_fields.set("")
        self.manage_sequence_start.set(str(int(scheme.get("sequence_start", 1))))
        self.manage_sequence_padding.set(str(int(scheme.get("sequence_padding", 3))))

    def clear_editor(self) -> None:
        self.manage_selected_company.set("")
        self.manage_company_name.set("")
        self.manage_pattern.set("")
        self.manage_fields.set("")
        self.manage_sequence_start.set("1")
        self.manage_sequence_padding.set("3")

    def save_scheme(self) -> None:
        company_name = self.manage_company_name.get().strip()
        pattern = self.manage_pattern.get().strip()
        field_input = self.manage_fields.get().strip()

        if not company_name:
            messagebox.showerror("Validation error", "Company name is required.")
            return
        if not pattern:
            messagebox.showerror("Validation error", "Naming pattern is required.")
            return

        fields = []
        if field_input:
            for raw_field in field_input.split(","):
                normalized = normalize_field_name(raw_field)
                if normalized and normalized not in fields:
                    fields.append(normalized)

        try:
            sequence_start = int(self.manage_sequence_start.get().strip())
            sequence_padding = int(self.manage_sequence_padding.get().strip())
        except ValueError:
            messagebox.showerror("Validation error", "Sequence start and padding must be integers.")
            return

        if sequence_start < 0 or sequence_padding < 1:
            messagebox.showerror("Validation error", "Sequence start must be >= 0 and padding must be >= 1.")
            return

        self.schemes[company_name] = {
            "pattern": pattern,
            "fields": fields,
            "sequence_start": sequence_start,
            "sequence_padding": sequence_padding,
        }
        save_schemes(self.schemes)
        self.schemes = load_schemes()
        self._refresh_company_dropdowns(preferred_company=company_name)
        self.status_message.set(f"Saved scheme for '{company_name}'.")
        messagebox.showinfo("Saved", f"Scheme saved for '{company_name}'.")

    def delete_scheme(self) -> None:
        company_name = self.manage_company_name.get().strip()
        if not company_name:
            messagebox.showerror("Validation error", "Enter or load a company name to delete.")
            return
        if company_name not in self.schemes:
            messagebox.showerror("Validation error", f"No saved scheme found for '{company_name}'.")
            return

        should_delete = messagebox.askyesno(
            "Delete company scheme",
            f"Delete naming scheme for '{company_name}'?",
        )
        if not should_delete:
            return

        del self.schemes[company_name]
        if not self.schemes:
            self.schemes = DEFAULT_SCHEMES.copy()

        save_schemes(self.schemes)
        self.schemes = load_schemes()
        self.clear_editor()
        self._refresh_company_dropdowns()
        self.status_message.set(f"Deleted scheme for '{company_name}'.")


def main() -> None:
    if not TK_AVAILABLE:
        raise SystemExit(
            "Tkinter is not installed. Install python3-tk to run this GUI tool "
            "(for example: sudo apt-get install python3-tk)."
        )

    root = Tk()
    style = ttk.Style(root)
    if "clam" in style.theme_names():
        style.theme_use("clam")
    FileRenamingTool(root)
    root.mainloop()


if __name__ == "__main__":
    main()
