let map;
let marker;
let userMarker;
let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
const taskForm = document.getElementById("taskForm");
const taskList = document.getElementById("taskList");
const locationInput = document.getElementById("location");
const enableLocationBtn = document.getElementById("enableLocation");
const locationStatus = document.getElementById("locationStatus");
const addressInput = document.getElementById("addressInput");
const searchBtn = document.getElementById("searchBtn");

function initMap() {
  map = L.map("map").setView([0, 0], 2);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  map.on("click", function (e) {
    placeMarker(e.latlng);
    reverseGeocode(e.latlng.lat, e.latlng.lng);
  });
}

function placeMarker(latlng) {
  if (marker) {
    map.removeLayer(marker);
  }
  marker = L.marker(latlng).addTo(map);
  map.setView(latlng, 13);
}

function updateLocationInput(address) {
  locationInput.value = address;
}

function addTask(title, description, location, datetime, lat, lng) {
  const task = {
    id: Date.now(),
    title,
    description,
    location,
    datetime,
    lat,
    lng,
  };
  tasks.push(task);
  saveTasks();
  renderTasks();
}

function deleteTask(id) {
  tasks = tasks.filter((task) => task.id !== id);
  saveTasks();
  renderTasks();
}

function saveTasks() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

function renderTasks() {
  taskList.innerHTML = "";
  tasks.forEach((task) => {
    const row = document.createElement("tr");
    row.innerHTML = `
                    <td>${task.title}</td>
                    <td>${task.description}</td>
                    <td>${task.location}</td>
                    <td>${new Date(task.datetime).toLocaleString()}</td>
                    <td><button onclick="deleteTask(${
                      task.id
                    })">Delete</button></td>
                `;
    taskList.appendChild(row);
  });
}

function enableLocationTracking() {
  if ("geolocation" in navigator) {
    navigator.geolocation.watchPosition(
      function (position) {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        updateUserLocation(userLat, userLng);
        checkNearbyTasks(userLat, userLng);
      },
      function (error) {
        locationStatus.textContent = "Error: " + error.message;
      }
    );
    locationStatus.textContent = "Location tracking enabled";
    enableLocationBtn.style.display = "none";
  } else {
    locationStatus.textContent = "Geolocation is not supported by your browser";
  }
}

function updateUserLocation(lat, lng) {
  if (userMarker) {
    map.removeLayer(userMarker);
  }
  userMarker = L.marker([lat, lng], {
    icon: L.divIcon({ className: "user-marker" }),
  }).addTo(map);
  map.setView([lat, lng], 13);
}

function checkNearbyTasks(userLat, userLng) {
  tasks.forEach((task) => {
    const distance = calculateDistance(userLat, userLng, task.lat, task.lng);
    if (distance <= 1) {
      // Within 1 km
      notifyUser(task);
    }
  });
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function notifyUser(task) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(task.title, {
      body: `You are near the location for task: ${task.description}`,
    });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(function (permission) {
      if (permission === "granted") {
        notifyUser(task);
      }
    });
  }
}

function geocode(address) {
  fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      address
    )}`
  )
    .then((response) => response.json())
    .then((data) => {
      if (data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        placeMarker([lat, lon]);
        updateLocationInput(data[0].display_name);
      } else {
        alert("Address not found");
      }
    })
    .catch((error) => console.error("Error:", error));
}

function reverseGeocode(lat, lon) {
  fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
  )
    .then((response) => response.json())
    .then((data) => {
      if (data.display_name) {
        updateLocationInput(data.display_name);
      }
    })
    .catch((error) => console.error("Error:", error));
}

taskForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = document.getElementById("title").value;
  const description = document.getElementById("description").value;
  const location = locationInput.value;
  const datetime = document.getElementById("datetime").value;

  if (marker) {
    const latlng = marker.getLatLng();
    addTask(title, description, location, datetime, latlng.lat, latlng.lng);
    taskForm.reset();
    map.removeLayer(marker);
    marker = null;
  } else {
    alert("Please select a location on the map or search for an address");
  }
});

enableLocationBtn.addEventListener("click", enableLocationTracking);

searchBtn.addEventListener("click", () => {
  const address = addressInput.value;
  if (address) {
    geocode(address);
  }
});

// Initialize the map and render tasks
initMap();
renderTasks();

// Request notification permission
if ("Notification" in window) {
  Notification.requestPermission();
}
