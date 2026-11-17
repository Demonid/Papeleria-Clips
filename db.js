const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'papeleria.db');
const db = new sqlite3.Database(dbPath);

// Crear tablas e insertar datos iniciales
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      precio REAL NOT NULL,
      existencias INTEGER NOT NULL DEFAULT 0,
      imagen TEXT,
      categoria_id INTEGER,
      FOREIGN KEY (categoria_id) REFERENCES categorias(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      correo TEXT UNIQUE NOT NULL,
      telefono TEXT,
      password TEXT NOT NULL,
      rol TEXT DEFAULT 'cliente'
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER,
      nombre_cliente TEXT,
      telefono TEXT,
      notas TEXT,
      fecha TEXT DEFAULT CURRENT_TIMESTAMP,
      total REAL NOT NULL,
      estado TEXT DEFAULT 'Pendiente',
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS detalle_pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pedido_id INTEGER,
      producto_id INTEGER,
      nombre_producto TEXT,
      precio REAL,
      cantidad INTEGER,
      FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
    )
  `);

  // Insertar usuarios de prueba si no existen
  db.get('SELECT COUNT(*) AS count FROM usuarios', (err, row) => {
    if (err || row.count > 0) return;

    const stmtUser = db.prepare(`
      INSERT INTO usuarios (nombre, correo, telefono, password, rol)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmtUser.run(['Administrador', 'admin@clips.com', '3310000000', 'admin123', 'admin']);
    stmtUser.run(['Cliente Demo', 'cliente@correo.com', '3320000000', '123456', 'cliente']);
    stmtUser.finalize();
  });

  // Verificar si ya existen categorias para no duplicar datos
  db.get('SELECT COUNT(*) AS count FROM categorias', (err, row) => {
    if (err || row.count > 0) return;

    const categorias = ['Escolares', 'Oficina', 'Papel y Cuadernos', 'Arte y Dibujo'];
    const stmtCat = db.prepare('INSERT INTO categorias (nombre) VALUES (?)');
    categorias.forEach(nombre => stmtCat.run(nombre));
    stmtCat.finalize();

    const productos = [
      [
        'Cuaderno Profesional Raya 100 Hojas',
        'Cuaderno cosido tamaño profesional con 100 hojas de raya y pasta dura.',
        45.00,
        30,
        '/img/cuaderno.svg',
        3
      ],
      [
        'Paquete 500 Hojas Blancas Carta',
        'Resma de 500 hojas blancas tamaño carta de alta blancura para impresión y copiado.',
        135.00,
        20,
        '/img/hojas.svg',
        3
      ],
      [
        'Caja de Clips Metálicos 100 pzas',
        'Clips estándar número 1 resistentes a la oxidación para sujetar documentos.',
        18.00,
        50,
        '/img/clips.svg',
        2
      ],
      [
        'Bolígrafo Punto Mediano Negro',
        'Pluma de tinta negra de secado rápido y escritura suave.',
        8.00,
        100,
        '/img/boligrafo.svg',
        1
      ],
      [
        'Juego de Geometría 5 Piezas',
        'Incluye regla de 30 cm, dos escuadras, transportador y compás escolar.',
        38.00,
        15,
        '/img/geometria.svg',
        1
      ],
      [
        'Carpeta Blanca de 3 Argollas',
        'Carpeta tamaño carta de 1 pulgada con cubiertas plásticas transparentes.',
        65.00,
        12,
        '/img/carpeta.svg',
        2
      ],
      [
        'Lápiz Adhesivo Escolar 40g',
        'Pegamento en barra lavable y no tóxico para papel, cartulina y fotos.',
        28.00,
        35,
        '/img/adhesivo.svg',
        1
      ],
      [
        'Caja de 12 Colores de Madera',
        'Colores largos de mina resistente y tonos intensos para dibujo escolar.',
        55.00,
        25,
        '/img/colores.svg',
        4
      ],
      [
        'Engrapadora Metálica de Escritorio',
        'Engrapadora de media tira con capacidad para engrapar hasta 20 hojas.',
        95.00,
        10,
        '/img/engrapadora.svg',
        2
      ],
      [
        'Marcatextos Fluorescente Amarillo',
        'Resaltador de punta cincel para subrayar textos en todo tipo de papel.',
        15.00,
        40,
        '/img/marcatextos.svg',
        1
      ],
      [
        'Acuarelas Escolares 12 Colores',
        'Estuche de plástico con 12 pastillas de acuarela y pincel incluido.',
        42.00,
        18,
        '/img/acuarelas.svg',
        4
      ],
      [
        'Notas Adhesivas 3x3 Pulgadas',
        'Block con 100 hojas adhesivas amarillas para recordatorios y apuntes rápidos.',
        22.00,
        45,
        '/img/notas.svg',
        2
      ]
    ];

    const stmtProd = db.prepare(`
      INSERT INTO productos (nombre, descripcion, precio, existencias, imagen, categoria_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    productos.forEach(p => stmtProd.run(p));
    stmtProd.finalize();
  });

  // Actualizar rutas de imagenes locales si existen registros con enlaces antiguos
  const imagenesLocales = [
    [1, '/img/cuaderno.svg'],
    [2, '/img/hojas.svg'],
    [3, '/img/clips.svg'],
    [4, '/img/boligrafo.svg'],
    [5, '/img/geometria.svg'],
    [6, '/img/carpeta.svg'],
    [7, '/img/adhesivo.svg'],
    [8, '/img/colores.svg'],
    [9, '/img/engrapadora.svg'],
    [10, '/img/marcatextos.svg'],
    [11, '/img/acuarelas.svg'],
    [12, '/img/notas.svg']
  ];
  imagenesLocales.forEach(([id, ruta]) => {
    db.run("UPDATE productos SET imagen = ? WHERE id = ? AND imagen LIKE 'https://placehold.co%'", [ruta, id]);
  });
});

module.exports = db;
