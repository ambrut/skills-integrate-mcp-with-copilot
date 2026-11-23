document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const signupContainer = document.getElementById("signup-container");
  const messageDiv = document.getElementById("message");

  // Auth elements
  const userIconBtn = document.getElementById("user-icon-btn");
  const loginPanel = document.getElementById("login-panel");
  const loginForm = document.getElementById("login-form");
  const loggedInPanel = document.getElementById("logged-in-panel");
  const loggedInUsername = document.getElementById("logged-in-username");
  const logoutBtn = document.getElementById("logout-btn");
  const loginMessage = document.getElementById("login-message");

  // Teacher session, persisted across page reloads within the browser tab.
  let authToken = sessionStorage.getItem("authToken");
  let authUsername = sessionStorage.getItem("authUsername");

  function isLoggedIn() {
    return Boolean(authToken);
  }

  function setSession(token, username) {
    authToken = token;
    authUsername = username;
    sessionStorage.setItem("authToken", token);
    sessionStorage.setItem("authUsername", username);
  }

  function clearSession() {
    authToken = null;
    authUsername = null;
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("authUsername");
  }

  function handleUnauthorized(response) {
    if (response.status !== 401) {
      return false;
    }

    clearSession();
    updateAuthUI();
    fetchActivities();
    loginMessage.textContent = "Your session has expired. Please log in again.";
    loginMessage.className = "error";
    loginMessage.classList.remove("hidden");
    return true;
  }

  // Reflect the current login state in the UI: only teachers can see and
  // use the signup form or the per-participant unregister buttons.
  function updateAuthUI() {
    if (isLoggedIn()) {
      loginForm.classList.add("hidden");
      loggedInPanel.classList.remove("hidden");
      loggedInUsername.textContent = authUsername;
      signupContainer.classList.remove("hidden");
    } else {
      loginForm.classList.remove("hidden");
      loggedInPanel.classList.add("hidden");
      signupContainer.classList.add("hidden");
      loginPanel.classList.add("hidden");
      userIconBtn.setAttribute("aria-expanded", "false");
    }
  }

  userIconBtn.addEventListener("click", () => {
    const isOpen = !loginPanel.classList.contains("hidden");
    loginPanel.classList.toggle("hidden");
    userIconBtn.setAttribute("aria-expanded", String(!isOpen));
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();

      if (response.ok) {
        setSession(result.token, result.username);
        loginForm.reset();
        loginMessage.classList.add("hidden");
        updateAuthUI();
        fetchActivities();
      } else {
        loginMessage.textContent = result.detail || "Login failed";
        loginMessage.className = "error";
        loginMessage.classList.remove("hidden");
      }
    } catch (error) {
      loginMessage.textContent = "Could not log in. Please try again.";
      loginMessage.className = "error";
      loginMessage.classList.remove("hidden");
      console.error("Error logging in:", error);
    }
  });

  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch("/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
    } catch (error) {
      console.error("Error logging out:", error);
    } finally {
      clearSession();
      updateAuthUI();
      fetchActivities();
    }
  });

  // Function to fetch activities from API
  async function fetchActivities() {
    activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points.
        // Only teachers (logged in) see the delete button; students can still
        // view who is registered.
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        isLoggedIn()
                          ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                          : ""
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      if (handleUnauthorized(response)) {
        return;
      }

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      if (handleUnauthorized(response)) {
        return;
      }

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  updateAuthUI();
  fetchActivities();
});
