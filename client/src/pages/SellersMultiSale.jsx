// SellerMultiSale.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Form, Button, Card } from 'react-bootstrap';
import api from '../api';
import { useSucursales } from '../hooks/useStaticData';
import Modal from '../components/Modal';
import { todayAR } from '../utils/date';

export default function SellerMultiSale () {
  const { id: sellerId } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const editId = search.get('edit');                       // ?edit=...

  /* ───────── estado ──────── */
  const { sucursales } = useSucursales();
  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);
  const [branch, setBranch]   = useState('');
  const [date, setDate]       = useState(todayAR());
  const [items, setItems]     = useState([]);              // [{productId, quantity, price}]
  const [obs,   setObs]       = useState('');
  const [error, setError]     = useState('');
  const [showModal,setShowModal]=useState(false);

  /* ───────── carga vendedor + productos + (movimiento) ──────── */
  useEffect(()=>{
    (async()=>{
      try{
        const [vRes,pRes] = await Promise.all([
          api.get(`/sellers/${sellerId}`),
          api.get('/products')
        ]);
        setSeller(vRes.data);
        setProducts(pRes.data);

        if (editId){
          const {data:m} = await api.get(`/stock/movements/${editId}`);
          setBranch(m.branch);
          setDate(m.date.slice(0,10));
          setItems(m.items.map(it=>({...it, price:it.price.toFixed(2)})));
          setObs(m.observations||'');
        }
      }catch(e){ setError('No se pudieron cargar los datos'); }
    })();
  },[sellerId,editId]);

  /* ───────── helpers interfaz ──────── */
  const addRow = ()=> setItems([...items,{productId:'',quantity:1,price:''}]);
  const updateRow = (i,key,val)=>{
    const clone=[...items]; clone[i][key]=val; setItems(clone);
  };
  const removeRow = i => setItems(items.filter((_,idx)=>idx!==i));

  /* ───────── submit ──────── */
  const handleSubmit = async e=>{
    e.preventDefault(); setError('');

    if(!branch) return setError('Seleccione sucursal');
    if(!items.length) return setError('Agregue al menos un producto');
    if(items.some(it=>!it.productId||!it.price||!it.quantity))
      return setError('Complete todos los ítems');

    try{
      const payload = { sellerId, branch, date, observations:obs,
                        items: items.map(it=>({
                          productId:it.productId,
                          quantity :Number(it.quantity),
                          price    :Number(it.price)
                        })) };
      if(editId) await api.put(`/stock/movements/${editId}`, payload);
      else       await api.post('/stock/sale-multi', payload);
      setShowModal(true);
    }catch(err){
      setError(err.response?.data?.error||'Error al guardar');
    }
  };

  /* ───────── render ──────── */
  if(!seller || !products.length) return <div>Cargando…</div>;
  return (
    <>
      <h2>{editId?'Editar':'Registrar'} venta a {seller.name} {seller.lastname}</h2>
      {error && <div className="alert alert-danger">{error}</div>}

      <Form onSubmit={handleSubmit} className="mb-4">
        <Form.Group className="mb-3" style={{maxWidth:350}}>
          <Form.Label>Fecha</Form.Label>
          <Form.Control type="date" value={date} onChange={e=>setDate(e.target.value)} required/>
        </Form.Group>

        <Form.Group className="mb-3" style={{maxWidth:350}}>
          <Form.Label>Sucursal</Form.Label>
          <Form.Select value={branch} onChange={e=>setBranch(e.target.value)} required>
            <option value="">Seleccione</option>
            {sucursales.map(s=><option key={s.id} value={s.nombre}>{s.nombre}</option>)}
          </Form.Select>
        </Form.Group>

        {/* ===== tabla de productos ===== */}
        <Card className="mb-3">
          <Card.Header className="d-flex justify-content-between align-items-center">
            <span>Ítems</span>
            <Button size="sm" variant="outline-success" onClick={addRow}>➕ Agregar</Button>
          </Card.Header>
          <Card.Body className="p-0">
            <table className="table mb-0">
              <thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th></th></tr></thead>
              <tbody>
                {items.map((it,i)=>(
                  <tr key={i}>
                    <td style={{minWidth:200}}>
                      <Form.Select
                        value={it.productId}
                        onChange={e=>updateRow(i,'productId',e.target.value)}
                      >
                        <option value="">-</option>
                        {products.map(p=><option key={p._id} value={p._id}>{p.name}</option>)}
                      </Form.Select>
                    </td>
                    <td style={{width:90}}>
                      <Form.Control type="number" min="1"
                        value={it.quantity}
                        onChange={e=>updateRow(i,'quantity',e.target.value)}/>
                    </td>
                    <td style={{width:120}}>
                      <div style={{position:'relative'}}>
                        <span style={{position:'absolute',left:8,top:6}}>$</span>
                        <Form.Control
                          style={{paddingLeft:18}}
                          value={it.price}
                          onChange={e=>updateRow(i,'price',e.target.value.replace(/[^0-9.]/g,''))}
                        />
                      </div>
                    </td>
                    <td style={{width:40}}>
                      <Button size="sm" variant="outline-danger" onClick={()=>removeRow(i)}>✖</Button>
                    </td>
                  </tr>
                ))}
                {!items.length && <tr><td colSpan="4" className="text-center py-3 text-muted">
                  No hay ítems
                </td></tr>}
              </tbody>
            </table>
          </Card.Body>
        </Card>

        <Form.Group className="mb-4" style={{maxWidth:500}}>
          <Form.Label>Observaciones</Form.Label>
          <Form.Control as="textarea" rows={2} value={obs} onChange={e=>setObs(e.target.value)}/>
        </Form.Group>

        <Button type="submit" variant="dark" className="me-2">
          {editId?'Guardar cambios':'Registrar venta'}
        </Button>
        <Button variant="secondary" onClick={()=>navigate(-1)}>Cancelar</Button>
      </Form>

      <Modal show={showModal}
             message={editId?'Venta actualizada':'Venta registrada'}
             onClose={()=>navigate('/movements')}/>
    </>
  );
}
