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

const auth = firebase.auth();
const db = firebase.firestore();
let currentProductId = null;
let allProducts = [];

// Login com "Lembre-se de mim" e exibição do indicador de carregamento
window.login = function() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const rememberMe = document.getElementById("remember-me").checked;
  const loadingMessage = document.getElementById("loading-message");

  loadingMessage.style.display = "block";

  const persistence = rememberMe ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION;

  auth.setPersistence(persistence).then(() => {
    return auth.signInWithEmailAndPassword(email, password);
  }).then(() => {
    document.getElementById("login").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");
    loadingMessage.style.display = "none";
    loadProducts();
  }).catch((error) => {
    document.getElementById("error-message").innerText = "Erro: " + error.message;
    loadingMessage.style.display = "none";
  });
};

// Logout
window.logout = function() {
  auth.signOut().then(() => {
    document.getElementById("dashboard").classList.add("hidden");
    document.getElementById("login").classList.remove("hidden");
  });
};

// Carregar produtos e armazenar em um array para filtragem
function loadProducts() {
  db.collection("products").onSnapshot((querySnapshot) => {
    allProducts = [];
    querySnapshot.forEach((doc) => {
      let product = { id: doc.id, ...doc.data() };
      allProducts.push(product);
    });
    renderProducts(allProducts);
  });
}

// Renderizar os produtos na tabela
function renderProducts(products) {
  const tableBody = document.getElementById("product-table");
  tableBody.innerHTML = "";
  products.forEach((product) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${product.name}</td>
      <td>${product.quantity}</td>
      <td>${product.category || "Sem Categoria"}</td>
      <td>
        <button class="btn btn-edit" onclick="editProduct('${product.id}', '${product.name}', '${product.quantity}', '${product.category}')">Editar</button>
        <button class="btn btn-delete" onclick="deleteProduct('${product.id}')">Remover</button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

// Implementação da barra de pesquisa
document.getElementById("search-bar").addEventListener("input", function() {
  const query = this.value.toLowerCase();
  const filteredProducts = allProducts.filter(product => {
    const nameMatch = product.name.toLowerCase().includes(query);
    const categoryMatch = product.category ? product.category.toLowerCase().includes(query) : false;
    return nameMatch || categoryMatch;
  });
  renderProducts(filteredProducts);
});

// Abrir modal para adicionar produto
window.openAddModal = function() {
  currentProductId = null;
  document.getElementById("modal-title").innerText = "Adicionar Produto";
  document.getElementById("modal-product-name").value = "";
  document.getElementById("modal-product-quantity").value = "";
  document.getElementById("modal-product-category").value = "";
  document.getElementById("modal").classList.add("active");
};

// Abrir modal para editar produto
window.editProduct = function(id, name, quantity, category) {
  currentProductId = id;
  document.getElementById("modal-title").innerText = "Editar Produto";
  document.getElementById("modal-product-name").value = name;
  document.getElementById("modal-product-quantity").value = quantity;
  document.getElementById("modal-product-category").value = category;
  document.getElementById("modal").classList.add("active");
};

// Salvar produto (adiciona ou atualiza)
window.saveProduct = function() {
  const name = document.getElementById("modal-product-name").value;
  const quantity = document.getElementById("modal-product-quantity").value;
  const category = document.getElementById("modal-product-category").value;

  if (name && quantity) {
    if (currentProductId) {
      // Atualizar produto
      db.collection("products").doc(currentProductId).update({ name, quantity, category })
        .then(() => {
          closeModal();
          currentProductId = null;
        })
        .catch((error) => { alert("Erro ao atualizar produto: " + error.message); });
    } else {
      // Adicionar novo produto
      db.collection("products").add({ name, quantity, category })
        .then(() => { closeModal(); })
        .catch((error) => { alert("Erro ao adicionar produto: " + error.message); });
    }
  } else {
    alert("Preencha todos os campos!");
  }
};

// Fechar modal
window.closeModal = function() {
  document.getElementById("modal").classList.remove("active");
};

// Deletar produto
window.deleteProduct = function(id) {
  db.collection("products").doc(id).delete();
};
