// A one-field "enter a name" dialog. Electron does not support window.prompt().
// Loaded as a plain script before renderer.js.
(function (root) {
  /** Resolves with the trimmed text, or null when cancelled. */
  function askForText(dialog, { title, label, placeholder = '', confirmLabel = 'OK' }) {
    if (dialog.open) return Promise.resolve(null);

    const part = (name) => dialog.querySelector(`[data-input-dialog="${name}"]`);
    const form = part('form');
    const input = part('input');
    const confirm = part('confirm');
    const cancel = part('cancel');

    part('title').textContent = title;
    part('label').textContent = label;
    confirm.textContent = confirmLabel;
    input.placeholder = placeholder;
    input.value = '';
    confirm.disabled = true;
    // Kept from the last time otherwise, and Esc does not change it
    dialog.returnValue = '';

    return new Promise((resolve) => {
      const onInput = () => { confirm.disabled = !input.value.trim(); };
      const onSubmit = (event) => {
        event.preventDefault();
        if (input.value.trim()) dialog.close('ok');
      };
      const onCancel = () => dialog.close();
      const onClose = () => {
        input.removeEventListener('input', onInput);
        form.removeEventListener('submit', onSubmit);
        cancel.removeEventListener('click', onCancel);
        dialog.removeEventListener('close', onClose);
        resolve(dialog.returnValue === 'ok' ? input.value.trim() : null);
      };
      input.addEventListener('input', onInput);
      form.addEventListener('submit', onSubmit);
      cancel.addEventListener('click', onCancel);
      dialog.addEventListener('close', onClose);
      dialog.showModal();
      input.focus();
    });
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { askForText };
  root.askForText = askForText;
})(globalThis);
