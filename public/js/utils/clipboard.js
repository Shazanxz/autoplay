export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {}

  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.appendChild(field);
  field.select();

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {}
  field.remove();
  return copied;
}
