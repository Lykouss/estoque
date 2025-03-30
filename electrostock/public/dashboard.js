(function() {
    let currentProductId = null;
    let currentEmployeeId = null;
    let currentSection = "products";
    let allProducts = [];
  
    window.allLogs = [];
    window.allEmployees = [];
  
    const productSection = document.getElementById("products-section");
    const employeesSection = document.getElementById("employees-section");
    const logSection = document.getElementById("log-section");
    const searchBar = document.getElementById("search-bar");
    const productTableBody = document.getElementById("product-table");
    const employeeTableBody = document.getElementById("employee-table");
    const addProductModal = document.getElementById("modal");
    const addProductModalTitle = document.getElementById("modal-title");
    const modalProductNameInput = document.getElementById("modal-product-name");
    const modalProductCategoryInput = document.getElementById("modal-product-category");
    const modalProductQuantityInput = document.getElementById("modal-product-quantity");
    const addEmployeeModal = document.getElementById("modal-employee");
    const addEmployeeModalTitle = document.getElementById("modal-employee-title");
    const modalEmployeeNameInput = document.getElementById("modal-employee-name");
    const modalEmployeeEmailInput = document.getElementById("modal-employee-email");
    const modalEmployeePasswordInput = document.getElementById("modal-employee-password");
    const modalEmployeeRoleSelect = document.getElementById("modal-employee-role");
    const sidebarElement = document.getElementById("sidebar");
    const menuToggleElement = document.querySelector(".menu-toggle");
  
    function renderLogs(logs) {
      const logTableBody = document.getElementById("log-table");
      if (!logTableBody) return;
      logTableBody.innerHTML = "";
      if (!logs || logs.length === 0) {
        logTableBody.innerHTML = "<tr><td colspan='5'>Nenhum log encontrado.</td></tr>";
        return;
      }
  
      logs.forEach(log => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${log.userName}</td>
            <td>${log.userEmail}</td>
            <td>${log.action}</td>
            <td>${log.timestamp ? new Date(log.timestamp.toDate()).toLocaleDateString() : ''}</td>
            <td>${log.timestamp ? new Date(log.timestamp.toDate()).toLocaleTimeString() : ''}</td>
          `;
        logTableBody.appendChild(tr);
      });
    }
  
    function renderEmployees(employees) {
      employeeTableBody.innerHTML = "";
      if (!employees || employees.length === 0) {
        employeeTableBody.innerHTML = "<tr><td colspan='4'>Nenhum funcionário cadastrado.</td></tr>";
        return;
      }
  
      const loggedInUserId = localStorage.getItem("loggedInUserId");
      let currentUserRole = null;
      if (loggedInUserId) {
        db.collection("employees").doc(loggedInUserId).get().then(employeeDoc => {
          if (employeeDoc.exists) {
            currentUserRole = employeeDoc.data().role;
  
            employees.forEach((employee) => {
              const tr = document.createElement("tr");
              let buttonsHTML = '';
  
              if (currentUserRole === 'dono' || currentUserRole === 'gerente') {
                buttonsHTML = `
                    <button class="btn btn-edit" onclick="editEmployee('${employee.id}')">Editar</button>
                    <button class="btn btn-delete" onclick="deleteEmployee('${employee.id}')">Remover</button>
                  `;
              } else if (currentUserRole === 'supervisor') {
                buttonsHTML = `Somente leitura`;
              } else {
                buttonsHTML = ``;
              }
  
              tr.innerHTML = `
                    <td>${employee.name}</td>
                    <td>${employee.email}</td>
                    <td>${employee.role}</td>
                    <td>
                        ${buttonsHTML}
                    </td>
                  `;
              employeeTableBody.appendChild(tr);
            });
          } else {
            employees.forEach((employee) => {
              const tr = document.createElement("tr");
              tr.innerHTML = `
                    <td>${employee.name}</td>
                    <td>${employee.email}</td>
                    <td>${employee.role}</td>
                    <td></td>
                  `;
              employeeTableBody.appendChild(tr);
            });
          }
        }).catch(error => {
          employees.forEach((employee) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                  <td>${employee.name}</td>
                  <td>${employee.email}</td>
                  <td>${employee.role}</td>
                  <td></td>
                `;
            employeeTableBody.appendChild(tr);
          });
        });
      } else {
        employees.forEach((employee) => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
              <td>${employee.name}</td>
              <td>${employee.email}</td>
              <td>${employee.role}</td>
              <td>
                  <button class="btn btn-edit" onclick="editEmployee('${employee.id}')">Editar</button>
                  <button class="btn btn-delete" onclick="deleteEmployee('${employee.id}')">Remover</button>
              </td>
            `;
          employeeTableBody.appendChild(tr);
        });
      }
    }
  
    // Carregar produtos e armazenar em um array para filtragem
    window.loadProducts = function () {
      const user = auth.currentUser;
      let companyId;
  
      if (user) {
        companyId = user.uid;
      } else {
        const loggedInUserId = localStorage.getItem("loggedInUserId");
        if (loggedInUserId) {
          db.collection("employees").doc(loggedInUserId).get().then(doc => {
            if (doc.exists) {
              companyId = doc.data().companyId;
              db.collection("products")
                .where("companyId", "==", companyId)
                .onSnapshot((snapshot) => {
                  allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                  renderProducts(allProducts);
                });
            }
          });
          return;
        } else {
          return;
        }
      }
  
      db.collection("products")
        .where("companyId", "==", companyId)
        .onSnapshot((snapshot) => {
          allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          renderProducts(allProducts);
        });
    };
  
    // Renderizar os produtos na tabela
    function renderProducts(products) {
      productTableBody.innerHTML = "";
      if (!products || products.length === 0) {
        productTableBody.innerHTML = "<tr><td colspan='3'>Nenhum produto cadastrado.</td></tr>";
        return;
      }
      products.forEach((product) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${product.name}</td>
            <td>${product.quantity}</td>
            <td>${product.category}</td>
            <td>
                <button class="btn btn-edit" onclick="editProduct('${product.id}', '${product.name}', '${product.quantity}', '${product.category}')">Editar</button>
                <button class="btn btn-delete" onclick="deleteProduct('${product.id}')">Remover</button>
            </td>
          `;
        productTableBody.appendChild(tr);
      });
    }
  
    searchBar.addEventListener("input", function () {
      const query = this.value.toLowerCase();
  
      if (currentSection === "products") {
        const filteredProducts = allProducts.filter(
          (product) =>
            product.name.toLowerCase().includes(query) ||
            (product.category && product.category.toLowerCase().includes(query))
        );
        renderProducts(filteredProducts);
      } else if (currentSection === "employees") {
        const filteredEmployees = window.allEmployees.filter(employee =>
          employee.name.toLowerCase().includes(query) ||
          employee.email.toLowerCase().includes(query) ||
          employee.role.toLowerCase().includes(query)
        );
        renderEmployees(filteredEmployees);
      } else if (currentSection === "log") {
        const filteredLogs = window.allLogs.filter(log =>
          log.userName.toLowerCase().includes(query) ||
          log.userEmail.toLowerCase().includes(query) ||
          log.action.toLowerCase().includes(query)
        );
        renderLogs(filteredLogs);
      }
    });
  
    // Abrir modal para adicionar produto
    window.openAddModal = function() {
      addProductModal.dataset.productId = "";
      addProductModalTitle.innerText = "Adicionar Produto";
      modalProductNameInput.value = "";
      modalProductCategoryInput.value = "";
      modalProductQuantityInput.value = "1";
      addProductModal.classList.add("active");
    };
  
    // Abrir modal para editar produto
    window.editProduct = function(id, name, quantity, category) {
      addProductModal.dataset.productId = id;
      addProductModalTitle.innerText = "Editar Produto";
      modalProductNameInput.value = name;
      modalProductQuantityInput.value = quantity;
      modalProductCategoryInput.value = category;
      addProductModal.classList.add("active");
    };
  
    // Fechar modal de produto
    window.closeModal = function() {
      addProductModal.classList.remove("active");
    };
  
    // Alternar a bandeja lateral
    window.toggleSidebar = function () {
      sidebarElement.classList.toggle("active");
    };
  
    // Mostrar seções do Dashboard
    window.showDashboard = function () {
      currentSection = "products";
      productSection.classList.remove("hidden");
      employeesSection.classList.add("hidden");
      logSection.classList.add("hidden");
    };
    window.showEmployees = async function () {
      currentSection = "employees";
      const loggedInUserId = localStorage.getItem("loggedInUserId");
      let userRole = null;
      if (loggedInUserId) {
        const employeeDoc = await db.collection("employees").doc(loggedInUserId).get();
        if (employeeDoc.exists) {
          userRole = employeeDoc.data().role;
        }
      } else {
        userRole = 'dono';
      }
  
      if (userRole === 'dono' || userRole === 'gerente') {
        productSection.classList.add("hidden");
        employeesSection.classList.remove("hidden");
        logSection.classList.add("hidden");
        window.loadEmployees();
      } else {
        alert("Acesso negado. Apenas Donos e Gerentes podem acessar a seção de funcionários.");
        window.showDashboard();
      }
    };
  
    window.showLog = async function () {
      currentSection = "log";
      const loggedInUserId = localStorage.getItem("loggedInUserId");
      let userRole = null;
  
      if (loggedInUserId) {
        const employeeDoc = await db.collection("employees").doc(loggedInUserId).get();
        if (employeeDoc.exists) {
          userRole = employeeDoc.data().role;
        }
      } else {
        userRole = 'dono';
      }
  
      if (userRole === 'dono' || userRole === 'gerente' || userRole === 'supervisor') {
        productSection.classList.add("hidden");
        employeesSection.classList.add("hidden");
        logSection.classList.remove("hidden");
        window.loadLog();
      } else {
        alert("Acesso negado. Apenas Donos, Gerentes e Supervisores podem acessar a seção de log.");
        window.showDashboard();
      }
    };
  
    // Helper function to get companyId if auth.currentUser is null
    async function getCompanyIdFromLoggedInEmployee() {
      const loggedInUserId = localStorage.getItem("loggedInUserId");
      if (loggedInUserId) {
        const employeeDoc = await db.collection("employees").doc(loggedInUserId).get();
        if (employeeDoc.exists) {
          return employeeDoc.data().companyId;
        }
      }
      return null;
    }
  
    // Helper function to get userEmail if auth.currentUser is null
    window.getUserEmailFromLoggedInEmployee = async function() {
      const loggedInUserId = localStorage.getItem("loggedInUserId");
      if (loggedInUserId) {
        try {
          const employeeDoc = await db.collection("employees").doc(loggedInUserId).get();
          if (employeeDoc.exists) {
            return employeeDoc.data().email;
          } else {
            return null;
          }
        } catch (error) {
          return null;
        }
      }
      return null;
    };
  
    document.addEventListener("DOMContentLoaded", function () {
      sidebarElement.classList.remove("active");
  
      menuToggleElement.addEventListener("click", function (event) {
        sidebarElement.classList.add("active");
      });
  
      document.addEventListener("click", function (event) {
        if (!sidebarElement.contains(event.target) && !menuToggleElement.contains(event.target)) {
          sidebarElement.classList.remove("active");
        }
      });
    });
  })();