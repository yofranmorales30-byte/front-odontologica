// Código de país de la clínica (Venezuela). Los teléfonos se cargan en formato local: "04121234567"
const CODIGO_PAIS = '58';

// Teléfono en formato internacional sin "+" (lo que pide wa.me), o null si no sirve.
//   "04121234567"    → "584121234567"
//   "4121234567"     → "584121234567"
//   "+58 412-123..." → "584121234567"
//   "0000000000", "550101", "" → null
export function telefonoInternacional(telefono) {
    let digitos = String(telefono ?? '').replace(/\D/g, '');
    if (digitos.startsWith('00')) digitos = digitos.slice(2); // prefijo internacional 00

    if (digitos.startsWith(CODIGO_PAIS) && digitos.length === 12) return digitos;
    if (digitos.startsWith('0') && digitos.length === 11 && !/^0+$/.test(digitos)) return CODIGO_PAIS + digitos.slice(1);
    if (!digitos.startsWith('0') && digitos.length === 10) return CODIGO_PAIS + digitos;
    if (!digitos.startsWith('0') && digitos.length >= 11 && digitos.length <= 15) return digitos; // otro país
    return null;
}

export function whatsappUrl(telefono) {
    const numero = telefonoInternacional(telefono);
    return numero ? `https://wa.me/${numero}` : null;
}
