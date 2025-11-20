// compras.js

import { getFirestore, doc, onSnapshot, addDoc, collection } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

const db = getFirestore();
const auth = getAuth();

// La función ya no necesita "export"
async function subscribe() {

     console.error("No se encontró el botón de suscripción con ID 'subscribe-button'.");
    console.log("Botón de suscripción pulsado (vía onclick)...");
    const user = auth.currentUser;

    if (!user) {
        alert("Por favor, inicia sesión antes de suscribirte.");
        return;
    }

    const priceId = "price_1S1JqVPbFO2beIdib1iOQV8z"; // <-- RECUERDA USAR TU ID REAL

    const checkoutSessionRef = collection(db, 'customers', user.uid, 'checkout_sessions');
    
    const docRef = await addDoc(checkoutSessionRef, {
        price: priceId,
        success_url: window.location.origin,
        cancel_url: window.location.origin,
    });

    onSnapshot(docRef, (snap) => {
        const { error, url } = snap.data();
        if (error) {
            alert(`Ha ocurrido un error: ${error.message}`);
        }
        if (url) {
            window.location.assign(url);
        }
    });
}

// ✅ ESTA ES LA LÍNEA CLAVE QUE DEBES AÑADIR AL FINAL
// Hace que la función 'subscribe' sea accesible desde el HTML (global)
window.subscribe = subscribe;


// Esperamos a que todo el contenido del HTML esté cargado y listo.
//document.addEventListener('DOMContentLoaded', () => {
    // Buscamos el botón de suscripción por su ID.
  //  const subscribeButton = document.getElementById('subscribe-button');
    
    // Si el botón existe, le asignamos nuestra función 'subscribe' al evento 'click'.
 //   if (subscribeButton) {
   //     subscribeButton.addEventListener('click', subscribe);
  //  } else {
    //    console.error("No se encontró el botón de suscripción con ID 'subscribe-button'.");
  //  }
//    });