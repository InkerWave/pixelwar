// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD8VZkXtKpyL3I2tKcZzdbjtXkl5dmQbmc",
  authDomain: "pixelwar-f7d0d.firebaseapp.com",
  projectId: "pixelwar-f7d0d",
  storageBucket: "pixelwar-f7d0d.firebasestorage.app",
  messagingSenderId: "392216041859",
  appId: "1:392216041859:web:ee14e336bc5f67b059beb6",
  measurementId: "G-791T4BFCSX"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// DOM элементы
const authContainer = document.getElementById('auth-container');
const gameContainer = document.getElementById('game-container');
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const logoutBtn = document.getElementById('logout-btn');
const pointsDisplay = document.getElementById('points');
const selectedColorDisplay = document.getElementById('selected-color');
const grid = document.getElementById('grid');

// Цвета для палитры
const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', 
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', 
    '#A52A2A', '#808080'
];

let points = 100;
let selectedColor = '#000000';

// Инициализация
init();

function init() {
    renderColorPalette();
    setupAuthListeners();
    setupPixelGrid();
}

// Рендер палитры цветов
function renderColorPalette() {
    const palette = document.querySelector('.color-palette');
    colors.forEach(color => {
        const colorElement = document.createElement('div');
        colorElement.className = 'color';
        colorElement.style.backgroundColor = color;
        colorElement.dataset.color = color;
        colorElement.addEventListener('click', () => {
            document.querySelectorAll('.color').forEach(c => c.classList.remove('selected'));
            colorElement.classList.add('selected');
            selectedColor = color;
            selectedColorDisplay.style.backgroundColor = color;
        });
        palette.appendChild(colorElement);
    });
    selectedColorDisplay.style.backgroundColor = selectedColor;
}

// Настройка сетки пикселей
function setupPixelGrid() {
    for (let i = 0; i < 50 * 50; i++) {
        const pixel = document.createElement('div');
        pixel.className = 'pixel';
        pixel.dataset.index = i;

        // Слушаем изменения пикселя из Firebase
        database.ref(`pixels/${i}`).on('value', (snapshot) => {
            const color = snapshot.val();
            pixel.style.backgroundColor = color || 'white';
            pixel.classList.toggle('occupied', !!color);
        });

        // Обработчик клика по пикселю
        pixel.addEventListener('click', () => {
            const user = auth.currentUser;
            if (!user) return;
            
            if (points > 0 && !pixel.classList.contains('occupied')) {
                database.ref(`pixels/${i}`).set(selectedColor);
                points--;
                updateUserPoints(user, points);
                pointsDisplay.textContent = points;
            } else if (pixel.classList.contains('occupied')) {
                alert('Этот пиксель уже занят!');
            } else {
                alert('У вас закончились очки!');
            }
        });

        grid.appendChild(pixel);
    }
}

// Аутентификация
function setupAuthListeners() {
    // Регистрация
    registerBtn.addEventListener('click', () => {
        const email = emailInput.value;
        const password = passwordInput.value;
        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Создаем запись пользователя в Firebase
                const user = userCredential.user;
                database.ref(`users/${user.uid}`).set({
                    points: 100,
                    lastReset: new Date().toDateString()
                });
                alert('Регистрация успешна!');
            })
            .catch(error => alert(error.message));
    });

    // Логин
    loginBtn.addEventListener('click', () => {
        const email = emailInput.value;
        const password = passwordInput.value;
        auth.signInWithEmailAndPassword(email, password)
            .catch(error => alert(error.message));
    });

    // Логаут
    logoutBtn.addEventListener('click', () => {
        auth.signOut();
    });

    // Слушатель состояния аутентификации
    auth.onAuthStateChanged(user => {
        if (user) {
            authContainer.style.display = 'none';
            gameContainer.style.display = 'block';
            loadUserData(user);
        } else {
            authContainer.style.display = 'block';
            gameContainer.style.display = 'none';
        }
    });
}

// Загрузка данных пользователя
function loadUserData(user) {
    const userRef = database.ref(`users/${user.uid}`);
    
    userRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            checkDailyReset(user, data);
            points = data.points;
            pointsDisplay.textContent = points;
        } else {
            // Новый пользователь
            resetDailyPoints(user);
        }
    });
}

// Проверка ежедневного сброса очков
function checkDailyReset(user, userData) {
    const today = new Date().toDateString();
    if (userData.lastReset !== today) {
        resetDailyPoints(user);
    }
}

// Сброс очков
function resetDailyPoints(user) {
    const today = new Date().toDateString();
    database.ref(`users/${user.uid}`).update({
        points: 100,
        lastReset: today
    });
}

// Обновление очков пользователя
function updateUserPoints(user, newPoints) {
    database.ref(`users/${user.uid}`).update({
        points: newPoints
    });
}

// Добавляем кнопку админа для сброса всех пикселей
function addAdminResetButton() {
    const adminBtn = document.createElement('button');
    adminBtn.textContent = 'ADMIN: Reset All Pixels';
    adminBtn.style.background = 'red';
    adminBtn.onclick = () => {
        if (confirm('⚠️ Удалить ВСЕ пиксели?')) {
            database.ref('pixels').remove()
                .then(() => alert('Холст очищен!'))
                .catch(error => alert('Ошибка: ' + error));
        }
    };
    document.querySelector('.info').appendChild(adminBtn);
}

// Вызываем после инициализации, если нужно
// addAdminResetButton();
