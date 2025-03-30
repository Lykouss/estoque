(function() {
  // Configuração do Firebase
  const firebaseConfig = {
    apiKey: "AIzaSyB4kICkZpo8HJGVbPXIeqD1c_3Ab67bGdU",
    authDomain: "gerenciamento-de-estoque-3075e.firebaseapp.com",
    projectId: "gerenciamento-de-estoque-3075e",
    storageBucket: "gerenciamento-de-estoque-3075e.firebasestorage.app",
    messagingSenderId: "788827481348",
    appId: "1:788827481348:web:4f5dd42272a38fafd4dc51",
    measurementId: "G-QFKM1VD7K2"
  };

  // Inicializando Firebase
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  window.auth = firebase.auth();
  window.db = firebase.firestore();
})();