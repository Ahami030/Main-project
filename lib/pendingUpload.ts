// Hands a file picked/dropped on the dashboard "+" card over to /Client/quotation, so it
// goes through the one real upload flow (PDF check, size limit, deadline field, n8n).
// Module state survives client-side navigation (router.push) but not a full reload —
// then the customer simply picks the file again on the upload form.

let pending: File | null = null;

export function setPendingUpload(file: File) {
  pending = file;
}

// returns the file once, then clears it
export function takePendingUpload(): File | null {
  const f = pending;
  pending = null;
  return f;
}
