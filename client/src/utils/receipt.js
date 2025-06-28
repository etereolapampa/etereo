// ↓ crea este archivo
import api from '../api';

export async function downloadReceipt(id) {
  const { data } = await api.get(`/stock/movements/${id}/receipt.png`, {
    responseType: 'blob'
  });

  const url = URL.createObjectURL(
    new Blob([data], { type: 'image/png' })
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = `comprobante_${id}.png`;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  a.remove();
}
