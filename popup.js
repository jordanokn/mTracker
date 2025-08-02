document.addEventListener('DOMContentLoaded', () => {
    const taskList = document.getElementById('taskList');
    const newTaskInput = document.getElementById('newTaskInput');
    const taskDeadline = document.getElementById('taskDeadline');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const datePickerBtn = document.getElementById('datePickerBtn');

    // Инициализация datepicker
    datePickerBtn.addEventListener('click', () => {
        taskDeadline.showPicker();
    });

    taskDeadline.addEventListener('change', () => {
        if (taskDeadline.value) {
            datePickerBtn.classList.add('date-selected');
        } else {
            datePickerBtn.classList.remove('date-selected');
        }
    });

    // Загрузка задач и запуск таймера обновления
    loadTasks();
    setInterval(updateProgressBars, 1000);

    // Обработчики событий
    addTaskBtn.addEventListener('click', addTask);
    newTaskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });

    function formatDeadline(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function setTaskDeadline(taskId) {
        const tasks = getTasks();
        const task = tasks.find(t => t.id === taskId);

        if (!task) return;

        const newDeadline = prompt('Enter deadline (YYYY-MM-DD HH:MM):',
            task.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : '');

        if (newDeadline !== null) {
            task.deadline = new Date(newDeadline).getTime();
            saveTasks(tasks);
            refreshTasks();
        }
    }

    function updateStats() {
        const tasks = getTasks();
        document.getElementById('totalTasks').textContent = tasks.length;
        document.getElementById('completedTasks').textContent = tasks.filter(t => t.completed).length;
    }

    function addTask() {
        const title = newTaskInput.value.trim();
        const deadline = new Date(taskDeadline.value).getTime();

        if (!title) {
            alert('Please enter a task title!');
            return;
        }

        if (!taskDeadline.value || isNaN(deadline)) {
            alert('Please select a valid deadline!');
            return;
        }

        const task = {
            id: Date.now(),
            title,
            description: '',
            deadline: deadline,
            createdAt: Date.now(),
            expanded: false,
            completed: false
        };

        saveTask(task);
        renderTask(task);
        newTaskInput.value = '';
        taskDeadline.value = '';
        datePickerBtn.classList.remove('date-selected');
        updateStats();
    }


    function renderTask(task) {
        const taskElement = document.createElement('div');
        taskElement.className = `task ${task.expanded ? 'expanded' : ''} ${task.completed ? 'completed' : ''}`;
        taskElement.dataset.id = task.id;
        taskElement.draggable = true;

        const { progress, timeText, isExpired } = calculateProgress(task);

        taskElement.innerHTML = `
    <div class="task-title">${task.title}</div>
    <div class="task-actions">
      <button class="complete-btn">${task.completed ? '✓' : '○'}</button>
      <button class="edit-btn">edit</button>
      <button class="delete-btn">del</button>
    </div>
    <br>
    <div class="task-description">${task.description || 'No description'}</div>


    <br>
    <div class="progress-bar">
      <div class="progress" style="width: ${progress}%"></div>
  
    </div>
            <div class="task-time">${timeText}</div>
  `;

        if (isExpired) taskElement.classList.add('expired');

        // Обработчики событий
        taskElement.querySelector('.complete-btn').addEventListener('click', () => toggleTaskCompletion(task.id));
        taskElement.querySelector('.edit-btn').addEventListener('click', () => editTask(task.id));
        taskElement.querySelector('.delete-btn').addEventListener('click', () => deleteTask(task.id));
        taskElement.addEventListener('click', (e) => {
            if (!e.target.classList.contains('edit-btn') && !e.target.classList.contains('delete-btn')) {
                toggleTaskCompletion(task.id);
            }
        });

        taskElement.addEventListener('dragstart', () => {
            taskElement.classList.add('dragging');
        });
        taskElement.addEventListener('dragend', () => {
            taskElement.classList.remove('dragging');
        });

        taskList.appendChild(taskElement);
    }

    function calculateProgress(task) {
        if (!task.deadline || !task.createdAt) {
            return { progress: 0, timeText: 'No deadline', isExpired: false };
        }

        const now = Date.now();
        const timeLeft = task.deadline - now;
        const isExpired = timeLeft <= 0;
        const timePassed = now - task.createdAt;
        const totalDuration = task.deadline - task.createdAt;
        let progress, timeText;

        if (isExpired) {
            progress = 100;
            timeText = 'Expired!';
        } else {
            progress = Math.min(100, (timePassed / totalDuration) * 100);

            const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
            const hoursLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

            if (daysLeft > 0) {
                timeText = `Left: ${daysLeft}d ${hoursLeft}h`;
            } else if (hoursLeft > 0) {
                timeText = `Left: ${hoursLeft}h ${minutesLeft}m`;
            } else {
                timeText = `Left: ${minutesLeft}m`;
            }
        }

        return { progress, timeText, isExpired };
    }

    function updateProgressBars() {
        const tasks = getTasks();
        tasks.forEach(task => {
            const taskElement = document.querySelector(`.task[data-id="${task.id}"]`);
            if (taskElement) {
                const { progress, timeText, isExpired } = calculateProgress(task);
                const progressBar = taskElement.querySelector('.progress');
                const timeElement = taskElement.querySelector('.task-time');

                if (progressBar) progressBar.style.width = `${progress}%`;
                if (timeElement) timeElement.textContent = timeText;

                if (isExpired) {
                    taskElement.classList.add('expired');
                    if (progressBar) progressBar.style.backgroundColor = '#f44336';
                }
            }
        });
    }

    function toggleTaskCompletion(id) {
        const tasks = getTasks();
        const task = tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            saveTasks(tasks);
            refreshTasks();
        }
    }

    function editTask(id) {
        const tasks = getTasks();
        const task = tasks.find(t => t.id === id);
        if (task) {
            const newTitle = prompt('Title:', task.title);
            if (newTitle !== null) {
                task.title = newTitle.trim();
                task.description = prompt('Description:', task.description) || '';

                const newDeadline = prompt('New deadline (YYYY-MM-DD HH:MM):',
                    new Date(task.deadline).toISOString().slice(0, 16));
                if (newDeadline) task.deadline = new Date(newDeadline).getTime();

                saveTasks(tasks);
                refreshTasks();
            }
        }
    }

    function deleteTask(id) {
        if (confirm('Delete task?')) {
            const tasks = getTasks().filter(t => t.id !== id);
            saveTasks(tasks);
            refreshTasks();
        }
    }

    function loadTasks() {
        getTasks().forEach(task => {
            if (!task.createdAt) task.createdAt = Date.now();
            renderTask(task);
        });
        setupDragAndDrop();
        updateStats();
    }

    function refreshTasks() {
        taskList.innerHTML = '';
        loadTasks();
    }

    function setupDragAndDrop() {
        taskList.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggingElement = document.querySelector('.dragging');
            const afterElement = getDragAfterElement(taskList, e.clientY);
            if (afterElement) {
                taskList.insertBefore(draggingElement, afterElement);
            } else {
                taskList.appendChild(draggingElement);
            }
        });

        taskList.addEventListener('drop', () => {
            const orderedTasks = Array.from(taskList.children).map(el =>
                getTasks().find(t => t.id === parseInt(el.dataset.id))
            ).filter(task => task !== undefined);
            saveTasks(orderedTasks);
        });
    }

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.task:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { element: child, offset: offset };
            } else {
                return closest;
            }
        }, { element: null, offset: Number.NEGATIVE_INFINITY }).element;
    }

    function getTasks() {
        const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
        return tasks.map(task => {
            if (!task.createdAt) task.createdAt = Date.now();
            if (!task.deadline) task.deadline = Date.now() + 86400000;
            if (typeof task.completed === 'undefined') task.completed = false; // Добавляем эту строку
            return task;
        });
    }



    function saveTask(task) {
        const tasks = getTasks();
        tasks.push(task);
        saveTasks(tasks);
    }

    function saveTasks(tasks) {
        localStorage.setItem('tasks', JSON.stringify(tasks));
        updateStats();
    }
});