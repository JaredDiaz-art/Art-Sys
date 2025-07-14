# Sistema OCR Integrado para ArtSys

## Descripción

Este sistema OCR está completamente integrado con la estética y funcionalidad del sitio principal de ArtSys. Permite escanear listas de productos usando la cámara del dispositivo y procesar la información automáticamente.

## Características

### 🔍 Funcionalidades OCR
- **Detección automática**: Identifica patrones de productos (cantidad, nombre, capacidad, precio)
- **Procesamiento con IA**: Interpreta y organiza los datos escaneados
- **Edición manual**: Permite corregir cualquier error del OCR
- **Múltiples formatos**: Soporta diferentes patrones de texto

### 📱 Interfaz de Usuario
- **Modal integrado**: Se abre desde cualquier botón OCR del sitio
- **Cámara en tiempo real**: Acceso directo a la cámara del dispositivo
- **Tabla editable**: Resultados organizados en tabla modificable
- **Estética consistente**: Mantiene el diseño artesanal del sitio

### 💾 Base de Datos Local
- **IndexedDB**: Almacenamiento local sin servidor
- **Completamente offline**: Funciona sin conexión a internet
- **Persistencia**: Los datos se mantienen entre sesiones
- **Exportación**: Posibilidad de exportar/importar datos

## Cómo Usar

### 1. Acceso al OCR
- Navega a cualquier sección (Entradas, Salidas, Bajas)
- Haz clic en el botón "OCR" correspondiente
- Se abrirá el modal de escaneo

### 2. Escaneo de Productos
- Haz clic en "Iniciar Cámara"
- Posiciona la lista de productos frente a la cámara
- Haz clic en "Capturar" cuando esté bien enfocado
- El sistema procesará la imagen automáticamente

### 3. Revisión y Edición
- Revisa los productos detectados en la tabla
- Edita cualquier campo si es necesario
- Elimina productos incorrectos con el botón 🗑️
- Haz clic en "Confirmar y Enviar" cuando esté listo

### 4. Confirmación
- El sistema ejecutará la acción correspondiente:
  - **Entradas**: Registra productos nuevos
  - **Salidas**: Registra ventas
  - **Bajas**: Registra productos dados de baja (precios negativos)

## Patrones de Texto Soportados

El sistema detecta automáticamente estos formatos:

```
2 Jabón de manos 500ml $3.50
1 Detergente líquido 1L $5.20
3 Papel higiénico 4 rollos $2.80
```

### Formatos válidos:
- `cantidad nombre capacidad precio`
- `cantidad nombre precio`
- `cantidad nombre capacidad $precio`
- `cantidad nombre $precio`

## Estructura de Datos

### Productos
```javascript
{
  cantidad: number,
  nombre: string,
  capacidad: string,
  precio: number,
  accion: 'entrada' | 'salida' | 'baja',
  fecha: ISO string,
  bodega: string
}
```

### Transacciones
```javascript
{
  tipo: string,
  productos: Array,
  bodega: string,
  fecha: ISO string,
  total: number
}
```

## Tecnologías Utilizadas

- **Tesseract.js**: Procesamiento OCR en el navegador
- **IndexedDB**: Base de datos local
- **MediaDevices API**: Acceso a la cámara
- **Canvas API**: Procesamiento de imágenes

## Archivos del Sistema

- `ocr-system.js`: Lógica principal del OCR
- `ocr-styles.css`: Estilos específicos del OCR
- `local-database.js`: Sistema de base de datos local
- `principal.html`: Integración con el sitio principal

## Configuración

### Requisitos del Navegador
- Soporte para `getUserMedia` (cámara)
- Soporte para IndexedDB
- Conexión HTTPS (para acceso a cámara)

### Instalación
1. Asegúrate de que todos los archivos estén en el directorio `Principal/`
2. Abre `principal.html` en un navegador moderno
3. El sistema se inicializará automáticamente

## Funciones Principales

### OCRSystem Class
- `openOCR(action)`: Abre el modal OCR
- `startCamera()`: Inicia la cámara
- `captureImage()`: Captura la imagen
- `processOCR()`: Procesa la imagen con Tesseract.js
- `processWithAI()`: Interpreta los resultados
- `displayResults()`: Muestra los resultados en tabla
- `confirmAndSend()`: Ejecuta la acción final

### LocalDatabase Class
- `saveProductos()`: Guarda productos en la BD
- `saveTransaccion()`: Guarda transacciones
- `getProductos()`: Obtiene productos
- `getTransacciones()`: Obtiene transacciones
- `exportData()`: Exporta datos
- `importData()`: Importa datos

## Personalización

### Modificar Patrones de Detección
Edita el método `processWithAI()` en `ocr-system.js`:

```javascript
const patterns = [
    /(\d+)\s+(.+?)\s+(\d+[mlL])\s+\$?(\d+\.?\d*)/i,
    // Agrega tus propios patrones aquí
];
```

### Cambiar Estilos
Modifica `ocr-styles.css` para ajustar la apariencia:

```css
.ocr-button {
    /* Tus estilos personalizados */
}
```

## Solución de Problemas

### La cámara no funciona
- Verifica permisos del navegador
- Asegúrate de estar en HTTPS
- Prueba en un navegador diferente

### OCR no detecta texto
- Mejora la iluminación
- Asegúrate de que el texto esté bien enfocado
- Verifica que el texto sea legible

### Base de datos no funciona
- Verifica que IndexedDB esté habilitado
- Limpia los datos del navegador si es necesario
- El sistema usará localStorage como fallback

## Notas de Desarrollo

- El sistema funciona completamente offline
- No requiere servidor ni configuración adicional
- Los datos se almacenan localmente en el navegador
- Compatible con todos los navegadores modernos 