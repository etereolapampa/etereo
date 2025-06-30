// src/routes/auth.js
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import Usuario from '../models/Usuario.js';

const router = express.Router();
const SALT_ROUNDS = 10;

// Registro de usuario (podés usarlo para crear vendedoras/admins)
router.post('/register',
  body('username').isString().isLength({ min: 3, max: 30 }),
  body('password').isString().isLength({ min: 6, max: 100 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Datos inválidos', details: errors.array() });
    }
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'username y password son obligatorios' });
      }

      const existingUser = await Usuario.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ error: 'El usuario ya existe' });
      }

      const hashed = await bcrypt.hash(password, SALT_ROUNDS);
      const newUser = new Usuario({
        username,
        password: hashed
      });

      await newUser.save();
      res.status(201).json({ _id: newUser._id, username });
    } catch (error) {
      console.error('Error al registrar usuario:', error);
      res.status(500).json({ error: 'Error al registrar el usuario' });
    }
  }
);

// Login: devuelve JWT
router.post('/login',
  body('username').isString().isLength({ min: 3, max: 30 }),
  body('password').isString().isLength({ min: 6, max: 100 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Datos inválidos', details: errors.array() });
    }
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: 'username y password son obligatorios' });
      }

      const user = await Usuario.findOne({ username });
      if (!user) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }


      const match = await bcrypt.compare(password, user.password);

      if (!match) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const token = jwt.sign(
        { _id: user._id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );
      res.json({ token });
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      res.status(500).json({ error: 'Error al iniciar sesión' });
    }
  }
);

export default router;
