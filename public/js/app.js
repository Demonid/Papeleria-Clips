const { createApp } = Vue;

createApp({
  data() {
    return {
      vistaActual: 'inicio',
      categorias: [],
      productos: [],
      productosDestacados: [],
      productoSeleccionado: null,
      cantidadDetalle: 1,
      textoBusqueda: '',
      busquedaActiva: '',
      categoriaActiva: '',
      carrito: [],
      usuarioActual: null,
      formLogin: {
        correo: '',
        password: ''
      },
      formRegistro: {
        nombre: '',
        correo: '',
        telefono: '',
        password: ''
      },
      formPedido: {
        nombre_cliente: '',
        telefono: '',
        notas: ''
      },
      formCategoria: {
        id: null,
        nombre: ''
      },
      pedidoConfirmado: null,
      misPedidos: [],
      pedidoDetalleVisible: null,
      mensajeAlerta: '',
      mensajeError: ''
    };
  },
  computed: {
    esAdmin() {
      return this.usuarioActual && this.usuarioActual.rol === 'admin';
    },
    nombreCategoriaActiva() {
      const cat = this.categorias.find(c => c.id === this.categoriaActiva);
      return cat ? cat.nombre : '';
    },
    totalCarrito() {
      return this.carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0);
    },
    totalArticulosCarrito() {
      return this.carrito.reduce((acc, item) => acc + item.cantidad, 0);
    },
    productosStockBajo() {
      return this.productos.filter(p => p.existencias <= 10).length;
    }
  },
  mounted() {
    this.cargarCategorias();
    this.cargarProductosIniciales();
  },
  methods: {
    cambiarVista(vista) {
      this.mensajeError = '';
      this.vistaActual = vista;
    },
    irInicio() {
      this.vistaActual = 'inicio';
    },
    verCatalogoCompleto() {
      this.textoBusqueda = '';
      this.busquedaActiva = '';
      this.categoriaActiva = '';
      this.cargarProductos();
      this.vistaActual = 'catalogo';
    },
    async cargarCategorias() {
      try {
        const res = await fetch('/api/categorias');
        this.categorias = await res.json();
      } catch (error) {
        console.error('Error al cargar categorias:', error);
      }
    },
    async cargarProductosIniciales() {
      try {
        const res = await fetch('/api/productos');
        const data = await res.json();
        this.productos = data;
        this.productosDestacados = data.slice(0, 4);
      } catch (error) {
        console.error('Error al cargar productos:', error);
      }
    },
    async cargarProductos() {
      try {
        const params = new URLSearchParams();
        if (this.busquedaActiva) {
          params.append('busqueda', this.busquedaActiva);
        }
        if (this.categoriaActiva) {
          params.append('categoria_id', this.categoriaActiva);
        }

        const res = await fetch(`/api/productos?${params.toString()}`);
        this.productos = await res.json();
      } catch (error) {
        console.error('Error al filtrar productos:', error);
      }
    },
    buscarProductos() {
      this.busquedaActiva = this.textoBusqueda.trim();
      this.cargarProductos();
      this.vistaActual = 'catalogo';
    },
    seleccionarCategoria(idCategoria) {
      this.categoriaActiva = idCategoria;
      this.cargarProductos();
      this.vistaActual = 'catalogo';
    },
    limpiarFiltros() {
      this.textoBusqueda = '';
      this.busquedaActiva = '';
      this.categoriaActiva = '';
      this.cargarProductos();
    },
    verDetalle(producto) {
      this.productoSeleccionado = producto;
      this.cantidadDetalle = 1;
      this.vistaActual = 'detalle';
    },
    agregarAlCarrito(producto, cantidad = 1) {
      const existente = this.carrito.find(item => item.id === producto.id);
      if (existente) {
        const nuevaCantidad = existente.cantidad + cantidad;
        existente.cantidad = Math.min(nuevaCantidad, producto.existencias);
      } else {
        this.carrito.push({
          id: producto.id,
          nombre: producto.nombre,
          categoria: producto.categoria,
          precio: producto.precio,
          imagen: producto.imagen,
          existencias: producto.existencias,
          cantidad: Math.min(cantidad, producto.existencias)
        });
      }

      this.mostrarAlerta(`Se agregó "${producto.nombre}" al carrito.`);
    },
    cambiarCantidadCarrito(item, cambio) {
      const nuevaCantidad = item.cantidad + cambio;
      if (nuevaCantidad >= 1 && nuevaCantidad <= item.existencias) {
        item.cantidad = nuevaCantidad;
      }
    },
    quitarDelCarrito(index) {
      this.carrito.splice(index, 1);
    },
    irARegistroPedido() {
      if (!this.usuarioActual) {
        this.mostrarAlerta('Inicia sesión para registrar tu pedido.');
        this.vistaActual = 'login';
        return;
      }

      this.formPedido.nombre_cliente = this.usuarioActual.nombre || '';
      this.formPedido.telefono = this.usuarioActual.telefono || '';
      this.formPedido.notas = '';
      this.vistaActual = 'pedido';
    },
    async confirmarPedido() {
      this.mensajeError = '';
      try {
        const payload = {
          usuario_id: this.usuarioActual ? this.usuarioActual.id : null,
          nombre_cliente: this.formPedido.nombre_cliente,
          telefono: this.formPedido.telefono,
          notas: this.formPedido.notas,
          total: this.totalCarrito,
          articulos: this.carrito
        };

        const res = await fetch('/api/pedidos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (!res.ok) {
          this.mensajeError = data.error || 'Error al registrar el pedido';
          return;
        }

        this.pedidoConfirmado = data;
        this.carrito = [];
        await this.cargarProductosIniciales();
        this.vistaActual = 'confirmacion';
      } catch (error) {
        this.mensajeError = 'No se pudo registrar el pedido';
      }
    },
    async verMisPedidos() {
      if (!this.usuarioActual) return;
      try {
        const res = await fetch(`/api/mis-pedidos/${this.usuarioActual.id}`);
        this.misPedidos = await res.json();
        this.pedidoDetalleVisible = null;
        this.vistaActual = 'mis-pedidos';
      } catch (error) {
        console.error('Error al consultar mis pedidos:', error);
      }
    },
    contarProductosPorCategoria(categoriaId) {
      return this.productos.filter(p => p.categoria_id === categoriaId).length;
    },
    editarCategoria(cat) {
      this.formCategoria = { id: cat.id, nombre: cat.nombre };
    },
    cancelarEdicionCategoria() {
      this.formCategoria = { id: null, nombre: '' };
    },
    async guardarCategoria() {
      try {
        const esEdicion = Boolean(this.formCategoria.id);
        const url = esEdicion ? `/api/categorias/${this.formCategoria.id}` : '/api/categorias';
        const metodo = esEdicion ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method: metodo,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre: this.formCategoria.nombre })
        });

        if (res.ok) {
          this.formCategoria = { id: null, nombre: '' };
          await this.cargarCategorias();
          await this.cargarProductosIniciales();
          this.mostrarAlerta(esEdicion ? 'Categoría actualizada.' : 'Categoría agregada.');
        }
      } catch (error) {
        this.mensajeError = 'Error al guardar la categoría';
      }
    },
    async eliminarCategoria(id) {
      try {
        const res = await fetch(`/api/categorias/${id}`, { method: 'DELETE' });
        if (res.ok) {
          await this.cargarCategorias();
          this.mostrarAlerta('Categoría eliminada.');
        }
      } catch (error) {
        this.mensajeError = 'Error al eliminar la categoría';
      }
    },
    async iniciarSesion() {
      this.mensajeError = '';
      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.formLogin)
        });
        const data = await res.json();

        if (!res.ok) {
          this.mensajeError = data.error || 'Error al iniciar sesión';
          return;
        }

        this.usuarioActual = data;
        this.formLogin = { correo: '', password: '' };
        this.mostrarAlerta(`Bienvenido, ${data.nombre}`);

        if (data.rol === 'admin') {
          this.vistaActual = 'admin-panel';
        } else {
          this.vistaActual = this.carrito.length > 0 ? 'carrito' : 'inicio';
        }
      } catch (error) {
        this.mensajeError = 'No se pudo conectar con el servidor';
      }
    },
    async registrarUsuario() {
      this.mensajeError = '';
      try {
        const res = await fetch('/api/registro', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.formRegistro)
        });
        const data = await res.json();

        if (!res.ok) {
          this.mensajeError = data.error || 'Error al registrar usuario';
          return;
        }

        this.usuarioActual = data;
        this.formRegistro = { nombre: '', correo: '', telefono: '', password: '' };
        this.mostrarAlerta('Cuenta creada correctamente.');
        this.vistaActual = this.carrito.length > 0 ? 'carrito' : 'inicio';
      } catch (error) {
        this.mensajeError = 'No se pudo conectar con el servidor';
      }
    },
    cerrarSesion() {
      this.usuarioActual = null;
      this.misPedidos = [];
      this.mostrarAlerta('Sesión cerrada.');
      this.vistaActual = 'inicio';
    },
    mostrarAlerta(texto) {
      this.mensajeAlerta = texto;
      setTimeout(() => {
        this.mensajeAlerta = '';
      }, 2500);
    }
  }
}).mount('#app');
