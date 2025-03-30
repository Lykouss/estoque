(function() {
    // Referências aos elementos de login e registro
    const loginDiv = document.getElementById("login");
    const registerDiv = document.getElementById("register");
    const dashboardDiv = document.getElementById("dashboard");
    const errorMessage = document.getElementById("error-message");
    const loadingMessage = document.getElementById("loading-message");
    const rememberMeCheckbox = document.getElementById("remember-me");
    const companyNameInput = document.getElementById("company-name");
    const cnpjInput = document.getElementById("cnpj");
    const ownerNameInput = document.getElementById("owner-name");
    const cpfInput = document.getElementById("cpf");
    const registerEmailInput = document.getElementById("register-email");
    const registerPasswordInput = document.getElementById("register-password");
    const confirmPasswordInput = document.getElementById("confirm-password");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
  
    window.showRegister = function () {
      loginDiv.classList.add("hidden");
      registerDiv.classList.remove("hidden");
    };
  
    window.showLogin = function () {
      registerDiv.classList.add("hidden");
      loginDiv.classList.remove("hidden");
    };
  
    window.login = function () {
      const email = emailInput.value;
      const password = passwordInput.value;
      const rememberMe = rememberMeCheckbox.checked;
  
      loadingMessage.style.display = "block";
  
      const persistence = rememberMe
        ? firebase.auth.Auth.Persistence.LOCAL
        : firebase.auth.Auth.Persistence.SESSION;
  
      auth.setPersistence(persistence)
        .then(() => auth.signInWithEmailAndPassword(email, password))
        .then(() => {
          localStorage.setItem("lembrar", rememberMe ? "true" : "false");
          localStorage.removeItem("loggedInUserId");
          loginDiv.classList.add("hidden");
          registerDiv.classList.add("hidden");
          dashboardDiv.classList.remove("hidden");
          loadingMessage.style.display = "none";
          window.loadProducts();
          window.loadEmployees();
          window.location.reload();
        })
        .catch((errorAuth) => {
          db.collection("employees")
            .where("email", "==", email)
            .get()
            .then(snapshot => {
              if (!snapshot.empty) {
                const employeeDoc = snapshot.docs[0];
                const employeeData = employeeDoc.data();
                if (password === employeeData.password) {
                  localStorage.setItem("lembrar", rememberMe ? "true" : "false");
                  localStorage.setItem("loggedInUserId", employeeDoc.id);
                  loginDiv.classList.add("hidden");
                  registerDiv.classList.add("hidden");
                  dashboardDiv.classList.remove("hidden");
                  loadingMessage.style.display = "none";
                  window.loadProducts();
                  window.loadEmployees();
                  window.location.reload();
                } else {
                  errorMessage.innerText = "Erro: Senha incorreta.";
                  loadingMessage.style.display = "none";
                }
              } else {
                errorMessage.innerText = "Erro: Email não encontrado.";
                loadingMessage.style.display = "none";
              }
            })
            .catch((errorFirestore) => {
              errorMessage.innerText = "Erro ao tentar login: " + errorFirestore.message;
              loadingMessage.style.display = "none";
            });
        });
    };
  
    // Cadastro de Empresa
    window.registerCompany = function() {
      const companyName = companyNameInput.value;
      const cnpj = cnpjInput.value;
      const ownerName = ownerNameInput.value;
      const cpf = cpfInput.value;
      const email = registerEmailInput.value;
      const password = registerPasswordInput.value;
      const confirmPassword = confirmPasswordInput.value;
  
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
          auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
              return userCredential.user.updateProfile({
                displayName: ownerName
              }).then(() => userCredential);
            })
            .then((userCredential) => {
              return db.collection("companies").doc(userCredential.user.uid).set({
                companyName,
                cnpj,
                ownerName,
                cpf,
                email,
                password,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                userId: userCredential.user.uid
              });
            })
            .then(() => {
              registerDiv.classList.add("hidden");
            })
            .catch((error) => {
              alert("Erro ao cadastrar: " + error.message);
            });
        });
      });
    };
  
    // Verificar se o usuário já está autenticado ao carregar a página
    auth.onAuthStateChanged((user) => {
      const loggedInUserId = localStorage.getItem("loggedInUserId");
  
      if (user) {
        const lembrar = localStorage.getItem("lembrar") === "true";
  
        if (lembrar) {
          loginDiv.classList.add("hidden");
          dashboardDiv.classList.remove("hidden");
          window.loadProducts();
          window.loadEmployees();
        } else {
          loginDiv.classList.add("hidden");
          dashboardDiv.classList.remove("hidden");
          window.loadProducts();
          window.loadEmployees();
        }
      } else if (loggedInUserId) {
        loginDiv.classList.add("hidden");
        dashboardDiv.classList.remove("hidden");
        window.loadProducts();
        window.loadEmployees();
      }
      else {
        loginDiv.classList.remove("hidden");
        dashboardDiv.classList.add("hidden");
      }
    });
  
    // Logout
    window.logout = function() {
      auth.signOut().then(() => {
        localStorage.removeItem("loggedInUserId");
        localStorage.removeItem("lembrar");
        dashboardDiv.classList.add("hidden");
        loginDiv.classList.remove("hidden");
      });
    };
  })();