const state = {
  schemes: {},
  previewPlan: [],
};

const elements = {
  renameCompany: document.getElementById("renameCompany"),
  folderPath: document.getElementById("folderPath"),
  projectFields: document.getElementById("projectFields"),
  previewBtn: document.getElementById("previewBtn"),
  renameBtn: document.getElementById("renameBtn"),
  previewBody: document.getElementById("previewBody"),
  previewErrors: document.getElementById("previewErrors"),
  manageCompany: document.getElementById("manageCompany"),
  loadSchemeBtn: document.getElementById("loadSchemeBtn"),
  companyName: document.getElementById("companyName"),
  pattern: document.getElementById("pattern"),
  fields: document.getElementById("fields"),
  sequenceStart: document.getElementById("sequenceStart"),
  sequencePadding: document.getElementById("sequencePadding"),
  saveSchemeBtn: document.getElementById("saveSchemeBtn"),
  deleteSchemeBtn: document.getElementById("deleteSchemeBtn"),
  clearEditorBtn: document.getElementById("clearEditorBtn"),
  statusText: document.getElementById("statusText"),
};

function setStatus(message, isError = false) {
  elements.statusText.textContent = message;
  elements.statusText.style.color = isError ? "#991b1b" : "#1e3a8a";
}

function setPreviewErrors(errors) {
  if (!errors || errors.length === 0) {
    elements.previewErrors.classList.add("hidden");
    elements.previewErrors.textContent = "";
    return;
  }

  elements.previewErrors.classList.remove("hidden");
  elements.previewErrors.innerHTML = "";
  const list = document.createElement("ul");
  list.style.margin = "0";
  list.style.paddingLeft = "18px";
  errors.forEach((error) => {
    const item = document.createElement("li");
    item.textContent = error;
    list.appendChild(item);
  });
  elements.previewErrors.appendChild(list);
}

function renderPreview(plan) {
  elements.previewBody.innerHTML = "";
  plan.forEach((item) => {
    const row = document.createElement("tr");
    const from = document.createElement("td");
    const to = document.createElement("td");
    from.textContent = item.source_name;
    to.textContent = item.destination_name;
    row.appendChild(from);
    row.appendChild(to);
    elements.previewBody.appendChild(row);
  });
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch (_error) {
    payload = {};
  }

  if (!response.ok) {
    const errorMessage = payload.error || payload.errors?.join("\n") || "Request failed.";
    throw new Error(errorMessage);
  }

  return payload;
}

function sortedCompanyNames() {
  return Object.keys(state.schemes).sort((a, b) => a.localeCompare(b));
}

function setSelectOptions(selectElement, options, selectedValue = "") {
  selectElement.innerHTML = "";
  options.forEach((optionValue) => {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = optionValue;
    selectElement.appendChild(option);
  });

  if (options.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "(no company schemes)";
    selectElement.appendChild(option);
    selectElement.value = "";
    return;
  }

  if (selectedValue && options.includes(selectedValue)) {
    selectElement.value = selectedValue;
    return;
  }

  selectElement.value = options[0];
}

function renderProjectFields(companyName) {
  elements.projectFields.innerHTML = "";
  const scheme = state.schemes[companyName];
  if (!scheme) {
    return;
  }

  const fields = Array.isArray(scheme.fields) ? scheme.fields : [];
  fields.forEach((fieldName) => {
    const wrapper = document.createElement("label");
    const pretty = String(fieldName).replaceAll("_", " ");
    const caption = pretty.charAt(0).toUpperCase() + pretty.slice(1);
    wrapper.textContent = caption;

    const input = document.createElement("input");
    input.type = "text";
    input.dataset.field = fieldName;
    input.autocomplete = "off";
    if (fieldName.toLowerCase().includes("date")) {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      input.value = `${yyyy}${mm}${dd}`;
    }
    wrapper.appendChild(input);
    elements.projectFields.appendChild(wrapper);
  });
}

function collectProjectDetails() {
  const details = {};
  const inputs = elements.projectFields.querySelectorAll("input[data-field]");
  for (const input of inputs) {
    const key = input.dataset.field;
    const value = input.value.trim();
    if (!value) {
      throw new Error(`Project field '${key}' is required.`);
    }
    details[key] = value;
  }
  return details;
}

function loadSelectedSchemeIntoEditor() {
  const company = elements.manageCompany.value;
  const scheme = state.schemes[company];
  if (!scheme) {
    return;
  }

  elements.companyName.value = company;
  elements.pattern.value = scheme.pattern || "";
  elements.fields.value = Array.isArray(scheme.fields) ? scheme.fields.join(", ") : "";
  elements.sequenceStart.value = Number.isInteger(scheme.sequence_start) ? scheme.sequence_start : 1;
  elements.sequencePadding.value = Number.isInteger(scheme.sequence_padding) ? scheme.sequence_padding : 3;
}

function clearEditor() {
  elements.companyName.value = "";
  elements.pattern.value = "";
  elements.fields.value = "";
  elements.sequenceStart.value = "1";
  elements.sequencePadding.value = "3";
}

async function refreshSchemes(preferredCompany = "") {
  const currentRenameCompany = elements.renameCompany.value;
  const currentManageCompany = elements.manageCompany.value;
  const previousPreferred = preferredCompany || currentRenameCompany || currentManageCompany;

  const payload = await apiRequest("/api/schemes");
  state.schemes = payload.schemes || {};

  const companies = sortedCompanyNames();
  setSelectOptions(elements.renameCompany, companies, previousPreferred);
  setSelectOptions(elements.manageCompany, companies, previousPreferred);
  renderProjectFields(elements.renameCompany.value);

  if (elements.manageCompany.value) {
    loadSelectedSchemeIntoEditor();
  }
}

function buildRenamePayload() {
  return {
    company: elements.renameCompany.value,
    folder_path: elements.folderPath.value.trim(),
    details: collectProjectDetails(),
  };
}

async function previewRenames() {
  try {
    elements.renameBtn.disabled = true;
    const payload = buildRenamePayload();
    const response = await apiRequest("/api/preview", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    state.previewPlan = response.plan || [];
    renderPreview(state.previewPlan);
    setPreviewErrors(response.errors || []);

    if (response.errors && response.errors.length > 0) {
      setStatus("Preview has issues. Resolve errors before renaming.", true);
      return;
    }

    if (state.previewPlan.length === 0) {
      setStatus("No files to rename.");
      return;
    }

    elements.renameBtn.disabled = false;
    setStatus(`Preview ready: ${state.previewPlan.length} files will be renamed.`);
  } catch (error) {
    setPreviewErrors([error.message]);
    renderPreview([]);
    setStatus(error.message, true);
  }
}

async function applyRename() {
  try {
    const payload = buildRenamePayload();
    const shouldContinue = window.confirm(
      `Rename files using '${payload.company}' naming scheme?`
    );
    if (!shouldContinue) {
      return;
    }

    const response = await apiRequest("/api/rename", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    setPreviewErrors([]);
    setStatus(`Renamed ${response.renamed_count} files successfully.`);
    elements.renameBtn.disabled = true;
    await previewRenames();
  } catch (error) {
    setPreviewErrors([error.message]);
    setStatus(error.message, true);
  }
}

async function saveScheme() {
  try {
    const company = elements.companyName.value.trim();
    const pattern = elements.pattern.value.trim();
    const fields = elements.fields.value
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    const sequenceStart = Number.parseInt(elements.sequenceStart.value, 10);
    const sequencePadding = Number.parseInt(elements.sequencePadding.value, 10);

    if (!Number.isInteger(sequenceStart) || !Number.isInteger(sequencePadding)) {
      throw new Error("Sequence start and sequence padding must be integers.");
    }

    const response = await apiRequest("/api/schemes", {
      method: "POST",
      body: JSON.stringify({
        company,
        pattern,
        fields,
        sequence_start: sequenceStart,
        sequence_padding: sequencePadding,
      }),
    });

    await refreshSchemes(company);
    elements.manageCompany.value = company;
    elements.renameCompany.value = company;
    renderProjectFields(company);
    setStatus(response.message || `Saved scheme for '${company}'.`);
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function deleteScheme() {
  try {
    const company = elements.companyName.value.trim();
    if (!company) {
      throw new Error("Enter or load a company name to delete.");
    }

    const shouldDelete = window.confirm(`Delete naming scheme for '${company}'?`);
    if (!shouldDelete) {
      return;
    }

    const response = await apiRequest(`/api/schemes/${encodeURIComponent(company)}`, {
      method: "DELETE",
    });

    clearEditor();
    await refreshSchemes();
    renderPreview([]);
    setPreviewErrors([]);
    elements.renameBtn.disabled = true;
    setStatus(response.message || `Deleted scheme for '${company}'.`);
  } catch (error) {
    setStatus(error.message, true);
  }
}

function bindEvents() {
  elements.renameCompany.addEventListener("change", () => {
    renderProjectFields(elements.renameCompany.value);
    elements.renameBtn.disabled = true;
    setPreviewErrors([]);
  });

  elements.manageCompany.addEventListener("change", loadSelectedSchemeIntoEditor);
  elements.loadSchemeBtn.addEventListener("click", loadSelectedSchemeIntoEditor);
  elements.clearEditorBtn.addEventListener("click", clearEditor);
  elements.saveSchemeBtn.addEventListener("click", saveScheme);
  elements.deleteSchemeBtn.addEventListener("click", deleteScheme);
  elements.previewBtn.addEventListener("click", previewRenames);
  elements.renameBtn.addEventListener("click", applyRename);
}

async function initialize() {
  bindEvents();
  try {
    await refreshSchemes();
    setStatus("Ready. Select a company and preview file renames.");
  } catch (error) {
    setStatus(`Failed to load schemes: ${error.message}`, true);
  }
}

initialize();
