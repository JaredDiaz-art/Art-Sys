// =====================
// Clases orientadas a objetos para la gestión
// =====================

/**
 * Clase Producto representa un producto en el sistema.
 */
class Producto {
    #id;
    #nombre;
    #stock;
    #precioEntrada;
    #precioVenta;
    #tamano;
    #fechaCreacion;

    constructor({ id, nombre, stock, precioEntrada, precioVenta, tamano, fechaCreacion }) {
        this.#id = id;
        this.#nombre = nombre;
        this.#stock = stock;
        this.#precioEntrada = precioEntrada;
        this.#precioVenta = precioVenta;
        this.#tamano = tamano;
        this.#fechaCreacion = fechaCreacion || new Date();
    }

    get id() { return this.#id; }
    get nombre() { return this.#nombre; }
    get stock() { return this.#stock; }
    get precioEntrada() { return this.#precioEntrada; }
    get precioVenta() { return this.#precioVenta; }
    get tamano() { return this.#tamano; }
    get fechaCreacion() { return this.#fechaCreacion; }

    actualizarStock(cantidad) {
        this.#stock += cantidad;
    }
}

/**
 * Clase Bodega representa una bodega que contiene productos.
 */
class Bodega {
    #id;
    #nombre;
    #productos;

    constructor({ id, nombre }) {
        this.#id = id;
        this.#nombre = nombre;
        this.#productos = [];
    }

    get id() { return this.#id; }
    get nombre() { return this.#nombre; }
    get productos() { return this.#productos; }

    agregarProducto(producto) {
        this.#productos.push(producto);
    }

    buscarProductoPorNombre(nombre) {
        return this.#productos.filter(p => p.nombre.toLowerCase().includes(nombre.toLowerCase()));
    }
}

/**
 * Clase Carrito para gestionar productos en una salida.
 */
class Carrito {
    #items;
    constructor() {
        this.#items = [];
    }
    agregar(producto, cantidad) {
        const existente = this.#items.find(item => item.producto.id === producto.id);
        if (existente) {
            existente.cantidad += cantidad;
        } else {
            this.#items.push({ producto, cantidad });
        }
    }
    eliminar(productoId) {
        this.#items = this.#items.filter(item => item.producto.id !== productoId);
    }
    vaciar() {
        this.#items = [];
    }
    get total() {
        return this.#items.reduce((acc, item) => acc + item.producto.precioVenta * item.cantidad, 0);
    }
    get items() {
        return this.#items;
    }
}

/**
 * Clase Transaccion para registrar movimientos de productos.
 */
class Transaccion {
    constructor({ fecha, tipo, producto, cantidad, precioUnitario, usuario, bodega }) {
        this.fecha = fecha || new Date();
        this.tipo = tipo; // entrada, salida, baja
        this.producto = producto;
        this.cantidad = cantidad;
        this.precioUnitario = precioUnitario;
        this.usuario = usuario;
        this.bodega = bodega;
    }
}

// =====================
// Variables globales y datos simulados
// =====================

let bodegas = [
    new Bodega({ id: '1', nombre: 'Bodega Principal' }),
    new Bodega({ id: '2', nombre: 'Bodega Secundaria' })
];

let carrito = new Carrito();
let transacciones = [];
let currentUser = { id: 'temp-user-id', nombre: 'Usuario Demo' };

// =====================
// Funciones de inicialización y UI
// =====================

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadInitialData();
});

async function initializeApp() {
    // Simulación de usuario y carga inicial
    currentUser = { id: 'temp-user-id', nombre: 'Usuario Demo' };
    await loadWarehouses();
    await loadProducts();
    await loadTransactions();
}

function setupEventListeners() {
    console.log('Configurando event listeners...');
    
    // Modal functionality
    document.querySelectorAll('.modal .close-button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.target.closest('.modal').style.display = 'none';
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });

    // Navigation functionality
    const navButtons = document.querySelectorAll('.nav-button');
    const contentSections = document.querySelectorAll('.content-section');

    console.log('Botones de navegación encontrados:', navButtons.length);
    console.log('Secciones de contenido encontradas:', contentSections.length);

    function showSection(sectionId) {
        console.log('Mostrando sección:', sectionId);
        
        contentSections.forEach(section => {
            section.classList.remove('active');
        });

        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
        } else {
            console.error('Sección no encontrada:', sectionId);
        }

        navButtons.forEach(button => {
            button.classList.remove('active');
            if (button.dataset.section === sectionId) {
                button.classList.add('active');
            }
        });

        localStorage.setItem('currentSection', sectionId);
    }

    navButtons.forEach(button => {
        console.log('Agregando event listener a botón:', button.id, 'para sección:', button.dataset.section);
        button.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Botón clickeado:', this.id, 'sección:', this.dataset.section);
            showSection(this.dataset.section);
        });
    });

    // Load last viewed section or default to products
    const currentSection = localStorage.getItem('currentSection') || 'misProductos';
    console.log('Cargando sección:', currentSection);
    showSection(currentSection);

    // Event listeners para formularios y botones
    setupFormEventListeners();
    setupButtonEventListeners();
    
    console.log('Event listeners configurados correctamente');
}

// Configurar event listeners de formularios
function setupFormEventListeners() {
    // Formulario de crear bodega
    const createWarehouseForm = document.getElementById('createWarehouseForm');
    if (createWarehouseForm) {
        createWarehouseForm.addEventListener('submit', handleCreateWarehouse);
    }

    // Formulario de entrada
    const entryForm = document.getElementById('entryForm');
    if (entryForm) {
        entryForm.addEventListener('submit', handleEntrySubmit);
    }

    // Botón de crear bodega
    const createWarehouseBtn = document.getElementById('createWarehouseBtn');
    if (createWarehouseBtn) {
        createWarehouseBtn.addEventListener('click', () => {
            document.getElementById('createWarehouseModal').style.display = 'block';
        });
    }

    // Búsqueda de productos
    const productSearch = document.getElementById('productSearch');
    if (productSearch) {
        productSearch.addEventListener('input', handleProductSearch);
    }

    // Búsqueda en salidas
    const saleProductSearch = document.getElementById('saleProductSearch');
    if (saleProductSearch) {
        saleProductSearch.addEventListener('input', handleSaleProductSearch);
    }

    // Búsqueda en bajas
    const lowProductSearch = document.getElementById('lowProductSearch');
    if (lowProductSearch) {
        lowProductSearch.addEventListener('input', handleLowProductSearch);
    }
}

// Configurar event listeners de botones
function setupButtonEventListeners() {
    // Botón de cerrar sesión
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }

    // Botones de carrito
    const addToCartBtn = document.getElementById('addToCartBtn');
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', addToCart);
    }

    const completeSaleBtn = document.getElementById('completeSaleBtn');
    if (completeSaleBtn) {
        completeSaleBtn.addEventListener('click', completeSale);
    }

    // Botón de baja
    const completeLowBtn = document.getElementById('completeLowBtn');
    if (completeLowBtn) {
        completeLowBtn.addEventListener('click', completeLow);
    }

    // Botón de filtrar finanzas
    const filterFinancesBtn = document.getElementById('filterFinancesBtn');
    if (filterFinancesBtn) {
        filterFinancesBtn.addEventListener('click', filterFinances);
    }

    // Botones OCR
    const ocrButtons = document.querySelectorAll('.ocr-button');
    ocrButtons.forEach(button => {
        button.addEventListener('click', handleOCR);
    });
}

// Cargar datos iniciales
async function loadInitialData() {
    await loadWarehouses();
    await loadProducts();
    await loadTransactions();
}

// ===== FUNCIONES DE BODEGAS =====
async function loadWarehouses() {
    try {
        console.log('Cargando bodegas...');
        
        // Cargar bodegas en los selects
        const warehouseSelects = [
            'warehouseSelect',
            'entryWarehouseSelect',
            'saleWarehouseSelect',
            'lowWarehouseSelect'
        ];
        warehouseSelects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="">Seleccionar bodega</option>';
                bodegas.forEach(bodega => {
                    const option = document.createElement('option');
                    option.value = bodega.id;
                    option.textContent = bodega.nombre;
                    select.appendChild(option);
                });
            }
        });

        console.log('Bodegas cargadas:', bodegas);

    } catch (error) {
        console.error('Error cargando bodegas:', error);
        showMessage('Error al cargar las bodegas', 'error');
    }
}

async function handleCreateWarehouse(e) {
    e.preventDefault();
    
    const warehouseName = document.getElementById('newWarehouseName').value;
    const nuevaBodega = new Bodega({ id: Date.now().toString(), nombre: warehouseName });
    bodegas.push(nuevaBodega);
    
    try {
        console.log('Creando bodega:', warehouseName);
        
        // Simular creación de bodega
        showMessage('Bodega creada exitosamente', 'success');
        document.getElementById('createWarehouseModal').style.display = 'none';
        document.getElementById('createWarehouseForm').reset();
        await loadWarehouses();

    } catch (error) {
        console.error('Error creando bodega:', error);
        showMessage('Error al crear la bodega', 'error');
    }
}

// ===== FUNCIONES DE PRODUCTOS =====
async function loadProducts() {
    try {
        const warehouseId = document.getElementById('warehouseSelect').value;
        if (!warehouseId) return;
        const bodega = bodegas.find(b => b.id === warehouseId);
        if (!bodega) return;

        console.log('Cargando productos para bodega:', warehouseId);
        
        displayProducts(bodega.productos);

    } catch (error) {
        console.error('Error cargando productos:', error);
        showMessage('Error al cargar los productos', 'error');
    }
}

function displayProducts(products) {
    const tbody = document.querySelector('#productsTable tbody');
    
    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">No hay productos registrados aún.</td></tr>';
        return;
    }

    tbody.innerHTML = products.map(producto => `
        <tr data-product-id="${producto.id}">
            <td>${producto.nombre}</td>
            <td>${producto.stock}</td>
            <td>$${producto.precioVenta}</td>
            <td>${producto.tamano}</td>
        </tr>
    `).join('');

    // Agregar event listeners para mostrar detalles
    tbody.querySelectorAll('tr').forEach(row => {
        row.addEventListener('click', () => showProductDetails(row.dataset.productId));
    });
}

async function showProductDetails(productId) {
    try {
        console.log('Mostrando detalles del producto:', productId);
        
        const warehouseId = document.getElementById('warehouseSelect').value;
        const bodega = bodegas.find(b => b.id === warehouseId);
        if (!bodega) return;
        const producto = bodega.productos.find(p => p.id === productId);
        if (!producto) return;

        selectedProduct = producto;
        const modal = document.getElementById('productDetailModal');
        const content = document.getElementById('productDetailsContent');

        content.innerHTML = `
            <h4>${producto.nombre}</h4>
            <p><strong>Stock:</strong> ${producto.stock}</p>
            <p><strong>Precio de entrada:</strong> $${producto.precioEntrada}</p>
            <p><strong>Precio de venta:</strong> $${producto.precioVenta}</p>
            <p><strong>Tamaño:</strong> ${producto.tamano}</p>
            <p><strong>Fecha de creación:</strong> ${new Date(producto.fechaCreacion).toLocaleDateString()}</p>
        `;

        modal.style.display = 'block';

    } catch (error) {
        console.error('Error mostrando detalles del producto:', error);
        showMessage('Error al cargar los detalles del producto', 'error');
    }
}

function handleProductSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#productsTable tbody tr');
    
    rows.forEach(row => {
        const productName = row.cells[0].textContent.toLowerCase();
        row.style.display = productName.includes(searchTerm) ? '' : 'none';
    });
}

// ===== FUNCIONES DE ENTRADAS =====
async function handleEntrySubmit(e) {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('entryProductName').value,
        stock: parseInt(document.getElementById('entryStock').value),
        entry_price: parseFloat(document.getElementById('entryEntryPrice').value),
        sale_price: parseFloat(document.getElementById('entrySalePrice').value),
        size: document.getElementById('entrySize').value,
        warehouse_id: document.getElementById('entryWarehouseSelect').value
    };

    try {
        console.log('Registrando entrada:', formData);
        
        // Simular registro de entrada
        showMessage('Entrada registrada exitosamente', 'success');
        e.target.reset();
        await loadProducts();

    } catch (error) {
        console.error('Error registrando entrada:', error);
        showMessage('Error al registrar la entrada', 'error');
    }
}

// ===== FUNCIONES DE SALIDAS =====
async function handleSaleProductSearch(e) {
    const searchTerm = e.target.value;
    const warehouseId = document.getElementById('saleWarehouseSelect').value;
    
    if (!warehouseId || searchTerm.length < 2) {
        document.getElementById('saleSearchResults').style.display = 'none';
        return;
    }

    try {
        console.log('Buscando productos para venta:', searchTerm);
        
        const bodega = bodegas.find(b => b.id === warehouseId);
        if (!bodega) return;

        const mockProducts = bodega.buscarProductoPorNombre(searchTerm);

        displaySaleSearchResults(mockProducts);

    } catch (error) {
        console.error('Error buscando productos:', error);
    }
}

function displaySaleSearchResults(products) {
    const resultsDiv = document.getElementById('saleSearchResults');
    
    if (products.length === 0) {
        resultsDiv.style.display = 'none';
        return;
    }

    resultsDiv.innerHTML = products.map(producto => `
        <div class="search-result-item" data-product='${JSON.stringify(producto)}'>
            ${producto.nombre} - Stock: ${producto.stock} - $${producto.precioVenta}
        </div>
    `).join('');

    resultsDiv.style.display = 'block';

    // Event listeners para seleccionar producto
    resultsDiv.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
            const product = JSON.parse(item.dataset.product);
            document.getElementById('saleProductSearch').value = product.nombre;
            selectedProduct = product;
            resultsDiv.style.display = 'none';
        });
    });
}

function addToCart() {
    if (!selectedProduct) {
        showMessage('Por favor selecciona un producto', 'error');
        return;
    }

    const quantity = parseInt(document.getElementById('saleQuantity').value);
    if (quantity > selectedProduct.stock) {
        showMessage('La cantidad excede el stock disponible', 'error');
        return;
    }

    carrito.agregar(selectedProduct, quantity);

    updateCartDisplay();
    document.getElementById('saleProductSearch').value = '';
    selectedProduct = null;
}

function updateCartDisplay() {
    const tbody = document.querySelector('#cartTable tbody');
    const totalElement = document.getElementById('cartTotal');
    
    tbody.innerHTML = carrito.items.map(item => `
        <tr>
            <td>${item.producto.nombre}</td>
            <td>$${item.producto.precioVenta}</td>
            <td>${item.cantidad}</td>
            <td>${item.producto.tamano}</td>
            <td>$${(item.producto.precioVenta * item.cantidad).toFixed(2)}</td>
            <td><button onclick="removeFromCart(${item.producto.id})" class="action-button delete-button">Eliminar</button></td>
        </tr>
    `).join('');

    const total = carrito.total;
    totalElement.textContent = total.toFixed(2);
}

function removeFromCart(productId) {
    carrito.eliminar(productId);
    updateCartDisplay();
}

async function completeSale() {
    if (carrito.items.length === 0) {
        showMessage('El carrito está vacío', 'error');
        return;
    }

    try {
        console.log('Completando venta:', carrito.items);
        
        // Simular venta
        showMessage('Salida completada exitosamente', 'success');
        carrito.vaciar();
        updateCartDisplay();
        await loadProducts();

    } catch (error) {
        console.error('Error completando salida:', error);
        showMessage('Error al completar la salida', 'error');
    }
}

// ===== FUNCIONES DE BAJAS =====
async function handleLowProductSearch(e) {
    const searchTerm = e.target.value;
    const warehouseId = document.getElementById('lowWarehouseSelect').value;
    
    if (!warehouseId || searchTerm.length < 2) {
        document.getElementById('lowSearchResults').style.display = 'none';
        return;
    }

    try {
        console.log('Buscando productos para baja:', searchTerm);
        
        const bodega = bodegas.find(b => b.id === warehouseId);
        if (!bodega) return;

        const mockProducts = bodega.buscarProductoPorNombre(searchTerm);

        displayLowSearchResults(mockProducts);

    } catch (error) {
        console.error('Error buscando productos:', error);
    }
}

function displayLowSearchResults(products) {
    const resultsDiv = document.getElementById('lowSearchResults');
    
    if (products.length === 0) {
        resultsDiv.style.display = 'none';
        return;
    }

    resultsDiv.innerHTML = products.map(producto => `
        <div class="search-result-item" data-product='${JSON.stringify(producto)}'>
            ${producto.nombre} - Stock: ${producto.stock} - $${producto.precioVenta}
        </div>
    `).join('');

    resultsDiv.style.display = 'block';

    resultsDiv.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
            const product = JSON.parse(item.dataset.product);
            document.getElementById('lowProductSearch').value = product.nombre;
            selectedProduct = product;
            resultsDiv.style.display = 'none';
        });
    });
}

async function completeLow() {
    if (!selectedProduct) {
        showMessage('Por favor selecciona un producto', 'error');
        return;
    }

    const quantity = parseInt(document.getElementById('lowQuantity').value);
    if (quantity > selectedProduct.stock) {
        showMessage('La cantidad excede el stock disponible', 'error');
        return;
    }

    try {
        console.log('Registrando baja:', selectedProduct.nombre, 'cantidad:', quantity);
        
        // Simular baja
        showMessage('Baja registrada exitosamente', 'success');
        document.getElementById('lowProductSearch').value = '';
        document.getElementById('lowQuantity').value = '1';
        selectedProduct = null;
        await loadProducts();

    } catch (error) {
        console.error('Error registrando baja:', error);
        showMessage('Error al registrar la baja', 'error');
    }
}

// ===== FUNCIONES DE FINANZAS =====
async function loadTransactions() {
    try {
        console.log('Cargando transacciones...');
        
        // Datos de ejemplo
        const mockTransactions = [
            new Transaccion({
                fecha: new Date(),
                tipo: 'entrada',
                producto: new Producto({ id: '1', nombre: 'Producto 1', stock: 10, precioEntrada: 20.00, precioVenta: 25.50, tamano: 'Mediano' }),
                cantidad: 10,
                precioUnitario: 20.00,
                usuario: currentUser,
                bodega: bodegas.find(b => b.id === '1')
            }),
            new Transaccion({
                fecha: new Date(Date.now() - 86400000),
                tipo: 'salida',
                producto: new Producto({ id: '2', nombre: 'Producto 2', stock: 5, precioEntrada: 15.75, precioVenta: 25.50, tamano: 'Pequeño' }),
                cantidad: 5,
                precioUnitario: 25.50,
                usuario: currentUser,
                bodega: bodegas.find(b => b.id === '2')
            })
        ];

        displayTransactions(mockTransactions);

    } catch (error) {
        console.error('Error cargando transacciones:', error);
        showMessage('Error al cargar las transacciones', 'error');
    }
}

function displayTransactions(transactions) {
    const tbody = document.querySelector('#transactionsTable tbody');
    
    if (transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8">No hay transacciones registradas para el período seleccionado.</td></tr>';
        return;
    }

    tbody.innerHTML = transactions.map(transaccion => `
        <tr>
            <td>${new Date(transaccion.fecha).toLocaleDateString()}</td>
            <td>${transaccion.tipo}</td>
            <td>${transaccion.producto?.nombre || 'N/A'}</td>
            <td>${transaccion.cantidad}</td>
            <td>$${transaccion.precioUnitario}</td>
            <td>$${transaccion.precioUnitario * transaccion.cantidad}</td>
            <td>${transaccion.usuario?.nombre || 'N/A'}</td>
            <td>${transaccion.bodega?.nombre || 'N/A'}</td>
        </tr>
    `).join('');
}

async function filterFinances() {
    const monthSelect = document.getElementById('financeMonthSelect').value;
    const startDate = document.getElementById('financeStartDate').value;
    const endDate = document.getElementById('financeEndDate').value;

    try {
        console.log('Filtrando finanzas:', { monthSelect, startDate, endDate });
        
        // Simular filtrado
        await loadTransactions();

    } catch (error) {
        console.error('Error filtrando transacciones:', error);
        showMessage('Error al filtrar las transacciones', 'error');
    }
}

// ===== FUNCIONES AUXILIARES =====
function showMessage(message, type = 'success') {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    messageElement.textContent = message;
    
    document.body.appendChild(messageElement);
    
    setTimeout(() => {
        messageElement.remove();
    }, 3000);
}

async function handleLogout() {
    try {
        console.log('Cerrando sesión...');
        
        // Simular cierre de sesión
        showMessage('Sesión cerrada exitosamente', 'success');
        
        // Redirigir a la página principal
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
        
    } catch (error) {
        console.error('Error cerrando sesión:', error);
        showMessage('Error al cerrar sesión', 'error');
    }
}

function handleOCR() {
    // Implementar funcionalidad OCR aquí
    showMessage('Funcionalidad OCR en desarrollo', 'success');
}

// Event listeners adicionales
document.addEventListener('change', function(e) {
    if (e.target.id === 'warehouseSelect') {
        loadProducts();
    }
}); 