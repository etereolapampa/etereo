// client/src/pages/Users.jsx
import React, { useEffect, useState } from 'react';
import api from '../api';
import Modal from '../components/Modal';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [creating, setCreating] = useState({ username: '', password: '', name: '', lastname: '', admin: false });
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState('');

  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({ username: '', name: '', lastname: '', admin: false, password: '' });
  const [editError, setEditError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; } })();
  const isAdmin = !!currentUser?.admin;

  useEffect(() => {
    api.get('/users')
      .then(res => setUsers(res.data))
      .catch(e => setError(e.response?.data?.error || 'Error al cargar usuarios'))
      .finally(() => setLoading(false));
  }, []);

  const refresh = async () => {
    const { data } = await api.get('/users');
    setUsers(data);
  };

  const createUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    setCreateError('');
    try {
      await api.post('/users', creating);
      setCreating({ username: '', password: '', name: '', lastname: '', admin: false });
      await refresh();
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Error al crear');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (u) => {
    setEditId(u.id);
    setEditData({ username: u.username, name: u.name, lastname: u.lastname, admin: u.admin, password: '' });
  };

  const saveEdit = async () => {
    setSaving(true);
    setEditError('');
    try {
      const body = { ...editData };
      if (!body.password) delete body.password;
      await api.put(`/users/${editId}`, body);
      setEditId(null);
      await refresh();
    } catch (err) {
      setEditError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const askDeleteUser = (u) => {
    setDeleteError('');
    setDeleteTarget(u);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError('');
    try {
      await api.delete(`/users/${deleteTarget.id}`);
      setDeleteTarget(null);
      await refresh();
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Error al eliminar');
    }
  };

  if (loading) return <div>Cargando…</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="container">
      <h2 className="mb-3">Usuarios</h2>

      {isAdmin && (
        <div className="card mb-4">
          <div className="card-body">
            <h5 className="card-title">Crear nuevo</h5>
            <form onSubmit={createUser} className="row g-2">
              <div className="col-md-3">
                <input className="form-control" placeholder="Usuario" required value={creating.username} onChange={e => setCreating({ ...creating, username: e.target.value })} />
              </div>
              <div className="col-md-3">
                <input className="form-control" type="password" placeholder="Contraseña" required value={creating.password} onChange={e => setCreating({ ...creating, password: e.target.value })} />
              </div>
              <div className="col-md-3">
                <input className="form-control" placeholder="Nombre" required value={creating.name} onChange={e => setCreating({ ...creating, name: e.target.value })} />
              </div>
              <div className="col-md-3">
                <input className="form-control" placeholder="Apellido" required value={creating.lastname} onChange={e => setCreating({ ...creating, lastname: e.target.value })} />
              </div>
              <div className="col-md-2 d-flex align-items-center">
                <div className="form-check">
                  <input id="adminNew" className="form-check-input" type="checkbox" checked={creating.admin} onChange={e => setCreating({ ...creating, admin: e.target.checked })} />
                  <label className="form-check-label" htmlFor="adminNew">Admin</label>
                </div>
              </div>
              <div className="col-md-2">
                <button className="btn btn-dark" disabled={saving} type="submit">Crear</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <table className="table table-striped">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Nombre</th>
            <th>Apellido</th>
            <th>Admin</th>
            <th>Últ. ingreso</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>
                {isAdmin && editId === u.id ? (
                  <input className="form-control" value={editData.username} onChange={e => setEditData({ ...editData, username: e.target.value })} />
                ) : u.username}
              </td>
              <td>
                {isAdmin && editId === u.id ? (
                  <input className="form-control" value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} />
                ) : u.name}
              </td>
              <td>
                {isAdmin && editId === u.id ? (
                  <input className="form-control" value={editData.lastname} onChange={e => setEditData({ ...editData, lastname: e.target.value })} />
                ) : u.lastname}
              </td>
              <td>
                {isAdmin && editId === u.id ? (
                  <input type="checkbox" className="form-check-input" checked={editData.admin} onChange={e => setEditData({ ...editData, admin: e.target.checked })} />
                ) : (u.admin ? 'Sí' : 'No')}
              </td>
              <td>{u.lastLogin ? new Date(u.lastLogin).toLocaleString('es-AR') : '-'}</td>
              <td className="d-flex gap-2">
                {isAdmin && editId === u.id ? (
                  <>
                    <button className="btn btn-sm btn-success" disabled={saving} onClick={saveEdit}>Guardar</button>
                    <button className="btn btn-sm btn-secondary" onClick={() => setEditId(null)}>Cancelar</button>
                  </>
                ) : (
                  <>
                    {isAdmin && (
                      <>
                        <button className="btn btn-sm btn-outline-primary" onClick={() => startEdit(u)}>Editar</button>
                        <button className="btn btn-sm btn-outline-danger" disabled={currentUser?.id === u.id} onClick={() => askDeleteUser(u)}>Eliminar</button>
                      </>
                    )}
                  </>
                )}
              </td>
            </tr>
          ))}
          {isAdmin && editId && (
            <tr>
              <td colSpan={6}>
                <div className="row g-2">
                  <div className="col-md-3">
                    <input className="form-control" type="password" placeholder="Nueva contraseña (opcional)" value={editData.password} onChange={e => setEditData({ ...editData, password: e.target.value })} />
                  </div>
                  {editError && (
                    <div className="col-12">
                      <div className="alert alert-danger mt-2">{editError}</div>
                    </div>
                  )}
                </div>
              </td>
            </tr>
          )}

          {/* Modal confirmación borrado */}
          <Modal
            show={!!deleteTarget}
            onClose={() => setDeleteTarget(null)}
            message={deleteTarget ? (
              <>
                <p>¿Seguro que deseas eliminar el siguiente usuario?</p>
                <div><strong>Usuario:</strong> {deleteTarget.username}</div>
                <div><strong>Nombre:</strong> {deleteTarget.name} {deleteTarget.lastname}</div>
                {deleteError && <div className="alert alert-danger mt-2">{deleteError}</div>}
              </>
            ) : null}
          >
            <button className="btn btn-danger" onClick={confirmDelete}>Eliminar</button>
          </Modal>
        </tbody>
      </table>
    </div>
  );
}
