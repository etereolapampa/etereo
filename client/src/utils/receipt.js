// utils/receipt.js
import api from '../api';

export async function downloadReceipt(id) {
  try {
    // pedimos el PNG como blob
    const { data } = await api.get(`/stock/movements/${id}/receipt.png`, {
      responseType: 'blob'
    });

    // creamos URL temporal y disparamos la descarga
    const blobUrl = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `comprobante_${id}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.error(err);
  }
}
