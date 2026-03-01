/**
 * @role utility-module
 * @owns promise-based dialog helpers (alert, confirm, prompt) using native <dialog>
 * @not-owns DOM structure of the dialog element (defined in index.html), styling (defined in styles.css), or business logic
 * @notes Drop-in replacements for window.alert, window.confirm, and window.prompt that avoid blocking the thread.
 */

let dialogEl;
let titleEl;
let messageEl;
let inputEl;
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
  confirmBtn = document.getElementById("dialogConfirm");
  cancelBtn = document.getElementById("dialogCancel");

  if (!dialogEl) {
    throw new Error("Missing required element: #appDialog");
  }
}

function resetDialog() {
  titleEl.textContent = "";
  messageEl.textContent = "";
  inputEl.value = "";
  inputEl.hidden = true;
  cancelBtn.hidden = false;
  confirmBtn.textContent = "OK";
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
    const cleanup = () => {
      confirmBtn.removeEventListener("click", onConfirm);
      dialogEl.removeEventListener("close", onClose);
    };

    const onConfirm = () => {
      cleanup();
      dialogEl.close();
      resolve();
    };

    const onClose = () => {
      cleanup();
      resolve();
    };

    confirmBtn.addEventListener("click", onConfirm);
    dialogEl.addEventListener("close", onClose);
    dialogEl.showModal();
    confirmBtn.focus();
  });
}

/**
 * Shows a confirm dialog. Returns a promise that resolves to true (confirm) or false (cancel).
 */
export function showConfirm(message, { title = "", confirmLabel = "Confirm", cancelLabel = "Cancel" } = {}) {
  ensureElements();
  resetDialog();

  titleEl.textContent = title;
  messageEl.textContent = message;
  confirmBtn.textContent = confirmLabel;
  cancelBtn.textContent = cancelLabel;

  return new Promise((resolve) => {
    const cleanup = () => {
      confirmBtn.removeEventListener("click", onConfirm);
      cancelBtn.removeEventListener("click", onCancel);
      dialogEl.removeEventListener("close", onClose);
    };

    const onConfirm = () => {
      cleanup();
      dialogEl.close();
      resolve(true);
    };

    const onCancel = () => {
      cleanup();
      dialogEl.close();
      resolve(false);
    };

    const onClose = () => {
      cleanup();
      resolve(false);
    };

    confirmBtn.addEventListener("click", onConfirm);
    cancelBtn.addEventListener("click", onCancel);
    dialogEl.addEventListener("close", onClose);
    dialogEl.showModal();
    confirmBtn.focus();
  });
}

/**
 * Shows a prompt dialog. Returns a promise that resolves to the entered string, or null on cancel.
 */
export function showPrompt(message, { title = "", defaultValue = "", confirmLabel = "OK", cancelLabel = "Cancel", placeholder = "" } = {}) {
  ensureElements();
  resetDialog();

  titleEl.textContent = title;
  messageEl.textContent = message;
  inputEl.hidden = false;
  inputEl.value = defaultValue;
  inputEl.placeholder = placeholder;
  confirmBtn.textContent = confirmLabel;
  cancelBtn.textContent = cancelLabel;

  return new Promise((resolve) => {
    const cleanup = () => {
      confirmBtn.removeEventListener("click", onConfirm);
      cancelBtn.removeEventListener("click", onCancel);
      dialogEl.removeEventListener("close", onClose);
      inputEl.removeEventListener("keydown", onKeydown);
    };

    const onConfirm = () => {
      const value = inputEl.value;
      cleanup();
      dialogEl.close();
      resolve(value);
    };

    const onCancel = () => {
      cleanup();
      dialogEl.close();
      resolve(null);
    };

    const onClose = () => {
      cleanup();
      resolve(null);
    };

    const onKeydown = (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        onConfirm();
      }
    };

    confirmBtn.addEventListener("click", onConfirm);
    cancelBtn.addEventListener("click", onCancel);
    dialogEl.addEventListener("close", onClose);
    inputEl.addEventListener("keydown", onKeydown);
    dialogEl.showModal();
    inputEl.focus();
    inputEl.select();
  });
}