function asistentedevoz() {
    const utterance = new SpeechSynthesisUtterance("Hola, soy tu asistente de voz. ¿En qué puedo ayudarte?");
    utterance.lang = 'es-ES'; // Especifica el idioma español para la voz.
    speechSynthesis.speak(utterance);
}


 