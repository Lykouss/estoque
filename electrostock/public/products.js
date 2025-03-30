(function() {
  let currentProductId = null;
  let allProducts = [];

  const productTableBody = document.getElementById("product-table");
  const addProductModal = document.getElementById("modal");
  const addProductModalTitle = document.getElementById("modal-title");
  const modalProductNameInput = document.getElementById("modal-product-name");
  const modalProductCategoryInput = document.getElementById("modal-product-category");
  const modalProductQuantityInput = document.getElementById("modal-product-quantity");

  // Funções para incrementar e decrementar a quantidade
  window.increment = function() {
    modalProductQuantityInput.value = parseInt(modalProductQuantityInput.value) + 1;
  };

  window.decrement = function() {
    let currentValue = parseInt(modalProductQuantityInput.value);
    if (currentValue > 1) {
      modalProductQuantityInput.value = currentValue - 1;
    }
  };

  // Função para salvar um produto no Firestore
  window.saveProduct = async function() {
    const name = modalProductNameInput.value;
    const category = modalProductCategoryInput.value;
    const quantity = modalProductQuantityInput.value;
    const user = auth.currentUser;
    let companyId;

    if (!name || !category || !quantity) {
      alert("Nome, Categoria e Quantidade são obrigatórios!");
      return;
    }

    if (user) {
      companyId = user.uid;
    } else {
      const loggedInUserId = localStorage.getItem("loggedInUserId");
      if (loggedInUserId) {
        const employeeDoc = await db.collection("employees").doc(loggedInUserId).get();
        if (employeeDoc.exists) {
          companyId = employeeDoc.data().companyId;
        } else {
          alert("Erro: Funcionário não encontrado.");
          return;
        }
      } else {
        alert("Erro: Usuário não autenticado.");
        return;
      }
    }

    const productData = {
      name,
      category,
      quantity: Number(quantity),
      companyId: companyId,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    const productIdFromData = addProductModal.dataset.productId;

    if (productIdFromData) {
      await db.collection("products").doc(productIdFromData).update(productData)
        .then(() => {
          window.loadProducts();
          window.closeModal();
          window.addLogEntry(`Editou o produto: ${name} (${quantity})`);
        })
        .catch((error) => {
          alert("Erro ao editar produto: " + error.message);
          console.error("Erro ao editar produto:", error);
        });
    } else {
      await db.collection("products").add({
        ...productData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      })
        .then(() => {
          window.loadProducts();
          window.closeModal();
          window.addLogEntry(`Adicionou o produto: ${name} (${quantity})`);
        })
        .catch((error) => {
          alert("Erro ao adicionar produto: " + error.message);
          console.error("Erro ao adicionar produto:", error);
        });
    }
  };

  window.deleteProduct = function(productId) {
    const confirmDelete = confirm("Tem certeza que deseja remover este produto?");
    if (confirmDelete) {
      db.collection("products").doc(productId).get().then(productDoc => {
        if (productDoc.exists) {
          const productName = productDoc.data().name;
          const quantity = productDoc.data().quantity;

          db.collection("products").doc(productId).delete()
            .then(() => {
              alert("Produto removido com sucesso!");
              window.loadProducts();
              window.addLogEntry(`Removeu o produto: ${productName} (${quantity})`);
            });
        } else {
          alert("Erro: Produto não encontrado para remoção.");
        }
      }).catch(error => {
        alert("Erro ao buscar produto para remoção: " + error.message);
        console.error("Erro ao buscar produto para remoção:", error);
      });
    } else {
      alert("Remoção cancelada.");
    }
  };
})();