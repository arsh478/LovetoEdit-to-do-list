document.addEventListener("DOMContentLoaded", () => {
    const taskInput = document.getElementById("taskInput");
    const addBtn = document.getElementById("addBtn");
    const taskList = document.getElementById("taskList");
    const emptyState = document.getElementById("emptyState");
    const totalTasks = document.getElementById("totalTasks");
    const completedTasks = document.getElementById("completedTasks");
    const pendingTasks = document.getElementById("pendingTasks");
    const alarmedTasks = document.getElementById("alarmedTasks");
    const filterButtons = document.querySelectorAll(".filter-btn");
    const taskAlarm = document.getElementById("taskAlarm");
    const taskPhoto = document.getElementById("taskPhoto");
    const audioAlarmModal = document.getElementById("audioAlarmModal");
    const alarmTaskText = document.getElementById("alarmTaskText");
    const stopAlarmBtn = document.getElementById("stopAlarmBtn");
    const snoozeAlarmBtn = document.getElementById("snoozeAlarmBtn");

    let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    let currentFilter = "all";
    let alarmTimeouts = new Map();
    let currentAlarmTask = null;
    let alarmAudio = null;

    // Initialize alarm audio
    const initAlarmAudio = () => {
        // Create a simple beep sound using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        
        return { audioContext, oscillator, gainNode };
    };

    // Save tasks to localStorage
    const saveTasks = () => {
        localStorage.setItem("tasks", JSON.stringify(tasks));
        updateStats();
        setupAlarms();
    };

    // Update statistics
    const updateStats = () => {
        const total = tasks.length;
        const completed = tasks.filter(task => task.completed).length;
        const pending = total - completed;
        const alarmed = tasks.filter(task => task.alarm && !task.completed).length;

        totalTasks.textContent = total;
        completedTasks.textContent = completed;
        pendingTasks.textContent = pending;
        alarmedTasks.textContent = alarmed;

        // Show/hide empty state
        if (total === 0) {
            emptyState.style.display = "block";
            taskList.style.display = "none";
        } else {
            emptyState.style.display = "none";
            taskList.style.display = "block";
        }
    };

    // Setup alarms for all tasks
    const setupAlarms = () => {
        // Clear existing timeouts
        alarmTimeouts.forEach(timeout => clearTimeout(timeout));
        alarmTimeouts.clear();

        tasks.forEach((task, index) => {
            if (task.alarm && !task.completed) {
                const alarmTime = new Date(task.alarm).getTime();
                const now = Date.now();
                
                if (alarmTime > now) {
                    const timeUntilAlarm = alarmTime - now;
                    const timeout = setTimeout(() => {
                        showAudioAlarm(task);
                    }, timeUntilAlarm);
                    alarmTimeouts.set(index, timeout);
                }
            }
        });
    };

    // Show audio alarm modal
    const showAudioAlarm = (task) => {
        currentAlarmTask = task;
        alarmTaskText.textContent = task.text;
        audioAlarmModal.style.display = "flex";
        
        // Start audio alarm
        alarmAudio = initAlarmAudio();
        alarmAudio.oscillator.start();
        
        // Request notification permission and show browser notification
        if (Notification.permission === "granted") {
            new Notification("Love to Edit Reminder", {
                body: `Time to complete: ${task.text}`,
                icon: "/favicon.ico",
                badge: "/favicon.ico"
            });
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    new Notification("Love to Edit Reminder", {
                        body: `Time to complete: ${task.text}`,
                        icon: "/favicon.ico",
                        badge: "/favicon.ico"
                    });
                }
            });
        }
    };

    // Stop alarm
    const stopAlarm = () => {
        if (alarmAudio) {
            alarmAudio.oscillator.stop();
            alarmAudio.audioContext.close();
            alarmAudio = null;
        }
        audioAlarmModal.style.display = "none";
        currentAlarmTask = null;
    };

    // Snooze alarm
    const snoozeAlarm = () => {
        if (currentAlarmTask) {
            // Add 5 minutes to current time
            const snoozeTime = new Date(Date.now() + 5 * 60 * 1000);
            currentAlarmTask.alarm = snoozeTime.toISOString();
            
            // Find task index and update
            const taskIndex = tasks.findIndex(t => t.timestamp === currentAlarmTask.timestamp);
            if (taskIndex !== -1) {
                tasks[taskIndex].alarm = snoozeTime.toISOString();
                saveTasks();
            }
        }
        stopAlarm();
    };

    // Filter tasks based on current filter
    const getFilteredTasks = () => {
        switch (currentFilter) {
            case "completed":
                return tasks.filter(task => task.completed);
            case "pending":
                return tasks.filter(task => !task.completed);
            case "alarmed":
                return tasks.filter(task => task.alarm && !task.completed);
            default:
                return tasks;
        }
    };

    // Render tasks with current filter
    const renderTasks = () => {
        const filteredTasks = getFilteredTasks();
        taskList.innerHTML = "";

        if (filteredTasks.length === 0 && tasks.length > 0) {
            taskList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-filter empty-icon"></i>
                    <p>No ${currentFilter} tasks found. Try changing the filter or add new tasks!</p>
                </div>
            `;
            return;
        }

        filteredTasks.forEach((task, index) => {
            const li = document.createElement("li");
            li.className = "task-item";

            // Create task content
            const taskContent = document.createElement("div");
            taskContent.className = "task-content";

            // Add photo if available
            if (task.photo) {
                const photoContainer = document.createElement("div");
                photoContainer.className = "task-photo-container";
                const photo = document.createElement("img");
                photo.src = task.photo;
                photo.className = "task-photo";
                photo.alt = "Task photo";
                photoContainer.appendChild(photo);
                taskContent.appendChild(photoContainer);
            }

            const taskText = document.createElement("span");
            taskText.textContent = task.text;
            taskText.className = "task-text" + (task.completed ? " completed" : "");
            taskContent.appendChild(taskText);

            // Add timestamp if available
            if (task.timestamp) {
                const timestamp = document.createElement("div");
                timestamp.className = "task-timestamp";
                timestamp.textContent = new Date(task.timestamp).toLocaleDateString();
                taskContent.appendChild(timestamp);
            }

            // Add alarm info if available
            if (task.alarm) {
                const alarmInfo = document.createElement("div");
                alarmInfo.className = "task-alarm-info";
                const alarmDate = new Date(task.alarm);
                const now = new Date();
                const isOverdue = alarmDate < now && !task.completed;
                
                alarmInfo.innerHTML = `
                    <i class="fas fa-bell ${isOverdue ? 'alarm-overdue' : 'alarm-active'}"></i>
                    <span class="${isOverdue ? 'alarm-overdue' : 'alarm-active'}">
                        ${isOverdue ? 'Overdue' : 'Due'}: ${alarmDate.toLocaleString()}
                    </span>
                `;
                taskContent.appendChild(alarmInfo);
            }

            li.appendChild(taskContent);

            // Create action buttons
            const actions = document.createElement("div");
            actions.className = "task-actions";

            // Edit button
            const editBtn = document.createElement("button");
            editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit';
            editBtn.className = "edit";
            editBtn.onclick = () => editTask(index);

            // Delete button
            const deleteBtn = document.createElement("button");
            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Delete';
            deleteBtn.className = "delete";
            deleteBtn.onclick = () => deleteTask(index);

            // Toggle button
            const toggleBtn = document.createElement("button");
            toggleBtn.innerHTML = task.completed ? 
                '<i class="fas fa-undo-alt"></i> Undo' : 
                '<i class="fas fa-check-double"></i> Done';
            toggleBtn.className = "toggle";
            toggleBtn.onclick = () => toggleTask(index);

            actions.appendChild(editBtn);
            actions.appendChild(deleteBtn);
            actions.appendChild(toggleBtn);
            li.appendChild(actions);

            taskList.appendChild(li);
        });
    };

    // Edit task with better UX
    const editTask = (index) => {
        const task = tasks[index];
        const newText = prompt("Edit task:", task.text);
        if (newText && newText.trim() !== "") {
            tasks[index].text = newText.trim();
            saveTasks();
            renderTasks();
        }
    };

    // Delete task without confirmation
    const deleteTask = (index) => {
        // Clear alarm timeout if exists
        if (alarmTimeouts.has(index)) {
            clearTimeout(alarmTimeouts.get(index));
            alarmTimeouts.delete(index);
        }
        tasks.splice(index, 1);
        saveTasks();
        renderTasks();
    };

    // Toggle task completion
    const toggleTask = (index) => {
        tasks[index].completed = !tasks[index].completed;
        
        // Clear alarm timeout if task is completed
        if (tasks[index].completed && alarmTimeouts.has(index)) {
            clearTimeout(alarmTimeouts.get(index));
            alarmTimeouts.delete(index);
        }
        
        saveTasks();
        renderTasks();
    };

    // Handle photo upload
    const handlePhotoUpload = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                resolve(e.target.result);
            };
            reader.readAsDataURL(file);
        });
    };

    // Add new task
    const addTask = async () => {
        const text = taskInput.value.trim();
        const alarm = taskAlarm.value;
        const photoFile = taskPhoto.files[0];
        
        if (text) {
            let photoData = null;
            if (photoFile) {
                photoData = await handlePhotoUpload(photoFile);
            }
            
            const newTask = {
                text: text,
                completed: false,
                timestamp: Date.now(),
                alarm: alarm || null,
                photo: photoData
            };
            tasks.push(newTask);
            saveTasks();
            renderTasks();
            taskInput.value = "";
            taskAlarm.value = "";
            taskPhoto.value = "";
            taskInput.focus();
        }
    };

    // Request notification permission on page load
    if (Notification.permission === "default") {
        Notification.requestPermission();
    }

    // Event listeners
    addBtn.addEventListener("click", addTask);

    taskInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            addTask();
        }
    });

    // Filter button event listeners
    filterButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            // Remove active class from all buttons
            filterButtons.forEach(b => b.classList.remove("active"));
            // Add active class to clicked button
            btn.classList.add("active");
            // Update current filter
            currentFilter = btn.dataset.filter;
            // Re-render tasks
            renderTasks();
        });
    });

    // Audio alarm modal event listeners
    stopAlarmBtn.addEventListener("click", stopAlarm);
    snoozeAlarmBtn.addEventListener("click", snoozeAlarm);

    // Close modal when clicking outside
    audioAlarmModal.addEventListener("click", (e) => {
        if (e.target === audioAlarmModal) {
            stopAlarm();
        }
    });

    // Initialize the app
    updateStats();
    renderTasks();
    setupAlarms();
});