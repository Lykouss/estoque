(function() {
    const addEmployeeModal = document.getElementById("modal-employee");
    const addEmployeeModalTitle = document.getElementById("modal-employee-title");
    const modalEmployeeNameInput = document.getElementById("modal-employee-name");
    const modalEmployeeEmailInput = document.getElementById("modal-employee-email");
    const modalEmployeePasswordInput = document.getElementById("modal-employee-password");
    const modalEmployeeRoleSelect = document.getElementById("modal-employee-role");
    const employeeTableBody = document.getElementById("employee-table");
  
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
  
      if (userRole === 'dono' || userRole === 'gerente') {
        addEmployeeModalTitle.innerText = "Adicionar Funcionário";
        modalEmployeeNameInput.value = "";
        modalEmployeeEmailInput.value = "";
        modalEmployeePasswordInput.value = "";
        modalEmployeeRoleSelect.value = "estoquista";
        addEmployeeModal.classList.add("active");
      } else {
        alert("Permissão negada. Apenas Donos e Gerentes podem adicionar novos funcionários.");
      }
    };
  
    window.closeEmployeeModal = function() {
      addEmployeeModal.classList.remove("active");
    };
  
    window.saveEmployee = async function() {
      const name = modalEmployeeNameInput.value;
      const email = modalEmployeeEmailInput.value;
      const password = modalEmployeePasswordInput.value;
      const role = modalEmployeeRoleSelect.value;
      const user = auth.currentUser;
      let companyId;
  
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
          companyId = employeeDoc.data().companyId;
        }
      } else if (user) {
        companyId = user.uid;
        loggedInUserRole = 'dono';
      } else {
        alert("Usuário não autenticado.");
        return;
      }
  
      if (currentEmployeeId) {
        const employeeName = name;
  
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
        if (password) {
          updateData.password = password;
        }
  
        db.collection("employees").doc(currentEmployeeId).update(updateData)
          .then(() => {
            window.loadEmployees();
            window.closeEmployeeModal();
            window.addLogEntry(`Editou funcionário: ${employeeName} (${role})`, loggedInUserId);
            currentEmployeeId = null;
          })
          .catch((error) => {
            alert("Erro ao editar funcionário: " + error.message);
          });
      } else {
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
          companyId: companyId,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
          window.loadEmployees();
          window.closeEmployeeModal();
          window.addLogEntry(`Adicionou funcionário: ${employeeName} (${role})`, loggedInUserId);
        })
        .catch((error) => {
          alert("Erro ao cadastrar funcionário: " + error.message);
        });
      }
    };
  
    window.loadEmployees = function () {
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
                  window.allEmployees = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                  renderEmployees(window.allEmployees);
                });
            }
          });
          return;
        } else {
          return;
        }
      }
  
      db.collection("employees")
        .where("companyId", "==", companyId)
        .onSnapshot((snapshot) => {
          window.allEmployees = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          renderEmployees(window.allEmployees);
        });
    };
  
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
  
    window.editEmployee = function(employeeId) {
      currentEmployeeId = employeeId;
      addEmployeeModalTitle.innerText = "Editar Funcionário";
  
      modalEmployeeNameInput.value = "";
      modalEmployeeEmailInput.value = "";
      modalEmployeePasswordInput.value = "";
      modalEmployeeRoleSelect.value = "estoquista";
  
      db.collection("employees").doc(employeeId).get().then(employeeDoc => {
        if (employeeDoc.exists) {
          const employeeData = employeeDoc.data();
          modalEmployeeNameInput.value = employeeData.name;
          modalEmployeeEmailInput.value = employeeData.email;
          modalEmployeeRoleSelect.value = employeeData.role;
  
          addEmployeeModal.classList.add("active");
        } else {
          alert("Erro: Funcionário não encontrado.");
        }
      }).catch(error => {
        alert("Erro ao buscar dados do funcionário: " + error.message);
      });
    };
  
    window.deleteEmployee = function(employeeId) {
      const confirmDelete = confirm("Tem certeza que deseja remover este funcionário?");
      if (confirmDelete) {
        db.collection("employees").doc(employeeId).get().then(employeeDoc => {
          if (employeeDoc.exists) {
            const employeeName = employeeDoc.data().name;
  
            db.collection("employees").doc(employeeId).delete()
              .then(() => {
                alert("Funcionário removido com sucesso!");
                window.loadEmployees();
                window.addLogEntry(`Removeu funcionário: ${employeeName}`);
              });
          } else {
            alert("Erro: Funcionário não encontrado para remoção.");
          }
        }).catch(error => {
          alert("Erro ao buscar funcionário para remoção: " + error.message);
        });
      } else {
        alert("Remoção cancelada.");
      }
    };
  })();