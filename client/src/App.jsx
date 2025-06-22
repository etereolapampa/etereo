// client/src/App.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProductForm from './pages/ProductForm';
import ProductDelete from './pages/ProductDelete';
import CategoryForm from './pages/CategoryForm';
import CategoryDelete from './pages/CategoryDelete';
import SellerForm from './pages/SellerForm';
import SellerDelete from './pages/SellerDelete';
import Stock from './pages/Stock';
import StockAdd from './pages/StockAdd';
import StockSale from './pages/StockSale';
import StockTransfer from './pages/StockTransfer';
import StockShortage from './pages/StockShortage';
import Movements from './pages/Movements';
import Stats from './pages/Stats';
import Datos from './pages/Datos';
import Layout from './components/Layout';
import Login from './pages/Login';
import PrivateRoute from './components/PrivateRoute';
import MovementDelete from './pages/MovementDelete';
import PriceAdjustment from './pages/PriceAdjustment';
import SellerMultiSale from './pages/SellersMultiSale';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/stock" replace />} />
        <Route path="datos" element={<Datos />} />
        <Route path="products/new" element={<ProductForm />} />
        <Route path="products/:id/edit" element={<ProductForm />} />
        <Route path="products/:id/delete" element={<ProductDelete />} />
        <Route path="categories/new" element={<CategoryForm />} />
        <Route path="categories/:id/edit" element={<CategoryForm />} />
        <Route path="categories/:id/delete" element={<CategoryDelete />} />
        <Route path="sellers/new" element={<SellerForm />} />
        <Route path="sellers/:id/edit" element={<SellerForm />} />
        <Route path="sellers/:id/delete" element={<SellerDelete />} />
        <Route path="stock" element={<Stock />} />
        <Route path="stock/add" element={<StockAdd />} />
        <Route path="stock/sale" element={<StockSale />} />
        <Route path="stock/price-adjustment" element={<PriceAdjustment />} />
        <Route path="stock/transfer" element={<StockTransfer />} />
        <Route path="stock/shortage" element={<StockShortage />} />
        <Route path="movements" element={<Movements />} />
        {/* <Route path="movements/:id/delete" element={<MovementDelete />} /> */}
        <Route path="stats" element={<Stats />} />
        <Route path="sellers/:id/sale" element={<SellerMultiSale />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
