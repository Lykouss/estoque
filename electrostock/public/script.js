window.onload = function() {
    const firebaseConfig = {
      apiKey: "AIzaSyB4kICkZpo8HJGVbPXIeqD1c_3Ab67bGdU",
      authDomain: "gerenciamento-de-estoque-3075e.firebaseapp.com",
      projectId: "gerenciamento-de-estoque-3075e",
      storageBucket: "gerenciamento-de-estoque-3075e.firebasestorage.app",
      messagingSenderId: "788827481348",
      appId: "1:788827481348:web:4f5dd42272a38fafd4dc51",
      measurementId: "G-QFKM1VD7K2"
    };
  
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
  
    const auth = firebase.auth();
    const db = firebase.firestore();
    let currentProductId = null;
  
    // Função de login
    window.login = function() {
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
  
      auth.signInWithEmailAndPassword(email, password)
        .then(() => {
          document.getElementById("login").classList.add("hidden");
          document.getElementById("dashboard").classList.remove("hidden");
          loadProducts();  // Carrega os produtos na hora do login
        })
        .catch((error) => {
          document.getElementById("error-message").innerText = "Erro: " + error.message;
        });
    };
  
    // Função de logout
    window.logout = function() {
      auth.signOut().then(() => {
        document.getElementById("dashboard").classList.add("hidden");
        document.getElementById("login").classList.remove("hidden");
      });
    };
  
    // Carrega produtos do Firestore e insere na tabela
    function loadProducts() {
      db.collection("products").onSnapshot((querySnapshot) => {
        const tableBody = document.getElementById("product-table");
        tableBody.innerHTML = "";
        querySnapshot.forEach((doc) => {
          const product = doc.data();
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${product.name}</td>
            <td>${product.quantity}</td>
            <td>
              <button class="btn btn-edit" onclick="openEditModal('${doc.id}', '${product.name}', '${product.quantity}')">Editar</button>
              <button class="btn btn-delete" onclick="deleteProduct('${doc.id}')">Remover</button>
            </td>
          `;
          tableBody.appendChild(tr);
        });
      });
    }
  
    // Modal de adicionar/editar produto
    window.openAddModal = function() {
      currentProductId = null;
      document.getElementById("modal-title").innerText = "Adicionar Produto";
      document.getElementById("modal-product-name").value = "";
      document.getElementById("modal-product-quantity").value = "";
      document.getElementById("modal").classList.add("active");
    };
  
    window.openEditModal = function(id, name, quantity) {
      currentProductId = id;
      document.getElementById("modal-title").innerText = "Editar Produto";
      document.getElementById("modal-product-name").value = name;
      document.getElementById("modal-product-quantity").value = quantity;
      document.getElementById("modal").classList.add("active");
    };
  
    window.closeModal = function() {
      document.getElementById("modal").classList.remove("active");
    };
  
    window.saveProduct = function() {
      const name = document.getElementById("modal-product-name").value;
      const quantity = document.getElementById("modal-product-quantity").value;
  
      if (name && quantity) {
        if (currentProductId) {
          // Atualiza produto
          db.collection("products").doc(currentProductId).update({ name, quantity })
            .then(() => {
              alert("Produto atualizado!");
              closeModal();
            })
            .catch((error) => {
              alert("Erro ao atualizar produto: " + error.message);
            });
        } else {
          // Adiciona novo produto
          db.collection("products").add({ name, quantity })
            .then(() => {
              alert("Produto adicionado!");
              closeModal();
            })
            .catch((error) => {
              alert("Erro ao adicionar produto: " + error.message);
            });
        }
      } else {
        alert("Preencha todos os campos!");
      }
    };
  
    window.deleteProduct = function(id) {
      if (confirm("Tem certeza que deseja remover esse produto?")) {
        db.collection("products").doc(id).delete()
          .then(() => {
            alert("Produto removido!");
          })
          .catch((error) => {
            alert("Erro ao remover produto: " + error.message);
          });
      }
    };
  };
  