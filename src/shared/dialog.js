/**
 * @role utility-module
 * @owns promise-based dialog helpers (alert, confirm, prompt, form prompt) using native <dialog>
 * @not-owns DOM structure of the dialog element (defined in index.html), styling (defined in styles.css), or business logic
 * @notes Drop-in replacements for window.alert, window.confirm, and window.prompt that avoid blocking the thread.
 */

let dialogEl;
let titleEl;
let messageEl;
let inputEl;
let fieldsEl;
let confirmBtn;
let cancelBtn;

function ensureElements() {
  if (dialogEl) {
    return;
  }

  dialogEl = document.getElementById("appDialog");
  titleEl = document.getElementById("dialogTitle");
  messageEl = document.getElementById("dialogMessage");
  inputEl = document.getElementById("dialogInput");
  fieldsEl = document.getElementById("dialogFields");
  confirmBtn = document.getElementById("dialogConfirm");
  cancelBtn = document.getElementById("dialogCancel");

  if (!dialogEl) {
    throw new Error("Missing required element: #appDialog");
  }

  if (!titleEl) {
    throw new Error("Missing required element: #dialogTitle");
  }

  if (!messageEl) {
    throw new Error("Missing required element: #dialogMessage");
  }

  if (!inputEl) {
    throw new Error("Missing required element: #dialogInput");
  }

  if (!fieldsEl) {
    throw new Error("Missing required element: #dialogFields");
  }

  if (!confirmBtn) {
    throw new Error("Missing required element: #dialogConfirm");
  }

  if (!cancelBtn) {
    throw new Error("Missing required element: #dialogCancel");
  }
}

function resetDialog() {
  titleEl.textContent = "";
  messageEl.textContent = "";

  inputEl.value = "";
  inputEl.placeholder = "";
  inputEl.hidden = true;

  fieldsEl.innerHTML = "";
  fieldsEl.hidden = true;

  cancelBtn.hidden = false;
  cancelBtn.textContent = "Cancel";
  confirmBtn.textContent = "OK";
}

function showManagedDialog({
  focusEl = null,
  selectFocus = false,
  keydownTargets = [],
  onConfirm,
  onCancel,
}) {
  return new Promise((resolve) => {
    let settled = false;

    const cleanup = () => {
      confirmBtn.removeEventListener("click", handleConfirm);
      cancelBtn.removeEventListener("click", handleCancel);
      dialogEl.removeEventListener("close", handleClose);

      keydownTargets.forEach((target) => {
        target.removeEventListener("keydown", handleKeydown);
      });
    };

    const settle = (value, { shouldClose = true } = {}) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();

      if (shouldClose && dialogEl.open) {
        dialogEl.close();
      }

      resolve(value);
    };

    const handleConfirm = () => {
      onConfirm(settle);
    };

    const handleCancel = () => {
      if (onCancel) {
        onCancel(settle);
        return;
      }

      settle(null);
    };

    const handleClose = () => {
      settle(null, { shouldClose: false });
    };

    const handleKeydown = (event) => {
      if (event.key !== "Enter" || event.shiftKey) {
        return;
      }

      const target = event.target;

      if (target instanceof HTMLTextAreaElement) {
        return;
      }

      event.preventDefault();
      handleConfirm();
    };

    confirmBtn.addEventListener("click", handleConfirm);
    cancelBtn.addEventListener("click", handleCancel);
    dialogEl.addEventListener("close", handleClose);

    keydownTargets.forEach((target) => {
      target.addEventListener("keydown", handleKeydown);
    });

    dialogEl.showModal();

    if (focusEl) {
      focusEl.focus();

      if (selectFocus && typeof focusEl.select === "function") {
        focusEl.select();
      }
    } else {
      confirmBtn.focus();
    }
  });
}

/**
 * Shows an alert dialog. Returns a promise that resolves when dismissed.
 */
export function showAlert(message, { title = "" } = {}) {
  ensureElements();
  resetDialog();

  titleEl.textContent = title;
  messageEl.textContent = message;
  cancelBtn.hidden = true;

  return new Promise((resolve) => {
    let settled = false;

    const cleanup = () => {
      confirmBtn.removeEventListener("click", handleConfirm);
      dialogEl.removeEventListener("close", handleClose);
    };

    const settle = (shouldClose) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();

      if (shouldClose && dialogEl.open) {
        dialogEl.close();
      }

      resolve();
    };

    const handleConfirm = () => {
      settle(true);
    };

    const handleClose = () => {
      settle(false);
    };

    confirmBtn.addEventListener("click", handleConfirm);
    dialogEl.addEventListener("close", handleClose);
    dialogEl.showModal();
    confirmBtn.focus();
  });
}

/**
 * Shows a confirm dialog. Returns a promise that resolves to true (confirm) or false (cancel).
 */
export function showConfirm(
  message,
  { title = "", confirmLabel = "Confirm", cancelLabel = "Cancel" } = {},
) {
  ensureElements();
  resetDialog();

  titleEl.textContent = title;
  messageEl.textContent = message;
  confirmBtn.textContent = confirmLabel;
  cancelBtn.textContent = cancelLabel;

  return showManagedDialog({
    focusEl: confirmBtn,
    onConfirm: (settle) => {
      settle(true);
    },
    onCancel: (settle) => {
      settle(false);
    },
  });
}

/**
 * Shows a prompt dialog. Returns a promise that resolves to the entered string, or null on cancel.
 */
export function showPrompt(
  message,
  {
    title = "",
    defaultValue = "",
    confirmLabel = "OK",
    cancelLabel = "Cancel",
    placeholder = "",
  } = {},
) {
  ensureElements();
  resetDialog();

  titleEl.textContent = title;
  messageEl.textContent = message;
  inputEl.hidden = false;
  inputEl.value = defaultValue;
  inputEl.placeholder = placeholder;
  confirmBtn.textContent = confirmLabel;
  cancelBtn.textContent = cancelLabel;

  return showManagedDialog({
    focusEl: inputEl,
    selectFocus: true,
    keydownTargets: [inputEl],
    onConfirm: (settle) => {
      settle(inputEl.value);
    },
    onCancel: (settle) => {
      settle(null);
    },
  });
}

/**
 * Shows a multi-field prompt dialog. Returns a promise that resolves to a keyed object, or null on cancel.
 */
export function showFormPrompt(
  message,
  {
    title = "",
    confirmLabel = "OK",
    cancelLabel = "Cancel",
    fields = [],
  } = {},
) {
  ensureElements();
  resetDialog();

  titleEl.textContent = title;
  messageEl.textContent = message;
  confirmBtn.textContent = confirmLabel;
  cancelBtn.textContent = cancelLabel;
  fieldsEl.hidden = false;

  const fieldControls = fields.map((field, index) => {
    const wrapper = document.createElement("label");
    wrapper.className = "dialog-field";

    const label = document.createElement("span");
    label.className = "dialog-field-label";
    label.textContent = field.label ?? field.name;

    const controlId = `dialogField-${index}-${field.name}`;

    let control;

    if (field.multiline) {
      control = document.createElement("textarea");
      control.rows = field.rows ?? 3;
      control.className = "dialog-textarea";
    } else {
      control = document.createElement("input");
      control.type = field.type ?? "text";
      control.className = "dialog-input";
    }

    control.id = controlId;
    control.name = field.name;
    control.placeholder = field.placeholder ?? "";
    control.value = field.defaultValue ?? "";
    control.required = Boolean(field.required);

    wrapper.appendChild(label);
    wrapper.appendChild(control);
    fieldsEl.appendChild(wrapper);

    return {
      field,
      control,
    };
  });

  const focusTarget = fieldControls[0]?.control ?? confirmBtn;

  return showManagedDialog({
    focusEl: focusTarget,
    selectFocus: focusTarget instanceof HTMLInputElement,
    onConfirm: (settle) => {
      const values = {};

      for (const { field, control } of fieldControls) {
        const value = control.value ?? "";

        if (field.required && !value.trim()) {
          control.focus();

          if (typeof control.reportValidity === "function") {
            control.reportValidity();
          }

          return;
        }

        values[field.name] = value;
      }

      settle(values);
    },
    onCancel: (settle) => {
      settle(null);
    },
  });
}