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
let currentEmployeeId = null;
let currentSection = "products";
let allProducts = [];
let allEmployees = []; // Variável para armazenar todos os funcionários em cache

// Esconde a dashboard por padrão ao carregar a página
document.getElementById("dashboard").classList.add("hidden");

window.showRegister = function () {
  document.getElementById("login").classList.add("hidden");
  document.getElementById("register").classList.remove("hidden");
};

window.showLogin = function () {
  document.getElementById("register").classList.add("hidden");
  document.getElementById("login").classList.remove("hidden");
};

window.login = function () {
    console.log("Função login() iniciada");
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const rememberMe = document.getElementById("remember-me").checked;
    const loadingMessage = document.getElementById("loading-message");

    loadingMessage.style.display = "block";

    const persistence = rememberMe
        ? firebase.auth.Auth.Persistence.LOCAL
        : firebase.auth.Auth.Persistence.SESSION;

    // Tentar login como DONO DE EMPRESA (Firebase Authentication padrão)
    auth.setPersistence(persistence)
        .then(() => auth.signInWithEmailAndPassword(email, password))
        .then(() => {
            // Login de DONO DE EMPRESA SUCEDIDO (Firebase Auth)
            console.log("Login de DONO DE EMPRESA SUCEDIDO, auth.currentUser:", auth.currentUser);
            localStorage.setItem("lembrar", rememberMe ? "true" : "false");
            localStorage.removeItem("loggedInUserId"); // Limpar qualquer resquício de login de funcionário
            document.getElementById("login").classList.add("hidden");
            document.getElementById("register").classList.add("hidden");
            document.getElementById("dashboard").classList.remove("hidden");
            loadingMessage.style.display = "none";
            loadProducts();
            loadEmployees();
            window.location.reload(); // ADICIONADO: Recarrega a página e vai para o dashboard
        })
        .catch((errorAuth) => {
            // Falha no login de DONO DE EMPRESA (Firebase Auth), tentar login como FUNCIONÁRIO (Firestore)
            console.log("Falha no login de DONO DE EMPRESA, erro:", errorAuth);
            db.collection("employees")
                .where("email", "==", email)
                .get()
                .then(snapshot => {
                    if (!snapshot.empty) {
                        const employeeDoc = snapshot.docs[0];
                        const employeeData = employeeDoc.data();
                        if (password === employeeData.password) {
                            // Login de FUNCIONÁRIO SUCEDIDO (Firestore - INSEGURO)
                            console.log("Login de FUNCIONÁRIO SUCEDIDO, auth.currentUser:", auth.currentUser, "loggedInUserId:", employeeDoc.id);
                            localStorage.setItem("lembrar", rememberMe ? "true" : "false");
                            localStorage.setItem("loggedInUserId", employeeDoc.id); // Armazenar ID do funcionário no localStorage
                            document.getElementById("login").classList.add("hidden");
                            document.getElementById("register").classList.add("hidden");
                            document.getElementById("dashboard").classList.remove("hidden");
                            loadingMessage.style.display = "none";
                            loadProducts();
                            loadEmployees();
                            window.location.reload(); // ADICIONADO: Recarrega a página e vai para o dashboard
                        } else {
                            // Senha de FUNCIONÁRIO incorreta (Firestore)
                            console.log("Senha de FUNCIONÁRIO incorreta.");
                            document.getElementById("error-message").innerText = "Erro: Senha incorreta.";
                            loadingMessage.style.display = "none";
                        }
                    } else {
                        // Email não encontrado como DONO DE EMPRESA (Firebase Auth) nem como FUNCIONÁRIO (Firestore)
                        console.log("Email não encontrado.");
                        document.getElementById("error-message").innerText = "Erro: Email não encontrado.";
                        loadingMessage.style.display = "none";
                    }
                })
                .catch((errorFirestore) => {
                    console.log("Erro ao tentar login como funcionário:", errorFirestore);
                    document.getElementById("error-message").innerText = "Erro ao tentar login: " + errorFirestore.message;
                    loadingMessage.style.display = "none";
                });
        });
};

// Função para validar CPF
function validarCPF(cpf) {
  cpf = cpf.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let soma = 0, resto;
  for (let i = 1; i <= 9; i++) soma += parseInt(cpf[i - 1]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf[9])) return false;
  soma = 0;
  for (let i = 1; i <= 10; i++) soma += parseInt(cpf[i - 1]) * (12 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(cpf[10]);
}

// Função para validar CNPJ
function validarCNPJ(cnpj) {
  cnpj = cnpj.replace(/\D/g, "");
  if (cnpj.length !== 14) return false;
  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  let digitos = cnpj.substring(tamanho);
  let soma = 0, pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado != digitos.charAt(0)) return false;
  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  return resultado == digitos.charAt(1);
}

// Cadastro de Empresa
window.registerCompany = function() {
  const companyName = document.getElementById("company-name").value;
  const cnpj = document.getElementById("cnpj").value;
  const ownerName = document.getElementById("owner-name").value;
  const cpf = document.getElementById("cpf").value;
  const email = document.getElementById("register-email").value;
  const password = document.getElementById("register-password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  if (!companyName || !cnpj || !ownerName || !cpf || !email || !password || !confirmPassword) {
      alert("Todos os campos são obrigatórios.");
      return;
  }

  if (!validarCPF(cpf)) {
      alert("CPF inválido.");
      return;
  }

  if (!validarCNPJ(cnpj)) {
      alert("CNPJ inválido.");
      return;
  }

  if (password !== confirmPassword) {
      alert("As senhas não coincidem.");
      return;
  }

  db.collection("companies").where("cpf", "==", cpf).get().then(snapshot => {
      if (!snapshot.empty) {
          alert("CPF já cadastrado.");
          return;
      }
      db.collection("companies").where("cnpj", "==", cnpj).get().then(snapshot => {
          if (!snapshot.empty) {
              alert("CNPJ já cadastrado.");
              return;
          }
          auth.createUserWithEmailAndPassword(email, password) // Cadastro de DONO DE EMPRESA usa Firebase Auth SEGURO
              .then((userCredential) => {
                // **INÍCIO DA MODIFICAÇÃO - Adicionar displayName**
                return userCredential.user.updateProfile({
                    displayName: ownerName // Usar o nome do dono como displayName
                }).then(() => userCredential); // Retornar userCredential para o próximo 'then'
                // **FIM DA MODIFICAÇÃO**
              })
              .then((userCredential) => {
                  return db.collection("companies").doc(userCredential.user.uid).set({
                      companyName,
                      cnpj,
                      ownerName,
                      cpf,
                      email,
                      password, // Senha aqui é para referência, Firebase Auth gerencia a real
                      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                      userId: userCredential.user.uid // Associando o usuário à empresa
                  });
              })
              .then(() => {
                  document.getElementById("register").classList.add("hidden");
                  //alert("Empresa cadastrada com sucesso!");
                  //showLogin();
              })
              .catch((error) => {
                  alert("Erro ao cadastrar: " + error.message);
              });
      });
  });
};

// Verificar se o usuário já está autenticado ao carregar a página
auth.onAuthStateChanged((user) => {
  const loggedInUserId = localStorage.getItem("loggedInUserId"); // Verificar se há login de FUNCIONÁRIO simulado

  if (user) {
      // Usuário DONO DE EMPRESA está LOGADO (Firebase Auth)
      const lembrar = localStorage.getItem("lembrar") === "true";

      if (lembrar) {
          document.getElementById("login").classList.add("hidden");
          document.getElementById("dashboard").classList.remove("hidden");
          loadProducts();
          loadEmployees();
          renderSidebar();
      } else {
          document.getElementById("login").classList.add("hidden");
          document.getElementById("dashboard").classList.remove("hidden");
          loadProducts();
          loadEmployees();
      }
  } else if (loggedInUserId) {
      // Usuário FUNCIONÁRIO está "LOGADO" (simulação com localStorage)
      document.getElementById("login").classList.add("hidden");
      document.getElementById("dashboard").classList.remove("hidden");
      loadProducts();
      loadEmployees();
  }
  else {
      // Nenhum usuário LOGADO (nem DONO DE EMPRESA, nem FUNCIONÁRIO): Mostrar tela de LOGIN
      document.getElementById("login").classList.remove("hidden");
      document.getElementById("dashboard").classList.add("hidden");
  }
});

// Logout
window.logout = function() {
  auth.signOut().then(() => { // Logout de DONO DE EMPRESA (Firebase Auth)
      localStorage.removeItem("loggedInUserId"); // Limpar login de FUNCIONÁRIO simulado
      localStorage.removeItem("lembrar");
      document.getElementById("dashboard").classList.add("hidden");
      document.getElementById("login").classList.remove("hidden");
  });
};

// Carregar produtos e armazenar em um array para filtragem
function loadProducts() {
    console.log("loadProducts chamada, auth.currentUser:", auth.currentUser);
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
        return; // Importante: Sair da função aqui pois os dados serão carregados assincronamente
      } else {
        return; // Nenhum usuário logado
      }
    }
  
    db.collection("products")
      .where("companyId", "==", companyId)
      .onSnapshot((snapshot) => {
        allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderProducts(allProducts);
      });
  }

// Renderizar os produtos na tabela
function renderProducts(products) {
  const tableBody = document.getElementById("product-table");
  tableBody.innerHTML = "";
  if (!products || products.length === 0) {
      tableBody.innerHTML = "<tr><td colspan='3'>Nenhum produto cadastrado.</td></tr>";
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
      tableBody.appendChild(tr);
  });
}

// Função para buscar produtos
document.getElementById("search-bar").addEventListener("input", function () {
  const query = this.value.toLowerCase();

  if (currentSection === "products") {
      // Filtrar produtos APENAS se a seção 'products' estiver ativa
      const filteredProducts = allProducts.filter(
          (product) =>
              product.name.toLowerCase().includes(query) ||
              (product.category && product.category.toLowerCase().includes(query))
      );
      renderProducts(filteredProducts);
  } else if (currentSection === "employees") {
      // Filtrar funcionários APENAS se a seção 'employees' estiver ativa
      const filteredEmployees = allEmployees.filter(employee =>
          employee.name.toLowerCase().includes(query) ||
          employee.email.toLowerCase().includes(query) ||
          employee.role.toLowerCase().includes(query) // Adicione role se desejar pesquisar por role também
      );
      renderEmployees(filteredEmployees); // Reutiliza a função renderEmployees (ela renderiza a tabela de funcionários)
  } else if (currentSection === "log") {
      console.log("Pesquisa na seção de Log - Ação não implementada para logs"); // Mensagem para indicar que a pesquisa de logs não está implementada
      const filteredProductsForLog = allProducts.filter(
          (product) =>
              product.name.toLowerCase().includes(query) ||
              (product.category && product.category.toLowerCase().includes(query))
      );
      renderProducts(filteredProductsForLog); // Renderizar produtos para evitar quebrar, mas isso NÃO FILTRA LOGS
  }
});

// Abrir modal para adicionar produto
window.openAddModal = function() {
  currentProductId = null;
  document.getElementById("modal-title").innerText = "Adicionar Produto";
  document.getElementById("modal-product-name").value = "";
  document.getElementById("modal-product-category").value = "";
  // Garantir que o valor seja "1" explicitamente ao abrir o modal de ADICIONAR
  document.getElementById("modal-product-quantity").value = "1";
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
window.deleteProduct = function(id) {
    const loggedInUserId = localStorage.getItem("loggedInUserId"); // Obter ID do usuário logado

    if (loggedInUserId) {
        // Buscar role do usuário logado
        db.collection("employees").doc(loggedInUserId).get().then(employeeDoc => {
            if (employeeDoc.exists) {
                const userRole = employeeDoc.data().role;
                
                // **VERIFICAÇÃO DE PERMISSÃO PARA O CARGO DE "leitor"**
                if (userRole === 'leitor') {
                    alert("Acesso negado. Leitores não podem adicionar, editar ou remover produtos.");
                    return; // Sai da função se o usuário for um leitor
                }

                // Buscar dados do produto ANTES de deletar para ter o nome para o log
                db.collection("products").doc(id).get().then(productDoc => {
                    if (productDoc.exists) {
                        const productName = productDoc.data().name; // Obter o nome do produto
                        const quantity = productDoc.data().quantity;

                        db.collection("products").doc(id).delete() // Deletar o produto DEPOIS de obter o nome
                        .then(() => {
                            addLogEntry(`Removeu produto: ${productName} (${quantity})`, loggedInUserId); // Passa loggedInUserId
                            loadProducts(); // Recarrega produtos após deletar
                        });
                    } else {
                        alert("Erro: Produto não encontrado para remoção."); // Caso o produto não seja encontrado (inesperado)
                    }
                }).catch(error => {
                    alert("Erro ao buscar produto para remoção: " + error.message); // Tratar erros na busca do produto
                    console.error("Erro ao buscar produto para remoção:", error);
                });

            } else {
                alert("Erro: Dados do funcionário não encontrados. Relogue para continuar.");
                logout();
            }
        }).catch(error => {
            alert("Erro ao buscar dados do funcionário: " + error.message);
        });
    } else {
        // Lógica para Dono da Empresa (não precisa de verificação de role aqui)
        db.collection("products").doc(id).get().then(productDoc => {
            if (productDoc.exists) {
                const productName = productDoc.data().name; // Obter o nome do produto
                const quantity = productDoc.data().quantity;

                db.collection("products").doc(id).delete() // Deletar o produto DEPOIS de obter o nome
                .then(() => {
                    addLogEntry(`Removeu produto: ${productName} (${quantity})`); // Dono não precisa de loggedInUserId
                    loadProducts(); // Recarrega produtos após deletar
                });
            } else {
                alert("Erro: Produto não encontrado para remoção."); // Caso o produto não seja encontrado (inesperado)
            }
        }).catch(error => {
            alert("Erro ao buscar produto para remoção: " + error.message); // Tratar erros na busca do produto
            console.error("Erro ao buscar produto para remoção:", error);
        });
    }
};

// Fechar modal
window.closeModal = function() {
  document.getElementById("modal").classList.remove("active");
};

// Deletar produto
window.deleteProduct = function(id) {
    const loggedInUserId = localStorage.getItem("loggedInUserId"); // Obter ID do usuário logado

    if (loggedInUserId) {
        // Buscar role do usuário logado
        db.collection("employees").doc(loggedInUserId).get().then(employeeDoc => {
            if (employeeDoc.exists) {
                const userRole = employeeDoc.data().role;

                // **VERIFICAÇÃO DE PERMISSÃO PARA O CARGO DE "leitor"**
                if (userRole === 'leitor') {
                    alert("Acesso negado. Leitores não podem adicionar, editar ou remover produtos.");
                    return; // Sai da função se o usuário for um leitor
                }

                // Buscar dados do produto ANTES de deletar para ter o nome para o log
                db.collection("products").doc(id).get().then(productDoc => {
                    if (productDoc.exists) {
                        const productName = productDoc.data().name; // Obter o nome do produto
                        const quantity = productDoc.data().quantity;

                        db.collection("products").doc(id).delete() // Deletar o produto DEPOIS de obter o nome
                        .then(() => {
                            addLogEntry(`Removeu produto: ${productName} (${quantity})`, loggedInUserId); // Passa loggedInUserId
                            loadProducts(); // Recarrega produtos após deletar
                        });
                    } else {
                        alert("Erro: Produto não encontrado para remoção."); // Caso o produto não seja encontrado (inesperado)
                    }
                }).catch(error => {
                    alert("Erro ao buscar produto para remoção: " + error.message); // Tratar erros na busca do produto
                    console.error("Erro ao buscar produto para remoção:", error);
                });

            } else {
                alert("Erro: Dados do funcionário não encontrados. Relogue para continuar.");
                logout();
            }
        }).catch(error => {
            alert("Erro ao buscar dados do funcionário: " + error.message);
        });
    } else {
        // Lógica para Dono da Empresa (não precisa de verificação de role aqui)
        db.collection("products").doc(id).get().then(productDoc => {
            if (productDoc.exists) {
                const productName = productDoc.data().name; // Obter o nome do produto
                const quantity = productDoc.data().quantity;

                db.collection("products").doc(id).delete() // Deletar o produto DEPOIS de obter o nome
                .then(() => {
                    addLogEntry(`Removeu produto: ${productName} (${quantity})`); // Dono não precisa de loggedInUserId
                    loadProducts(); // Recarrega produtos após deletar
                });
            } else {
                alert("Erro: Produto não encontrado para remoção."); // Caso o produto não seja encontrado (inesperado)
            }
        }).catch(error => {
            alert("Erro ao buscar produto para remoção: " + error.message); // Tratar erros na busca do produto
            console.error("Erro ao buscar produto para remoção:", error);
        });
    }
};

// Funções para incrementar/decrementar quantidade
window.increment = function() {
  let input = document.getElementById("modal-product-quantity");
  input.value = parseInt(input.value) + 1;
};

window.decrement = function() {
  let input = document.getElementById("modal-product-quantity");
  if (parseInt(input.value) > 1) {
    input.value = parseInt(input.value) - 1;
  }
};

// Alternar a bandeja lateral
window.toggleSidebar = function () {
  document.getElementById("sidebar").classList.toggle("active");
};

// Mostrar seções do Dashboard
window.showDashboard = function () {
  currentSection = "products"; // Atualiza para 'products' quando a seção de produtos é mostrada
  document.getElementById("products-section").classList.remove("hidden");
  document.getElementById("employees-section").classList.add("hidden");
  document.getElementById("log-section").classList.add("hidden");
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

    // Acesso à seção de Funcionários permitido apenas para 'dono' e 'gerente'
    if (userRole === 'dono' || userRole === 'gerente') {
        document.getElementById("products-section").classList.add("hidden");
        document.getElementById("employees-section").classList.remove("hidden");
        document.getElementById("log-section").classList.add("hidden");
        loadEmployees();
    } else {
        alert("Acesso negado. Apenas Donos e Gerentes podem acessar a seção de funcionários.");
        showDashboard();
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

    // Acesso à seção de Log permitido para 'dono', 'gerente' e 'supervisor'
    if (userRole === 'dono' || userRole === 'gerente' || userRole === 'supervisor') {
        document.getElementById("products-section").classList.add("hidden");
        document.getElementById("employees-section").classList.add("hidden");
        document.getElementById("log-section").classList.remove("hidden");
        loadLog();
    } else {
        alert("Acesso negado. Apenas Donos, Gerentes e Supervisores podem acessar a seção de log.");
        showDashboard();
    }
};

// Carregar registros do log (CORRIGIDO para filtrar por empresa)
window.loadLog = function () {
    console.log('loadLog foi chamada!');
    const logTable = document.getElementById("log-table");
    logTable.innerHTML = "";
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
                    db.collection("logs")
                        .where("companyId", "==", companyId)
                        .orderBy("timestamp", "desc")
                        .get()
                        .then(snapshot => {
                            console.log('Snapshot de logs:', snapshot);
                            snapshot.forEach(doc => {
                                console.log('Dados do log:', doc.data());
                                const data = doc.data();
                                const tr = document.createElement("tr");
                                tr.innerHTML = `
                                    <td>${data.userName}</td>
                                    <td>${data.userEmail}</td>
                                    <td>${data.action}</td>
                                    <td>${new Date(data.timestamp.toDate()).toLocaleDateString()}</td>
                                    <td>${new Date(data.timestamp.toDate()).toLocaleTimeString()}</td>
                                `;
                                logTable.appendChild(tr);
                            });
                        })
                        .catch(error => {
                            console.error("Erro ao carregar logs:", error);
                        });
                }
            });
            return; // Importante: Sair da função aqui pois os dados serão carregados assincronamente
        } else {
            return; // Nenhum usuário logado
        }
    }

    db.collection("logs")
        .where("companyId", "==", companyId)
        .orderBy("timestamp", "desc")
        .get()
        .then(snapshot => {
            console.log('Snapshot de logs:', snapshot);
            snapshot.forEach(doc => {
                console.log('Dados do log:', doc.data());
                const data = doc.data();
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${data.userName}</td>
                    <td>${data.userEmail}</td>
                    <td>${data.action}</td>
                    <td>${new Date(data.timestamp.toDate()).toLocaleDateString()}</td>
                    <td>${new Date(data.timestamp.toDate()).toLocaleTimeString()}</td>
                `;
                logTable.appendChild(tr);
            });
        })
        .catch(error => {
            console.error("Erro ao carregar logs:", error);
        });
};

// Adicionar entrada ao log (CORRIGIDO para incluir companyId)
window.addLogEntry = async function (action, userId = null) {
    const user = auth.currentUser;
    let userName = "Sistema"; // Default user name

    if (userId) {
        const employeeDoc = await db.collection("employees").doc(userId).get();
        if (employeeDoc.exists) {
            userName = employeeDoc.data().name;
        }
    } else if (user) {
        userName = "Dono(a) da Empresa";
    }

    const logEntry = {
        companyId: user ? user.uid : (await getCompanyIdFromLoggedInEmployee()),
        userName: userName,
        userEmail: user ? user.email : (await getUserEmailFromLoggedInEmployee()),
        action: action,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    db.collection("logs").add(logEntry)
        .then(() => console.log("Log entry added:", action))
        .catch((error) => console.error("Error adding log entry:", error));
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
async function getUserEmailFromLoggedInEmployee() {
    const loggedInUserId = localStorage.getItem("loggedInUserId");
    if (loggedInUserId) {
        const employeeDoc = await db.collection("employees").doc(loggedInUserId).get();
        if (employeeDoc.exists) {
            return employeeDoc.data().email;
        }
    }
    return null;
}

// Exemplo: Log quando produto é adicionado (Função saveProduct -  já deve estar chamando addLogEntry)
window.saveProduct = function () {
    const name = document.getElementById("modal-product-name").value;
    const quantity = document.getElementById("modal-product-quantity").value;
    const category = document.getElementById("modal-product-category").value;
    const loggedInUserId = localStorage.getItem("loggedInUserId"); // Verificar se é funcionário logado (simulação)
    let companyIdToUse; // Variável para armazenar o companyId correto

    if (loggedInUserId) {
        // Lógica para Funcionário (autenticação INSEGURA com Firestore)
        db.collection("employees").doc(loggedInUserId).get().then(employeeDoc => { // Buscar documento do funcionário pelo ID
            if (employeeDoc.exists) {
                const employeeData = employeeDoc.data();
                const userRole = employeeData.role; // Obtém o cargo do usuário

                // **VERIFICAÇÃO DE PERMISSÃO PARA O CARGO DE "leitor"**
                if (userRole === 'leitor') {
                    alert("Acesso negado. Leitores não podem adicionar, editar ou remover produtos.");
                    return; // Sai da função se o usuário for um leitor
                }

                companyIdToUse = employeeData.companyId; // Obter companyId do documento do funcionário

                if (name && quantity) {
                    const productData = {
                        name,
                        quantity,
                        category,
                        companyId: companyIdToUse // Usar companyId obtido do funcionário
                    };
                    if (currentProductId) {
                        db.collection("products").doc(currentProductId).update(productData)
                            .then(() => {
                                addLogEntry(`Editou produto: ${name} (${quantity})`, loggedInUserId);
                                closeModal();
                                loadProducts();
                            });
                    } else {
                        db.collection("products").add(productData)
                            .then(() => {
                                addLogEntry(`Adicionou produto: ${name} (${quantity})`, loggedInUserId);
                                closeModal();
                                loadProducts();
                            });
                    }
                } else {
                    alert("Preencha todos os campos!");
                }
            } else {
                alert("Erro: Dados do funcionário não encontrados. Relogue para continuar."); // Caso documento do funcionário não exista (inesperado)
                logout(); // Forçar logout para evitar inconsistências
            }
        }).catch(error => {
            alert("Erro ao buscar dados do funcionário: " + error.message);
        });
        return; // Importante: Sair da função aqui para evitar que o código de Dono de Empresa execute também
    } else {
        // Lógica para Dono de Empresa (autenticação SEGURA com Firebase Auth padrão)
        const user = auth.currentUser; // Para Donos de Empresa, auth.currentUser está populado corretamente
        if (user) {
            companyIdToUse = user.uid; // Usar user.uid para Donos de Empresa

            if (name && quantity) {
                const productData = {
                    name,
                    quantity,
                    category,
                    companyId: companyIdToUse // Usar user.uid para Donos de Empresa
                };

                if (currentProductId) {
                    db.collection("products").doc(currentProductId).update(productData)
                        .then(() => {
                            addLogEntry(`Editou produto: ${name} (${quantity})`);
                            closeModal();
                            loadProducts();
                        });
                    } else {
                        db.collection("products").add(productData)
                            .then(() => {
                                addLogEntry(`Adicionou produto: ${name} (${quantity})`);
                                closeModal();
                                loadProducts();
                            });
                    }
                } else {
                    alert("Preencha todos os campos!");
                }
            } else {
                // Nenhum usuário logado (nem Dono de Empresa, nem Funcionário) - Tratar como erro ou redirecionar para login
                alert("Usuário não autenticado. Relogue para continuar.");
                showLogin(); // Redirecionar para a tela de login
            }
        }
    };

// Abrir modal de adicionar funcionário
window.openAddEmployeeModal = async function() {
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

    // Abertura do modal de adicionar funcionário permitida apenas para 'dono' e 'gerente'
    if (userRole === 'dono' || userRole === 'gerente') {
        document.getElementById("modal-employee-title").innerText = "Adicionar Funcionário";
        document.getElementById("modal-employee-name").value = "";
        document.getElementById("modal-employee-email").value = "";
        document.getElementById("modal-employee-password").value = "";
        document.getElementById("modal-employee-role").value = "estoquista"; // Role padrão
        document.getElementById("modal-employee").classList.add("active");
    } else {
        alert("Permissão negada. Apenas Donos e Gerentes podem adicionar novos funcionários.");
    }
};

// Fechar modal de funcionário
window.closeEmployeeModal = function() {
  document.getElementById("modal-employee").classList.remove("active");
};

// Salvar funcionário no banco de dados
window.saveEmployee = async function() {
    const name = document.getElementById("modal-employee-name").value;
    const email = document.getElementById("modal-employee-email").value;
    const password = document.getElementById("modal-employee-password").value; // Mantemos a senha aqui por enquanto
    const role = document.getElementById("modal-employee-role").value;
    const user = auth.currentUser;
    let companyId;

    console.log("Início da função saveEmployee");
    console.log("currentEmployeeId:", currentEmployeeId);
    console.log("Role selecionado:", role);

    if (!name || !email || !role) {
        alert("Nome, Email e Role são obrigatórios!");
        return;
    }

    const loggedInUserId = localStorage.getItem("loggedInUserId");
    let loggedInUserRole = null;

    if (loggedInUserId) {
        const employeeDoc = await db.collection("employees").doc(loggedInUserId).get();
        if (employeeDoc.exists) {
            loggedInUserRole = employeeDoc.data().role;
            companyId = employeeDoc.data().companyId; // Obtém o companyId do funcionário logado
        }
    } else if (user) {
        companyId = user.uid; // Para o Dono da Empresa
        loggedInUserRole = 'dono';
    } else {
        alert("Usuário não autenticado.");
        return;
    }

    if (currentEmployeeId) {
        // *** MODO DE EDIÇÃO ***
        const employeeName = name; // Nome para a mensagem de log

        // **NOVA VERIFICAÇÃO DE PERMISSÃO PARA EDIÇÃO**
        if (loggedInUserId === currentEmployeeId && role === 'dono' && loggedInUserRole !== 'dono') {
            alert("Permissão negada. Você não pode alterar seu próprio cargo para Dono.");
            return;
        }

        const updateData = {
            name,
            email,
            role,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Só atualiza a senha se uma nova senha foi fornecida
        if (password) {
            updateData.password = password;
        }

        db.collection("employees").doc(currentEmployeeId).update(updateData)
        .then(() => {
            loadEmployees();
            closeEmployeeModal();
            addLogEntry(`Editou funcionário: ${employeeName} (${role})`, loggedInUserId); // Passando loggedInUserId
            currentEmployeeId = null; // Limpar o ID após a edição
        })
        .catch((error) => {
            alert("Erro ao editar funcionário: " + error.message);
            console.error("Erro ao editar funcionário:", error);
        });
    } else {
        // *** MODO DE ADIÇÃO (seu código existente com a correção do companyId) ***
        if (!password) {
            alert("Senha é obrigatória para adicionar um novo funcionário!");
            return;
        }

        if (loggedInUserRole === 'gerente' && (role === 'gerente' || role === 'dono')) {
            alert("Permissão negada. Gerentes só podem adicionar funcionários com roles abaixo de Gerente.");
            return;
        }
        if (loggedInUserRole === 'supervisor' || loggedInUserRole === 'estoquista' || loggedInUserRole === 'leitor') {
            alert("Permissão negada. Apenas Donos e Gerentes podem adicionar novos funcionários.");
            return;
        }

        const employeeId = db.collection("employees").doc().id;
        const employeeName = name;

        db.collection("employees").doc(employeeId).set({
            id: employeeId,
            name,
            email,
            password: password,
            role,
            companyId: companyId, // Usando o companyId obtido corretamente
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            loadEmployees();
            closeEmployeeModal();
            addLogEntry(`Adicionou funcionário: ${employeeName} (${role})`, loggedInUserId); // Passando o ID do gerente que adicionou
        })
        .catch((error) => {
            alert("Erro ao cadastrar funcionário: " + error.message);
            console.error("Erro ao cadastrar funcionário:", error);
        });
    }
};

// Carregar funcionários da empresa logada e manter em cache para otimização
function loadEmployees() {
    console.log("loadEmployees chamada, auth.currentUser:", auth.currentUser);
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
            db.collection("employees")
              .where("companyId", "==", companyId)
              .onSnapshot((snapshot) => {
                allEmployees = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderEmployees(allEmployees);
              });
          }
        });
        return; // Importante: Sair da função aqui pois os dados serão carregados assincronamente
      } else {
        return; // Nenhum usuário logado
      }
    }
  
    db.collection("employees")
      .where("companyId", "==", companyId)
      .onSnapshot((snapshot) => {
        allEmployees = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderEmployees(allEmployees);
      });
  }

// Renderizar funcionários na tabela, usando o cache para evitar recarregamento desnecessário
function renderEmployees(employees) {
    const tableBody = document.getElementById("employee-table");
    tableBody.innerHTML = "";
    if (!employees || employees.length === 0) {
        tableBody.innerHTML = "<tr><td colspan='4'>Nenhum funcionário cadastrado.</td></tr>";
        return;
    }

    const loggedInUserId = localStorage.getItem("loggedInUserId");
    let currentUserRole = null;

    if (loggedInUserId) {
        db.collection("employees").doc(loggedInUserId).get().then(employeeDoc => { // Buscar role para cada renderização (pode otimizar com cache se performance for problema)
            if (employeeDoc.exists) {
                currentUserRole = employeeDoc.data().role;

                employees.forEach((employee) => {
                    const tr = document.createElement("tr");
                    let buttonsHTML = ''; // Inicializa HTML dos botões vazio por padrão

                    // Botões 'Editar' e 'Remover' visíveis apenas para 'dono' e 'gerente'
                    if (currentUserRole === 'dono' || currentUserRole === 'gerente') {
                        buttonsHTML = `
                            <button class="btn btn-edit" onclick="editEmployee('${employee.id}')">Editar</button>
                            <button class="btn btn-delete" onclick="deleteEmployee('${employee.id}')">Remover</button>
                        `;
                    } else if (currentUserRole === 'supervisor') {
                        buttonsHTML = `Somente leitura`; // Supervisor pode ver, mas não editar/remover
                    } else {
                        buttonsHTML = ``; // Outros roles (estoquista, leitor) não veem botões
                    }

                    tr.innerHTML = `
                        <td>${employee.name}</td>
                        <td>${employee.email}</td>
                        <td>${employee.role}</td>
                        <td>
                            ${buttonsHTML}
                        </td>
                    `;
                    tableBody.appendChild(tr);
                });

            } else {
                console.error("Erro ao buscar role do usuário para permissões de botões.");
                employees.forEach((employee) => { // Renderizar sem botões em caso de erro ao buscar role
                    const tr = document.createElement("tr");
                    tr.innerHTML = `
                        <td>${employee.name}</td>
                        <td>${employee.email}</td>
                        <td>${employee.role}</td>
                        <td></td>
                    `;
                    tableBody.appendChild(tr);
                });
            }
        }).catch(error => {
            console.error("Erro ao buscar role do usuário:", error);
            employees.forEach((employee) => { // Renderizar sem botões em caso de erro ao buscar role
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${employee.name}</td>
                    <td>${employee.email}</td>
                    <td>${employee.role}</td>
                    <td></td>
                `;
                tableBody.appendChild(tr);
            });
        });

    } else { // Se não estiver logado como funcionário (Dono da Empresa), mostrar botões completos
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
            tableBody.appendChild(tr);
        });
    }
}

//Editar funcionário
window.editEmployee = function(employeeId) {
  currentEmployeeId = employeeId; // Usar variável global para armazenar o ID do funcionário sendo editado
  document.getElementById("modal-employee-title").innerText = "Editar Funcionário"; // Alterar título do modal

  // Limpar campos do modal (caso já tenham dados de adições anteriores)
  document.getElementById("modal-employee-name").value = "";
  document.getElementById("modal-employee-email").value = "";
  document.getElementById("modal-employee-password").value = ""; // Limpar senha para não preencher com a senha existente (segurança)
  document.getElementById("modal-employee-role").value = "estoquista"; // Definir role padrão (pode ser alterado no modal)

  // Buscar dados do funcionário no Firestore usando o employeeId
  db.collection("employees").doc(employeeId).get().then(employeeDoc => {
      if (employeeDoc.exists) {
          const employeeData = employeeDoc.data();
          // Preencher os campos do modal com os dados do funcionário
          document.getElementById("modal-employee-name").value = employeeData.name;
          document.getElementById("modal-employee-email").value = employeeData.email;
          document.getElementById("modal-employee-role").value = employeeData.role;

          document.getElementById("modal-employee").classList.add("active"); // Abrir o modal
      } else {
          alert("Erro: Funcionário não encontrado."); // Caso o documento do funcionário não exista (inesperado)
          console.error("Funcionário não encontrado com ID:", employeeId);
      }
  }).catch(error => {
      alert("Erro ao buscar dados do funcionário: " + error.message); // Tratar erros de busca no Firestore
      console.error("Erro ao buscar dados do funcionário:", error);
  });
};

//Remover funcionário
window.deleteEmployee = function(employeeId) {
  const confirmDelete = confirm("Tem certeza que deseja remover este funcionário?");

  if (confirmDelete) {
      // Buscar dados do funcionário ANTES de deletar para ter o nome para o log
      db.collection("employees").doc(employeeId).get().then(employeeDoc => {
          if (employeeDoc.exists) {
              const employeeName = employeeDoc.data().name; // Obter o nome do funcionário

              db.collection("employees").doc(employeeId).delete() // Deletar funcionário DEPOIS de obter o nome
              .then(() => {
                  alert("Funcionário removido com sucesso!");
                  loadEmployees();
                  addLogEntry(`Removeu funcionário: ${employeeName}`); // Log específico com o nome do funcionário
              });
          } else {
              alert("Erro: Funcionário não encontrado para remoção."); // Caso funcionário não encontrado (inesperado)
          }
      }).catch(error => {
          alert("Erro ao buscar funcionário para remoção: " + error.message); // Tratar erros na busca do funcionário
          console.error("Erro ao buscar funcionário para remoção:", error);
      });
  } else {
      alert("Remoção cancelada.");
  }
};

//Abrir/fechar a sidebar
document.addEventListener("DOMContentLoaded", function () {
  const menuToggle = document.querySelector(".menu-toggle");
  const sidebar = document.querySelector(".sidebar");

  // Garante que a sidebar COMEÇA FECHADA, removendo 'active' inicialmente
  sidebar.classList.remove("active"); // ADICIONADO: Garante estado inicial fechado

  // Evento para abrir a bandeja ao clicar no botão
  menuToggle.addEventListener("click", function (event) {
      sidebar.classList.add("active");
  });

  // Fechar a bandeja ao clicar fora dela
  document.addEventListener("click", function (event) {
      if (!sidebar.contains(event.target) && !menuToggle.contains(event.target)) {
          sidebar.classList.remove("active"); // Fecha a bandeja se clicar fora
      }
  });
});