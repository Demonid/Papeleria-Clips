const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = 3000;

// Middleware para JSON y archivos estaticos
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Iniciar sesion
app.post('/api/login', (req, res) => {
  const { correo, password } = req.body;
  const sql = 'SELECT id, nombre, correo, telefono, rol FROM usuarios WHERE correo = ? AND password = ?';

  db.get(sql, [correo, password], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Error al iniciar sesion' });
    }
    if (!row) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }
    res.json(row);
  });
});

// Registrar nuevo usuario
app.post('/api/registro', (req, res) => {
  const { nombre, correo, telefono, password } = req.body;
  if (!nombre || !correo || !password) {
    return res.status(400).json({ error: 'Todos los campos obligatorios deben completarse' });
  }

  const sql = 'INSERT INTO usuarios (nombre, correo, telefono, password, rol) VALUES (?, ?, ?, ?, ?)';
  db.run(sql, [nombre, correo, telefono || '', password, 'cliente'], function (err) {
    if (err) {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }
    res.json({
      id: this.lastID,
      nombre,
      correo,
      telefono: telefono || '',
      rol: 'cliente'
    });
  });
});

// Obtener todas las categorias
app.get('/api/categorias', (req, res) => {
  db.all('SELECT * FROM categorias', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Error al consultar categorias' });
    }
    res.json(rows);
  });
});

// Crear categoria
app.post('/api/categorias', (req, res) => {
  const { nombre } = req.body;
  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: 'El nombre de la categoria es obligatorio' });
  }

  db.run('INSERT INTO categorias (nombre) VALUES (?)', [nombre.trim()], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Error al guardar categoria' });
    }
    res.json({ id: this.lastID, nombre: nombre.trim() });
  });
});

// Actualizar categoria
app.put('/api/categorias/:id', (req, res) => {
  const { nombre } = req.body;
  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: 'El nombre de la categoria es obligatorio' });
  }

  db.run('UPDATE categorias SET nombre = ? WHERE id = ?', [nombre.trim(), req.params.id], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Error al actualizar categoria' });
    }
    res.json({ id: Number(req.params.id), nombre: nombre.trim() });
  });
});

// Eliminar categoria
app.delete('/api/categorias/:id', (req, res) => {
  db.run('DELETE FROM categorias WHERE id = ?', [req.params.id], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Error al eliminar categoria' });
    }
    res.json({ eliminado: true });
  });
});

// Obtener lista de productos con filtro opcional de busqueda y categoria
app.get('/api/productos', (req, res) => {
  const { busqueda, categoria_id } = req.query;

  let sql = `
    SELECT p.*, c.nombre AS categoria
    FROM productos p
    LEFT JOIN categorias c ON p.categoria_id = c.id
    WHERE 1 = 1
  `;
  const params = [];

  if (busqueda && busqueda.trim() !== '') {
    sql += ' AND (p.nombre LIKE ? OR p.descripcion LIKE ?)';
    params.push(`%${busqueda.trim()}%`, `%${busqueda.trim()}%`);
  }

  if (categoria_id && categoria_id !== '') {
    sql += ' AND p.categoria_id = ?';
    params.push(categoria_id);
  }

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Error al consultar productos' });
    }
    res.json(rows);
  });
});

// Obtener detalle de un producto por su id
app.get('/api/productos/:id', (req, res) => {
  const sql = `
    SELECT p.*, c.nombre AS categoria
    FROM productos p
    LEFT JOIN categorias c ON p.categoria_id = c.id
    WHERE p.id = ?
  `;

  db.get(sql, [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Error al consultar el producto' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(row);
  });
});

// Crear nuevo producto
app.post('/api/productos', (req, res) => {
  const { nombre, descripcion, precio, existencias, imagen, categoria_id } = req.body;
  const imgFinal = imagen && imagen.trim() !== ''
    ? imagen.trim()
    : `https://placehold.co/400x280/e3f2fd/1565c0?text=${encodeURIComponent(nombre)}`;

  const sql = `
    INSERT INTO productos (nombre, descripcion, precio, existencias, imagen, categoria_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.run(sql, [nombre, descripcion || '', Number(precio), Number(existencias), imgFinal, Number(categoria_id)], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Error al crear producto' });
    }
    res.json({ id: this.lastID });
  });
});

// Actualizar producto existente
app.put('/api/productos/:id', (req, res) => {
  const { nombre, descripcion, precio, existencias, imagen, categoria_id } = req.body;
  const imgFinal = imagen && imagen.trim() !== ''
    ? imagen.trim()
    : `https://placehold.co/400x280/e3f2fd/1565c0?text=${encodeURIComponent(nombre)}`;

  const sql = `
    UPDATE productos
    SET nombre = ?, descripcion = ?, precio = ?, existencias = ?, imagen = ?, categoria_id = ?
    WHERE id = ?
  `;

  db.run(sql, [nombre, descripcion || '', Number(precio), Number(existencias), imgFinal, Number(categoria_id), req.params.id], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Error al actualizar producto' });
    }
    res.json({ actualizado: true });
  });
});

// Eliminar producto
app.delete('/api/productos/:id', (req, res) => {
  db.run('DELETE FROM productos WHERE id = ?', [req.params.id], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Error al eliminar producto' });
    }
    res.json({ eliminado: true });
  });
});

// Registrar un nuevo pedido y descontar inventario
app.post('/api/pedidos', (req, res) => {
  const { usuario_id, nombre_cliente, telefono, notas, total, articulos } = req.body;

  if (!articulos || articulos.length === 0) {
    return res.status(400).json({ error: 'El pedido no contiene productos' });
  }

  const sqlPedido = `
    INSERT INTO pedidos (usuario_id, nombre_cliente, telefono, notas, total, estado)
    VALUES (?, ?, ?, ?, ?, 'Pendiente')
  `;

  db.run(sqlPedido, [usuario_id || null, nombre_cliente, telefono, notas || '', total], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Error al guardar el pedido' });
    }

    const pedidoId = this.lastID;
    const stmtDetalle = db.prepare(`
      INSERT INTO detalle_pedidos (pedido_id, producto_id, nombre_producto, precio, cantidad)
      VALUES (?, ?, ?, ?, ?)
    `);
    const stmtStock = db.prepare(`
      UPDATE productos SET existencias = MAX(0, existencias - ?) WHERE id = ?
    `);

    articulos.forEach(item => {
      stmtDetalle.run([pedidoId, item.id, item.nombre, item.precio, item.cantidad]);
      stmtStock.run([item.cantidad, item.id]);
    });

    stmtDetalle.finalize();
    stmtStock.finalize();

    db.get('SELECT * FROM pedidos WHERE id = ?', [pedidoId], (err2, row) => {
      if (err2) {
        return res.status(500).json({ error: 'Error al recuperar el pedido registrado' });
      }
      res.json(row);
    });
  });
});

// Consultar pedidos de un usuario especifico
app.get('/api/mis-pedidos/:usuario_id', (req, res) => {
  const sqlPedidos = 'SELECT * FROM pedidos WHERE usuario_id = ? ORDER BY id DESC';

  db.all(sqlPedidos, [req.params.usuario_id], (err, pedidos) => {
    if (err) {
      return res.status(500).json({ error: 'Error al consultar pedidos' });
    }
    if (pedidos.length === 0) {
      return res.json([]);
    }

    db.all('SELECT * FROM detalle_pedidos', [], (err2, detalles) => {
      if (err2) {
        return res.status(500).json({ error: 'Error al consultar detalle de pedidos' });
      }

      const resultado = pedidos.map(p => ({
        ...p,
        articulos: detalles.filter(d => d.pedido_id === p.id)
      }));
      res.json(resultado);
    });
  });
});

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
