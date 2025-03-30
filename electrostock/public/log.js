(function() {
    const logTableBody = document.getElementById("log-table");
  
    let allLogs = [];
  
    window.allLogs = [];
  
    window.loadLog = function () {
      const logTableBody = document.getElementById("log-table");
      logTableBody.innerHTML = "";
      window.allLogs = [];
  
      const user = auth.currentUser;
      let companyId;
  
      const fetchLogs = (query) => {
        query.onSnapshot((snapshot) => {
          window.allLogs = snapshot.docs.map(doc => doc.data());
          renderLogs(window.allLogs);
        }, (error) => {
          console.error("Erro ao carregar logs:", error);
        });
      };
  
      if (user) {
        companyId = user.uid;
        fetchLogs(db.collection("logs").where("companyId", "==", companyId).orderBy("timestamp", "desc"));
      } else {
        const loggedInUserId = localStorage.getItem("loggedInUserId");
        if (loggedInUserId) {
          db.collection("employees").doc(loggedInUserId).get().then(doc => {
            if (doc.exists) {
              companyId = doc.data().companyId;
              fetchLogs(db.collection("logs").where("companyId", "==", companyId).orderBy("timestamp", "desc"));
            }
          }).catch(error => {
            console.error("Erro ao buscar companyId do funcionário:", error);
          });
          return;
        } else {
          return;
        }
      }
    };
  
    function renderLogs(logs) {
      const logTableBody = document.getElementById("log-table");
      if (!logTableBody) {
        console.error("Elemento logTableBody não encontrado!");
        return;
      }
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
  
    window.addLogEntry = async function(action) {
      const user = auth.currentUser;
      let companyId;
      let userName;
      let userEmail;
  
      if (user) {
        companyId = user.uid;
        userName = user.displayName || 'Usuário Anônimo';
        userEmail = user.email || '';
      } else {
        const loggedInUserId = localStorage.getItem("loggedInUserId");
        if (loggedInUserId) {
          const employeeDoc = await db.collection("employees").doc(loggedInUserId).get();
          if (employeeDoc.exists) {
            const employeeData = employeeDoc.data();
            companyId = employeeData.companyId;
            userName = employeeData.name;
            userEmail = employeeData.email;
          } else {
            console.error("Funcionário não encontrado ao buscar dados para log.");
            return;
          }
        } else {
          console.error("Nenhum usuário logado encontrado para registrar log.");
          return;
        }
      }
  
      const timestamp = firebase.firestore.FieldValue.serverTimestamp();
  
      db.collection("logs").add({
        companyId: companyId,
        userName: userName,
        userEmail: userEmail,
        action: action,
        timestamp: timestamp
      }).then(() => {
        // console.log("Log de ação registrado com sucesso!");
      }).catch((error) => {
        console.error("Erro ao registrar log de ação:", error);
      });
    };
  })();