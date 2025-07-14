// Sistema OCR integrado para ArtSys con flujo de confirmación y "IA" avanzada
class OCRSystem {
    constructor() {
        this.stream = null;
        this.video = null;
        this.currentAction = null;
        this.capturedImage = null;
        this.ocrResults = [];
        this.tesseract = null;
        this.rawOCRText = '';
        this.init();
    }

    async init() {
        this.createOCRModal();
        this.bindEvents();
        await this.loadTesseract();
    }

    async loadTesseract() {
        try {
            if (typeof Tesseract === 'undefined') {
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/tesseract.js@4/dist/tesseract.min.js';
                document.head.appendChild(script);
                await new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = reject;
                });
            }
            this.tesseract = Tesseract;
        } catch (error) {
            console.error('Error al cargar Tesseract.js:', error);
        }
    }

    createOCRModal() {
        const modalHTML = `
            <div id="ocrModal" class="modal" style="display: none;">
                <div class="modal-content" style="max-width: 900px; width: 95%;">
                    <span class="close-button" id="closeOCRModal">&times;</span>
                    <div class="modal-header-with-img">
                        <h3>🔍 Escáner OCR - <span id="ocrActionTitle">Entradas</span></h3>
                    </div>
                    <!-- Paso 1: Cámara -->
                    <div id="ocrCameraStep" class="ocr-step active">
                        <div class="camera-container">
                            <video id="ocrVideo" autoplay playsinline muted style="width: 100%; max-width: 500px; border-radius: 10px; margin: 20px 0;"></video>
                            <div class="camera-controls">
                                <button id="startCameraBtn" class="artisanal-button">📷 Iniciar Cámara</button>
                                <button id="captureImageBtn" class="artisanal-button" style="display: none;">📸 Capturar</button>
                                <button id="stopCameraBtn" class="artisanal-button" style="display: none;">⏹️ Detener</button>
                            </div>
                        </div>
                    </div>
                    <!-- Paso 2: Confirmar Foto -->
                    <div id="ocrConfirmStep" class="ocr-step" style="display: none; text-align:center;">
                        <h4>¿La foto es clara y legible?</h4>
                        <img id="ocrCapturedImage" style="max-width: 400px; border-radius: 10px; margin: 20px 0;" />
                        <div class="ocr-actions">
                            <button id="confirmPhotoBtn" class="artisanal-button">✅ Usar esta foto</button>
                            <button id="retakePhotoBtn2" class="action-button">📷 Tomar otra foto</button>
                        </div>
                    </div>
                    <!-- Paso 3: Resultados OCR/IA -->
                    <div id="ocrResultsStep" class="ocr-step" style="display: none;">
                        <div class="ocr-status">
                            <div id="ocrStatus" class="status info">Procesando imagen...</div>
                        </div>
                        <div id="ocrResultsContainer" style="display: none;">
                            <h4>Productos Detectados:</h4>
                            <div class="table-container">
                                <table id="ocrResultsTable">
                                    <thead>
                                        <tr>
                                            <th>Cantidad</th>
                                            <th>Nombre</th>
                                            <th>Capacidad</th>
                                            <th>Tipo Capacidad</th>
                                            <th>Precio</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody></tbody>
                                </table>
                            </div>
                            <div class="ocr-actions">
                                <button id="confirmOCRBtn" class="artisanal-button">✅ Confirmar y Enviar</button>
                                <button id="retakePhotoBtn3" class="action-button">📷 Tomar Nueva Foto</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    bindEvents() {
        document.getElementById('ocrButtonEntradas').addEventListener('click', () => this.openOCR('entrada'));
        document.getElementById('ocrButtonSalidas').addEventListener('click', () => this.openOCR('salida'));
        document.getElementById('ocrButtonBajas').addEventListener('click', () => this.openOCR('baja'));
        document.getElementById('closeOCRModal').addEventListener('click', () => this.closeOCR());
        document.getElementById('startCameraBtn').addEventListener('click', () => this.startCamera());
        document.getElementById('captureImageBtn').addEventListener('click', () => this.captureImage());
        document.getElementById('stopCameraBtn').addEventListener('click', () => this.stopCamera());
        // Confirmación de foto
        document.getElementById('confirmPhotoBtn').addEventListener('click', () => this.processOCR());
        document.getElementById('retakePhotoBtn2').addEventListener('click', () => this.retakePhoto());
        // Resultados
        document.getElementById('confirmOCRBtn').addEventListener('click', () => this.confirmAndSend());
        document.getElementById('retakePhotoBtn3').addEventListener('click', () => this.retakePhoto());
        document.getElementById('ocrModal').addEventListener('click', (e) => {
            if (e.target.id === 'ocrModal') {
                this.closeOCR();
            }
        });
    }

    openOCR(action) {
        this.currentAction = action;
        document.getElementById('ocrActionTitle').textContent = this.getActionTitle(action);
        document.getElementById('ocrModal').style.display = 'block';
        this.showStep('camera');
    }

    closeOCR() {
        this.stopCamera();
        document.getElementById('ocrModal').style.display = 'none';
        this.resetOCR();
    }

    getActionTitle(action) {
        const titles = {
            'entrada': 'Entradas',
            'salida': 'Salidas',
            'baja': 'Bajas'
        };
        return titles[action] || 'OCR';
    }

    showStep(step) {
        document.querySelectorAll('.ocr-step').forEach(s => s.style.display = 'none');
        if (step === 'camera') document.getElementById('ocrCameraStep').style.display = 'block';
        if (step === 'confirm') document.getElementById('ocrConfirmStep').style.display = 'block';
        if (step === 'results') document.getElementById('ocrResultsStep').style.display = 'block';
    }

    async startCamera() {
        try {
            const status = document.getElementById('ocrStatus');
            if (status) { status.textContent = 'Accediendo a la cámara...'; status.className = 'status info'; }
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            this.video = document.getElementById('ocrVideo');
            this.video.srcObject = this.stream;
            document.getElementById('startCameraBtn').style.display = 'none';
            document.getElementById('captureImageBtn').style.display = 'inline-block';
            document.getElementById('stopCameraBtn').style.display = 'inline-block';
            if (status) { status.textContent = '✅ Cámara activada - Posicione la lista de productos'; status.className = 'status success'; }
        } catch (error) {
            console.error('Error al acceder a la cámara:', error);
            if (document.getElementById('ocrStatus')) {
                document.getElementById('ocrStatus').textContent = '❌ Error al acceder a la cámara';
                document.getElementById('ocrStatus').className = 'status error';
            }
        }
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        document.getElementById('startCameraBtn').style.display = 'inline-block';
        document.getElementById('captureImageBtn').style.display = 'none';
        document.getElementById('stopCameraBtn').style.display = 'none';
    }

    captureImage() {
        if (!this.video || !this.video.videoWidth) {
            alert('La cámara no está lista');
            return;
        }
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = this.video.videoWidth;
        canvas.height = this.video.videoHeight;
        context.drawImage(this.video, 0, 0);
        this.capturedImage = canvas.toDataURL('image/jpeg');
        this.stopCamera();
        // Mostrar confirmación de la foto
        document.getElementById('ocrCapturedImage').src = this.capturedImage;
        this.showStep('confirm');
    }

    retakePhoto() {
        this.showStep('camera');
        this.resetOCR();
    }

    resetOCR() {
        this.capturedImage = null;
        this.ocrResults = [];
        this.rawOCRText = '';
        document.getElementById('ocrResultsContainer').style.display = 'none';
        document.getElementById('ocrStatus').textContent = 'Listo para escanear';
        document.getElementById('ocrStatus').className = 'status info';
    }

    async processOCR() {
        this.showStep('results');
        const status = document.getElementById('ocrStatus');
        status.textContent = '🔍 Procesando imagen...';
        status.className = 'status info';
        try {
            if (!this.tesseract) throw new Error('Tesseract.js no está cargado');
            // Usar OCR solo para extraer texto
            const result = await this.tesseract.recognize(
                this.capturedImage,
                'spa+eng',
                {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            status.textContent = `🔍 Procesando... ${Math.round(m.progress * 100)}%`;
                        }
                    }
                }
            );
            this.rawOCRText = result.data.text;
            // Ahora usar la "IA" (regex avanzada) para estructurar la información
            this.ocrResults = this.processWithAI(this.rawOCRText);
            this.displayResults();
        } catch (error) {
            console.error('Error en OCR:', error);
            status.textContent = '❌ Error al procesar la imagen';
            status.className = 'status error';
            // Fallback demo
            await this.fallbackOCR();
        }
    }

    async fallbackOCR() {
        const status = document.getElementById('ocrStatus');
        status.textContent = '⚠️ Usando modo de demostración...';
        status.className = 'status info';
        await new Promise(resolve => setTimeout(resolve, 1000));
        this.rawOCRText = `2 Jabón de manos 500 ml $35\n1 Detergente líquido 1.5 L $52\n3 Papel higiénico 4 rollos 12 m $28\n1 Limpiador multiusos 750 ml $41`;
        this.ocrResults = this.processWithAI(this.rawOCRText);
        this.displayResults();
    }

    // IA: Nueva lógica para extraer los campos según la estructura solicitada
    processWithAI(rawText) {
        const lines = rawText.trim().split('\n').filter(line => line.trim());
        const products = [];
        lines.forEach(line => {
            // Solo procesar si la línea inicia con un número
            const cantidadMatch = line.match(/^(\d+)/);
            if (!cantidadMatch) return;
            let cantidad = parseInt(cantidadMatch[1]);
            let rest = line.replace(/^(\d+)\s+/, '');

            // Buscar la capacidad (número entero, flotante o fracción)
            // Buscar el primer número (entero, flotante o fracción) después de la cantidad
            const capacidadMatch = rest.match(/([\d]+[\/.\d]*)/);
            if (!capacidadMatch) {
                // Si no hay capacidad, fallback: nombre es todo, los demás vacíos
                products.push({
                    cantidad,
                    nombre: rest.trim(),
                    capacidad: '',
                    tipoCapacidad: '',
                    precio: '',
                    original: line.trim()
                });
                return;
            }
            let capacidad = capacidadMatch[1];
            // Nombre: todo lo que está antes de la capacidad
            let nombre = rest.split(capacidad)[0].trim();
            // El resto después de la capacidad
            let afterCapacidad = rest.substring(rest.indexOf(capacidad) + capacidad.length).trim();

            // Tipo de capacidad: la primera palabra después de la capacidad
            const tipoCapMatch = afterCapacidad.match(/^([a-zA-ZáéíóúüñÑ]+)/);
            let tipoCapacidad = tipoCapMatch ? tipoCapMatch[1] : '';

            // Buscar precio: número al final, después de un signo de pesos (puede haber espacios)
            let precio = '';
            const precioMatch = line.match(/\$\s*(\d+[\/.\d]*)\s*$/);
            if (precioMatch) {
                precio = precioMatch[1];
            } else {
                // Si no hay signo de pesos, buscar el último número al final
                const precioAltMatch = afterCapacidad.match(/(\d+[\/.\d]*)\s*$/);
                if (precioAltMatch) precio = precioAltMatch[1];
            }

            products.push({
                cantidad,
                nombre,
                capacidad,
                tipoCapacidad,
                precio,
                original: line.trim()
            });
        });
        return products;
    }

    displayResults() {
        const tbody = document.querySelector('#ocrResultsTable tbody');
        tbody.innerHTML = '';
        this.ocrResults.forEach((product, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><input type="number" value="${product.cantidad || ''}" min="1" class="ocr-edit-input"></td>
                <td><input type="text" value="${product.nombre || ''}" class="ocr-edit-input"></td>
                <td><input type="text" value="${product.capacidad || ''}" class="ocr-edit-input"></td>
                <td><input type="text" value="${product.tipoCapacidad || ''}" class="ocr-edit-input"></td>
                <td><input type="number" value="${product.precio || ''}" min="0" class="ocr-edit-input"></td>
                <td><button onclick="ocrSystem.deleteProduct(${index})" class="action-button delete-button">🗑️</button></td>
            `;
            tbody.appendChild(row);
        });
        document.getElementById('ocrResultsContainer').style.display = 'block';
        document.getElementById('ocrStatus').textContent = `✅ Se detectaron ${this.ocrResults.length} productos`;
        document.getElementById('ocrStatus').className = 'status success';
    }

    deleteProduct(index) {
        this.ocrResults.splice(index, 1);
        this.displayResults();
    }

    confirmAndSend() {
        // Obtener datos editados de la tabla
        const rows = document.querySelectorAll('#ocrResultsTable tbody tr');
        const finalProducts = [];
        rows.forEach(row => {
            const inputs = row.querySelectorAll('.ocr-edit-input');
            finalProducts.push({
                cantidad: parseInt(inputs[0].value),
                nombre: inputs[1].value,
                capacidad: inputs[2].value,
                tipoCapacidad: inputs[3].value,
                precio: parseInt(inputs[4].value)
            });
        });
        this.executeAction(finalProducts);
    }

    executeAction(products) {
        switch (this.currentAction) {
            case 'entrada':
                this.handleEntrada(products);
                break;
            case 'salida':
                this.handleSalida(products);
                break;
            case 'baja':
                this.handleBaja(products);
                break;
        }
    }

    handleEntrada(products) {
        this.saveToDatabase('entrada', products);
        alert(`✅ Se registraron ${products.length} productos como entradas`);
        this.closeOCR();
    }

    handleSalida(products) {
        this.saveToDatabase('salida', products);
        alert(`✅ Se registraron ${products.length} productos como salidas`);
        this.closeOCR();
    }

    handleBaja(products) {
        const bajasProducts = products.map(p => ({ ...p, precio: p.precio ? -Math.abs(p.precio) : 0 }));
        this.saveToDatabase('baja', bajasProducts);
        alert(`✅ Se registraron ${bajasProducts.length} productos como bajas`);
        this.closeOCR();
    }

    async saveToDatabase(action, products) {
        try {
            if (localDB) {
                await localDB.saveProductos(action, products);
                const bodega = this.getCurrentBodega();
                await localDB.saveTransaccion(action, products, bodega);
            } else {
                const transactions = JSON.parse(localStorage.getItem('ocrTransactions') || '[]');
                products.forEach(product => {
                    transactions.push({
                        id: Date.now() + Math.random(),
                        accion: action,
                        cantidad: product.cantidad,
                        producto: product.nombre,
                        capacidad: product.capacidad,
                        tipoCapacidad: product.tipoCapacidad,
                        precio: product.precio,
                        fecha: new Date().toISOString()
                    });
                });
                localStorage.setItem('ocrTransactions', JSON.stringify(transactions));
            }
        } catch (error) {
            console.error('Error al guardar en base de datos:', error);
        }
    }

    getCurrentBodega() {
        const bodegaSelect = document.querySelector('select[id*="warehouse"]');
        return bodegaSelect ? bodegaSelect.value : 'General';
    }
}

let ocrSystem;
document.addEventListener('DOMContentLoaded', () => {
    ocrSystem = new OCRSystem();
}); 